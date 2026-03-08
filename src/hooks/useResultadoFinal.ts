import { useMemo } from "react";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import {
  Quadrimestre,
  filterPatientsByQuadrimestre,
  filterTratamentoByQuadrimestre,
  filterByQuadrimestre,
  filterTab4ByQuadrimestre,
} from "@/hooks/useQuadrimesterFilter";

const isConsultaPendente = (val: string): boolean =>
  !val || val === "-" || val.trim() === "";

const isTratamentoPendente = (val: string): boolean =>
  !val || val === "-" || val.trim() === "";

const isConsultaPendenteTab4 = (val: string): boolean =>
  !val || val === "-" || val.trim() === "";

export type Conceito = "regular" | "suficiente" | "bom" | "otimo" | "none";

export interface IndicadorResult {
  indicador: string;
  peso: number;
  porcentagem: number;
  conceito: Conceito;
  nota: number;
  notaFinal: number;
}

export interface EquipeResult {
  equipe: string;
  indicadores: IndicadorResult[];
  notaFinal: number;
}

const CONCEITO_SCORES: Record<Conceito, number> = {
  regular: 0.25,
  suficiente: 0.50,
  bom: 0.75,
  otimo: 1.00,
  none: 0,
};

const getConceitoB1 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 1) return "regular";
  if (pct <= 3) return "suficiente";
  if (pct <= 5) return "bom";
  return "otimo";
};

const getConceitoB2 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 25) return "regular";
  if (pct <= 50) return "suficiente";
  if (pct <= 75) return "bom";
  return "otimo";
};

const getConceitoB3 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct >= 8 && pct <= 10) return "otimo";
  if (pct > 10 && pct < 12) return "bom";
  if (pct >= 12 && pct < 14) return "suficiente";
  return "regular";
};

const getConceitoB4 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 30) return "regular";
  if (pct <= 50) return "suficiente";
  if (pct <= 70) return "bom";
  return "otimo";
};

const getConceitoB5 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 0.25) return "regular";
  if (pct <= 0.5) return "suficiente";
  if (pct <= 1) return "bom";
  return "otimo";
};

const getConceitoB6 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 3) return "regular";
  if (pct <= 6) return "suficiente";
  if (pct <= 8) return "bom";
  return "otimo";
};

const INDICADORES = [
  { key: "B1", label: "1ª Consulta Odontológica", peso: 2, getConceito: getConceitoB1 },
  { key: "B2", label: "Tratamento Concluído", peso: 2, getConceito: getConceitoB2 },
  { key: "B3", label: "Taxa de Exodontias", peso: 2, getConceito: getConceitoB3 },
  { key: "B4", label: "Proced. Odont. Preventivos", peso: 2, getConceito: getConceitoB4 },
  { key: "B5", label: "Escovação Supervisionada", peso: 1, getConceito: getConceitoB5 },
  { key: "B6", label: "Trat. Restaurador Atraumático", peso: 1, getConceito: getConceitoB6 },
];

function buildIndicador(key: string, porcentagem: number): IndicadorResult {
  const config = INDICADORES.find((i) => i.key === key)!;
  const conceito = config.getConceito(porcentagem);
  const nota = CONCEITO_SCORES[conceito];
  return {
    indicador: config.label,
    peso: config.peso,
    porcentagem,
    conceito,
    nota,
    notaFinal: nota * config.peso,
  };
}

function getAllEquipes(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[]
): string[] {
  const set = new Set<string>();
  patients.forEach((p) => p.equipe && set.add(p.equipe));
  tratamento.forEach((p) => p.equipe && set.add(p.equipe));
  tab3.forEach((r) => set.add(r.equipe));
  tab4.forEach((p) => p.equipe && set.add(p.equipe));
  tab5.forEach((r) => set.add(r.equipe));
  tab6.forEach((r) => set.add(r.equipe));
  return Array.from(set).sort();
}

function avgMonthlyPct(
  records: { porcentagem: number; mesAno: string }[],
  equipe?: string
): number {
  const filtered = equipe
    ? records.filter((r) => (r as any).equipe === equipe)
    : records;
  if (filtered.length === 0) return 0;

  const byMonth = new Map<string, number[]>();
  filtered.forEach((r) => {
    const arr = byMonth.get(r.mesAno) || [];
    arr.push(r.porcentagem);
    byMonth.set(r.mesAno, arr);
  });

  const monthAvgs = Array.from(byMonth.values()).map(
    (arr) => arr.reduce((s, v) => s + v, 0) / arr.length
  );
  return monthAvgs.reduce((s, v) => s + v, 0) / monthAvgs.length;
}

export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[],
  quad: Quadrimestre = "todos"
) {
  return useMemo(() => {
    // Dados filtrados pelo período (numerador)
    const fPatients   = filterPatientsByQuadrimestre(patients, quad);
    const fTratamento = filterTratamentoByQuadrimestre(tratamento, quad);
    const fTab3       = filterByQuadrimestre(tab3, quad);
    const fTab4       = filterTab4ByQuadrimestre(tab4, quad);
    const fTab5       = filterByQuadrimestre(tab5, quad);
    const fTab6       = filterByQuadrimestre(tab6, quad);

    const equipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);

    // Por equipe
    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const eqPatientsTotal    = patients.filter((p) => p.equipe === equipe);
      const eqPatientsFiltered = fPatients.filter((p) => p.equipe === equipe);
      const totalB1 = eqPatientsTotal.length;
      const withB1  = eqPatientsFiltered.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
      const pctB1   = totalB1 > 0 ? (withB1 / totalB1) * 100 : 0;

      const eqTratTotal    = tratamento.filter((p) => p.equipe === equipe);
      const eqTratFiltered = fTratamento.filter((p) => p.equipe === equipe);
      const totalB2 = eqTratTotal.length;
      const withTrat = eqTratFiltered.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
      const pctB2   = totalB2 > 0 ? (withTrat / totalB2) * 100 : 0;

      const pctB3 = avgMonthlyPct(fTab3, equipe);
      const pctB4 = avgMonthlyPct(fTab5, equipe);
      const pctB6 = avgMonthlyPct(fTab6, equipe);

      const eqTab4Total    = tab4.filter((p) => p.equipe === equipe);
      const eqTab4Filtered = fTab4.filter((p) => p.equipe === equipe);
      const totalB5 = eqTab4Total.length;
      const withB5  = eqTab4Filtered.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
      const pctB5   = totalB5 > 0 ? (withB5 / totalB5) * 100 : 0;

      const indicadores = [
        buildIndicador("B1", pctB1),
        buildIndicador("B2", pctB2),
        buildIndicador("B3", pctB3),
        buildIndicador("B4", pctB4),
        buildIndicador("B5", pctB5),
        buildIndicador("B6", pctB6),
      ];
      const notaFinal = indicadores.reduce((s, i) => s + i.notaFinal, 0);
      return { equipe, indicadores, notaFinal };
    });

    // Geral — denominador fixo (total cadastrado), numerador filtrado pelo período
    const totalPatients = patients.length;
    const withConsulta  = fPatients.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
    const pctB1 = totalPatients > 0 ? (withConsulta / totalPatients) * 100 : 0;

    const totalTrat = tratamento.length;
    const withTrat  = fTratamento.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
    const pctB2 = totalTrat > 0 ? (withTrat / totalTrat) * 100 : 0;

    const pctB3 = avgMonthlyPct(fTab3);
    const pctB4 = avgMonthlyPct(fTab5);
    const pctB6 = avgMonthlyPct(fTab6);

    const totalTab4 = tab4.length;
    const withTab4  = fTab4.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
    const pctB5 = totalTab4 > 0 ? (withTab4 / totalTab4) * 100 : 0;

    const geralIndicadores = [
      buildIndicador("B1", pctB1),
      buildIndicador("B2", pctB2),
      buildIndicador("B3", pctB3),
      buildIndicador("B4", pctB4),
      buildIndicador("B5", pctB5),
      buildIndicador("B6", pctB6),
    ];
    const geralNotaFinal = geralIndicadores.reduce((s, i) => s + i.notaFinal, 0);

    const geral: EquipeResult = {
      equipe: "Geral",
      indicadores: geralIndicadores,
      notaFinal: geralNotaFinal,
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad]);
}
