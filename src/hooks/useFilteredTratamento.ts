import { useMemo } from "react";
import { parse, isValid, differenceInYears } from "date-fns";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { FilterState } from "@/components/dashboard/PatientFilters";
import { filterTratamentoByQuadrimestre } from "./useQuadrimesterFilter";
import { dateToMMYYYY, matchesMesReferencia } from "@/lib/mesReferenciaUtils";

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

/**
 * dateField controla qual coluna é usada no filtro de quadrimestre e mesReferência:
 *  - "primeiraConsulta"  → denominador (padrão, comportamento original)
 *  - "tratamentoConcluido" → numerador
 */
export const useFilteredTratamento = (
  patients: TratamentoPatient[],
  filters: FilterState,
  dateField: "primeiraConsulta" | "tratamentoConcluido" = "primeiraConsulta"
) => {
  return useMemo(() => {
    // Filtro de quadrimestre usando o campo correto conforme contexto
    let filtered = filterTratamentoByQuadrimestre(patients, filters.quadrimestre, dateField);

    return filtered.filter((patient) => {
      const matchesEquipe    = filters.equipe    === "all" || patient.equipe    === filters.equipe;
      const matchesMicroarea = filters.microarea === "all" || patient.microarea === filters.microarea;

      const status = (patient.comTratamentoConcluido || "").toUpperCase().trim();
      const matchesStatus =
        filters.status === "all" ||
        status === filters.status.toUpperCase().trim();

      // Filtro Mês de Referência — usa o campo correto conforme contexto
      const selected = filters.mesReferencia || [];
      let matchesMesRef = true;
      if (selected.length > 0) {
        const dateValue = patient[dateField];
        const hasNoDate =
          !dateValue || dateValue === "-" || dateValue.trim() === "";
        const mmyyyy = dateToMMYYYY(dateValue);
        matchesMesRef = hasNoDate || matchesMesReferencia(mmyyyy, selected);
      }

      return matchesEquipe && matchesMicroarea && matchesStatus && matchesMesRef;
    });
  }, [patients, filters, dateField]);
};
