import { toast } from "sonner";

/**
 * Proteção contra "versão parcial" da planilha publicada.
 *
 * O Google às vezes publica o CSV no meio de um recálculo/upload: vem só a 1ª equipe
 * e as colunas calculadas (ex.: 1ª Consulta) vazias. Como o painel recarrega a cada
 * foco da janela e no botão "Atualizar dados", uma resposta parcial sobrescrevia os
 * dados bons. Aqui comparamos a resposta com a última carga boa e, se vier muito
 * menor, tentamos de novo e, persistindo, mantemos os dados anteriores.
 */

interface Resumo { linhas: number; comData: number; equipes: number }
type Registro = { equipe: string; primeiraConsulta: string };

const LIMITE_LINHAS = 0.9;   // aceita até 10% a menos de linhas
const LIMITE_DATAS = 0.7;    // aceita até 30% a menos de linhas com 1ª consulta preenchida
const TENTATIVAS = 3;
const ESPERA_MS = 4000;

const memoria: Record<string, { resumo: Resumo; dados: Registro[] }> = {};

const resumir = (dados: Registro[]): Resumo => {
  const equipes = new Set<string>();
  let comData = 0;
  for (const p of dados) {
    if (p.equipe) equipes.add(p.equipe);
    const c = (p.primeiraConsulta ?? "").trim();
    if (c && c !== "-") comData++;
  }
  return { linhas: dados.length, comData, equipes: equipes.size };
};

const lerSalvo = (chave: string): Resumo | null => {
  try {
    const v = localStorage.getItem(`carga-ok:${chave}`);
    return v ? (JSON.parse(v) as Resumo) : null;
  } catch { return null; }
};
const gravarSalvo = (chave: string, r: Resumo) => {
  try { localStorage.setItem(`carga-ok:${chave}`, JSON.stringify(r)); } catch { /* ignora */ }
};

const incompleto = (novo: Resumo, base: Resumo): boolean =>
  novo.linhas < base.linhas * LIMITE_LINHAS ||
  novo.equipes < base.equipes ||
  novo.comData < base.comData * LIMITE_DATAS;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function carregarComGuarda<T extends Registro>(
  chave: string,
  buscar: () => Promise<T[]>,
): Promise<T[]> {
  const anterior = memoria[chave];                  // dados bons desta sessão
  const base = anterior?.resumo ?? lerSalvo(chave); // ou contagens da última sessão

  let melhor: T[] | null = null;
  let melhorResumo: Resumo | null = null;

  for (let i = 0; i < TENTATIVAS; i++) {
    const dados = await buscar();
    const resumo = resumir(dados);
    if (!melhorResumo || resumo.linhas + resumo.comData > melhorResumo.linhas + melhorResumo.comData) {
      melhor = dados; melhorResumo = resumo;
    }
    if (!base || !incompleto(resumo, base)) {
      memoria[chave] = { resumo, dados };
      gravarSalvo(chave, resumo);
      return dados;
    }
    if (i < TENTATIVAS - 1) await esperar(ESPERA_MS);
  }

  // Continua incompleto depois das tentativas.
  console.warn(`[${chave}] planilha publicada parece incompleta`, { recebido: melhorResumo, esperado: base });
  if (anterior) {
    toast.warning("A planilha publicada veio incompleta. Mantive a última versão carregada; tente novamente em alguns minutos.");
    return anterior.dados as T[];
  }
  // Sem dados anteriores nesta sessão: usa a melhor tentativa e passa a tomá-la como base.
  memoria[chave] = { resumo: melhorResumo!, dados: melhor! };
  gravarSalvo(chave, melhorResumo!);
  return melhor!;
}
