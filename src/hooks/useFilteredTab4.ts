import { useMemo } from "react";
import { Tab4Patient } from "./useTab4Data";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterTab4ByQuadrimestre } from "./useQuadrimesterFilter";
import { dateToMMYYYY, matchesMesReferencia } from "@/lib/mesReferenciaUtils";

export const isConsultaPendenteTab4 = (consulta: string): boolean => {
  return !consulta || consulta === "-" || consulta.trim() === "";
};

export const useFilteredTab4 = (patients: Tab4Patient[], filters: FilterState): Tab4Patient[] => {
  return useMemo(() => {
    let filtered = filterTab4ByQuadrimestre(patients, filters.quadrimestres);
    return filtered.filter((patient) => {
      if (filters.equipes.length > 0 && !filters.equipes.includes(patient.equipe)) return false;
      if (filters.microareas.length > 0 && !filters.microareas.includes(patient.microarea)) return false;
      if (filters.status !== "all") {
        const isPendente = isConsultaPendenteTab4(patient.primeiraConsulta);
        if (filters.status === "pendente" && !isPendente) return false;
        if (filters.status === "concluido" && isPendente) return false;
      }

      const selected = filters.mesReferencia || [];
      if (selected.length > 0) {
        const mmyyyy = dateToMMYYYY(patient.primeiraConsulta);
        const hasNo = !patient.primeiraConsulta || patient.primeiraConsulta === "-" || patient.primeiraConsulta.trim() === "";
        if (!hasNo && !matchesMesReferencia(mmyyyy, selected)) return false;
      }

      return true;
    });
  }, [patients, filters]);
};
