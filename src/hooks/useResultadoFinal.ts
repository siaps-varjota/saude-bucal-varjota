import { parse, isValid, getMonth, getYear, format } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";
import { OficialData, makeOficialKey, normalizeMes, normalizeEquipe } from "@/hooks/useOficialData";

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
  fonte?: "oficial" | "preliminar";
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
  fonte?: "oficial" | "preliminar";
  // Campos auxiliares usados pela simulação do B4
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
  /** true quando TODOS os meses do período têm dado oficial */
  todosOficiais?: boolean;
}

function buildIndicador(
  key: string,
  raw: RawCalc,
  extras?: {
    b1Numerador?: number;
    b1Denominador?: number;
    b2Numerador?: number;
    b2Denominador?: number;
  }
): IndicadorResult {
  const config = INDICADORES.find((i) => i.key === key)!;
  const conceito = config.getConceito(raw.porcentagem);
  const nota = CONCEITO_SCORES[conceito];
  const fonte: "oficial" | "preliminar" = raw.todosOficiais ? "oficial" : "preliminar";
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
    fonte,
    ...extras,
  };
}

/** Normaliza nomes de equipe: ESF → ESB para consistência */
const normalizeEquipeLocal = (name: string): string =>
  name.replace(/^ESF\b/i, "ESB").trim();

/** Verifica se a equipe do registro corresponde ao filtro (ESF/ESB equivalentes) */
const equipeMatch = (recordEquipe: string, filterEquipe: string): boolean =>
  normalizeEquipeLocal(recordEquipe) === normalizeEquipeLocal(filterEquipe);

// ── Helper: resolve num/den de um indicador específico para um mês via oficial ──
type BIndicador = "B1" | "B2" | "B3" | "B4" | "B5" | "B6";

function resolveOficialMes(
  monthIdx: number,
  year: number,
  equipe: string,
  indicador: BIndicador,
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; isOficial: boolean } | null {
  if (!oficialIndex) return null;

  const monthDate = new Date(year, monthIdx, 1);
  const mesNorm = normalizeMes(format(monthDate, "MM/yyyy")) ?? format(monthDate, "MM/yyyy");

  // Tenta com a equipe passada e suas variações (igual ao que as abas fazem)
  const equipeNorm = normalizeEquipe(equipe);
  const keysToTry = [
    makeOficialKey(mesNorm, equipeNorm),
    makeOficialKey(mesNorm, equipeNorm.replace(/^ESB\b/i, "ESF")),
    makeOficialKey(mesNorm, equipeNorm === "ESB CENTRO" ? "ESB SEDE 1" : equipeNorm),
    makeOficialKey(mesNorm, equipeNorm === "ESB SEDE 1" ? "ESB CENTRO" : equipeNorm),
  ];

  let ofRow = undefined;
  for (const k of keysToTry) {
    ofRow = oficialIndex.get(k);
    if (ofRow) break;
  }

  if (!ofRow) return null;

  const numKey = `num${indicador}` as keyof typeof ofRow;
  const denKey = `den${indicador}` as keyof typeof ofRow;
  const num = ofRow[numKey] as number;
  const den = ofRow[denKey] as number;

  if (num === 0 && den === 0) return null; // sem dado oficial para este indicador neste mês

  return { num, den, isOficial: true };
}

function getAllEquipes(
  patients: Patient[], tratamento: TratamentoPatient[], tab3: Tab3Record[],
  tab4: Tab4Patient[], tab5: Tab5Record[], tab6: Tab6Record[]
): string[] {
  const set = new Set<string>();
  patients.forEach((p) => p.equipe && set.add(normalizeEquipeLocal(p.equipe)));
  tratamento.forEach((p) => p.equipe && set.add(normalizeEquipeLocal(p.equipe)));
  tab3.forEach((r) => set.add(normalizeEquipeLocal(r.equipe)));
  tab4.forEach((p) => p.equipe && set.add(normalizeEquipeLocal(p.equipe)));
  tab5.forEach((r) => set.add(normalizeEquipeLocal(r.equipe)));
  tab6.forEach((r) => set.add(normalizeEquipeLocal(r.equipe)));
  return Array.from(set).sort();
}

// ── calcB1 ────────────────────────────────────────────────────────────────────
function calcB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  denominadorExterno: number,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? allPatients.filter((p) => equipeMatch(p.equipe, equipe)) : allPatients;
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
  let sumDen = 0;
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    // Preliminar
    const prelCount = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B1", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const count = isOficial ? oficial!.num : prelCount;
    const den   = isOficial ? oficial!.den  : denominadorExterno;

    if (!isOficial) todosMesesOficiais = false;

    sumNum += count;
    sumDen += den;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: count,
      denominador: den,
      porcentagem: den > 0 ? (count / den) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  // Denominador final: média dos denominadores acumulados (consistente com QuadrimesterCards)
  const mesesComDados = mesesDetalhe.length || 1;
  const denominadorFinal = mesesComDados > 0 ? Math.round(sumDen / mesesComDados) : denominadorExterno;
  const denominadorTotal = denominadorFinal * 4;

  return {
    numerador: sumNum,
    denominador: denominadorTotal,
    porcentagem: denominadorTotal > 0 ? (sumNum / denominadorTotal) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
}

// ── calcB2 ────────────────────────────────────────────────────────────────────
function calcB2(
  tratamento: TratamentoPatient[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? tratamento.filter((p) => equipeMatch(p.equipe, equipe)) : tratamento;
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
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    // Preliminar
    const mTrat = source.filter(p => { const d = parseDate(p.tratamentoConcluido); return d && getMonth(d) === m && getYear(d) === year; }).length;
    const mCons = source.filter(p => { const d = parseDate(p.primeiraConsulta);    return d && getMonth(d) === m && getYear(d) === year; }).length;

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B2", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const trat = isOficial ? oficial!.num : mTrat;
    const cons = isOficial ? oficial!.den  : mCons;

    if (!isOficial) todosMesesOficiais = false;

    sumTrat += trat;
    sumCons += cons;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: trat,
      denominador: cons,
      porcentagem: cons > 0 ? (trat / cons) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  return {
    numerador: sumTrat,
    denominador: sumCons,
    porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
}

// ── calcB3 ────────────────────────────────────────────────────────────────────
function calcB3(
  tab3: Tab3Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? tab3.filter((r) => equipeMatch(r.equipe, equipe)) : tab3;

  if (quad === "todos") {
    let sumExo = 0, sumTot = 0;
    source.forEach(r => { sumExo += r.exodontias; sumTot += r.totalAtendimentos; });
    return { numerador: sumExo, denominador: sumTot, porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0, mesesDetalhe: [] };
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  // Mapa de dados preliminares por mês
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
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const prelData = byMonth.get(m) || { exodontias: 0, total: 0 };

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B3", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const exo = isOficial ? oficial!.num : prelData.exodontias;
    const tot = isOficial ? oficial!.den  : prelData.total;

    if (!isOficial) todosMesesOficiais = false;

    sumExo += exo;
    sumTot += tot;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: exo,
      denominador: tot,
      porcentagem: tot > 0 ? (exo / tot) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  return {
    numerador: sumExo,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
}

// ── calcB4 ────────────────────────────────────────────────────────────────────
function calcB4(
  tab5: Tab5Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? tab5.filter((r) => equipeMatch(r.equipe, equipe)) : tab5;

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
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const prelData = byMonth.get(m) || { preventivos: 0, total: 0 };

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B4", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const prev = isOficial ? oficial!.num : prelData.preventivos;
    const tot  = isOficial ? oficial!.den  : prelData.total;

    if (!isOficial) todosMesesOficiais = false;

    sumPrev += prev;
    sumTot  += tot;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: prev,
      denominador: tot,
      porcentagem: tot > 0 ? (prev / tot) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  return {
    numerador: sumPrev,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
}

// ── calcB5 ────────────────────────────────────────────────────────────────────
function calcB5(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? allTab4.filter((p) => equipeMatch(p.equipe, equipe)) : allTab4;
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
  let sumDen = 0;
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    // Preliminar
    const prelCount = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B5", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const count = isOficial ? oficial!.num : prelCount;
    const den   = isOficial ? oficial!.den  : totalPatients;

    if (!isOficial) todosMesesOficiais = false;

    sumNum += count;
    sumDen += den;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: count,
      denominador: den,
      porcentagem: den > 0 ? (count / den) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  // Denominador final: média (consistente com Tab4QuadrimesterCards)
  const mesesComDados = mesesDetalhe.length || 1;
  const denominadorFinal = mesesComDados > 0 ? Math.round(sumDen / mesesComDados) : totalPatients;
  const denominadorTotal = denominadorFinal * 4;

  return {
    numerador: sumNum,
    denominador: denominadorTotal,
    porcentagem: denominadorTotal > 0 ? (sumNum / denominadorTotal) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
}

// ── calcB6 ────────────────────────────────────────────────────────────────────
function calcB6(
  tab6: Tab6Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
): RawCalc {
  const source = equipe ? tab6.filter((r) => equipeMatch(r.equipe, equipe)) : tab6;

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
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const prelData = byMonth.get(m) || { exodontias: 0, total: 0 };

    // Oficial?
    const oficial = equipe
      ? resolveOficialMes(m, year, equipe, "B6", oficialData?.index)
      : null;

    const isOficial = !!oficial;
    const art = isOficial ? oficial!.num : prelData.exodontias;
    const tot = isOficial ? oficial!.den  : prelData.total;

    if (!isOficial) todosMesesOficiais = false;

    sumArt += art;
    sumTot += tot;

    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: art,
      denominador: tot,
      porcentagem: tot > 0 ? (art / tot) * 100 : 0,
      fonte: isOficial ? "oficial" : "preliminar",
    });
  });

  return {
    numerador: sumArt,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0,
    mesesDetalhe,
    todosOficiais: todosMesesOficiais,
  };
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
  denominadorB1: { porEquipe: Record<string, number>; total: number },
  oficialData?: OficialData,
) {
  // Helper para encontrar o denominadorB1 tentando aliases ESB/ESF
  const findDenomB1 = (eq: string): number => {
    const normalized = normalizeEquipeLocal(eq);
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

  const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
  const equipes = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

  const porEquipe: EquipeResult[] = equipes.map((equipe) => {
    const denomB1 = findDenomB1(equipe);
    const rawB1 = calcB1(patients, quad, denomB1, equipe, oficialData);
    const rawB2 = calcB2(tratamento, quad, equipe, oficialData);
    const indicadores = [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, equipe, oficialData)),
      buildIndicador("B5", calcB5(tab4, quad, equipe, oficialData)),
      buildIndicador("B4", calcB4(tab5, quad, equipe, oficialData), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, equipe, oficialData)),
    ];
    return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
  });

  const buildGeral = (eq?: string) => {
    const denomB1 = eq ? findDenomB1(eq) : denominadorB1.total;
    const rawB1 = calcB1(patients, quad, denomB1, eq, oficialData);
    const rawB2 = calcB2(tratamento, quad, eq, oficialData);
    return [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, eq, oficialData)),
      buildIndicador("B5", calcB5(tab4, quad, eq, oficialData)),
      buildIndicador("B4", calcB4(tab5, quad, eq, oficialData), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, eq, oficialData)),
    ];
  };

  const geralIndicadores = equipeFilter === "all" ? buildGeral() : buildGeral(equipeFilter);
  const geral: EquipeResult = {
    equipe: equipeFilter === "all" ? "Geral" : equipeFilter,
    indicadores: geralIndicadores,
    notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
  };

  return { geral, porEquipe };
}
