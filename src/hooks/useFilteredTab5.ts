import { useMemo } from "react";
import { Tab5Patient } from "./useTab5Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const isConsultaPendenteTab5 = (consulta: string): boolean => {
  return !consulta || consulta === "-" || consulta.trim() === "";
};

export const useFilteredTab5 = (patients: Tab5Patient[], filters: FilterState): Tab5Patient[] => {
  return useMemo(() => {
    return patients.filter((patient) => {
      if (filters.equipe !== "all" && patient.equipe !== filters.equipe) {
        return false;
      }
      if (filters.microarea !== "all" && patient.microarea !== filters.microarea) {
        return false;
      }
      if (filters.status !== "all") {
        const isPendente = isConsultaPendenteTab5(patient.primeiraConsulta);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }
      return true;
    });
  }, [patients, filters]);
};
