import { useMemo } from "react";
import { Tab6Patient } from "./useTab6Data";
import { FilterState } from "@/components/dashboard/PatientFilters";

export const isTRAPendente = (teveTRA: string): boolean => {
  return teveTRA !== "SIM";
};

export const useFilteredTab6 = (patients: Tab6Patient[], filters: FilterState): Tab6Patient[] => {
  return useMemo(() => {
    return patients.filter((patient) => {
      if (filters.equipe !== "all" && patient.equipe !== filters.equipe) {
        return false;
      }
      if (filters.status !== "all") {
        const isPendente = isTRAPendente(patient.teveTRA);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }
      return true;
    });
  }, [patients, filters]);
};
