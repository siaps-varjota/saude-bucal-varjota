import { MESES_ABBR } from "@/lib/mesesFiltro";

export type SituacaoMes = "fechado" | "em_andamento" | "futuro" | "sem_dados";

/** Converte "Dez/2026" ou "12/2026" em { ano, mes } (mes 1-12). */
export function parseMes(mes: string): { ano: number; mes: number } | null {
  const [m, a] = mes.split("/");
  const idx = MESES_ABBR.indexOf(m);
  const mesNum = idx >= 0 ? idx + 1 : Number(m);
  const ano = Number(a);
  if (!mesNum || mesNum < 1 || mesNum > 12 || !ano) return null;
  return { ano, mes: mesNum };
}

/**
 * Situação do mês frente à data de hoje:
 * - futuro: ainda não começou;
 * - em_andamento: é o mês corrente (dados parciais, mesmo que haja números);
 * - sem_dados: mês já passado, mas sem denominador registrado;
 * - fechado: mês passado com dados.
 */
export function situacaoMes(mes: string, denominador: number, hoje: Date = new Date()): SituacaoMes {
  const p = parseMes(mes);
  if (!p) return denominador > 0 ? "fechado" : "sem_dados";
  const chave = p.ano * 12 + p.mes;
  const atual = hoje.getFullYear() * 12 + (hoje.getMonth() + 1);
  if (chave > atual) return "futuro";
  if (chave === atual) return "em_andamento";
  return denominador > 0 ? "fechado" : "sem_dados";
}

export const rotuloMesAtual = (hoje: Date = new Date()) => `${MESES_ABBR[hoje.getMonth()]}/${hoje.getFullYear()}`;
