import { useMemo } from "react";
import { Patient, TratamentoPatient, Tab3Record, Tab4Patient, Tab5Record, Tab6Record, Quadrimestre } from "@/types/dashboard";

interface MesDetalhe {
  mes: string;
  numerador: number;
  denominador: number;
  porcentagem: number;
}

interface RawCalc {
  numerador: number;
  denominador: number;
  porcentagem: number;
  mesesDetalhe: MesDetalhe[];
}

interface IndicadorResult {
  id: string;
  numerador: number;
  denominador: number;
  porcentagem: number;
  notaFinal: number;
  mesesDetalhe: MesDetalhe[];
}

export interface EquipeResult {
  equipe: string;
  indicadores: IndicadorResult[];
  notaFinal: number;
}

const QUAD_MONTHS: Record<string, number[]> = {
  Q1: [0, 1, 2, 3],
  Q2: [4, 5, 6, 7],
  Q3: [8, 9, 10, 11],
};

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const MONTH_NAME_TO_NUM: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

/**
 * Normaliza o nome da equipe para facilitar a comparação
 * Remove espaços extras, converte para maiúsculas, remove acentos e caracteres não alfanuméricos
 */
const normalizeEquipeName = (name: string): string => {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^A-Z0-9]/g, "") // Remove TUDO que não for letra ou número
    .trim();
};

function parseDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const s = String(d);
  const parts = s.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

function getMonth(d: Date) { return d.getMonth(); }
function getYear(d: Date) { return d.getFullYear(); }

function buildIndicador(id: string, calc: RawCalc): IndicadorResult {
  const peso = 10 / 6;
  const notaFinal = (calc.porcentagem / 100) * peso;
  return { ...calc, id, notaFinal };
}

function getAllEquipes(...sources: any[][]): string[] {
  const set = new Set<string>();
  sources.forEach(src => src.forEach(item => item.equipe && set.add(item.equipe)));
  return Array.from(set).sort();
}

// ── Funções de Cálculo ────────────────────────────────────────────────────────

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
  const totalPatients = source.length;
  if (quad === "todos") {
    const concluido = source.filter(p => p.concluido === "SIM").length;
    return { numerador: concluido, denominador: totalPatients, porcentagem: totalPatients > 0 ? (concluido / totalPatients) * 100 : 0, mesesDetalhe: [] };
  }
  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  let sumNum = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const count = source.filter((p) => {
      const d = parseDate(p.dataConclusao);
      return d && getMonth(d) === m && getYear(d) === year && p.concluido === "SIM";
    }).length;
    sumNum += count;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: count, denominador: totalPatients, porcentagem: totalPatients > 0 ? (count / totalPatients) * 100 : 0 });
  });
  const denominador = totalPatients * 4;
  return { numerador: sumNum, denominador, porcentagem: denominador > 0 ? (sumNum / denominador) * 100 : 0, mesesDetalhe };
}

function calcB3(tab3: Tab3Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab3.filter((r) => r.equipe === equipe) : tab3;
  if (quad === "todos") {
    let sumArt = 0, sumTot = 0;
    source.forEach(r => { sumArt += r.art; sumTot += r.totalProcedimentos; });
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
    const ex = byMonth.get(mesIdx) || { art: 0, total: 0 };
    ex.art += r.art; ex.total += r.totalProcedimentos;
    byMonth.set(mesIdx, ex);
  });
  let sumArt = 0, sumTot = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const data = byMonth.get(m) || { art: 0, total: 0 };
    sumArt += data.art; sumTot += data.total;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.art, denominador: data.total, porcentagem: data.total > 0 ? (data.art / data.total) * 100 : 0 });
  });
  return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe };
}

function calcB4(tab5: Tab5Record[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab5.filter((r) => r.equipe === equipe) : tab5;
  if (quad === "todos") {
    let sumArt = 0, sumTot = 0;
    source.forEach(r => { sumArt += r.preventivos; sumTot += r.totalProcedimentos; });
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
    const ex = byMonth.get(mesIdx) || { art: 0, total: 0 };
    ex.art += r.preventivos; ex.total += r.totalProcedimentos;
    byMonth.set(mesIdx, ex);
  });
  let sumArt = 0, sumTot = 0;
  const mesesDetalhe: MesDetalhe[] = [];
  months.forEach((m) => {
    const data = byMonth.get(m) || { art: 0, total: 0 };
    sumArt += data.art; sumTot += data.total;
    mesesDetalhe.push({ mes: `${MONTH_ABBR[m]}/${year}`, numerador: data.art, denominador: data.total, porcentagem: data.total > 0 ? (data.art / data.total) * 100 : 0 });
  });
  return { numerador: sumArt, denominador: sumTot, porcentagem: sumTot > 0 ? (sumArt / sumTot) * 100 : 0, mesesDetalhe };
}

function calcB5(tab4: Tab4Patient[], quad: Quadrimestre, equipe?: string): RawCalc {
  const source = equipe ? tab4.filter((p) => p.equipe === equipe) : tab4;
  const totalPatients = source.length;
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
  denominadorB1: { porEquipe: Record<string, number>; total: number }
) {
  const allEquipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);
  const equipes = equipeFilter === "all" ? allEquipes : allEquipes.filter(e => e === equipeFilter);

  // Normaliza as chaves do objeto de denominadores para garantir o match
  const normalizedDenominadores = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(denominadorB1.porEquipe).forEach(([name, val]) => {
      result[normalizeEquipeName(name)] = val;
    });
    return result;
  }, [denominadorB1.porEquipe]);

  const porEquipe: EquipeResult[] = equipes.map((equipe) => {
    const normalizedName = normalizeEquipeName(equipe);
    
    // Tenta match exato primeiro
    let denomB1 = normalizedDenominadores[normalizedName] ?? 0;
    
    // Se não encontrar, tenta match parcial (ex: "ESB SEDE 1" e "SEDE 1")
    if (denomB1 === 0) {
      const matchKey = Object.keys(normalizedDenominadores).find(key => 
        normalizedName.includes(key) || key.includes(normalizedName)
      );
      if (matchKey) {
        denomB1 = normalizedDenominadores[matchKey];
        console.log(`[useResultadoFinal] Match PARCIAL encontrado para equipe "${equipe}": "${matchKey}" -> ${denomB1}`);
      } else {
        console.warn(`[useResultadoFinal] AVISO: Nenhum denominador encontrado para a equipe "${equipe}" (Normalizado: ${normalizedName})`);
      }
    } else {
      console.log(`[useResultadoFinal] Match EXATO para equipe "${equipe}": ${denomB1}`);
    }
    
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
    let denomB1 = 0;
    if (eq) {
      denomB1 = normalizedDenominadores[normalizeEquipeName(eq)] ?? 0;
    } else {
      // Soma os denominadores de todas as equipes usando match flexível
      denomB1 = allEquipes.reduce((acc, equipe) => {
        const normalizedName = normalizeEquipeName(equipe);
        let val = normalizedDenominadores[normalizedName] ?? 0;
        if (val === 0) {
          const matchKey = Object.keys(normalizedDenominadores).find(key => 
            normalizedName.includes(key) || key.includes(normalizedName)
          );
          if (matchKey) val = normalizedDenominadores[matchKey];
        }
        return acc + val;
      }, 0);
      console.log(`[useResultadoFinal] Denominador GERAL calculado (soma das equipes): ${denomB1}`);
    }

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
}
