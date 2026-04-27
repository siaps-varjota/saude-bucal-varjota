import { parse, isValid, getMonth, getYear } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";
import { OficialData, makeOficialKey } from "@/hooks/useOficialData";

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
    ...extras,
  };
}

/** Normaliza nomes de equipe: ESF → ESB para consistência */
const normalizeEquipe = (name: string): string =>
  name.replace(/^ESF\b/i, "ESB").trim();

/** Verifica se a equipe do registro corresponde ao filtro (ESF/ESB equivalentes) */
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

// ── Oficial merge helper ──────────────────────────────────────────────────────
interface OficialMesValues {
  B1num: number; B1den: number;
  B2num: number; B2den: number;
  B3num: number; B3den: number;
  B4num: number; B4den: number;
  B5num: number; B5den: number;
  B6num: number; B6den: number;
}

/**
 * Retorna valores oficiais para um determinado mês.
 * - Se `equipe` for fornecida: busca a linha daquela equipe.
 * - Se `equipe` for undefined: agrega todas as equipes daquele mês.
 * Retorna null se não houver dados oficiais para o mês.
 */
function getOficialMes(
  oficialData: OficialData | undefined,
  monthNum: number, // 0-indexed (0 = jan)
  year: number,
  equipe?: string,
): OficialMesValues | null {
  if (!oficialData) return null;
  const mesStr = `${String(monthNum + 1).padStart(2, "0")}/${year}`;

  if (equipe) {
    const row = oficialData.index.get(makeOficialKey(mesStr, equipe));
    if (!row) return null;
    return {
      B1num: row.numB1, B1den: row.denB1,
      B2num: row.numB2, B2den: row.denB2,
      B3num: row.numB3, B3den: row.denB3,
      B4num: row.numB4, B4den: row.denB4,
      B5num: row.numB5, B5den: row.denB5,
      B6num: row.numB6, B6den: row.denB6,
    };
  }

  // Agrega todas as equipes para este mês
  const monthRows = oficialData.rows.filter(r => r.mes === mesStr);
  if (monthRows.length === 0) return null;

  return monthRows.reduce<OficialMesValues>(
    (acc, row) => ({
      B1num: acc.B1num + row.numB1, B1den: acc.B1den + row.denB1,
      B2num: acc.B2num + row.numB2, B2den: acc.B2den + row.denB2,
      B3num: acc.B3num + row.numB3, B3den: acc.B3den + row.denB3,
      B4num: acc.B4num + row.numB4, B4den: acc.B4den + row.denB4,
      B5num: acc.B5num + row.numB5, B5den: acc.B5den + row.denB5,
      B6num: acc.B6num + row.numB6, B6den: acc.B6den + row.denB6,
    }),
    { B1num: 0, B1den: 0, B2num: 0, B2den: 0, B3num: 0, B3den: 0,
      B4num: 0, B4den: 0, B5num: 0, B5den: 0, B6num: 0, B6den: 0 }
  );
}

// ── calcB1 ────────────────────────────────────────────────────────────────────
// Denominador fixo = população × 4 (meta quadrimestral).
// Numerador: oficial por mês quando disponível, preliminar caso contrário.
function calcB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  denominadorExterno: number,
  oficialData?: OficialData,
  equipe?: string,
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
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B1num > 0 || ofMes.B1den > 0);

    let mesNum: number;
    let mesDen: number;

    if (hasOf) {
      mesNum = ofMes!.B1num;
      mesDen = ofMes!.B1den > 0 ? ofMes!.B1den : denominadorExterno;
    } else {
      mesNum = source.filter((p) => {
        const d = parseDate(p.primeiraConsulta);
        return d && getMonth(d) === m && getYear(d) === year;
      }).length;
      mesDen = denominadorExterno;
    }

    sumNum += mesNum;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mesNum,
      denominador: mesDen,
      porcentagem: mesDen > 0 ? (mesNum / mesDen) * 100 : 0,
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

// ── calcB2 ────────────────────────────────────────────────────────────────────
// Numerador e denominador ambos acumulados (tratamentos e consultas).
function calcB2(
  tratamento: TratamentoPatient[],
  quad: Quadrimestre,
  oficialData?: OficialData,
  equipe?: string,
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
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B2num > 0 || ofMes.B2den > 0);

    let mTrat: number, mCons: number;

    if (hasOf) {
      mTrat = ofMes!.B2num;
      mCons = ofMes!.B2den;
    } else {
      mTrat = source.filter(p => { const d = parseDate(p.tratamentoConcluido); return d && getMonth(d) === m && getYear(d) === year; }).length;
      mCons = source.filter(p => { const d = parseDate(p.primeiraConsulta); return d && getMonth(d) === m && getYear(d) === year; }).length;
    }

    sumTrat += mTrat;
    sumCons += mCons;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mTrat,
      denominador: mCons,
      porcentagem: mCons > 0 ? (mTrat / mCons) * 100 : 0,
    });
  });

  return {
    numerador: sumTrat,
    denominador: sumCons,
    porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0,
    mesesDetalhe,
  };
}

// ── calcB3 ────────────────────────────────────────────────────────────────────
function calcB3(
  tab3: Tab3Record[],
  quad: Quadrimestre,
  oficialData?: OficialData,
  equipe?: string,
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

  // Índice preliminar por mês
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
    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B3num > 0 || ofMes.B3den > 0);

    let mExo: number, mTot: number;

    if (hasOf) {
      mExo = ofMes!.B3num;
      mTot = ofMes!.B3den;
    } else {
      const data = byMonth.get(m) || { exodontias: 0, total: 0 };
      mExo = data.exodontias;
      mTot = data.total;
    }

    sumExo += mExo; sumTot += mTot;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mExo,
      denominador: mTot,
      porcentagem: mTot > 0 ? (mExo / mTot) * 100 : 0,
    });
  });

  return {
    numerador: sumExo,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumExo / sumTot) * 100 : 0,
    mesesDetalhe,
  };
}

// ── calcB4 — Proced. Odont. Preventivos (aba 5 / tab5) ───────────────────────
function calcB4(
  tab5: Tab5Record[],
  quad: Quadrimestre,
  oficialData?: OficialData,
  equipe?: string,
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
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B4num > 0 || ofMes.B4den > 0);

    let mPrev: number, mTot: number;

    if (hasOf) {
      mPrev = ofMes!.B4num;
      mTot  = ofMes!.B4den;
    } else {
      const data = byMonth.get(m) || { preventivos: 0, total: 0 };
      mPrev = data.preventivos;
      mTot  = data.total;
    }

    sumPrev += mPrev; sumTot += mTot;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mPrev,
      denominador: mTot,
      porcentagem: mTot > 0 ? (mPrev / mTot) * 100 : 0,
    });
  });

  return {
    numerador: sumPrev,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumPrev / sumTot) * 100 : 0,
    mesesDetalhe,
  };
}

// ── calcB5 — Escovação Supervisionada (aba 4 / tab4) ─────────────────────────
// Denominador fixo = totalPatients × 4 (meta quadrimestral), igual ao B1.
function calcB5(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  oficialData?: OficialData,
  equipe?: string,
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
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;

    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B5num > 0 || ofMes.B5den > 0);

    let mesNum: number;
    let mesDen: number;

    if (hasOf) {
      mesNum = ofMes!.B5num;
      mesDen = ofMes!.B5den > 0 ? ofMes!.B5den : totalPatients;
    } else {
      mesNum = source.filter((p) => {
        const d = parseDate(p.primeiraConsulta);
        return d && getMonth(d) === m && getYear(d) === year;
      }).length;
      mesDen = totalPatients;
    }

    sumNum += mesNum;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mesNum,
      denominador: mesDen,
      porcentagem: mesDen > 0 ? (mesNum / mesDen) * 100 : 0,
    });
  });

  const denominador = totalPatients * 4;
  return {
    numerador: sumNum,
    denominador,
    porcentagem: denominador > 0 ? (sumNum / denominador) * 100 : 0,
    mesesDetalhe,
  };
}

// ── calcB6 ────────────────────────────────────────────────────────────────────
function calcB6(
  tab6: Tab6Record[],
  quad: Quadrimestre,
  oficialData?: OficialData,
  equipe?: string,
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
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const ofMes = getOficialMes(oficialData, m, year, equipe);
    const hasOf = !!ofMes && (ofMes.B6num > 0 || ofMes.B6den > 0);

    let mArt: number, mTot: number;

    if (hasOf) {
      mArt = ofMes!.B6num;
      mTot = ofMes!.B6den;
    } else {
      const data = byMonth.get(m) || { exodontias: 0, total: 0 };
      mArt = data.exodontias;
      mTot = data.total;
    }

    sumArt += mArt; sumTot += mTot;
    mesesDetalhe.push({
      mes: `${MONTH_ABBR[m]}/${year}`,
      numerador: mArt,
      denominador: mTot,
      porcentagem: mTot > 0 ? (mArt / mTot) * 100 : 0,
    });
  });

  return {
    numerador: sumArt,
    denominador: sumTot,
    porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0,
    mesesDetalhe,
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
  // Helper to find denominadorB1 value trying aliases and ESB/ESF variants
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

  const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
  const equipes = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

  const porEquipe: EquipeResult[] = equipes.map((equipe) => {
    const denomB1 = findDenomB1(equipe);
    const rawB1 = calcB1(patients,   quad, denomB1, oficialData, equipe);
    const rawB2 = calcB2(tratamento, quad,           oficialData, equipe);
    const indicadores = [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, oficialData, equipe)),
      buildIndicador("B5", calcB5(tab4, quad, oficialData, equipe)),
      buildIndicador("B4", calcB4(tab5, quad, oficialData, equipe), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, oficialData, equipe)),
    ];
    return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
  });

  const buildGeral = (eq?: string) => {
    const denomB1 = eq ? findDenomB1(eq) : denominadorB1.total;
    const rawB1 = calcB1(patients,   quad, denomB1, oficialData, eq);
    const rawB2 = calcB2(tratamento, quad,           oficialData, eq);
    return [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, oficialData, eq)),
      buildIndicador("B5", calcB5(tab4, quad, oficialData, eq)),
      buildIndicador("B4", calcB4(tab5, quad, oficialData, eq), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, oficialData, eq)),
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
