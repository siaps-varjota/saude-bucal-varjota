import { useMemo } from "react";
import { Tab3Patient } from "./useTab3Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const isExodontiaPendente = (numeradorB3: string): boolean => {
  return numeradorB3 === "NÃO" || numeradorB3 === "" || !numeradorB3;
};

export const useFilteredTab3 = (patients: Tab3Patient[], filters: FilterState): Tab3Patient[] => {
  return useMemo(() => {
    return patients.filter((patient) => {
      if (filters.equipe !== "all" && patient.equipe !== filters.equipe) {
        return false;
      }
      if (filters.microarea !== "all" && patient.microarea !== filters.microarea) {
        return false;
      }
      if (filters.status !== "all") {
        const isPendente = isExodontiaPendente(patient.numeradorB3);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }
      return true;
    });
  }, [patients, filters]);
};
