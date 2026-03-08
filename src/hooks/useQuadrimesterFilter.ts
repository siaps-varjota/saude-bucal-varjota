import { useMemo } from "react";
import { Patient } from "./usePatientData";
import { TratamentoPatient } from "./useTratamentoData";
import { Tab3Record } from "./useTab3Data";
import { Tab4Patient } from "./useTab4Data";
import { Tab5Record } from "./useTab5Data";
import { Tab6Record } from "./useTab6Data";
export type Quadrimestre = "todos" | "Q1" | "Q2" | "Q3";
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
function getMonthFromMesAno(mesAno: string): number | null {
  const parts = mesAno.split("/");
  const monthName = parts[0]?.toLowerCase().trim();
  return MONTH_NAME_TO_NUM[monthName] ?? null;
}
function getMonthFromDateStr(dateStr: string): number | null {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const parts = dateStr.split("/");
  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    if (month >= 1 && month <= 12) return month;
  }
  return null;
}
function isInQuadrimestre(month: number | null, quad: Quadrimestre): boolean {
  if (quad === "todos" || month === null) return true;
  return QUAD_MONTHS[quad]?.includes(month) ?? false;
}
export function filterByQuadrimestre<T extends { mesAno: string }>(
  records: T[],
  quad: Quadrimestre
): T[] {
  if (quad === "todos") return records;
  return records.filter((r) => {
    const month = getMonthFromMesAno(r.mesAno);
    return month !== null && QUAD_MONTHS[quad]?.includes(month);
  });
}
export function filterPatientsByQuadrimestre(
  patients: Patient[],
  quad: Quadrimestre
): Patient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const month = getMonthFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(month, quad);
  });
}
export function filterTratamentoByQuadrimestre(
  patients: TratamentoPatient[],
  quad: Quadrimestre
): TratamentoPatient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const month = getMonthFromDateStr(p.tratamentoConcluido) ?? getMonthFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(month, quad);
  });
}
export function filterTab4ByQuadrimestre(
  patients: Tab4Patient[],
  quad: Quadrimestre
): Tab4Patient[] {
  if (quad === "todos") return patients;
  return patients.filter((p) => {
    const month = getMonthFromDateStr(p.primeiraConsulta);
    return isInQuadrimestre(month, quad);
  });
}
const ANO_ATUAL = new Date().getFullYear();
const ANO_PASSADO = ANO_ATUAL - 1;

export const QUADRIMESTRE_OPTIONS = [
  { value: "todos" as Quadrimestre, label: "Todos os Quadrimestres" },
  { value: "Q1" as Quadrimestre, label: `1º Quadrimestre (Jan–Abr/${ANO_ATUAL})` },
  { value: "Q2" as Quadrimestre, label: `2º Quadrimestre (Mai–Ago/${ANO_ATUAL})` },
  { value: "Q3" as Quadrimestre, label: `3º Quadrimestre (Set–Dez/${ANO_ATUAL})` },
  { value: "Q1" as Quadrimestre, label: `1º Quadrimestre (Jan–Abr/${ANO_PASSADO})` },
  { value: "Q2" as Quadrimestre, label: `2º Quadrimestre (Mai–Ago/${ANO_PASSADO})` },
  { value: "Q3" as Quadrimestre, label: `3º Quadrimestre (Set–Dez/${ANO_PASSADO})` },
];
