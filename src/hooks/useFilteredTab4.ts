import { useMemo } from "react";
import { Tab4Patient } from "./useTab4Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const isConsultaPendenteTab4 = (consulta: string): boolean => {
  return !consulta || consulta === "-" || consulta.trim() === "";
};

export const useFilteredTab4 = (patients: Tab4Patient[], filters: FilterState): Tab4Patient[] => {
  return useMemo(() => {
    return patients.filter((patient) => {
      if (filters.equipe !== "all" && patient.equipe !== filters.equipe) {
        return false;
      }
      if (filters.microarea !== "all" && patient.microarea !== filters.microarea) {
        return false;
      }
      if (filters.status !== "all") {
        const isPendente = isConsultaPendenteTab4(patient.primeiraConsulta);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }
      return true;
    });
  }, [patients, filters]);
};
