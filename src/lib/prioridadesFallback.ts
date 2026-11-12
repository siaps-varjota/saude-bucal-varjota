/**
 * Sugestões de prioridades SEM IA (regras fixas).
 * Usadas quando a análise por IA não está disponível (ex.: créditos esgotados).
 * Mesmo formato de resposta da função `sugerir-acoes`.
 */
export interface DadosMes { mes: string; numerador: number; denominador: number; percentual: number }
export interface DadosIndicador {
  indicador: string;
  peso: number;
  conceitoPeriodo: string;
  percentualPeriodo: number;
  numeradorPeriodo: number;
  denominadorPeriodo: number;
  meses: DadosMes[];
}
export interface DadosEquipe { equipe: string; indicadores: DadosIndicador[] }
export type Nivel = "alta" | "media" | "baixa";
export interface PrioridadeFallback { equipe: string; indicador: string; nivel: Nivel; motivo: string; acoes: string[] }
export interface AnaliseFallback { resumo: string; prioridades: PrioridadeFallback[] }

// Revise estas ações conforme os protocolos da sua equipe.
const ACOES: Record<string, string[]> = {
  "1ª Consulta Odontológica": [
    "Fazer busca ativa dos usuários cadastrados sem 1ª consulta odontológica programática, com apoio dos ACS.",
    "Reservar vagas fixas na agenda para a 1ª consulta programática.",
    "Conferir se a 1ª consulta está sendo registrada corretamente (tipo de consulta e CBO) no e-SUS.",
  ],
  "Tratamento Concluído": [
    "Listar os pacientes com tratamento iniciado e não concluído e reagendar o retorno.",
    "Fazer busca ativa dos faltosos por meio dos ACS.",
    "Registrar a conclusão do tratamento no e-SUS assim que o último procedimento for realizado.",
  ],
  "Taxa de Exodontias": [
    "Priorizar procedimentos conservadores (restaurações e tratamento endodôntico) sempre que houver indicação.",
    "Reforçar ações de prevenção e de detecção precoce de cárie para reduzir a necessidade de extrações.",
    "Revisar com a equipe os casos de exodontia para identificar o que poderia ter sido evitado. Neste indicador, quanto MENOR o percentual, melhor.",
  ],
  "Escovação Supervisionada": [
    "Programar ações de escovação supervisionada nas escolas, com calendário mensal.",
    "Articular com as escolas e com a equipe de saúde da família a participação das crianças de 6 a 12 anos.",
    "Conferir se as ações coletivas estão sendo registradas corretamente no e-SUS.",
  ],
  "Proced. Odont. Preventivos": [
    "Incluir procedimentos preventivos (aplicação de flúor, profilaxia, orientação de higiene) em todos os atendimentos.",
    "Conferir o registro dos procedimentos preventivos no e-SUS.",
    "Priorizar a atenção preventiva em grupos de maior risco (crianças, gestantes).",
  ],
  "Trat. Restaurador Atraumático": [
    "Ampliar o uso do ART em atendimentos na UBS e em ações extramuros, onde houver indicação.",
    "Garantir material e capacitação da equipe para o ART.",
    "Conferir o registro dos procedimentos de ART no e-SUS.",
  ],
};

const ORDEM: Record<Nivel, number> = { alta: 0, media: 1, baixa: 2 };
const SOBE: Record<Nivel, Nivel> = { alta: "alta", media: "alta", baixa: "media" };

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function gerarPrioridadesFallback(dados: DadosEquipe[]): AnaliseFallback {
  const lista: PrioridadeFallback[] = [];
  const pesoDe: Record<string, number> = {};

  for (const eq of dados) {
    for (const ind of eq.indicadores) {
      const base: Nivel | null =
        ind.conceitoPeriodo === "Regular" ? "alta"
        : ind.conceitoPeriodo === "Suficiente" ? "media"
        : ind.conceitoPeriodo === "Bom" ? "baixa"
        : null; // "Ótimo" e "Sem dado" não entram
      if (!base) continue;

      const comDado = ind.meses.filter(m => m.denominador > 0);
      let queda = false;
      if (comDado.length >= 2) {
        const delta = comDado[comDado.length - 1].percentual - comDado[0].percentual;
        queda = ind.indicador === "Taxa de Exodontias" ? delta > 0 : delta < 0;
      }
      const nivel = queda ? SOBE[base] : base;

      const tendencia = queda
        ? ` Há piora entre ${comDado[0].mes} (${fmt(comDado[0].percentual)}%) e ${comDado[comDado.length - 1].mes} (${fmt(comDado[comDado.length - 1].percentual)}%).`
        : "";
      const motivo = `Conceito ${ind.conceitoPeriodo} no período, com média de ${fmt(ind.percentualPeriodo)}% (peso ${ind.peso}).${tendencia}`;

      pesoDe[`${eq.equipe}|${ind.indicador}`] = ind.peso;
      lista.push({
        equipe: eq.equipe,
        indicador: ind.indicador,
        nivel,
        motivo,
        acoes: ACOES[ind.indicador] ?? ["Revisar o registro dos dados no e-SUS e definir ações com a equipe."],
      });
    }
  }

  lista.sort((a, b) =>
    ORDEM[a.nivel] - ORDEM[b.nivel] ||
    (pesoDe[`${b.equipe}|${b.indicador}`] ?? 0) - (pesoDe[`${a.equipe}|${a.indicador}`] ?? 0));
  const prioridades = lista.slice(0, 8);

  const alta = lista.filter(p => p.nivel === "alta").length;
  const resumo = prioridades.length === 0
    ? "Nenhum indicador em Regular, Suficiente ou Bom nos períodos escolhidos: os resultados estão Ótimos ou sem dados."
    : `${lista.length} indicador(es) abaixo do conceito Ótimo, dos quais ${alta} com prioridade alta. Análise automática por regras fixas (IA indisponível): ordenada pelo conceito, pela tendência entre os meses e pelo peso do indicador.`;

  return { resumo, prioridades };
}
