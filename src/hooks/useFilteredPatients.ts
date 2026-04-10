import { useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterPatientsByQuadrimestre } from "./useQuadrimesterFilter";
import { dateToMMYYYY, matchesMesReferencia } from "@/lib/mesReferenciaUtils";

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(consulta.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

export const isConsultaPendente = (primeiraConsulta: string): boolean => {
  if (!primeiraConsulta || primeiraConsulta === "-" || primeiraConsulta.trim() === "") return true;
  const consultaDate = parseConsultaDate(primeiraConsulta);
  if (!consultaDate) return true;
  return differenceInYears(new Date(), consultaDate) >= 1;
};

export const useFilteredPatients = (patients: Patient[], filters: FilterState) => {
  return useMemo(() => {
    let filtered = filterPatientsByQuadrimestre(patients, filters.quadrimestre);
    return filtered.filter((patient) => {
      const matchesEquipe = filters.equipe === "all" || patient.equipe === filters.equipe;
      const matchesMicroarea = filters.microarea === "all" || patient.microarea === filters.microarea;
      const isPendente = isConsultaPendente(patient.primeiraConsulta);
      const matchesStatus = 
        filters.status === "all" || 
        (filters.status === "pendente" && isPendente) ||
        (filters.status === "concluido" && !isPendente);

      const selected = filters.mesReferencia || [];
      let matchesMesRef = true;
      if (selected.length > 0) {
        const mmyyyy = dateToMMYYYY(patient.primeiraConsulta);
        const hasNoConsulta = !patient.primeiraConsulta || patient.primeiraConsulta === "-" || patient.primeiraConsulta.trim() === "";
        matchesMesRef = hasNoConsulta || matchesMesReferencia(mmyyyy, selected);
      }

      return matchesEquipe && matchesMicroarea && matchesStatus && matchesMesRef;
    });
  }, [patients, filters]);
};
