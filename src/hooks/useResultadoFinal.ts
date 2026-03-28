import { useMemo } from "react";
import { parse, isValid, getMonth, getYear } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";

const parseDate = (val: string): Date | null => {
  if (!val || val === "-" || val.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(val.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

const QUAD_MONTHS: Record<string, number[]> = {
  Q1: [0, 1, 2, 3],
  Q2: [4, 5, 6, 7],
  Q3: [8, 9, 10, 11],
};

const MONTH_NAME_TO_NUM: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type Conceito = "regular" | "suficiente" | "bom" | "otimo" | "none";

export interface MesDetalhe {
  mes: string;
  numerador: number;
  denominador: number;
  porcentagem: number;
}

export interface IndicadorResult {
  indicador: string;
  peso: number;
  numerador: number;
  denominador: number;
  porcentagem: number;
  conceito: Conceito;
  nota: number;
  notaFinal: number;
  mesesDetalhe: MesDetalhe[];
}

export interface EquipeResult {
  equipe: string;
  indicadores: IndicadorResult[];
  notaFinal: number;
}

const CONCEITO_SCORES: Record<Conceito, number> = {
  regular: 0.25, suficiente: 0.50, bom: 0.75, otimo: 1.00, none: 0,
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
  if (pct >= 80 && pct <= 85) return "otimo";
  if (pct >= 60 && pct < 80)  return "bom";
  if (pct >= 40 && pct < 60)  return "suficiente";
  return "regular";
};

const getConceitoB5 = (pct: number): Conceito => {
  if (pct <= 0)   return "none";
  if (pct > 1)    return "otimo";
  if (pct > 0.5)  return "bom";
  if (pct > 0.25) return "suficiente";
  return "regular";
};

const getConceitoB6 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct > 8) return "otimo";
  if (pct > 6) return "bom";
  if (pct > 3) return "suficiente";
  return "regular";
};

const INDICADORES = [
  { key: "B1", label: "1ª Consulta Odontológica",     peso: 2, getConceito: getConceitoB1 },
  { key: "B2", label: "Tratamento Concluído",          peso: 2, getConceito: getConceitoB2 },
  { key: "B3", label: "Taxa de Exodontias",            peso: 2, getConceito: getConceitoB3 },
  { key: "B4", label: "Proced. Odont. Preventivos",    peso: 2, getConceito: getConceitoB4 },
  { key: "B5", label: "Escovação Supervisionada",      peso: 1, getConceito: getConceitoB5 },
  { key: "B6", label: "Trat. Restaurador Atraumático", peso: 1, getConceito: getConceitoB6 },
];

interface RawCalc {
  numerador: number;
  denominador: number;
  porcentagem: number;
  mesesDetalhe: MesDetalhe[];
}

function buildIndicador(key: string, raw: RawCalc): IndicadorResult {
  const config = INDICADORES.find((i) => i.key === key)!;
  const conceito = config.getConceito(raw.porcentagem);
  const nota = CONCEITO_SCORES[conceito];
  return {
    indicador: config.label,
    peso: config.peso,
    numerador: Math.round(raw.numerador),
    denominador: Math.round(raw.denominador),
    porcentagem: raw.porcentagem,
    conceito,
    nota,
    notaFinal: nota * config.peso,
    mesesDetalhe: raw.mesesDetalhe,
  };
}

function getAllEquipes(
  patients: Patient[], tratamento: TratamentoPatient[], tab3: Tab3Record[],
  tab4: Tab4Patient[], tab5: Tab5Record[], tab6: Tab6Record[]
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

function calcB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  denominadorExterno: number,
  equipe?: string
): RawCalc {
  const source = equipe ? allPatients.filter((p) => p.equipe === equipe) : allPatients;
  if (denominadorExterno === 0) return { numerador: 0, denominador: 0, porcentagem: 0, mesesDetalhe: [] };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const totalConsultas = source.filter(p => parseDate(p.primeiraConsulta)).length;
    return {
      numerador: totalConsultas,
      denominador: denominadorExterno,
      porcentagem: (totalConsultas / denominadorExterno) * 100,
      mesesDetalhe: [],
    };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumNum = 0;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    const count = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
    sumNum += count;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: count,
      denominador: denominadorExterno,
      porcentagem: (count / denominadorExterno) * 100,
    });
  });

  const denominador = denominadorExterno * 4;
  return {
    numerador: sumNum,
    denominador,
    porcentagem: denominador > 0 ? (sumNum / denominador) * 100 : 0,
    mesesDetalhe,
  };
}

function calcB2(tratamento: TratamentoPatient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tratamento.filter((p) => p.equipe === equipe) : tratamento;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    let sumTrat = 0, sumCons = 0;
    const consultaByMonth = new Map<string, number>();
    const tratamentoByMonth = new Map<string, number>();
    source.forEach(p => {
      const dCons = parseDate(p.primeiraConsulta);
      const dTrat = parseDate(p.tratamentoConcluido);
      if (dCons) { const k = `${getMonth(dCons)}-${getYear(dCons)}`; consultaByMonth.set(k, (consultaByMonth.get(k) || 0) + 1); }
      if (dTrat) { const k = `${getMonth(dTrat)}-${getYear(dTrat)}`; tratamentoByMonth.set(k, (tratamentoByMonth.get(k) || 0) + 1); }
    });
    consultaByMonth.forEach((consultas, key) => {
      const tratamentos = tratamentoByMonth.get(key) || 0;
      if (consultas > 0) { sumTrat += tratamentos; sumCons += consultas; }
    });
    return { numerador: sumTrat, denominador: sumCons, porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumTrat = 0, sumCons = 0;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    const mTrat = source.filter(p => { const d = parseDate(p.tratamentoConcluido); return d && getMonth(d) === m && getYear(d) === year; }).length;
    const mCons = source.filter(p => { const d = parseDate(p.primeiraConsulta); return d && getMonth(d) === m && getYear(d) === year; }).length;
    sumTrat += mTrat;
    sumCons += mCons;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: mTrat, denominador: mCons, porcentagem: mCons > 0 ? (mTrat / mCons) * 100 : 0 });
  });

  return { numerador: sumTrat, denominador: sumCons, porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0, mesesDetalhe };
}

function calcB3(tab3: Tab3Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab3.filter((r) => r.equipe === equipe) : tab3;

  if (quad === "todos") {
    let sumExo = 0, sumTot = 0;
    source.forEach(r => { sumExo += r.exodontias; sumTot += r.totalAtendimentos; });
    return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const byMonth = new Map<number, { exodontias: number; total: number }>();
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
    const ano = parseInt(parts[1]);
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    const ex = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
    ex.exodontias += r.exodontias; ex.total += r.totalAtendimentos;
    byMonth.set(mesIdx, ex);
  });

  let sumExo = 0, sumTot = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const data = byMonth.get(m) || { exodontias: 0, total: 0 };
    sumExo += data.exodontias; sumTot += data.total;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.exodontias, denominador: data.total, porcentagem: data.total > 0 ? (data.exodontias / data.total) * 100 : 0 });
  });

  return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0, mesesDetalhe };
}

function calcB4(tab5: Tab5Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab5.filter((r) => r.equipe === equipe) : tab5;

  if (quad === "todos") {
    let sumPrev = 0, sumTot = 0;
    source.forEach(r => { sumPrev += r.preventivos; sumTot += r.totalIndividuais; });
    return { numerador: sumPrev, denominador: sumTot, porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const byMonth = new Map<number, { preventivos: number; total: number }>();
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
    const ano = parseInt(parts[1]);
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    const ex = byMonth.get(mesIdx) || { preventivos: 0, total: 0 };
    ex.preventivos += r.preventivos; ex.total += r.totalIndividuais;
    byMonth.set(mesIdx, ex);
  });

  let sumPrev = 0, sumTot = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const data = byMonth.get(m) || { preventivos: 0, total: 0 };
    sumPrev += data.preventivos; sumTot += data.total;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.preventivos, denominador: data.total, porcentagem: data.total > 0 ? (data.preventivos / data.total) * 100 : 0 });
  });

  return { numerador: sumPrev, denominador: sumTot, porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0, mesesDetalhe };
}

function calcB5(allTab4: Tab4Patient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? allTab4.filter((p) => p.equipe === equipe) : allTab4;
  const totalPatients = source.length;
  if (totalPatients === 0) return { numerador: 0, denominador: 0, porcentagem: 0, mesesDetalhe: [] };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const byMonth = new Map<string, number>();
    source.forEach(p => {
      const d = parseDate(p.primeiraConsulta);
      if (d) { const k = `${getMonth(d)}-${getYear(d)}`; byMonth.set(k, (byMonth.get(k) || 0) + 1); }
    });
    if (byMonth.size === 0) return { numerador: 0, denominador: totalPatients, porcentagem: 0, mesesDetalhe: [] };
    const totalConsultas = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
    return { numerador: totalConsultas, denominador: totalPatients, porcentagem: (totalConsultas / totalPatients) * 100, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumNum = 0;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    const count = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
    sumNum += count;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: count, denominador: totalPatients, porcentagem: totalPatients > 0 ? (count / totalPatients) * 100 : 0 });
  });

  const denominador = totalPatients * 4;
  return {
    numerador: sumNum,
    denominador,
    porcentagem: denominador > 0 ? (sumNum / denominador) * 100 : 0,
    mesesDetalhe,
  };
}

function calcB6(tab6: Tab6Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab6.filter((r) => r.equipe === equipe) : tab6;

  if (quad === "todos") {
    let sumArt = 0, sumTot = 0;
    source.forEach(r => { sumArt += r.exodontias; sumTot += r.totalProcedimentos; });
    return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const byMonth = new Map<number, { exodontias: number; total: number }>();
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
    const ano = parseInt(parts[1]);
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    const ex = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
    ex.exodontias += r.exodontias; ex.total += r.totalProcedimentos;
    byMonth.set(mesIdx, ex);
  });

  let sumArt = 0, sumTot = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const data = byMonth.get(m) || { exodontias: 0, total: 0 };
    sumArt += data.exodontias; sumTot += data.total;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.exodontias, denominador: data.total, porcentagem: data.total > 0 ? (data.exodontias / data.total) * 100 : 0 });
  });

  return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe };
}

// ── hook principal ────────────────────────────────────────────────────────────

export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[],
  quad: Quadrimestre = "todos",
  equipeFilter: string = "all",
  denominadorB1: { porEquipe: Map<string, number>; total: number }
) {
  // chave estável que muda apenas quando o conteúdo do Map muda
  const denomKey = Array.from(denominadorB1.porEquipe.entries())
    .map(([k, v]) => `${k}:${v}`)
    .join("|");

  return useMemo(() => {
    const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
    const equipes = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const denomB1 = denominadorB1.porEquipe.get(equipe) ?? 0;
      const indicadores = [
        buildIndicador("B1", calcB1(patients, quad, denomB1, equipe)),
        buildIndicador("B2", calcB2(tratamento, quad, equipe)),
        buildIndicador("B3", calcB3(tab3, quad, equipe)),
        buildIndicador("B5", calcB5(tab4, quad, equipe)),
        buildIndicador("B4", calcB4(tab5, quad, equipe)),
        buildIndicador("B6", calcB6(tab6, quad, equipe)),
      ];
      return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
    });

    const buildGeral = (eq?: string) => {
      const denomB1 = eq ? (denominadorB1.porEquipe.get(eq) ?? 0) : denominadorB1.total;
      return [
        buildIndicador("B1", calcB1(patients, quad, denomB1, eq)),
        buildIndicador("B2", calcB2(tratamento, quad, eq)),
        buildIndicador("B3", calcB3(tab3, quad, eq)),
        buildIndicador("B5", calcB5(tab4, quad, eq)),
        buildIndicador("B4", calcB4(tab5, quad, eq)),
        buildIndicador("B6", calcB6(tab6, quad, eq)),
      ];
    };

    const geralIndicadores = equipeFilter === "all" ? buildGeral() : buildGeral(equipeFilter);
    const geral: EquipeResult = {
      equipe: equipeFilter === "all" ? "Geral" : equipeFilter,
      indicadores: geralIndicadores,
      notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad, equipeFilter, denominadorB1.total, denomKey]);
};

