import { useMemo } from "react";
import { parse, isValid, getMonth, getYear, format } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

const MONTH_ABBR = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export type Conceito = "regular" | "suficiente" | "bom" | "otimo" | "none";

export interface MesDetalhe {
  mes: string;
  numerador: number;
  denominador: number;
  porcentagem: number;
  fonte: FonteDado; // ← novo
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
  fonte: FonteDado; // ← novo: fonte do quadrimestre agregado
  b1Numerador?: number;
  b1Denominador?: number;
  b2Numerador?: number;
  b2Denominador?: number;
}

export interface EquipeResult {
  equipe: string;
  indicadores: IndicadorResult[];
  notaFinal: number;
}

// ── Conceitos ─────────────────────────────────────────────────────────────────

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
  if (pct > 10 && pct < 12)  return "bom";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

interface RawCalc {
  numerador: number;
  denominador: number;
  porcentagem: number;
  mesesDetalhe: MesDetalhe[];
  fonte: FonteDado;
}

function buildIndicador(
  key: string,
  raw: RawCalc,
  extras?: { b1Numerador?: number; b1Denominador?: number; b2Numerador?: number; b2Denominador?: number }
): IndicadorResult {
  const config   = INDICADORES.find((i) => i.key === key)!;
  const conceito = config.getConceito(raw.porcentagem);
  const nota     = CONCEITO_SCORES[conceito];
  return {
    indicador:   config.label,
    peso:        config.peso,
    numerador:   Math.round(raw.numerador),
    denominador: Math.round(raw.denominador),
    porcentagem: raw.porcentagem,
    conceito,
    nota,
    notaFinal:    nota * config.peso,
    mesesDetalhe: raw.mesesDetalhe,
    fonte:        raw.fonte,
    ...extras,
  };
}

const normalizeEquipe = (name: string): string =>
  name.replace(/^ESF\b/i, "ESB").trim();

const equipeMatch = (recordEquipe: string, filterEquipe: string): boolean =>
  normalizeEquipe(recordEquipe) === normalizeEquipe(filterEquipe);

function getAllEquipes(
  patients: Patient[], tratamento: TratamentoPatient[], tab3: Tab3Record[],
  tab4: Tab4Patient[], tab5: Tab5Record[], tab6: Tab6Record[]
): string[] {
  const set = new Set<string>();
  patients.forEach((p) => p.equipe && set.add(normalizeEquipe(p.equipe)));
  tratamento.forEach((p) => p.equipe && set.add(normalizeEquipe(p.equipe)));
  tab3.forEach((r) => set.add(normalizeEquipe(r.equipe)));
  tab4.forEach((p) => p.equipe && set.add(normalizeEquipe(p.equipe)));
  tab5.forEach((r) => set.add(normalizeEquipe(r.equipe)));
  tab6.forEach((r) => set.add(normalizeEquipe(r.equipe)));
  return Array.from(set).sort();
}

/** Retorna "MM/YYYY" para um mês/ano */
const toMMYYYY = (m: number, year: number): string =>
  `${String(m + 1).padStart(2, "0")}/${year}`;

/** Resolve oficial para um indicador específico num mês */
const resolveOficial = (
  m: number,
  year: number,
  equipe: string,
  indKey: "B1"|"B2"|"B3"|"B4"|"B5"|"B6",
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; isOficial: boolean } | null => {
  if (!oficialIndex) return null;
  const mesNorm = normalizeMes(toMMYYYY(m, year)) ?? toMMYYYY(m, year);
  const ofRow   = oficialIndex.get(makeOficialKey(mesNorm, equipe));
  if (!ofRow) return null;
  const numKey = `numB${indKey.slice(1)}` as keyof typeof ofRow;
  const denKey = `denB${indKey.slice(1)}` as keyof typeof ofRow;
  const num = ofRow[numKey] as number;
  const den = ofRow[denKey] as number;
  if (num > 0 || den > 0) return { num, den, isOficial: true };
  return null;
};

// ── Funções de cálculo (agora com merge oficial) ──────────────────────────────

function calcB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  denominadorExterno: number,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? allPatients.filter((p) => equipeMatch(p.equipe, equipe)) : allPatients;
  if (denominadorExterno === 0) return { numerador: 0, denominador: 0, porcentagem: 0, mesesDetalhe: [], fonte: "preliminar" };

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const totalConsultas = source.filter(p => parseDate(p.primeiraConsulta)).length;
    return { numerador: totalConsultas, denominador: denominadorExterno, porcentagem: (totalConsultas / denominadorExterno) * 100, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumNum = 0, sumDen = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const of = resolveOficial(m, year, equipe, "B1", oficialIndex);
    if (of) {
      sumNum += of.num;
      sumDen += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const count = source.filter((p) => { const d = parseDate(p.primeiraConsulta); return d && getMonth(d) === m && getYear(d) === year; }).length;
      sumNum += count;
      sumDen += denominadorExterno;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: count, denominador: denominadorExterno, porcentagem: (count / denominadorExterno) * 100, fonte: "preliminar" });
    }
  });

  return {
    numerador: sumNum,
    denominador: sumDen,
    porcentagem: sumDen > 0 ? (sumNum / sumDen) * 100 : 0,
    mesesDetalhe,
    fonte: todosOficiais ? "oficial" : "preliminar",
  };
}

function calcB2(
  tratamento: TratamentoPatient[],
  quad: Quadrimestre,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? tratamento.filter((p) => equipeMatch(p.equipe, equipe)) : tratamento;
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    let sumTrat = 0, sumCons = 0;
    source.forEach(p => {
      const dCons = parseDate(p.primeiraConsulta);
      const dTrat = parseDate(p.tratamentoConcluido);
      if (dCons && dTrat) { sumTrat++; sumCons++; } else if (dCons) { sumCons++; }
    });
    return { numerador: sumTrat, denominador: sumCons, porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumTrat = 0, sumCons = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const of = resolveOficial(m, year, equipe, "B2", oficialIndex);
    if (of) {
      sumTrat += of.num;
      sumCons += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const mTrat = source.filter(p => { const d = parseDate(p.tratamentoConcluido); return d && getMonth(d) === m && getYear(d) === year; }).length;
      const mCons = source.filter(p => { const d = parseDate(p.primeiraConsulta);    return d && getMonth(d) === m && getYear(d) === year; }).length;
      sumTrat += mTrat; sumCons += mCons;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: mTrat, denominador: mCons, porcentagem: mCons > 0 ? (mTrat / mCons) * 100 : 0, fonte: "preliminar" });
    }
  });

  return { numerador: sumTrat, denominador: sumCons, porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0, mesesDetalhe, fonte: todosOficiais ? "oficial" : "preliminar" };
}

function calcB3(
  tab3: Tab3Record[],
  quad: Quadrimestre,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? tab3.filter((r) => equipeMatch(r.equipe, equipe)) : tab3;

  if (quad === "todos") {
    let sumExo = 0, sumTot = 0;
    source.forEach(r => { sumExo += r.exodontias; sumTot += r.totalAtendimentos; });
    return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumExo = 0, sumTot = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const of = resolveOficial(m, year, equipe, "B3", oficialIndex);
    if (of) {
      sumExo += of.num; sumTot += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const prelByMonth = new Map<number, { exodontias: number; total: number }>();
      source.forEach(r => {
        const parts  = r.mesAno.split("/");
        const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
        const ano    = parseInt(parts[1]);
        if (mesIdx !== m || ano !== year) return;
        const ex = prelByMonth.get(mesIdx) || { exodontias: 0, total: 0 };
        ex.exodontias += r.exodontias; ex.total += r.totalAtendimentos;
        prelByMonth.set(mesIdx, ex);
      });
      const data = prelByMonth.get(m) || { exodontias: 0, total: 0 };
      sumExo += data.exodontias; sumTot += data.total;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.exodontias, denominador: data.total, porcentagem: data.total > 0 ? (data.exodontias / data.total) * 100 : 0, fonte: "preliminar" });
    }
  });

  return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0, mesesDetalhe, fonte: todosOficiais ? "oficial" : "preliminar" };
}

function calcB4(
  tab5: Tab5Record[],
  quad: Quadrimestre,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? tab5.filter((r) => equipeMatch(r.equipe, equipe)) : tab5;

  if (quad === "todos") {
    let sumPrev = 0, sumTot = 0;
    source.forEach(r => { sumPrev += r.preventivos; sumTot += r.totalIndividuais; });
    return { numerador: sumPrev, denominador: sumTot, porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumPrev = 0, sumTot = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const of = resolveOficial(m, year, equipe, "B4", oficialIndex);
    if (of) {
      sumPrev += of.num; sumTot += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const byMonth = new Map<number, { preventivos: number; total: number }>();
      source.forEach(r => {
        const parts  = r.mesAno.split("/");
        const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
        const ano    = parseInt(parts[1]);
        if (mesIdx !== m || ano !== year) return;
        const ex = byMonth.get(mesIdx) || { preventivos: 0, total: 0 };
        ex.preventivos += r.preventivos; ex.total += r.totalIndividuais;
        byMonth.set(mesIdx, ex);
      });
      const data = byMonth.get(m) || { preventivos: 0, total: 0 };
      sumPrev += data.preventivos; sumTot += data.total;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.preventivos, denominador: data.total, porcentagem: data.total > 0 ? (data.preventivos / data.total) * 100 : 0, fonte: "preliminar" });
    }
  });

  return { numerador: sumPrev, denominador: sumTot, porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0, mesesDetalhe, fonte: todosOficiais ? "oficial" : "preliminar" };
}

function calcB5(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? allTab4.filter((p) => equipeMatch(p.equipe, equipe)) : allTab4;
  const totalPatients = source.length;
  if (totalPatients === 0) return { numerador: 0, denominador: 0, porcentagem: 0, mesesDetalhe: [], fonte: "preliminar" };

  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    const totalConsultas = source.filter(p => parseDate(p.primeiraConsulta)).length;
    return { numerador: totalConsultas, denominador: totalPatients, porcentagem: (totalConsultas / totalPatients) * 100, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumNum = 0, sumDen = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const of = resolveOficial(m, year, equipe, "B5", oficialIndex);
    if (of) {
      sumNum += of.num; sumDen += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const count = source.filter((p) => { const d = parseDate(p.primeiraConsulta); return d && getMonth(d) === m && getYear(d) === year; }).length;
      sumNum += count; sumDen += totalPatients;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: count, denominador: totalPatients, porcentagem: totalPatients > 0 ? (count / totalPatients) * 100 : 0, fonte: "preliminar" });
    }
  });

  return { numerador: sumNum, denominador: sumDen, porcentagem: sumDen > 0 ? (sumNum / sumDen) * 100 : 0, mesesDetalhe, fonte: todosOficiais ? "oficial" : "preliminar" };
}

function calcB6(
  tab6: Tab6Record[],
  quad: Quadrimestre,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): RawCalc {
  const source = equipe ? tab6.filter((r) => equipeMatch(r.equipe, equipe)) : tab6;

  if (quad === "todos") {
    let sumArt = 0, sumTot = 0;
    source.forEach(r => { sumArt += r.exodontias; sumTot += r.totalProcedimentos; });
    return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe: [], fonte: "preliminar" };
  }

  const [q, yearStr] = quad.split("-");
  const year   = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumArt = 0, sumTot = 0;
  let todosOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const of = resolveOficial(m, year, equipe, "B6", oficialIndex);
    if (of) {
      sumArt += of.num; sumTot += of.den;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: of.num, denominador: of.den, porcentagem: of.den > 0 ? (of.num / of.den) * 100 : 0, fonte: "oficial" });
    } else {
      todosOficiais = false;
      const byMonth = new Map<number, { exodontias: number; total: number }>();
      source.forEach(r => {
        const parts  = r.mesAno.split("/");
        const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
        const ano    = parseInt(parts[1]);
        if (mesIdx !== m || ano !== year) return;
        const ex = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
        ex.exodontias += r.exodontias; ex.total += r.totalProcedimentos;
        byMonth.set(mesIdx, ex);
      });
      const data = byMonth.get(m) || { exodontias: 0, total: 0 };
      sumArt += data.exodontias; sumTot += data.total;
      mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.exodontias, denominador: data.total, porcentagem: data.total > 0 ? (data.exodontias / data.total) * 100 : 0, fonte: "preliminar" });
    }
  });

  return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe, fonte: todosOficiais ? "oficial" : "preliminar" };
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[],
  quad: Quadrimestre = "todos",
  equipeFilter: string = "all",
  denominadorB1: { porEquipe: Record<string, number>; total: number },
  oficialData?: OficialData, // ← novo
) {
  const findDenomB1 = (eq: string): number => {
    const normalized = normalizeEquipe(eq);
    const aliases = [
      normalized,
      normalized.replace(/^ESB\b/i, "ESF"),
      normalized.replace(/^ESB CENTRO$/i, "ESB SEDE 1"),
      normalized.replace(/^ESF CENTRO$/i, "ESB SEDE 1"),
      normalized.replace(/^ESB SEDE 1$/i, "ESB CENTRO"),
      normalized.replace(/^ESB SEDE 1$/i, "ESF CENTRO"),
    ];
    for (const alias of aliases) {
      if (denominadorB1.porEquipe[alias] !== undefined) return denominadorB1.porEquipe[alias];
    }
    return 0;
  };

  const oficialIndex = oficialData?.index;

  const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
  const equipes    = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

  const porEquipe: EquipeResult[] = equipes.map((equipe) => {
    const denomB1 = findDenomB1(equipe);
    const rawB1   = calcB1(patients,  quad, denomB1, equipe, oficialIndex);
    const rawB2   = calcB2(tratamento, quad, equipe, oficialIndex);
    const indicadores = [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, equipe, oficialIndex)),
      buildIndicador("B5", calcB5(tab4, quad, equipe, oficialIndex)),
      buildIndicador("B4", calcB4(tab5, quad, equipe, oficialIndex), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, equipe, oficialIndex)),
    ];
    return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
  });

  const buildGeral = (eq?: string) => {
    const denomB1 = eq ? findDenomB1(eq) : denominadorB1.total;
    const rawB1   = calcB1(patients,  quad, denomB1, eq ?? "", oficialIndex);
    const rawB2   = calcB2(tratamento, quad, eq ?? "", oficialIndex);
    return [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, eq ?? "", oficialIndex)),
      buildIndicador("B5", calcB5(tab4, quad, eq ?? "", oficialIndex)),
      buildIndicador("B4", calcB4(tab5, quad, eq ?? "", oficialIndex), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, eq ?? "", oficialIndex)),
    ];
  };

  const geralIndicadores = equipeFilter === "all" ? buildGeral() : buildGeral(equipeFilter);
  const geral: EquipeResult = {
    equipe:     equipeFilter === "all" ? "Geral" : equipeFilter,
    indicadores: geralIndicadores,
    notaFinal:  geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
  };

  return { geral, porEquipe };
}
