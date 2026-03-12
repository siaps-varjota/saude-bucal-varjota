import { Patient } from "./usePatientData";
import { TratamentoPatient } from "./useTratamentoData";
import { Tab4Patient } from "./useTab4Data";

export type Quadrimestre = "todos" | `Q1-${number}` | `Q2-${number}` | `Q3-${number}`;

const QUAD_MONTHS: Record<string, number[]> = {
  Q1: [1, 2, 3, 4],
  Q2: [5, 6, 7, 8],
  Q3: [9, 10, 11, 12],
};

const MONTH_NAME_TO_NUM: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, abril: 4,
  maio: 5, junho: 6, julho: 7, agosto: 8,
  setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

// Extrai mês e ano de "janeiro/2026"
function getMonthYearFromMesAno(mesAno: string): { month: number; year: number } | null {
  const parts = mesAno.split("/");
  const monthName = parts[0]?.toLowerCase().trim();
  const year = parseInt(parts[1], 10);
  const month = MONTH_NAME_TO_NUM[monthName];
  if (!month || isNaN(year)) return null;
  return { month, year };
}

// Extrai mês e ano de "dd/mm/yyyy"
function getMonthYearFromDateStr(dateStr: string): { month: number; year: number } | null {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const parts = dateStr.split("/");
  if (parts.length >= 3) {
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (month >= 1 && month <= 12 && year > 0) return { month, year };
  }
  return null;
}

function isInQuadrimestre(
  data: { month: number; year: number } | null,
  quad: Quadrimestre
): boolean {
  if (quad === "todos" || data === null) return true;
  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  return data.year === year && (QUAD_MONTHS[q]?.includes(data.month) ?? false);
}

export function filterByQuadrimestre<T extends { mesAno: string }>(
  records: T[],
  quad: Quadrimestre
): T[] {
  if (quad === "todos") return records;
  return records.filter((r) => {
    const data = getMonthYearFromMesAno(r.mesAno);
    return isInQuadrimestre(data, quad);
  });
}

export function filterPatientsByQuadrimestre(
  patients: Patient[],
  quad: Quadrimestre
): Patient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const data = getMonthYearFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(data, quad);
  });
}

export function filterTratamentoByQuadrimestre(
  patients: TratamentoPatient[],
  quad: Quadrimestre
): TratamentoPatient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const data =
      getMonthYearFromDateStr(p.tratamentoConcluido) ??
      getMonthYearFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(data, quad);
  });
}

export function filterTab4ByQuadrimestre(
  patients: Tab4Patient[],
  quad: Quadrimestre
): Tab4Patient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const data = getMonthYearFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(data, quad);
  });
}

const ANO_ATUAL = new Date().getFullYear();
const ANO_PASSADO = ANO_ATUAL - 1;

export function getCurrentQuadrimestre(): Quadrimestre {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 4) return `Q1-${ANO_ATUAL}`;
  if (month >= 5 && month <= 8) return `Q2-${ANO_ATUAL}`;
  return `Q3-${ANO_ATUAL}`;
}

export const QUADRIMESTRE_ATUAL = getCurrentQuadrimestre();

export const QUADRIMESTRE_OPTIONS = [
  { value: "todos" as Quadrimestre, label: "Todos os Quadrimestres" },
  { value: `Q1-${ANO_ATUAL}` as Quadrimestre, label: `1º Quadrimestre (Jan–Abr/${ANO_ATUAL})` },
  { value: `Q2-${ANO_ATUAL}` as Quadrimestre, label: `2º Quadrimestre (Mai–Ago/${ANO_ATUAL})` },
  { value: `Q3-${ANO_ATUAL}` as Quadrimestre, label: `3º Quadrimestre (Set–Dez/${ANO_ATUAL})` },
  { value: `Q1-${ANO_PASSADO}` as Quadrimestre, label: `1º Quadrimestre (Jan–Abr/${ANO_PASSADO})` },
  { value: `Q2-${ANO_PASSADO}` as Quadrimestre, label: `2º Quadrimestre (Mai–Ago/${ANO_PASSADO})` },
  { value: `Q3-${ANO_PASSADO}` as Quadrimestre, label: `3º Quadrimestre (Set–Dez/${ANO_PASSADO})` },
];

export const QUADRIMESTRE_OPTIONS_SEM_TODOS = QUADRIMESTRE_OPTIONS.filter(opt => opt.value !== "todos");
