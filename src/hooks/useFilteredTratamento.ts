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

export const useFilteredTratamento = (patients: TratamentoPatient[], filters: FilterState) => {
  return useMemo(() => {
    const selected = filters.mesReferencia || [];

    // ── Etapa 1: filtro de equipe + microarea (sempre aplicado) ──────────────
    const byEquipeMicroarea = patients.filter((patient) => {
      const matchesEquipe    = filters.equipes.length === 0    || filters.equipes.includes(patient.equipe);
      const matchesMicroarea = filters.microareas.length === 0 || filters.microareas.includes(patient.microarea);
      return matchesEquipe && matchesMicroarea;
    });

    // ── Etapa 2: filtro de período ─────────────────────────────────────────
    // Quando mesReferencia está ativo, o DENOMINADOR é primeiraConsulta no(s)
    // mês(es) selecionado(s) — idêntico ao TratamentoMetaCard.
    // Quando não está, usa o filtro de quadrimestre normal (por primeiraConsulta).
    let denominadorBase: TratamentoPatient[];
    if (selected.length > 0) {
      denominadorBase = byEquipeMicroarea.filter((p) => {
        const hasNoConsulta =
          !p.primeiraConsulta ||
          p.primeiraConsulta === "-" ||
          p.primeiraConsulta.trim() === "";
        if (hasNoConsulta) return false;
        const mmyyyy = dateToMMYYYY(p.primeiraConsulta);
        return matchesMesReferencia(mmyyyy, selected);
      });
    } else {
      denominadorBase = filterTratamentoByQuadrimestre(byEquipeMicroarea, filters.quadrimestres);
    }

    // ── Etapa 3: filtro de status ──────────────────────────────────────────
    const filtered = denominadorBase.filter((patient) => {
      const status = (patient.comTratamentoConcluido || "").toUpperCase().trim();
      const matchesStatus =
        filters.status === "all" ||
        status === filters.status.toUpperCase().trim();

      // Filtro Mês de Referência — aplica ao NUMERADOR pela data de tratamentoConcluido
      let matchesMesRef = true;
      if (selected.length > 0) {
        const hasNoTratamento =
          !patient.tratamentoConcluido ||
          patient.tratamentoConcluido === "-" ||
          patient.tratamentoConcluido.trim() === "";
        if (hasNoTratamento) {
          // Sem tratamento: incluir na lista (aparecem como pendentes), mas
          // matchesMesRef = false para não contar no numerador
          matchesMesRef = false;
        } else {
          const mmyyyy = dateToMMYYYY(patient.tratamentoConcluido);
          matchesMesRef = matchesMesReferencia(mmyyyy, selected);
        }
      }

      // Quando há filtro de mês, o status "CONCLUÍDO" só bate se o tratamento
      // também cai no mês — caso contrário vira PENDENTE visualmente.
      // Para o filtro de status específico, respeitamos matchesMesRef.
      if (filters.status !== "all") {
        const isConcluido = status === "CONCLUÍDO";
        if (isConcluido && !matchesMesRef && selected.length > 0) return false;
        return matchesStatus;
      }

      return matchesStatus;
    });

    return filtered;
  }, [patients, filters]);
};
