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

// ── helpers internos ──────────────────────────────────────────────────────────

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

// ── funções exportadas ────────────────────────────────────────────────────────

// Tab1 - filtra por primeiraConsulta (data)
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
    if (!d) return true;
    return getYear(d) === year && months.includes(getMonth(d));
  });
}

/**
 * Tab2 — filtra pacientes de tratamento por quadrimestre.
 *
 * @param dateField  Controla qual coluna é usada para o filtro de período:
 *
 *   "primeiraConsulta"    → DENOMINADOR
 *     • Concluídos: incluídos se primeiraConsulta estiver no quad.
 *     • Pendentes (sem tratamentoConcluido): incluídos se primeiraConsulta
 *       estiver no quad.
 *     Comportamento original — lista todos que iniciaram no período.
 *
 *   "tratamentoConcluido" → NUMERADOR
 *     • Inclui apenas registros cuja data de tratamentoConcluido cai no quad.
 *     • Pendentes (sem tratamentoConcluido) são excluídos, pois ainda não
 *       compõem o numerador.
 */
export function filterTratamentoByQuadrimestre<
  T extends { primeiraConsulta: string; tratamentoConcluido: string }
>(
  patients: T[],
  quad: Quadrimestre,
  dateField: "primeiraConsulta" | "tratamentoConcluido" = "primeiraConsulta"
): T[] {
  if (quad === "todos") return patients;

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  // ── NUMERADOR: filtra exclusivamente pela data de tratamentoConcluido ────────
  if (dateField === "tratamentoConcluido") {
    return patients.filter((p) => {
      const dTrat = parseDate(p.tratamentoConcluido);
      if (!dTrat) return false; // pendente não entra no numerador
      return getYear(dTrat) === year && months.includes(getMonth(dTrat));
    });
  }

  // ── DENOMINADOR (padrão): comportamento original ──────────────────────────
  // Concluídos filtrados por tratamentoConcluido; pendentes por primeiraConsulta.
  return patients.filter((p) => {
    const dTrat = parseDate(p.tratamentoConcluido);
    if (dTrat) {
      // já tem tratamento concluído — filtra pela data de conclusão
      return getYear(dTrat) === year && months.includes(getMonth(dTrat));
    }
    // ainda pendente — filtra pela data da 1ª consulta
    const dCons = parseDate(p.primeiraConsulta);
    if (!dCons) return false;
    return getYear(dCons) === year && months.includes(getMonth(dCons));
  });
}

// Tab3, Tab5, Tab6 - filtra por mesAno (ex: "Janeiro/2025")
export function filterByQuadrimestre<T extends { mesAno: string }>(
  records: T[],
  quad: Quadrimestre
): T[] {
  if (quad === "todos") return records;
  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  return records.filter((r) => {
    const parsed = parseMesAno(r.mesAno);
    if (!parsed) return true;
    return parsed.ano === year && months.includes(parsed.mes);
  });
}

// Tab4 - filtra por primeiraConsulta (reutiliza filterPatientsByQuadrimestre)
export function filterTab4ByQuadrimestre<T extends { primeiraConsulta: string }>(
  patients: T[],
  quad: Quadrimestre
): T[] {
  return filterPatientsByQuadrimestre(patients, quad);
}
