import { parse, isValid, getMonth, getYear } from "date-fns";

export type Quadrimestre =
  | "todos"
  | "Q1-2024" | "Q2-2024" | "Q3-2024"
  | "Q1-2025" | "Q2-2025" | "Q3-2025"
  | "Q1-2026" | "Q2-2026" | "Q3-2026";

export interface QuadrimestreOption {
  value: Quadrimestre;
  label: string;
}

export const QUADRIMESTRE_OPTIONS: QuadrimestreOption[] = [
  { value: "todos",   label: "Todos os períodos" },
  { value: "Q1-2024", label: "1º Quadrimestre 2024 (Jan–Abr)" },
  { value: "Q2-2024", label: "2º Quadrimestre 2024 (Mai–Ago)" },
  { value: "Q3-2024", label: "3º Quadrimestre 2024 (Set–Dez)" },
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

export function filterPatientsByQuadrimestre<T extends { primeiraConsulta: string }>(
  patients: T[],
  quad: Quadrimestre
): T[] {
  if (quad === "todos") return patients;

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  return patients.filter((p) => {
    const d = parseDate(p.primeiraConsulta);
    if (!d) return true; // sem data: inclui (pendente)
    return getYear(d) === year && months.includes(getMonth(d));
  });
}
