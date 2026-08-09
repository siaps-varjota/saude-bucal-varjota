import { parse, isValid, getMonth, getYear, format } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Quadrimestre } from "@/hooks/useQuadrimesterFilter";
import { OficialData, makeOficialKey, normalizeMes, normalizeEquipe } from "@/hooks/useOficialData";
import { pontosDesempateIndicador, normalizarIndicador, IndicadorKey } from "@/lib/desempateScore";

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
  /** Escala contínua 0–100 usada no desempate */
  desempateNormalizado: number;
  /** Pontos de desempate deste indicador (0–100 × peso) */
  desempatePontos: number;
  mesesDetalhe: MesDetalhe[];
  fonte?: "oficial" | "preliminar";
  b1Numerador?: number;
  b1Denominador?: number;
  b2Numerador?: number;
  b2Denominador?: number;
}

export interface EquipeResult {
  equipe: string;
  indicadores: IndicadorResult[];
  notaFinal: number;
  /** Pontuação total de desempate (0–1000) */
  desempate: number;
}

const CONCEITO_SCORES: Record<Conceito, number> = {
  regular: 0.25, suficiente: 0.50, bom: 0.75, otimo: 1.00, none: 0,
};

const getConceitoB1 = (pct: number): Conceito => {
  if (pct <= 0) return "none";
  if (pct <= 0.25) return "regular";
  if (pct <= 0.75) return "suficiente";
  if (pct <= 1.25) return "bom";
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
  if (pct >= 3 && pct < 10) return "otimo";
  if (pct >= 10 && pct < 12) return "bom";
  if (pct >= 12 && pct < 14) return "suficiente";
  return "regular";
};

// B4 — Escovação Supervisionada (NM B4, maio/2026)
// Parâmetro: Ótimo >1% | Bom >0,5% e ≤1% | Suficiente >0,25% e ≤0,5% | Regular ≤0,25%
// Numerador:   crianças 6-12 anos participantes da escovação supervisionada (SIGTAP 01.01.02.003-1)
// Denominador: crianças 6-12 anos vinculadas à eSF/eAP de referência da eSB
const getConceitoB4 = (pct: number): Conceito => {
  if (pct <= 0)   return "none";
  if (pct > 1)    return "otimo";
  if (pct > 0.5)  return "bom";
  if (pct > 0.25) return "suficiente";
  return "regular";
};

// B5 — Procedimentos Odontológicos Preventivos (NM B5, maio/2026)
// Parâmetro: Ótimo ≥65% e ≤85% | Bom ≥55% e <65% | Suficiente ≥40% e <55% | Regular <40% ou >85%
// Numerador:   procedimentos preventivos individuais (SIGTAP: 01.01.02.005-8, 006-6, 007-4,
//              008-2, 010-4, 012-0, 03.07.03.004-0) — inclui Profilaxia e Orientação prótese
//              conforme atualização maio/2026; exclui 01.01.02.009-0, 03.07.01.013-9, 03.07.01.009-0
// Denominador: total de procedimentos odontológicos individuais realizados pela eSB
const getConceitoB5 = (pct: number): Conceito => {
  if (pct <= 0)            return "none";
  if (pct >= 65 && pct <= 85) return "otimo";
  if (pct >= 55 && pct < 65)  return "bom";
  if (pct >= 40 && pct < 55)  return "suficiente";
  return "regular";
};

// B6 — Tratamento Restaurador Atraumático (NM B6, maio/2026)
// Parâmetro: Ótimo >8% | Bom >6% e ≤8% | Suficiente >3% e ≤6% | Regular ≤3%
// Numerador:   procedimentos ART (SIGTAP 03.07.01.007-4)
// Denominador: total de procedimentos restauradores (SIGTAP 03.07.01.007-4, 003-1, 008-2,
//              010-4, 011-2, 012-0) — EXCLUÍDOS 03.07.01.009-0 e 03.07.01.013-9 (amálgama)
//              conforme atualização maio/2026
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
  // B4 — Escovação Supervisionada (peso 1, parâmetros de proporção sobre população 6-12 anos)
  { key: "B4", label: "Escovação Supervisionada",      peso: 1, getConceito: getConceitoB4 },
  // B5 — Procedimentos Odontológicos Preventivos (peso 2, parâmetros de % sobre total de proced.)
  { key: "B5", label: "Proced. Odont. Preventivos",    peso: 2, getConceito: getConceitoB5 },
  { key: "B6", label: "Trat. Restaurador Atraumático", peso: 1, getConceito: getConceitoB6 },
];

interface RawCalc {
  numerador: number;
  denominador: number;
  porcentagem: number;
  mesesDetalhe: MesDetalhe[];
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
  const dKey = key as IndicadorKey;
  return {
    indicador: config.label,
    peso: config.peso,
    numerador: Math.round(raw.numerador),
    denominador: Math.round(raw.denominador),
    porcentagem: raw.porcentagem,
    conceito,
    nota,
    notaFinal: nota * config.peso,
    desempateNormalizado: normalizarIndicador(dKey, raw.porcentagem),
    desempatePontos: pontosDesempateIndicador(dKey, raw.porcentagem, config.peso),
    mesesDetalhe: raw.mesesDetalhe,
    fonte,
    ...extras,
  };
}

const normalizeEquipeLocal = (name: string): string =>
  name.replace(/^ESF\b/i, "ESB").trim();

const equipeMatch = (recordEquipe: string, filterEquipe: string): boolean =>
  normalizeEquipeLocal(recordEquipe) === normalizeEquipeLocal(filterEquipe);

type BIndicador = "B1" | "B2" | "B3" | "B4" | "B5" | "B6";

// Mapeamento de chave interna → campo no CSV de dados oficiais (SIAPS).
// B4 = Escovação Supervisionada → coluna B4 no CSV
// B5 = Procedimentos Preventivos → coluna B5 no CSV
const INDICADOR_TO_CSV_FIELD: Record<BIndicador, "B1" | "B2" | "B3" | "B4" | "B5" | "B6"> = {
  B1: "B1", B2: "B2", B3: "B3", B4: "B4", B5: "B5", B6: "B6",
};

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

  const csvField = INDICADOR_TO_CSV_FIELD[indicador];
  const numKey = `num${csvField}` as keyof typeof ofRow;
  const denKey = `den${csvField}` as keyof typeof ofRow;
  return { num: ofRow[numKey] as number, den: ofRow[denKey] as number, isOficial: true };
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

const mesKey = (m: number, year: number) => `${String(m + 1).padStart(2, "0")}/${year}`;
const skipMes = (m: number, year: number, mf?: string[]) =>
  !!mf && mf.length > 0 && !mf.includes(mesKey(m, year));

// ── calcB1 ────────────────────────────────────────────────────────────────────
function calcB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  denominadorExterno: number,
  equipe?: string,
  oficialData?: OficialData,
  mesesFiltro?: string[],
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
  let sumNum = 0, sumDen = 0;
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    if (skipMes(m, year, mesesFiltro)) return;

    const prelCount = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B1", oficialData?.index) : null;
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

  const mesesComDados   = mesesDetalhe.length || 1;
  const denominadorFinal = Math.round(sumDen / mesesComDados);
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
  mesesFiltro?: string[],
): RawCalc {
  const source = equipe ? tratamento.filter((p) => equipeMatch(p.equipe, equipe)) : tratamento;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    // Denominador: todos com primeiraConsulta válida
    const sumCons = source.filter(p => !!parseDate(p.primeiraConsulta)).length;
    // Numerador: pacientes com status "Concluído" e data de conclusão válida
    const sumTrat = source.filter(p =>
      p.comTratamentoConcluido === "Concluído" && !!parseDate(p.tratamentoConcluido)
    ).length;
    return {
      numerador: sumTrat,
      denominador: sumCons,
      porcentagem: sumCons > 0 ? (sumTrat / sumCons) * 100 : 0,
      mesesDetalhe: [],
    };
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
    if (skipMes(m, year, mesesFiltro)) return;

    // Denominador: pacientes com primeiraConsulta no mês
    const mCons = source.filter(p => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    // Numerador: pacientes com status "Concluído" cuja data de conclusão é deste mês
    const mTrat = source.filter(p => {
      if (p.comTratamentoConcluido !== "Concluído") return false;
      const d = parseDate(p.tratamentoConcluido);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B2", oficialData?.index) : null;
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

// ── calcB3 — Taxa de Exodontias ───────────────────────────────────────────────
// Recebe: Tab3Record[] — totais mensais de exodontias e procedimentos por equipe
// Numerador:   exodontias de dentes permanentes (SIGTAP 04.14.02.013-8 e 04.14.02.014-6)
// Denominador: total de procedimentos individuais preventivos + curativos + exodontias
//   EXCLUÍDO do denominador (NM B3, maio/2026):
//     03.07.01.013-9  Restauração dente permanente posterior com amálgama
//   (inclui orientação higienização próteses 01.01.02.012-0 e fotobiomodulação 03.07.05.001-7)
// Polaridade: Menor-Melhor
function calcB3(
  tab3: Tab3Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
  mesesFiltro?: string[],
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
    if (skipMes(m, year, mesesFiltro)) return;
    const prelData = byMonth.get(m) || { exodontias: 0, total: 0 };

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B3", oficialData?.index) : null;
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

// ── calcB4 — Escovação Supervisionada ────────────────────────────────────────
// Recebe: Tab4Patient[] — registros de escovação dental supervisionada (ação coletiva)
// Numerador:   crianças 6-12 anos participantes (SIGTAP 01.01.02.003-1, MIAC código 4)
// Denominador: crianças 6-12 anos vinculadas à eSF/eAP (NM B4, maio/2026)
function calcB4(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
  mesesFiltro?: string[],
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
  let sumNum = 0, sumDen = 0;
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    if (skipMes(m, year, mesesFiltro)) return;

    const prelCount = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B4", oficialData?.index) : null;
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

  const mesesComDados    = mesesDetalhe.length || 1;
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

// ── calcB5 — Procedimentos Odontológicos Preventivos ─────────────────────────
// Recebe: Tab5Record[] — totais mensais de procedimentos individuais por equipe
// Numerador:   total de procedimentos individuais PREVENTIVOS realizados pela eSB
//   SIGTAP numerador (NM B5, maio/2026):
//     01.01.02.005-8  Aplicação de cariostático (por dente)
//     01.01.02.006-6  Aplicação de selante (por dente)
//     01.01.02.007-4  Aplicação tópica de flúor (individual por sessão)
//     01.01.02.008-2  Evidenciação de placa bacteriana
//     01.01.02.010-4  Orientação de higiene bucal
//     01.01.02.012-0  Orientação de higienização de próteses dentárias ← incluído maio/2026
//     03.07.03.004-0  Profilaxia / Remoção da placa bacteriana ← incluído maio/2026
//   EXCLUÍDOS do numerador: 01.01.02.009-0 (selamento provisório), 03.07.01.013-9 e 03.07.01.009-0 (amálgama)
// Denominador: total de procedimentos odontológicos individuais (lista completa na NM B5 seção 24d)
function calcB5(
  tab5: Tab5Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
  mesesFiltro?: string[],
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
    if (skipMes(m, year, mesesFiltro)) return;
    const prelData = byMonth.get(m) || { preventivos: 0, total: 0 };

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B5", oficialData?.index) : null;
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

// ── calcB6 — Tratamento Restaurador Atraumático ───────────────────────────────
// Recebe: Tab6Record[] — totais mensais de ART e procedimentos restauradores por equipe
// Numerador:   procedimentos ART (SIGTAP 03.07.01.007-4)
// Denominador: total de procedimentos restauradores:
//     03.07.01.007-4  ART (TRA/ART)
//     03.07.01.003-1  Restauração dente permanente anterior com resina composta
//     03.07.01.008-2  Restauração dente decíduo posterior com resina composta
//     03.07.01.010-4  Restauração dente decíduo posterior com ionômero de vidro
//     03.07.01.011-2  Restauração dente decíduo anterior com resina composta
//     03.07.01.012-0  Restauração dente permanente posterior com resina composta
//   EXCLUÍDOS do denominador (NM B6, maio/2026):
//     03.07.01.009-0  Restauração dente decíduo posterior com amálgama
//     03.07.01.013-9  Restauração dente permanente posterior com amálgama
//
// ⚠️ ATENÇÃO — verificar a origem do dado: o campo lido abaixo é `r.exodontias`
// (nome herdado de Tab3Record/Tab6Record). Não tenho acesso ao arquivo
// useTab6Data.ts nesta conversa para confirmar se esse campo, na planilha/CSV
// de origem do Tab6, realmente representa a contagem de ART (007-4) — ou se é,
// de fato, uma contagem de exodontias copiada por engano do parser de Tab3.
// Mantive a leitura do campo como estava (não alterei dados/contrato), mas
// renomeei as variáveis locais de "exodontias"→"art" para deixar a INTENÇÃO
// explícita e facilitar a auditoria. Se ao abrir useTab6Data.ts o campo
// `exodontias` realmente vier de uma coluna de exodontias (e não de ART), o
// numerador de B6 está incorreto e precisa apontar para o campo certo do Tab6Record.
function calcB6(
  tab6: Tab6Record[],
  quad: Quadrimestre,
  equipe?: string,
  oficialData?: OficialData,
  mesesFiltro?: string[],
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

  const byMonth = new Map<number, { art: number; total: number }>();
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesIdx = MONTH_NAME_TO_NUM[parts[0]?.toLowerCase().trim()];
    const ano = parseInt(parts[1]);
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    const acc = byMonth.get(mesIdx) || { art: 0, total: 0 };
    acc.art += r.exodontias; acc.total += r.totalProcedimentos;
    byMonth.set(mesIdx, acc);
  });

  let sumArt = 0, sumTot = 0;
  let todosMesesOficiais = true;
  const mesesDetalhe: MesDetalhe[] = [];

  months.forEach((m) => {
    if (skipMes(m, year, mesesFiltro)) return;
    const prelData = byMonth.get(m) || { art: 0, total: 0 };

    const oficial = equipe ? resolveOficialMes(m, year, equipe, "B6", oficialData?.index) : null;
    const isOficial = !!oficial;
    const art = isOficial ? oficial!.num : prelData.art;
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
  mesesFiltro: string[] = [],
) {
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
  const mf = mesesFiltro;

  const porEquipe: EquipeResult[] = equipes.map((equipe) => {
    const denomB1 = findDenomB1(equipe);
    const rawB1 = calcB1(patients, quad, denomB1, equipe, oficialData, mf);
    const rawB2 = calcB2(tratamento, quad, equipe, oficialData, mf);
    const indicadores = [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, equipe, oficialData, mf)),
      // B4 — Escovação Supervisionada: usa tab4 (ação coletiva de escovação)
      buildIndicador("B4", calcB4(tab4, quad, equipe, oficialData, mf)),
      // B5 — Procedimentos Preventivos: usa tab5 (procedimentos individuais preventivos/curativos)
      buildIndicador("B5", calcB5(tab5, quad, equipe, oficialData, mf), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, equipe, oficialData, mf)),
    ];
    return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
  });

  const buildGeral = (eq?: string) => {
    const denomB1 = eq ? findDenomB1(eq) : denominadorB1.total;
    const rawB1 = calcB1(patients, quad, denomB1, eq, oficialData, mf);
    const rawB2 = calcB2(tratamento, quad, eq, oficialData, mf);
    return [
      buildIndicador("B1", rawB1),
      buildIndicador("B2", rawB2),
      buildIndicador("B3", calcB3(tab3, quad, eq, oficialData, mf)),
      // B4 — Escovação Supervisionada: usa tab4
      buildIndicador("B4", calcB4(tab4, quad, eq, oficialData, mf)),
      // B5 — Procedimentos Preventivos: usa tab5
      buildIndicador("B5", calcB5(tab5, quad, eq, oficialData, mf), {
        b1Numerador:   Math.round(rawB1.numerador),
        b1Denominador: Math.round(rawB1.denominador),
        b2Numerador:   Math.round(rawB2.numerador),
        b2Denominador: Math.round(rawB2.denominador),
      }),
      buildIndicador("B6", calcB6(tab6, quad, eq, oficialData, mf)),
    ];
  };

  // O "Geral" deve sempre refletir o consolidado de TODAS as equipes,
  // independente da equipe selecionada no filtro — esse filtro só deve
  // restringir o bloco "Por Equipe" (porEquipe), nunca o Geral.
  const geralIndicadores = buildGeral();
  const geral: EquipeResult = {
    equipe: "Geral",
    indicadores: geralIndicadores,
    notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
  };

  return { geral, porEquipe };
}
