import { useMemo } from "react";
import { parse, isValid, getMonth, getYear } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── tipos e constantes ────────────────────────────────────────────────────────

export type Conceito = "regular" | "suficiente" | "bom" | "otimo" | "none";

export interface IndicadorResult {
  indicador: string;
  peso: number;
  numerador: number;
  denominador: number;
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

// Proced. Odont. Preventivos — critérios B5: Ótimo ≥80% e ≤85%, Bom ≥60% e <80%, Suficiente ≥40% e <60%, Regular <40% ou >85%
const getConceitoB4 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct >= 80 && pct <= 85) return "otimo";
  if (pct >= 60 && pct < 80)  return "bom";
  if (pct >= 40 && pct < 60)  return "suficiente";
  return "regular"; // < 40 ou > 85
};

// Escovação Supervisionada — Regular ≤0,25%, Suficiente >0,25% e ≤0,5%, Bom >0,5% e ≤1%, Ótimo >1%
const getConceitoB5 = (pct: number): Conceito => {
  if (pct <= 0)    return "none";
  if (pct > 1)     return "otimo";
  if (pct > 0.5)   return "bom";
  if (pct > 0.25)  return "suficiente";
  return "regular"; // <= 0,25
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

interface RawCalc { numerador: number; denominador: number; porcentagem: number; }

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

// ── Cálculos — agora retornam { numerador, denominador, porcentagem } ─────────

function calcB1(allPatients: Patient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? allPatients.filter((p) => p.equipe === equipe) : allPatients;
  const totalPatients = source.length;
  if (totalPatients === 0) return { numerador: 0, denominador: 0, porcentagem: 0 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const byMonth = new Map<string, number>();
    source.forEach(p => {
      const d = parseDate(p.primeiraConsulta);
      if (d) {
        const key = `${getMonth(d)}-${getYear(d)}`;
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      }
    });
    if (byMonth.size === 0) return { numerador: 0, denominador: totalPatients, porcentagem: 0 };
    const totalConsultas = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
    const mediaConsultas = totalConsultas / byMonth.size;
    return { numerador: mediaConsultas, denominador: totalPatients, porcentagem: (mediaConsultas / totalPatients) * 100 };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let totalConsultas = 0;
  let monthsWithData = 0;

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    monthsWithData++;
    totalConsultas += source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
  });

  const mediaConsultas = monthsWithData > 0 ? totalConsultas / monthsWithData : 0;
  return {
    numerador: totalConsultas,
    denominador: totalPatients,
    porcentagem: monthsWithData > 0 ? (mediaConsultas / totalPatients) * 100 : 0,
  };
}

function calcB2(tratamento: TratamentoPatient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tratamento.filter((p) => p.equipe === equipe) : tratamento;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const consultaByMonth = new Map<string, number>();
    const tratamentoByMonth = new Map<string, number>();
    source.forEach(p => {
      const dCons = parseDate(p.primeiraConsulta);
      const dTrat = parseDate(p.tratamentoConcluido);
      if (dCons) { const k = `${getMonth(dCons)}-${getYear(dCons)}`; consultaByMonth.set(k, (consultaByMonth.get(k) || 0) + 1); }
      if (dTrat) { const k = `${getMonth(dTrat)}-${getYear(dTrat)}`; tratamentoByMonth.set(k, (tratamentoByMonth.get(k) || 0) + 1); }
    });
    let totalTrat = 0, totalCons = 0, months = 0;
    consultaByMonth.forEach((consultas, key) => {
      const tratamentos = tratamentoByMonth.get(key) || 0;
      if (consultas > 0) { totalTrat += tratamentos; totalCons += consultas; months++; }
    });
    const pct = months > 0 ? (totalTrat / totalCons) * 100 : 0;
    return { numerador: totalTrat / (months || 1), denominador: totalCons / (months || 1), porcentagem: pct };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumTrat = 0, sumCons = 0;
  const monthlyPcts: number[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    const mTrat = source.filter(p => { const d = parseDate(p.tratamentoConcluido); return d && getMonth(d) === m && getYear(d) === year; }).length;
    const mCons = source.filter(p => { const d = parseDate(p.primeiraConsulta); return d && getMonth(d) === m && getYear(d) === year; }).length;
    if (mCons > 0) { sumTrat += mTrat; sumCons += mCons; monthlyPcts.push((mTrat / mCons) * 100); }
  });

  // Média mensal dos percentuais — igual à lógica do TratamentoQuadrimesterCards
  const pct = monthlyPcts.length > 0
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length
    : 0;
  return { numerador: sumTrat, denominador: sumCons, porcentagem: pct };
}

function calcB3(tab3: Tab3Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab3.filter((r) => r.equipe === equipe) : tab3;

  if (quad === "todos") {
    const byMonth = new Map<string, { exodontias: number; total: number }>();
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
      const ano = parseInt(parts[1]);
      if (mesIdx === undefined) return;
      const k = `${mesIdx}-${ano}`;
      const ex = byMonth.get(k) || { exodontias: 0, total: 0 };
      ex.exodontias += r.exodontias; ex.total += r.totalAtendimentos;
      byMonth.set(k, ex);
    });
    let sumExo = 0, sumTot = 0;
    byMonth.forEach(({ exodontias, total }) => { sumExo += exodontias; sumTot += total; });
    return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0 };
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
  const monthlyPcts: number[] = [];
  byMonth.forEach(({ exodontias, total }) => {
    if (total > 0) { sumExo += exodontias; sumTot += total; monthlyPcts.push((exodontias / total) * 100); }
  });
  // Média mensal dos percentuais — igual à lógica do Tab3QuadrimesterCards
  const pct = monthlyPcts.length > 0
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length
    : 0;
  return { numerador: sumExo, denominador: sumTot, porcentagem: pct };
}

function calcB4(tab5: Tab5Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab5.filter((r) => r.equipe === equipe) : tab5;

  if (quad === "todos") {
    const byMonth = new Map<string, { preventivos: number; total: number }>();
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
      const ano = parseInt(parts[1]);
      if (mesIdx === undefined) return;
      const k = `${mesIdx}-${ano}`;
      const ex = byMonth.get(k) || { preventivos: 0, total: 0 };
      ex.preventivos += r.preventivos; ex.total += r.totalIndividuais;
      byMonth.set(k, ex);
    });
    let sumPrev = 0, sumTot = 0;
    byMonth.forEach(({ preventivos, total }) => { sumPrev += preventivos; sumTot += total; });
    return { numerador: sumPrev, denominador: sumTot, porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0 };
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
  const monthlyPcts: number[] = [];
  byMonth.forEach(({ preventivos, total }) => {
    if (total > 0) { sumPrev += preventivos; sumTot += total; monthlyPcts.push((preventivos / total) * 100); }
  });
  // Média mensal dos percentuais — igual à lógica do Tab5QuadrimesterCards
  const pct = monthlyPcts.length > 0
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length
    : 0;
  return { numerador: sumPrev, denominador: sumTot, porcentagem: pct };
}

function calcB5(allTab4: Tab4Patient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? allTab4.filter((p) => p.equipe === equipe) : allTab4;
  const totalPatients = source.length;
  if (totalPatients === 0) return { numerador: 0, denominador: 0, porcentagem: 0 };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const byMonth = new Map<string, number>();
    source.forEach(p => {
      const d = parseDate(p.primeiraConsulta);
      if (d) { const k = `${getMonth(d)}-${getYear(d)}`; byMonth.set(k, (byMonth.get(k) || 0) + 1); }
    });
    if (byMonth.size === 0) return { numerador: 0, denominador: totalPatients, porcentagem: 0 };
    const totalConsultas = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
    const media = totalConsultas / byMonth.size;
    return { numerador: media, denominador: totalPatients, porcentagem: (media / totalPatients) * 100 };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let totalConsultas = 0, monthsWithData = 0;

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    monthsWithData++;
    totalConsultas += source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
  });

  const media = monthsWithData > 0 ? totalConsultas / monthsWithData : 0;
  return {
    numerador: totalConsultas,
    denominador: totalPatients,
    porcentagem: monthsWithData > 0 ? (media / totalPatients) * 100 : 0,
  };
}

function calcB6(tab6: Tab6Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab6.filter((r) => r.equipe === equipe) : tab6;

  if (quad === "todos") {
    const byMonth = new Map<string, { exodontias: number; total: number }>();
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
      const ano = parseInt(parts[1]);
      if (mesIdx === undefined) return;
      const k = `${mesIdx}-${ano}`;
      const ex = byMonth.get(k) || { exodontias: 0, total: 0 };
      ex.exodontias += r.exodontias; ex.total += r.totalProcedimentos;
      byMonth.set(k, ex);
    });
    let sumArt = 0, sumTot = 0;
    byMonth.forEach(({ exodontias, total }) => { sumArt += exodontias; sumTot += total; });
    return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0 };
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
  const monthlyPcts: number[] = [];
  byMonth.forEach(({ exodontias, total }) => {
    if (total > 0) { sumArt += exodontias; sumTot += total; monthlyPcts.push((exodontias / total) * 100); }
  });
  // Média mensal dos percentuais — igual à lógica do Tab6QuadrimesterCards
  const pct = monthlyPcts.length > 0
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length
    : 0;
  return { numerador: sumArt, denominador: sumTot, porcentagem: pct };
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
  equipeFilter: string = "all"
) {
  return useMemo(() => {
    const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
    const equipes = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const indicadores = [
        buildIndicador("B1", calcB1(patients, quad, equipe)),
        buildIndicador("B2", calcB2(tratamento, quad, equipe)),
        buildIndicador("B3", calcB3(tab3, quad, equipe)),
        buildIndicador("B5", calcB5(tab4, quad, equipe)),
        buildIndicador("B4", calcB4(tab5, quad, equipe)),
        buildIndicador("B6", calcB6(tab6, quad, equipe)),
      ];
      return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
    });

    const buildGeral = (eq?: string) => [
      buildIndicador("B1", calcB1(patients, quad, eq)),
      buildIndicador("B2", calcB2(tratamento, quad, eq)),
      buildIndicador("B3", calcB3(tab3, quad, eq)),
      buildIndicador("B5", calcB5(tab4, quad, eq)),
      buildIndicador("B4", calcB4(tab5, quad, eq)),
      buildIndicador("B6", calcB6(tab6, quad, eq)),
    ];

    const geralIndicadores = equipeFilter === "all" ? buildGeral() : buildGeral(equipeFilter);
    const geral: EquipeResult = {
      equipe: equipeFilter === "all" ? "Geral" : equipeFilter,
      indicadores: geralIndicadores,
      notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad, equipeFilter]);
}
