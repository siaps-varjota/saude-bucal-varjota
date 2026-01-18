import { useMemo } from "react";
import { Tab6Patient } from "./useTab6Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const isConsultaPendenteTab6 = (consulta: string): boolean => {
  return !consulta || consulta === "-" || consulta.trim() === "";
};

export const useFilteredTab6 = (patients: Tab6Patient[], filters: FilterState): Tab6Patient[] => {
  return useMemo(() => {
    return patients.filter((patient) => {
      if (filters.equipe !== "all" && patient.equipe !== filters.equipe) {
        return false;
      }
      if (filters.microarea !== "all" && patient.microarea !== filters.microarea) {
        return false;
      }
      if (filters.status !== "all") {
        const isPendente = isConsultaPendenteTab6(patient.primeiraConsulta);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }
      return true;
    });
  }, [patients, filters]);
};
