import type { EquipeResult } from "@/hooks/useResultadoFinal";

export const MESES_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const mesNumero = (m: string) => {
  const i = MESES_ABBR.indexOf(m);
  return i >= 0 ? i + 1 : Number(m);
};

/** Meses (ex.: "Jan/2025" ou "01/2025") existentes nos resultados, em ordem cronológica. */
export const listarMeses = (resultados: EquipeResult[]): string[] => {
  const s = new Set<string>();
  resultados.forEach(r => r.indicadores.forEach(i => i.mesesDetalhe.forEach(m => s.add(m.mes))));
  const key = (m: string) => {
    const [mm, yy] = m.split("/");
    return Number(yy) * 100 + mesNumero(mm);
  };
  return [...s].sort((a, b) => key(a) - key(b));
};

/** Conjunto de meses (nos dois formatos) cobertos pelos quadrimestres ("Q1-2025"...); null = sem filtro. */
export const mesesDosQuadrimestres = (quads: string[]): Set<string> | null => {
  if (quads.length === 0) return null;
  const set = new Set<string>();
  quads.forEach(q => {
    const [qn, ano] = q.split("-");
    const nums = qn === "Q1" ? [1, 2, 3, 4] : qn === "Q2" ? [5, 6, 7, 8] : [9, 10, 11, 12];
    nums.forEach(n => {
      set.add(`${String(n).padStart(2, "0")}/${ano}`);
      set.add(`${MESES_ABBR[n - 1]}/${ano}`);
    });
  });
  return set;
};
