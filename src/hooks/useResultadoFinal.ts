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

function buildIndicador(key: string, porcentagem: number): IndicadorResult {
  const config = INDICADORES.find((i) => i.key === key)!;
  const conceito = config.getConceito(porcentagem);
  const nota = CONCEITO_SCORES[conceito];
  return { indicador: config.label, peso: config.peso, porcentagem, conceito, nota, notaFinal: nota * config.peso };
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

// ── Cálculos de percentual por indicador ──────────────────────────────────────

// B1: (total consultas no quad / meses com dados / total pacientes) * 100
// Igual ao QuadrimesterCards.tsx
function calcPctB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? allPatients.filter((p) => p.equipe === equipe) : allPatients;
  const totalPatients = source.length;
  if (totalPatients === 0) return 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    // Agrupa por mês/ano e calcula média
    const byMonth = new Map<string, number>();
    source.forEach(p => {
      const d = parseDate(p.primeiraConsulta);
      if (d) {
        const key = `${getMonth(d)}-${getYear(d)}`;
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      }
    });
    
    if (byMonth.size === 0) return 0;
    const totalConsultas = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
    return (totalConsultas / byMonth.size / totalPatients) * 100;
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

  return monthsWithData > 0 ? (totalConsultas / monthsWithData / totalPatients) * 100 : 0;
}

// B2: média dos percentuais mensais (tratamento concluído / 1ª consulta por mês)
// Igual ao TratamentoQuadrimesterCards.tsx
function calcPctB2(
  tratamento: TratamentoPatient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? tratamento.filter((p) => p.equipe === equipe) : tratamento;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (quad === "todos") {
    // Agrupa consultas e tratamentos por mês
    const consultaByMonth = new Map<string, number>();
    const tratamentoByMonth = new Map<string, number>();
    
    source.forEach(p => {
      const dCons = parseDate(p.primeiraConsulta);
      const dTrat = parseDate(p.tratamentoConcluido);
      
      if (dCons) {
        const key = `${getMonth(dCons)}-${getYear(dCons)}`;
        consultaByMonth.set(key, (consultaByMonth.get(key) || 0) + 1);
      }
      
      if (dTrat) {
        const key = `${getMonth(dTrat)}-${getYear(dTrat)}`;
        tratamentoByMonth.set(key, (tratamentoByMonth.get(key) || 0) + 1);
      }
    });
    
    const monthlyPcts: number[] = [];
    consultaByMonth.forEach((consultas, key) => {
      const tratamentos = tratamentoByMonth.get(key) || 0;
      if (consultas > 0) {
        monthlyPcts.push((tratamentos / consultas) * 100);
      }
    });
    
    return monthlyPcts.length > 0 
      ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
      : 0;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  const monthlyPcts: number[] = [];
  
  months.forEach((m) => {
    const isCurrentOrPast = year < currentYear || (year === currentYear && m <= currentMonth);
    if (!isCurrentOrPast) return;
    
    const mTratamento = source.filter(p => {
      const d = parseDate(p.tratamentoConcluido);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
    
    const mConsulta = source.filter(p => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
    
    if (mConsulta > 0) {
      monthlyPcts.push((mTratamento / mConsulta) * 100);
    }
  });

  return monthlyPcts.length > 0 
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
    : 0;
}

// B3: média dos percentuais mensais (exodontias/total atendimentos por mês)
// Igual ao Tab3QuadrimesterCards.tsx
function calcPctB3(
  tab3: Tab3Record[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? tab3.filter((r) => r.equipe === equipe) : tab3;
  
  if (quad === "todos") {
    const byMonth = new Map<string, { exodontias: number; total: number }>();
    
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesName = parts[0]?.toLowerCase().trim();
      const ano = parseInt(parts[1]);
      const mesIdx = MONTH_NAME_TO_NUM[mesName];
      if (mesIdx === undefined) return;
      
      const key = `${mesIdx}-${ano}`;
      const existing = byMonth.get(key) || { exodontias: 0, total: 0 };
      existing.exodontias += r.exodontias;
      existing.total += r.totalAtendimentos;
      byMonth.set(key, existing);
    });
    
    const monthlyPcts: number[] = [];
    byMonth.forEach(({ exodontias, total }) => {
      if (total > 0) {
        monthlyPcts.push((exodontias / total) * 100);
      }
    });
    
    return monthlyPcts.length > 0 
      ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
      : 0;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  const byMonth = new Map<number, { exodontias: number; total: number }>();
  
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesName = parts[0]?.toLowerCase().trim();
    const ano = parseInt(parts[1]);
    const mesIdx = MONTH_NAME_TO_NUM[mesName];
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    
    const existing = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
    existing.exodontias += r.exodontias;
    existing.total += r.totalAtendimentos;
    byMonth.set(mesIdx, existing);
  });

  const monthlyPcts: number[] = [];
  byMonth.forEach(({ exodontias, total }) => {
    if (total > 0) {
      monthlyPcts.push((exodontias / total) * 100);
    }
  });

  return monthlyPcts.length > 0 
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
    : 0;
}

// B4 (Tab5): média dos percentuais mensais (preventivos/total individuais por mês)
// Igual ao Tab5QuadrimesterCards.tsx
function calcPctB4(
  tab5: Tab5Record[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? tab5.filter((r) => r.equipe === equipe) : tab5;
  
  if (quad === "todos") {
    const byMonth = new Map<string, { preventivos: number; total: number }>();
    
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesName = parts[0]?.toLowerCase().trim();
      const ano = parseInt(parts[1]);
      const mesIdx = MONTH_NAME_TO_NUM[mesName];
      if (mesIdx === undefined) return;
      
      const key = `${mesIdx}-${ano}`;
      const existing = byMonth.get(key) || { preventivos: 0, total: 0 };
      existing.preventivos += r.preventivos;
      existing.total += r.totalIndividuais;
      byMonth.set(key, existing);
    });
    
    const monthlyPcts: number[] = [];
    byMonth.forEach(({ preventivos, total }) => {
      if (total > 0) {
        monthlyPcts.push((preventivos / total) * 100);
      }
    });
    
    return monthlyPcts.length > 0 
      ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
      : 0;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  const byMonth = new Map<number, { preventivos: number; total: number }>();
  
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesName = parts[0]?.toLowerCase().trim();
    const ano = parseInt(parts[1]);
    const mesIdx = MONTH_NAME_TO_NUM[mesName];
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    
    const existing = byMonth.get(mesIdx) || { preventivos: 0, total: 0 };
    existing.preventivos += r.preventivos;
    existing.total += r.totalIndividuais;
    byMonth.set(mesIdx, existing);
  });

  const monthlyPcts: number[] = [];
  byMonth.forEach(({ preventivos, total }) => {
    if (total > 0) {
      monthlyPcts.push((preventivos / total) * 100);
    }
  });

  return monthlyPcts.length > 0 
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
    : 0;
}

// B5 (Tab4): (total escovações no quad / meses com dados / total pacientes) * 100
// Igual ao Tab4QuadrimesterCards.tsx
function calcPctB5(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? allTab4.filter((p) => p.equipe === equipe) : allTab4;
  const totalPatients = source.length;
  if (totalPatients === 0) return 0;

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
    
    if (byMonth.size === 0) return 0;
    const totalConsultas = Array.from(byMonth.values()).reduce((a, b) => a + b, 0);
    return (totalConsultas / byMonth.size / totalPatients) * 100;
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

  return monthsWithData > 0 ? (totalConsultas / monthsWithData / totalPatients) * 100 : 0;
}

// B6 (Tab6): média dos percentuais mensais (ART/total procedimentos por mês)
// Igual ao Tab6QuadrimesterCards.tsx
function calcPctB6(
  tab6: Tab6Record[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? tab6.filter((r) => r.equipe === equipe) : tab6;
  
  if (quad === "todos") {
    const byMonth = new Map<string, { exodontias: number; total: number }>();
    
    source.forEach(r => {
      const parts = r.mesAno.split("/");
      const mesName = parts[0]?.toLowerCase().trim();
      const ano = parseInt(parts[1]);
      const mesIdx = MONTH_NAME_TO_NUM[mesName];
      if (mesIdx === undefined) return;
      
      const key = `${mesIdx}-${ano}`;
      const existing = byMonth.get(key) || { exodontias: 0, total: 0 };
      existing.exodontias += r.exodontias;
      existing.total += r.totalProcedimentos;
      byMonth.set(key, existing);
    });
    
    const monthlyPcts: number[] = [];
    byMonth.forEach(({ exodontias, total }) => {
      if (total > 0) {
        monthlyPcts.push((exodontias / total) * 100);
      }
    });
    
    return monthlyPcts.length > 0 
      ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
      : 0;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];

  const byMonth = new Map<number, { exodontias: number; total: number }>();
  
  source.forEach(r => {
    const parts = r.mesAno.split("/");
    const mesName = parts[0]?.toLowerCase().trim();
    const ano = parseInt(parts[1]);
    const mesIdx = MONTH_NAME_TO_NUM[mesName];
    if (mesIdx === undefined || ano !== year || !months.includes(mesIdx)) return;
    
    const existing = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
    existing.exodontias += r.exodontias;
    existing.total += r.totalProcedimentos;
    byMonth.set(mesIdx, existing);
  });

  const monthlyPcts: number[] = [];
  byMonth.forEach(({ exodontias, total }) => {
    if (total > 0) {
      monthlyPcts.push((exodontias / total) * 100);
    }
  });

  return monthlyPcts.length > 0 
    ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
    : 0;
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

    // Por equipe
    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const indicadores = [
        buildIndicador("B1", calcPctB1(patients, quad, equipe)),
        buildIndicador("B2", calcPctB2(tratamento, quad, equipe)),
        buildIndicador("B3", calcPctB3(tab3, quad, equipe)),
        buildIndicador("B5", calcPctB5(tab4, quad, equipe)),
        buildIndicador("B4", calcPctB4(tab5, quad, equipe)),
        buildIndicador("B6", calcPctB6(tab6, quad, equipe)),
      ];
      return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
    });

    // Geral (sempre considera todas as equipes para o cálculo geral, ou apenas a filtrada)
    const geralIndicadores = equipeFilter === "all" ? [
      buildIndicador("B1", calcPctB1(patients, quad)),
      buildIndicador("B2", calcPctB2(tratamento, quad)),
      buildIndicador("B3", calcPctB3(tab3, quad)),
      buildIndicador("B5", calcPctB5(tab4, quad)),
      buildIndicador("B4", calcPctB4(tab5, quad)),
      buildIndicador("B6", calcPctB6(tab6, quad)),
    ] : [
      buildIndicador("B1", calcPctB1(patients, quad, equipeFilter)),
      buildIndicador("B2", calcPctB2(tratamento, quad, equipeFilter)),
      buildIndicador("B3", calcPctB3(tab3, quad, equipeFilter)),
      buildIndicador("B5", calcPctB5(tab4, quad, equipeFilter)),
      buildIndicador("B4", calcPctB4(tab5, quad, equipeFilter)),
      buildIndicador("B6", calcPctB6(tab6, quad, equipeFilter)),
    ];

    const geral: EquipeResult = {
      equipe: equipeFilter === "all" ? "Geral" : equipeFilter,
      indicadores: geralIndicadores,
      notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad, equipeFilter]);
}

