import { useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterTratamentoByQuadrimestre } from "./useQuadrimesterFilter";

const parseTratamentoDate = (tratamento: string): Date | null => {
  if (!tratamento || tratamento === "-" || tratamento.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(tratamento.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

export const isTratamentoPendente = (tratamentoConcluido: string): boolean => {
  if (!tratamentoConcluido || tratamentoConcluido === "-" || tratamentoConcluido.trim() === "") return true;
  const tratamentoDate = parseTratamentoDate(tratamentoConcluido);
  if (!tratamentoDate) return true;
  return differenceInYears(new Date(), tratamentoDate) >= 1;
};

// Usa o campo real da planilha para determinar se está concluído
export const isTratamentoConcluido = (comTratamentoConcluido: string): boolean => {
  const val = (comTratamentoConcluido || "").trim().toUpperCase();
  return val === "SIM" || val === "S" || val === "1" || val === "TRUE";
};

export const useFilteredTratamento = (patients: TratamentoPatient[], filters: FilterState) => {
  return useMemo(() => {
    let filtered = filterTratamentoByQuadrimestre(patients, filters.quadrimestre);
    return filtered.filter((patient) => {
      const matchesEquipe = filters.equipe === "all" || patient.equipe === filters.equipe;
      const matchesMicroarea = filters.microarea === "all" || patient.microarea === filters.microarea;

      // Filtro de status usa o campo real da planilha
      const concluido = isTratamentoConcluido(patient.comTratamentoConcluido);
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "concluido" && concluido) ||
        (filters.status === "pendente" && !concluido);

      return matchesEquipe && matchesMicroarea && matchesStatus;
    });
  }, [patients, filters]);
};
