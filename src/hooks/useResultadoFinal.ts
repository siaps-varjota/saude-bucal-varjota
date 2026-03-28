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

// ... (calcB2, calcB3, calcB4, calcB5, calcB6 permanecem iguais aos que você enviou)

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
        // ... outros indicadores chamando suas respectivas funções calcBX
      ];
      return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
    });

    const buildGeral = (eq?: string) => {
      const denomB1 = eq ? (denominadorB1.porEquipe.get(eq) ?? 0) : denominadorB1.total;
      return [
        buildIndicador("B1", calcB1(patients, quad, denomB1, eq)),
        // ... outros indicadores chamando suas respectivas funções calcBX
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
}
