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

// ✅ Necessário para o ResultadoFinalTab — sem a opção "todos"
export const QUADRIMESTRE_OPTIONS_SEM_TODOS: QuadrimestreOption[] = QUADRIMESTRE_OPTIONS.filter(
  (opt) => opt.value !== "todos"
);
