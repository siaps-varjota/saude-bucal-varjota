/**
 * Estratégia de fim de mês (saúde bucal).
 *
 * A nota do quadrimestre usa a MÉDIA MENSAL dos percentuais, então perto do fim
 * do mês o que importa é decidir onde concentrar o esforço: o indicador que
 * rende mais pontos com menos unidades a cumprir no mês atual.
 *
 * Janela em que o olhar estratégico vale (constantes abaixo, fáceis de ajustar):
 *  - 1º, 2º e 3º mês do quadrimestre: só a partir do dia 20;
 *  - 4º mês do quadrimestre: o mês inteiro (última chance de fechar o conceito).
 *
 * Também trata do cruzamento entre indicadores que dividem os mesmos
 * procedimentos individuais (B3 x B5 x B6):
 *  - B3 abaixo do piso (precisa de exodontias): procedimentos preventivos/ART
 *    aumentam o denominador de B3 e AFASTAM o piso, então B5 atrapalha B3;
 *  - B3 acima do limite (precisa de denominador): B5/B6 ajudam B3.
 */

/** Dia do mês a partir do qual a estratégia vale nos meses 1 a 3 do quadrimestre. */
export const DIA_INICIO_JANELA = 20;

export type FaseEstrategia = "apos_dia_20" | "mes_inteiro";

export interface JanelaEstrategica {
  ativa: boolean;
  fase: FaseEstrategia | null;
  /** 1 a 4 (Jan=1 … Abr=4, Mai=1 …) */
  mesNoQuadrimestre: number;
  dia: number;
  descricao: string;
}

const ORDINAL = ["", "1º", "2º", "3º", "4º"];

export function janelaEstrategica(hoje: Date = new Date()): JanelaEstrategica {
  const mesNoQuadrimestre = (hoje.getMonth() % 4) + 1;
  const dia = hoje.getDate();
  if (mesNoQuadrimestre === 4) {
    return { ativa: true, fase: "mes_inteiro", mesNoQuadrimestre, dia, descricao: "último (4º) mês do quadrimestre — olhar estratégico o mês inteiro" };
  }
  if (dia >= DIA_INICIO_JANELA) {
    return { ativa: true, fase: "apos_dia_20", mesNoQuadrimestre, dia, descricao: `${ORDINAL[mesNoQuadrimestre]} mês do quadrimestre, após o dia ${DIA_INICIO_JANELA}` };
  }
  return { ativa: false, fase: null, mesNoQuadrimestre, dia, descricao: "fora da janela estratégica" };
}

/** Código do indicador a partir do nome usado no painel. */
export const CODIGO_POR_INDICADOR: Record<string, string> = {
  "1ª Consulta Odontológica": "B1",
  "Tratamento Concluído": "B2",
  "Taxa de Exodontias": "B3",
  "Escovação Supervisionada": "B4",
  "Proced. Odont. Preventivos": "B5",
  "Trat. Restaurador Atraumático": "B6",
};

/** Dados mínimos de cada indicador (a linha do "Resumo de Simulação" já satisfaz esta interface). */
export interface LinhaEstrategia {
  /** B1…B6 (vazio quando o indicador não tem código) */
  codigo: string;
  /** nome do indicador no painel (ex.: "Taxa de Exodontias") */
  nome: string;
  /** rótulo exibido (ex.: "B3 — Taxa de Exodontias") */
  indicador: string;
  atual: string;
  conceitoAtual: string;
  proximo: string;
  /** texto curto de quanto falta ("4 exodontia(s) (mínimo)") */
  faltamCurto: string;
  pendente: boolean;
  /** true quando o "mês em andamento" da simulação é o mês corrente do calendário */
  mesCorrente: boolean;
  /** unidades a cumprir NO MÊS ATUAL; null = inalcançável só com o mês atual */
  faltamNum: number | null;
  unidadeEsforco: string;
  /** pontos que o indicador ganha na nota final ao atingir o próximo conceito */
  impactoNum: number;
  notaProjNum: number;
  /** Só B3: situação do mês aberto, usada no cruzamento com B5/B6 */
  b3?: { modo: "exodontia" | "denominador"; mesNum: number; mesDen: number; alvoMin: number };
}

export interface ItemEstrategia {
  codigo: string;
  indicador: string;
  faltamNum: number;
  unidade: string;
  pontosGanhos: number;
  /** pontos ganhos por unidade a cumprir: quanto maior, mais "barato" */
  pontosPorUnidade: number;
  proximoConceito: string;
  papel: "foco" | "adiar";
}

export interface EstrategiaFimDeMes {
  ativa: boolean;
  fase: FaseEstrategia | null;
  descricao: string;
  /** do mais fácil/rentável ao mais difícil */
  ranking: ItemEstrategia[];
  foco: string[];
  adiar: string[];
  inalcancaveis: string[];
  avisos: string[];
  ordemSugerida: string;
  titulo: string;
  /** parágrafos prontos para PDF/tela */
  paragrafos: string[];
}

const fmtPts = (v: number) => v.toFixed(2).replace(".", ",");
const fmtN = (v: number) => v.toLocaleString("pt-BR");

const vazia = (janela: JanelaEstrategica): EstrategiaFimDeMes => ({
  ativa: false, fase: janela.fase, descricao: janela.descricao,
  ranking: [], foco: [], adiar: [], inalcancaveis: [], avisos: [], ordemSugerida: "", titulo: "", paragrafos: [],
});

export function analisarEstrategia(linhas: LinhaEstrategia[], hoje: Date = new Date()): EstrategiaFimDeMes {
  const janela = janelaEstrategica(hoje);
  if (!janela.ativa) return vazia(janela);

  const candidatas = linhas.filter(l => l.pendente && l.mesCorrente);
  if (candidatas.length === 0) return vazia(janela);

  const inalcancaveis = candidatas.filter(l => l.faltamNum === null).map(l => l.codigo || l.nome);
  const viaveis = candidatas.filter(l => l.faltamNum !== null && l.faltamNum > 0 && l.impactoNum > 0);
  if (viaveis.length === 0 && inalcancaveis.length === 0) return vazia(janela);

  const base: Omit<ItemEstrategia, "papel">[] = viaveis
    .map(l => ({
      codigo: l.codigo || l.nome,
      indicador: l.nome,
      faltamNum: l.faltamNum as number,
      unidade: l.unidadeEsforco,
      pontosGanhos: l.impactoNum,
      pontosPorUnidade: l.impactoNum / (l.faltamNum as number),
      proximoConceito: l.proximo,
    }))
    .sort((a, b) => b.pontosPorUnidade - a.pontosPorUnidade || b.pontosGanhos - a.pontosGanhos);

  const porCodigo = (c: string) => viaveis.find(l => l.codigo === c);
  const b3 = porCodigo("B3");
  const b5 = porCodigo("B5");
  const b6 = porCodigo("B6");
  const avisos: string[] = [];
  const adiar = new Set<string>();

  // ── B3 abaixo do piso (precisa de exodontias) x B5/B6 (diluem o piso) ─────
  if (b3?.b3?.modo === "exodontia") {
    const { mesNum, mesDen, alvoMin } = b3.b3;
    const e0 = b3.faltamNum as number;
    const rivais = [b5, b6].filter((l): l is LinhaEstrategia => !!l);
    const idxB3 = base.findIndex(i => i.codigo === "B3");
    for (const rival of rivais) {
      // B5: cada 1ª consulta/trat. concluído soma +2 procedimentos ao denominador de B3; B6: cada ART soma +1.
      const k = rival.faltamNum as number;
      const porUnidade = rival.codigo === "B5" ? 2 : 1;
      const procs = k * porUnidade;
      const eTot = Math.ceil((alvoMin * (mesDen + procs) - mesNum) / (1 - alvoMin) - 1e-9);
      const extra = Math.max(0, eTot - e0);
      avisos.push(
        `${rival.codigo} x B3: para chegar ao próximo conceito de ${rival.codigo} seriam ${fmtN(k)} ${rival.unidadeEsforco}, o que soma cerca de ${fmtN(procs)} procedimento(s) ao denominador de B3 e exigiria ${fmtN(extra)} exodontia(s) a mais (${fmtN(eTot)} no total, em vez de ${fmtN(e0)}) para B3 não voltar abaixo do piso de 3%. Priorizar ${rival.codigo} dificulta B3.`,
      );
      const idxRival = base.findIndex(i => i.codigo === rival.codigo);
      if (idxB3 >= 0 && idxRival >= 0 && idxB3 < idxRival) adiar.add(rival.codigo);
      else if (idxB3 >= 0 && idxRival >= 0) adiar.add("B3");
    }
    if (b5) avisos.push("As exodontias também entram no denominador de B5 (efeito pequeno): confira B5 de novo depois de registrá-las.");
  }

  // ── B3 acima do limite (precisa de denominador): B5/B6 ajudam ────────────
  if (b3?.b3?.modo === "denominador") {
    const faltaDen = b3.faltamNum as number;
    const ajudas: string[] = [];
    if (b5) ajudas.push(`B5 (${fmtN(b5.faltamNum as number)} ${b5.unidadeEsforco} somam cerca de ${fmtN((b5.faltamNum as number) * 2)} procedimentos ao denominador de B3)`);
    if (b6) ajudas.push(`B6 (${fmtN(b6.faltamNum as number)} ART somam ${fmtN(b6.faltamNum as number)})`);
    if (ajudas.length) {
      avisos.push(`B3 acima do limite precisa de cerca de ${fmtN(faltaDen)} procedimento(s) a mais no denominador: ${ajudas.join(" e ")} ajudam B3 ao mesmo tempo. Priorizar esses indicadores atende os dois. Evite apenas exodontias que possam ser adiadas; nunca deixe de realizar as que têm indicação clínica.`);
    }
  }

  const ranking: ItemEstrategia[] = base.map(i => ({ ...i, papel: adiar.has(i.codigo) ? "adiar" : "foco" }));
  const foco = ranking.filter(i => i.papel === "foco").map(i => i.codigo);
  const adiarLista = ranking.filter(i => i.papel === "adiar").map(i => i.codigo);

  const descreve = (i: ItemEstrategia) => `${i.codigo} (${fmtN(i.faltamNum)} ${i.unidade}, +${fmtPts(i.pontosGanhos)} pts)`;
  const itensFoco = ranking.filter(i => i.papel === "foco");
  const itensAdiar = ranking.filter(i => i.papel === "adiar");
  let ordemSugerida = "";
  if (itensFoco.length) {
    ordemSugerida = `Concentrar primeiro em ${itensFoco.map(descreve).join(", depois ")}`;
    if (itensAdiar.length) ordemSugerida += `; deixar ${itensAdiar.map(i => i.codigo).join(" e ")} para depois, só se sobrar capacidade, porque ${itensAdiar.length > 1 ? "competem" : "compete"} com o foco`;
    ordemSugerida += ".";
  }

  const paragrafos: string[] = [];
  paragrafos.push(
    `Como a nota é a média mensal dos percentuais, o mês atual precisa cobrir sozinho o que falta. Neste ponto (${janela.descricao}), vale priorizar o indicador que rende mais pontos com menos esforço.`,
  );
  if (ranking.length) {
    paragrafos.push(
      "Do mais fácil ao mais difícil de alcançar neste mês: " +
        ranking.map((i, n) => `${n + 1}º ${descreve(i)}`).join("; ") + ".",
    );
  }
  avisos.forEach(a => paragrafos.push(a));
  if (inalcancaveis.length) {
    paragrafos.push(`${inalcancaveis.join(", ")}: não dá para atingir o próximo conceito só com o mês atual; não concentre esforço extra aqui agora.`);
  }
  if (ordemSugerida) paragrafos.push(`Recomendação: ${ordemSugerida.charAt(0).toLowerCase()}${ordemSugerida.slice(1)}`);
  paragrafos.push(
    janela.fase === "mes_inteiro"
      ? "Último mês do quadrimestre: refaça esta leitura toda semana, não só no fim do mês."
      : "Refaça esta leitura a cada mês, a partir do dia 20, até o 3º mês do quadrimestre; no 4º mês, o mês inteiro.",
  );
  paragrafos.push("O objetivo é organizar agenda e busca ativa e registrar corretamente o que foi feito; nenhum procedimento deve ser feito ou lançado só para mexer no percentual.");

  return {
    ativa: true,
    fase: janela.fase,
    descricao: janela.descricao,
    ranking, foco, adiar: adiarLista, inalcancaveis, avisos, ordemSugerida,
    titulo: "Estratégia de fim de mês — onde concentrar o esforço",
    paragrafos,
  };
}

// ── Dados do relatório de pendências para a análise por IA ────────────────────

export interface PendenciasIA {
  contagens: { semPrimeiraConsultaB1: number; tratamentoPendenteB2: number };
  notaFinalAtual: number;
  notaFinalProjetada: number;
  simulacao: {
    indicador: string; atual: string; conceitoAtual: string; proximoConceito: string;
    faltamNoMesAtual: string; pontosGanhos: number; notaProjetada: number;
  }[];
  estrategiaFimDeMes: {
    ativa: boolean; fase?: FaseEstrategia | null; descricao?: string;
    ranking?: ItemEstrategia[]; foco?: string[]; adiar?: string[]; inalcancaveis?: string[];
    avisos?: string[]; ordemSugerida?: string;
  };
}

const arred = (v: number) => Number(v.toFixed(2));

export function pendenciasParaIA(
  linhas: LinhaEstrategia[],
  info: { notaFinalAtual: number; semPrimeiraConsulta: number; tratamentoPendente: number },
  hoje: Date = new Date(),
): PendenciasIA {
  const est = analisarEstrategia(linhas, hoje);
  return {
    contagens: { semPrimeiraConsultaB1: info.semPrimeiraConsulta, tratamentoPendenteB2: info.tratamentoPendente },
    notaFinalAtual: arred(info.notaFinalAtual),
    notaFinalProjetada: arred(linhas.reduce((s, l) => s + l.notaProjNum, 0)),
    simulacao: linhas.map(l => ({
      indicador: l.indicador, atual: l.atual, conceitoAtual: l.conceitoAtual, proximoConceito: l.proximo,
      faltamNoMesAtual: l.faltamCurto, pontosGanhos: arred(l.pendente ? l.impactoNum : 0), notaProjetada: arred(l.notaProjNum),
    })),
    estrategiaFimDeMes: est.ativa
      ? {
          ativa: true, fase: est.fase, descricao: est.descricao,
          ranking: est.ranking.map(i => ({ ...i, pontosPorUnidade: Number(i.pontosPorUnidade.toFixed(3)), pontosGanhos: arred(i.pontosGanhos) })),
          foco: est.foco, adiar: est.adiar, inalcancaveis: est.inalcancaveis, avisos: est.avisos, ordemSugerida: est.ordemSugerida,
        }
      : { ativa: false },
  };
}
