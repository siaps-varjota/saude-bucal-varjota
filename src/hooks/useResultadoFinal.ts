import { useMemo } from "react";
import { parse, isValid, differenceInYears, getMonth, getYear } from "date-fns";
import { Patient } from "@/hooks/usePatientData";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Tab3Record } from "@/hooks/useTab3Data";
import { Tab4Patient } from "@/hooks/useTab4Data";
import { Tab5Record } from "@/hooks/useTab5Data";
import { Tab6Record } from "@/hooks/useTab6Data";
import {
  Quadrimestre,
  filterPatientsByQuadrimestre,
  filterTratamentoByQuadrimestre,
  filterByQuadrimestre,
  filterTab4ByQuadrimestre,
} from "@/hooks/useQuadrimesterFilter";

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

// B1: média mensal do período / total cadastrado (igual ao QuadrimesterCards)
function calcPctB1(
  allPatients: Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? allPatients.filter((p) => p.equipe === equipe) : allPatients;
  const totalPatients = source.length;
  if (totalPatients === 0) return 0;

  if (quad === "todos") {
    // Calcula média de todos os quadrimestres disponíveis
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Agrupa por mês/ano
    const byMonth = new Map<string, number>();
    source.forEach(p => {
      const d = parseDate(p.primeiraConsulta);
      if (d) {
        const key = `${getMonth(d)}-${getYear(d)}`;
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      }
    });
    
    if (byMonth.size === 0) return 0;
    
    // Calcula percentual médio de cada mês
    let totalPct = 0;
    byMonth.forEach(count => {
      totalPct += (count / totalPatients) * 100;
    });
    
    return totalPct / byMonth.size;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const now = new Date();

  let monthsWithData = 0;
  const monthlyPcts: number[] = [];

  months.forEach((m) => {
    const isCurrentOrPast = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
    if (!isCurrentOrPast) return;
    monthsWithData++;
    
    const count = source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
    
    // Não calcula percentual por mês, soma total e divide no final
  });

  if (monthsWithData === 0) return 0;

  // Total de consultas no período dividido por meses com dados dividido por total de pacientes
  let totalConsultas = 0;
  months.forEach((m) => {
    const isCurrentOrPast = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
    if (!isCurrentOrPast) return;
    
    totalConsultas += source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
  });

  return (totalConsultas / monthsWithData / totalPatients) * 100;
}

// B2: média dos percentuais mensais (tratamento/consulta por mês)
function calcPctB2(
  tratamento: TratamentoPatient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? tratamento.filter((p) => p.equipe === equipe) : tratamento;
  
  if (quad === "todos") {
    // Agrupa por mês e calcula média dos percentuais mensais
    const byMonth = new Map<string, { tratamento: number; consulta: number }>();
    
    source.forEach(p => {
      const dTrat = parseDate(p.tratamentoConcluido);
      const dCons = parseDate(p.primeiraConsulta);
      
      if (dCons) {
        const key = `${getMonth(dCons)}-${getYear(dCons)}`;
        const existing = byMonth.get(key) || { tratamento: 0, consulta: 0 };
        existing.consulta++;
        byMonth.set(key, existing);
      }
      
      if (dTrat) {
        const key = `${getMonth(dTrat)}-${getYear(dTrat)}`;
        const existing = byMonth.get(key) || { tratamento: 0, consulta: 0 };
        existing.tratamento++;
        byMonth.set(key, existing);
      }
    });
    
    const monthlyPcts: number[] = [];
    byMonth.forEach(({ tratamento, consulta }) => {
      if (consulta > 0) {
        monthlyPcts.push((tratamento / consulta) * 100);
      }
    });
    
    return monthlyPcts.length > 0 
      ? monthlyPcts.reduce((a, b) => a + b, 0) / monthlyPcts.length 
      : 0;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const now = new Date();

  const monthlyPcts: number[] = [];
  
  months.forEach((m) => {
    const isCurrentOrPast = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
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

// B3: média dos percentuais mensais (exodontias/total por mês)
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

// B5 (Tab4): média mensal do período / total cadastrado
function calcPctB5(
  allTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const source = equipe ? allTab4.filter((p) => p.equipe === equipe) : allTab4;
  const totalPatients = source.length;
  if (totalPatients === 0) return 0;

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
    
    let totalPct = 0;
    byMonth.forEach(count => {
      totalPct += (count / totalPatients) * 100;
    });
    
    return totalPct / byMonth.size;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const now = new Date();

  let monthsWithData = 0;
  let totalConsultas = 0;

  months.forEach((m) => {
    const isCurrentOrPast = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
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

// B1: média mensal do período / total cadastrado (igual ao QuadrimesterCards)
function calcPctB1(
  allPatients: Patient[],
  fPatients: Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const total = equipe
    ? allPatients.filter((p) => p.equipe === equipe).length
    : allPatients.length;
  if (total === 0) return 0;

  const source = equipe ? fPatients.filter((p) => p.equipe === equipe) : fPatients;

  if (quad === "todos") {
    const withConsulta = source.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
    return (withConsulta / total) * 100;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const now = new Date();

  let count = 0;
  let monthsWithData = 0;

  months.forEach((m) => {
    const isCurrentOrPast =
      year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
    if (!isCurrentOrPast) return;
    monthsWithData++;
    count += source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year;
    }).length;
  });

  return monthsWithData > 0 ? (count / monthsWithData / total) * 100 : 0;
}

// B2: tratamentos concluídos no período / 1ªs consultas no mesmo período
function calcPctB2(fTratamento: TratamentoPatient[], equipe?: string): number {
  const filtered = equipe ? fTratamento.filter((p) => p.equipe === equipe) : fTratamento;
  const total = filtered.filter((p) => !isTratamentoPendente(p.primeiraConsulta)).length;
  const withTrat = filtered.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
  return total > 0 ? (withTrat / total) * 100 : 0;
}

// B5: média mensal do período / total cadastrado Tab4 (igual ao Tab4QuadrimesterCards)
function calcPctB5(
  allTab4: Tab4Patient[],
  fTab4: Tab4Patient[],
  quad: Quadrimestre,
  equipe?: string
): number {
  const total = equipe
    ? allTab4.filter((p) => p.equipe === equipe).length
    : allTab4.length;
  if (total === 0) return 0;

  const source = equipe ? fTab4.filter((p) => p.equipe === equipe) : fTab4;

  if (quad === "todos") {
    const withEscovacao = source.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
    return (withEscovacao / total) * 100;
  }

  const [q, yearStr] = quad.split("-");
  const year = parseInt(yearStr, 10);
  const months = QUAD_MONTHS[q] || [];
  const now = new Date();

  let count = 0;
  let monthsWithData = 0;

  months.forEach((m) => {
    const isCurrentOrPast =
      year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth());
    if (!isCurrentOrPast) return;
    monthsWithData++;
    count += source.filter((p) => {
      const d = parseDate(p.primeiraConsulta);
      return d && getMonth(d) === m && getYear(d) === year && !isConsultaPendenteTab4(p.primeiraConsulta);
    }).length;
  });

  return monthsWithData > 0 ? (count / monthsWithData / total) * 100 : 0;
}

// ── hook principal ────────────────────────────────────────────────────────────

export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[],
  quad: Quadrimestre = "todos"
) {
  return useMemo(() => {
    const fPatients   = filterPatientsByQuadrimestre(patients, quad);
    const fTratamento = filterTratamentoByQuadrimestre(tratamento, quad);
    const fTab3       = filterByQuadrimestre(tab3, quad);
    const fTab4       = filterTab4ByQuadrimestre(tab4, quad);
    const fTab5       = filterByQuadrimestre(tab5, quad);
    const fTab6       = filterByQuadrimestre(tab6, quad);

    const equipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);

    // Por equipe
    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      const indicadores = [
        buildIndicador("B1", calcPctB1(patients, fPatients, quad, equipe)),
        buildIndicador("B2", calcPctB2(fTratamento, equipe)),
        buildIndicador("B3", avgMonthlyPct(fTab3, equipe)),
        buildIndicador("B4", avgMonthlyPct(fTab5, equipe)),
        buildIndicador("B5", calcPctB5(tab4, fTab4, quad, equipe)),
        buildIndicador("B6", avgMonthlyPct(fTab6, equipe)),
      ];
      return { equipe, indicadores, notaFinal: indicadores.reduce((s, i) => s + i.notaFinal, 0) };
    });

    // Geral
    const geralIndicadores = [
      buildIndicador("B1", calcPctB1(patients, fPatients, quad)),
      buildIndicador("B2", calcPctB2(fTratamento)),
      buildIndicador("B3", avgMonthlyPct(fTab3)),
      buildIndicador("B4", avgMonthlyPct(fTab5)),
      buildIndicador("B5", calcPctB5(tab4, fTab4, quad)),
      buildIndicador("B6", avgMonthlyPct(fTab6)),
    ];

    const geral: EquipeResult = {
      equipe: "Geral",
      indicadores: geralIndicadores,
      notaFinal: geralIndicadores.reduce((s, i) => s + i.notaFinal, 0),
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad]);
}
