import { useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { FilterState } from "@/components/dashboard/PatientFilters";

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(consulta.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

export const isConsultaPendente = (primeiraConsulta: string): boolean => {
  if (!primeiraConsulta || primeiraConsulta === "-" || primeiraConsulta.trim() === "") {
    return true;
  }
  
  const consultaDate = parseConsultaDate(primeiraConsulta);
  if (!consultaDate) return true;
  
  const yearsAgo = differenceInYears(new Date(), consultaDate);
  return yearsAgo >= 1;
};

export const useFilteredPatients = (patients: Patient[], filters: FilterState) => {
  return useMemo(() => {
    return patients.filter((patient) => {
      // Equipe filter
      const matchesEquipe = filters.equipe === "all" || patient.equipe === filters.equipe;
      
      // Microarea filter
      const matchesMicroarea = filters.microarea === "all" || patient.microarea === filters.microarea;
      
      // Status filter
      const isPendente = isConsultaPendente(patient.primeiraConsulta);
      const matchesStatus = 
        filters.status === "all" || 
        (filters.status === "pendente" && isPendente) ||
        (filters.status === "concluido" && !isPendente);
      
      return matchesEquipe && matchesMicroarea && matchesStatus;
    });
  }, [patients, filters]);
};
