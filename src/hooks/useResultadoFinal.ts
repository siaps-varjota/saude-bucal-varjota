import { useMemo } from "react";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
import { isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { isConsultaPendenteTab4 } from "@/hooks/useFilteredTab4";

export type Conceito = "regular" | "suficiente" | "bom" | "otimo" | "none";

export interface IndicadorResult {
  indicador: string;
  peso: number;
  porcentagem: number;
  conceito: Conceito;
  nota: number; // conceito score
  notaFinal: number; // nota * peso
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

// B1 - 1ª Consulta: Regular (≤1%), Suficiente (>1% e ≤3%), Bom (>3% e ≤5%), Ótimo (>5%)
const getConceitoB1 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 1) return "regular";
  if (pct <= 3) return "suficiente";
  if (pct <= 5) return "bom";
  return "otimo";
};

// B2 - Tratamento: Regular (≤25%), Suficiente (>25% e ≤50%), Bom (>50% e ≤75%), Ótimo (>75%)
const getConceitoB2 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 25) return "regular";
  if (pct <= 50) return "suficiente";
  if (pct <= 75) return "bom";
  return "otimo";
};

// B3 - Taxa Exodontias: Ótimo (8%-10%), Bom (10%-12%), Suficiente (12%-14%), Regular (<8% ou ≥14%)
const getConceitoB3 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct >= 8 && pct <= 10) return "otimo";
  if (pct > 10 && pct < 12) return "bom";
  if (pct >= 12 && pct < 14) return "suficiente";
  return "regular";
};

// B4 - Proced. Preventivos: Regular (≤30%), Suficiente (>30% e ≤50%), Bom (>50% e ≤70%), Ótimo (>70%)
const getConceitoB4 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 30) return "regular";
  if (pct <= 50) return "suficiente";
  if (pct <= 70) return "bom";
  return "otimo";
};

// B5 - Escovação: Regular (≤0.25%), Suficiente (>0.25% e ≤0.5%), Bom (>0.5% e ≤1%), Ótimo (>1%)
const getConceitoB5 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 0.25) return "regular";
  if (pct <= 0.5) return "suficiente";
  if (pct <= 1) return "bom";
  return "otimo";
};

// B6 - TRA: Regular (≤3%), Suficiente (>3% e ≤6%), Bom (>6% e ≤8%), Ótimo (>8%)
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

function buildIndicador(
  key: string,
  porcentagem: number
): IndicadorResult {
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

// Get all unique equipes across all data sources
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

// Calculate average monthly percentage for aggregated tabs (3, 5, 6)
function avgMonthlyPct(records: { porcentagem: number; mesAno: string }[], equipe?: string): number {
  const filtered = equipe ? records.filter((r) => (r as any).equipe === equipe) : records;
  if (filtered.length === 0) return 0;

  // Group by month, average the percentages per month, then average across months
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

function calcEquipeIndicadores(
  equipe: string,
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[]
): IndicadorResult[] {
  // B1: % com 1ª consulta
  const eqPatients = patients.filter((p) => p.equipe === equipe);
  const totalB1 = eqPatients.length;
  const withB1 = eqPatients.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
  const pctB1 = totalB1 > 0 ? (withB1 / totalB1) * 100 : 0;

  // B2: % tratamento concluído / 1ª consulta
  const eqTratamento = tratamento.filter((p) => p.equipe === equipe);
  const totalWithConsulta = eqTratamento.length;
  const withTrat = eqTratamento.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
  const pctB2 = totalWithConsulta > 0 ? (withTrat / totalWithConsulta) * 100 : 0;

  // B3: média mensal taxa exodontias
  const pctB3 = avgMonthlyPct(tab3, equipe);

  // B4: média mensal preventivos
  const pctB4 = avgMonthlyPct(tab5, equipe);

  // B5: % escovação supervisionada
  const eqTab4 = tab4.filter((p) => p.equipe === equipe);
  const totalB5 = eqTab4.length;
  const withB5 = eqTab4.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
  const pctB5 = totalB5 > 0 ? (withB5 / totalB5) * 100 : 0;

  // B6: média mensal TRA
  const pctB6 = avgMonthlyPct(tab6, equipe);

  return [
    buildIndicador("B1", pctB1),
    buildIndicador("B2", pctB2),
    buildIndicador("B3", pctB3),
    buildIndicador("B4", pctB4),
    buildIndicador("B5", pctB5),
    buildIndicador("B6", pctB6),
  ];
}

export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[]
) {
  return useMemo(() => {
    const equipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);

    // Per team
    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const indicadores = calcEquipeIndicadores(equipe, patients, tratamento, tab3, tab4, tab5, tab6);
      const notaFinal = indicadores.reduce((s, i) => s + i.notaFinal, 0);
      return { equipe, indicadores, notaFinal };
    });

    // Geral (all data)
    const totalPatients = patients.length;
    const withConsulta = patients.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
    const pctB1 = totalPatients > 0 ? (withConsulta / totalPatients) * 100 : 0;

    const totalTrat = tratamento.length;
    const withTrat = tratamento.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
    const pctB2 = totalTrat > 0 ? (withTrat / totalTrat) * 100 : 0;

    const pctB3 = avgMonthlyPct(tab3);
    const pctB4 = avgMonthlyPct(tab5);

    const totalTab4 = tab4.length;
    const withTab4 = tab4.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
    const pctB5 = totalTab4 > 0 ? (withTab4 / totalTab4) * 100 : 0;

    const pctB6 = avgMonthlyPct(tab6);

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
  }, [patients, tratamento, tab3, tab4, tab5, tab6]);
}
