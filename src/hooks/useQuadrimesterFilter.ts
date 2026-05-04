import { parse, isValid, getMonth, getYear } from "date-fns";

export type Quadrimestre =
  | "todos"
  | "Q1-2025" | "Q2-2025" | "Q3-2025"
  | "Q1-2026" | "Q2-2026" | "Q3-2026";

export interface QuadrimestreOption {
  value: Quadrimestre;
  label: string;
}

export const QUADRIMESTRE_OPTIONS: QuadrimestreOption[] = [
  { value: "todos",   label: "Todos os períodos" },
  { value: "Q1-2025", label: "1º Quadrimestre 2025 (Jan–Abr)" },
  { value: "Q2-2025", label: "2º Quadrimestre 2025 (Mai–Ago)" },
  { value: "Q3-2025", label: "3º Quadrimestre 2025 (Set–Dez)" },
  { value: "Q1-2026", label: "1º Quadrimestre 2026 (Jan–Abr)" },
  { value: "Q2-2026", label: "2º Quadrimestre 2026 (Mai–Ago)" },
  { value: "Q3-2026", label: "3º Quadrimestre 2026 (Set–Dez)" },
];

export const QUADRIMESTRE_OPTIONS_SEM_TODOS: QuadrimestreOption[] = QUADRIMESTRE_OPTIONS.filter(
  (opt) => opt.value !== "todos"
);

const QUAD_MONTHS: Record<string, number[]> = {
  Q1: [0, 1, 2, 3],
  Q2: [4, 5, 6, 7],
  Q3: [8, 9, 10, 11],
};

const MONTH_NAME_TO_NUM: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const parseDate = (val: string): Date | null => {
  if (!val || val === "-" || val.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

const parseMesAno = (mesAno: string): { mes: number; ano: number } | null => {
  const parts = mesAno.split("/");
  const mesName = parts[0]?.toLowerCase().trim();
  const ano = parseInt(parts[1]);
  const mes = MONTH_NAME_TO_NUM[mesName];
  if (mes === undefined || isNaN(ano)) return null;
  return { mes, ano };
};

// Verifica se um (mes, ano) cai em algum dos quadrimestres selecionados
const matchesAnyQuad = (mes: number, ano: number, quads: Quadrimestre[]): boolean => {
  if (quads.length === 0) return true;
  return quads.some(quad => {
    if (quad === "todos") return true;
    const [q, yearStr] = quad.split("-");
    const year = parseInt(yearStr, 10);
    const months = QUAD_MONTHS[q] || [];
    return ano === year && months.includes(mes);
  });
};

// Tab1 - filtra por primeiraConsulta (data)
export function filterPatientsByQuadrimestre<T extends { primeiraConsulta: string }>(
  patients: T[],
  quads: Quadrimestre[],
): T[] {
  if (quads.length === 0) return patients;
  return patients.filter((p) => {
    const d = parseDate(p.primeiraConsulta);
    if (!d) return true;
    return matchesAnyQuad(getMonth(d), getYear(d), quads);
  });
}

export function filterTratamentoByQuadrimestre<
  T extends { primeiraConsulta: string; tratamentoConcluido: string }
>(
  patients: T[],
  quads: Quadrimestre[],
): T[] {
  if (quads.length === 0) return patients;
  return patients.filter((p) => {
    const d = parseDate(p.primeiraConsulta);
    if (!d) return false;
    return matchesAnyQuad(getMonth(d), getYear(d), quads);
  });
}

export function filterByQuadrimestre<T extends { mesAno: string }>(
  records: T[],
  quads: Quadrimestre[],
): T[] {
  if (quads.length === 0) return records;
  return records.filter((r) => {
    const parsed = parseMesAno(r.mesAno);
    if (!parsed) return true;
    return matchesAnyQuad(parsed.mes, parsed.ano, quads);
  });
}

export function filterTab4ByQuadrimestre<T extends { primeiraConsulta: string }>(
  patients: T[],
  quads: Quadrimestre[],
): T[] {
  return filterPatientsByQuadrimestre(patients, quads);
}
