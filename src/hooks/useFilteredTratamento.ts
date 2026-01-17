import { useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { FilterState } from "@/components/dashboard/PatientFilters";

const parseTratamentoDate = (tratamento: string): Date | null => {
  if (!tratamento || tratamento === "-" || tratamento.trim() === "") return null;
  
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(tratamento.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

export const isTratamentoPendente = (tratamentoConcluido: string): boolean => {
  if (!tratamentoConcluido || tratamentoConcluido === "-" || tratamentoConcluido.trim() === "") {
    return true;
  }
  
  const tratamentoDate = parseTratamentoDate(tratamentoConcluido);
  if (!tratamentoDate) return true;
  
  const yearsAgo = differenceInYears(new Date(), tratamentoDate);
  return yearsAgo >= 1;
};

export const useFilteredTratamento = (patients: TratamentoPatient[], filters: FilterState) => {
  return useMemo(() => {
    return patients.filter((patient) => {
      // Equipe filter
      const matchesEquipe = filters.equipe === "all" || patient.equipe === filters.equipe;
      
      // Microarea filter
      const matchesMicroarea = filters.microarea === "all" || patient.microarea === filters.microarea;
      
      // Status filter
      const isPendente = isTratamentoPendente(patient.tratamentoConcluido);
      const matchesStatus = 
        filters.status === "all" || 
        (filters.status === "pendente" && isPendente) ||
        (filters.status === "concluido" && !isPendente);
      
      return matchesEquipe && matchesMicroarea && matchesStatus;
    });
  }, [patients, filters]);
};
