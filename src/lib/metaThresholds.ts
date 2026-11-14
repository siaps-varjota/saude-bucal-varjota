// ── Regra ÚNICA de thresholds de meta/conceito ────────────────────────────────
// Fonte de verdade compartilhada entre o Resultado Final (UI) e o PDF de
// pendências, para que "Ótimo" e "Meta atingida" usem sempre o mesmo critério.
//
// Convenção: TODOS os thresholds são superados de forma ESTRITA (valor > threshold).
// Parâmetros do tipo "≥ X%" são representados por um threshold levemente inferior
// (ex.: ≥ 55% -> 0.55 - 1e-9), de modo que "> (0,55 - ε)" equivale a "≥ 55%".

export interface MetaThreshold {
  /** Código do indicador (B1, B2, ...) */
  code: string;
  labelBom: string;
  thresholdBom: number;
  labelOtimo: string;
  thresholdOtimo: number;
  /** Unidade exibida em metas/faltam */
  unit: string;
  /** Incremento típico no numerador por unidade adicionada */
  deltaNum: number;
  /** Incremento típico no denominador por unidade adicionada */
  deltaDenom: number;
  /** true quando MENOR é melhor (ex.: B3): os thresholds são limites SUPERIORES (valor < threshold). */
  menorMelhor?: boolean;
}

export const META_THRESHOLDS: Partial<Record<string, MetaThreshold>> = {
  "1ª Consulta Odontológica": {
    code: "B1",
    labelBom: "> 0,75%",   thresholdBom: 0.0075,
    labelOtimo: "> 1,25%", thresholdOtimo: 0.0125,
    unit: "atend.", deltaNum: 1, deltaDenom: 0,
  },
  "Tratamento Concluído": {
    code: "B2",
    labelBom: "> 50%",   thresholdBom: 0.501,
    labelOtimo: "> 75%", thresholdOtimo: 0.751,
    unit: "trat.", deltaNum: 1, deltaDenom: 0,
  },
  "Proced. Odont. Preventivos": {
    code: "B5",
    labelBom: ">= 55%",   thresholdBom: 0.55 - 1e-9,
    labelOtimo: ">= 65%", thresholdOtimo: 0.65 - 1e-9,
    unit: "prev.", deltaNum: 2, deltaDenom: 2,
  },
  "Escovação Supervisionada": {
    code: "B4",
    labelBom: "> 0,5%",  thresholdBom: 0.005,
    labelOtimo: "> 1%",  thresholdOtimo: 0.01,
    unit: "atend.", deltaNum: 1, deltaDenom: 0,
  },
  // B3 — menor é melhor: Ótimo < 10% | Bom < 12% (limites superiores, estritos).
  // Só entra aqui para o card de meta; cálculos "maior é melhor" ignoram menorMelhor.
  "Taxa de Exodontias": {
    code: "B3",
    labelBom: "< 12%",   thresholdBom: 0.12,
    labelOtimo: "< 10%", thresholdOtimo: 0.10,
    unit: "proced.", deltaNum: 0, deltaDenom: 1,
    menorMelhor: true,
  },
  "Trat. Restaurador Atraumático": {
    code: "B6",
    labelBom: "> 6%",   thresholdBom: 0.0601,
    labelOtimo: "> 8%", thresholdOtimo: 0.0801,
    unit: "ART", deltaNum: 1, deltaDenom: 1,
  },
};

/** Indicadores sem simulação por incremento, mas com prefixo de código. */
export const LABEL_SEM_SIMULACAO: Record<string, string> = {
  "Taxa de Exodontias": "B3",
};

/** true quando o percentual SUPERA ESTRITAMENTE o threshold. */
export const atingiuThreshold = (num: number, den: number, threshold: number): boolean =>
  den > 0 && num / den > threshold;

/** Menor valor INTEIRO do numerador que supera estritamente o threshold. */
export const strictMeta = (den: number, threshold: number): number =>
  den > 0 ? Math.floor(threshold * den) + 1 : 0;

/**
 * Quantas unidades faltam (incremento típico do indicador) para superar
 * ESTRITAMENTE o threshold. Retorna 0 quando já atingido.
 */
export function calcFaltam(
  num: number,
  den: number,
  threshold: number,
  deltaNum = 1,
  deltaDenom = 0,
): number {
  if (atingiuThreshold(num, den, threshold)) return 0;
  const dn = deltaNum || 1;
  const dd = deltaDenom || 0;
  const d = dn - dd * threshold;
  if (d <= 0) return 0;
  const x = (threshold * den - num) / d;
  return Math.max(0, Math.floor(x) + 1);
}

/**
 * "Faltam" pela regra do PERCENTUAL MÉDIO MENSAL: o percentual do período é a
 * média dos percentuais mensais (só meses com denominador > 0). Calcula quantas
 * unidades (incremento típico do indicador) precisam ser somadas ao ÚLTIMO mês
 * com dado para que essa média SUPERE ESTRITAMENTE o threshold.
 *
 * `meses` deve estar em ordem cronológica. Retorna null quando não há nenhum
 * mês com denominador > 0 (o chamador decide o fallback).
 */
export function calcFaltamMediaMensal(
  meses: { num: number; den: number }[],
  threshold: number,
  deltaNum = 1,
  deltaDenom = 0,
  capMensal?: number,
): number | null {
  const valid = meses.filter((m) => m.den > 0);
  if (valid.length === 0) return null;

  // Razão mensal usada na média; `capMensal` limita meses acima de 100% (ex.: B2).
  const ratio = (m: { num: number; den: number }) => {
    const r = m.num / m.den;
    return capMensal != null ? Math.min(capMensal, r) : r;
  };

  const k    = valid.length;
  const soma = valid.reduce((s, m) => s + ratio(m), 0);
  const last = valid[valid.length - 1];
  const pLast = ratio(last);

  // Percentual que o último mês precisa atingir para a média bater o threshold
  const alvoMes = threshold * k - (soma - pLast);

  // Com teto mensal, o último mês não pode passar do teto: se o alvo exige mais,
  // a meta é inalcançável somando só neste mês → o chamador usa o fallback.
  if (capMensal != null && alvoMes > capMensal) return null;

  const dn = deltaNum || 1;
  const dd = deltaDenom || 0;

  let x: number;
  if (dd === 0) {
    x = (alvoMes * last.den - last.num) / dn;
  } else {
    const div = dn - dd * alvoMes;
    if (div <= 0) return null; // inalcançável somando só neste mês
    x = (alvoMes * last.den - last.num) / div;
  }

  if (!isFinite(x) || x <= 0) return 0;
  return Math.floor(x) + 1; // superação estrita
}

/**
 * Calcula o par (Bom, Ótimo) de forma COERENTE: usa a regra do percentual médio
 * mensal apenas quando ela produz resultados válidos e monotônicos
 * (faltamBom <= faltamOtimo). Caso contrário — mês inalcançável, ausência de
 * meses válidos ou inversão — usa os valores de fallback agregados para AMBOS,
 * evitando exibir "Bom" exigindo mais que "Ótimo".
 */
export function calcFaltamPar(
  meses: { num: number; den: number }[],
  thresholdBom: number,
  thresholdOtimo: number,
  deltaNum = 1,
  deltaDenom = 0,
  fallbackBom = 0,
  fallbackOtimo = 0,
  capMensal?: number,
): { bom: number; otimo: number; viaMedia: boolean } {
  const mBom   = calcFaltamMediaMensal(meses, thresholdBom,   deltaNum, deltaDenom, capMensal);
  const mOtimo = calcFaltamMediaMensal(meses, thresholdOtimo, deltaNum, deltaDenom, capMensal);
  if (mBom !== null && mOtimo !== null && mBom <= mOtimo) {
    return { bom: mBom, otimo: mOtimo, viaMedia: true };
  }
  return {
    bom:   Math.max(0, fallbackBom),
    otimo: Math.max(0, fallbackOtimo),
    viaMedia: false,
  };
}

// ── Método "mês atual": média ≥ meta nos N meses do período ────────────────────
// O conceito do período é a MÉDIA dos percentuais mensais. Para fechar o período
// com média ≥ meta: N × meta − Σ(meses já FECHADOS) é dividido igualmente entre o
// mês em andamento e os meses que ainda não aconteceram. O mês em andamento deve
// atingir esse percentual; os meses futuros serão calculados quando existirem.

export interface MesCalcLabel {
  mes?: string;
  num: number;
  den: number;
}

const ABBR_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "Nov/2026" ou "11/2026" -> ano*12 + mês (0-11); null se não reconhecer. */
export function chaveMes(label?: string): number | null {
  if (!label) return null;
  const [a, b] = label.split("/");
  const ano = parseInt(b, 10);
  if (isNaN(ano)) return null;
  let m = ABBR_MES.indexOf(a.trim().slice(0, 3).toLowerCase());
  if (m < 0) {
    const n = parseInt(a, 10);
    if (isNaN(n) || n < 1 || n > 12) return null;
    m = n - 1;
  }
  return ano * 12 + m;
}

/**
 * Índice do mês "em andamento": o mês corrente do calendário, se estiver na lista;
 * senão (período já encerrado) o último mês com dado.
 */
export function indiceMesAberto(meses: MesCalcLabel[], hoje: Date = new Date()): number {
  const chaveHoje = hoje.getFullYear() * 12 + hoje.getMonth();
  const idx = meses.findIndex((m) => chaveMes(m.mes) === chaveHoje);
  if (idx >= 0) return idx;
  for (let i = meses.length - 1; i >= 0; i--) if (meses[i].den > 0) return i;
  return meses.length - 1;
}

const razao = (m: { num: number; den: number }, cap?: number) => {
  const r = m.den > 0 ? m.num / m.den : 0;
  return cap != null ? Math.min(cap, r) : r;
};

export interface FaltamMesAtual {
  /** unidades a somar no mês atual; 0 = já atingido; null = inalcançável neste mês */
  faltam: number | null;
  /** fração (0-1) que o mês atual precisa atingir */
  alvo: number;
  idxAberto: number;
  mesAberto?: string;
  fechados: number;
}

export function calcFaltamMesAtual(
  meses: MesCalcLabel[],
  nMeses: number,
  threshold: number,
  deltaNum = 1,
  deltaDenom = 0,
  capMensal?: number,
  hoje: Date = new Date(),
): FaltamMesAtual | null {
  if (meses.length === 0) return null;
  const idx = indiceMesAberto(meses, hoje);
  if (idx < 0) return null;
  const fechados = meses.filter((m, i) => i < idx && m.den > 0);
  const soma = fechados.reduce((s, m) => s + razao(m, capMensal), 0);
  const abertos = Math.max(1, nMeses - fechados.length);
  const alvo = (nMeses * threshold - soma) / abertos;
  const atual = meses[idx];
  const base = { alvo, idxAberto: idx, mesAberto: atual.mes, fechados: fechados.length };

  if (atual.den > 0 && razao(atual, capMensal) > alvo) return { faltam: 0, ...base };
  if (alvo <= 0) return { faltam: 0, ...base };
  if (capMensal != null && alvo > capMensal) return { faltam: null, ...base };

  const dn = deltaNum || 1;
  const dd = deltaDenom || 0;
  let x: number;
  if (dd === 0) {
    x = (alvo * atual.den - atual.num) / dn;
  } else {
    const div = dn - dd * alvo;
    if (div <= 0) return { faltam: null, ...base };
    x = (alvo * atual.den - atual.num) / div;
  }
  if (!isFinite(x)) return { faltam: null, ...base };
  return { faltam: x <= 0 ? 0 : Math.floor(x) + 1, ...base };
}

/**
 * Percentual (0-100) do período projetado: soma `extraNum`/`extraDen` ao mês em
 * andamento. Com `nMeses`, os meses que ainda não aconteceram são assumidos com o
 * MESMO desempenho do mês em andamento (mesma premissa do cálculo de "Faltam"),
 * e a média é feita sobre os `nMeses` do período. Sem `nMeses`, é a média dos
 * meses com denominador > 0.
 */
export function projetaMediaMensal(
  meses: MesCalcLabel[],
  extraNum: number,
  extraDen: number,
  capMensal?: number,
  hoje: Date = new Date(),
  nMeses?: number,
): number | null {
  if (meses.length === 0) return null;
  const idx = indiceMesAberto(meses, hoje);
  const proj = meses.map((m, i) => (i === idx ? { ...m, num: m.num + extraNum, den: m.den + extraDen } : m));
  const atual = proj[idx];

  if (nMeses != null && atual && atual.den > 0) {
    const fechados = proj.filter((m, i) => i < idx && m.den > 0);
    const abertos = Math.max(1, nMeses - fechados.length);
    const soma = fechados.reduce((s, m) => s + razao(m, capMensal), 0) + razao(atual, capMensal) * abertos;
    return (soma / (fechados.length + abertos)) * 100;
  }

  const validos = proj.filter((m) => m.den > 0);
  if (validos.length === 0) return null;
  return (validos.reduce((s, m) => s + razao(m, capMensal), 0) / validos.length) * 100;
}

/**
 * Versão "menor é melhor" (B3): a média dos N meses precisa ficar ABAIXO de
 * `threshold`. O mês atual precisa ficar abaixo de (N × limite − Σ fechados) / abertos.
 * Só é possível reduzir o % somando procedimentos (sem novas exodontias) ao denominador.
 * `faltam` = procedimentos a somar no mês atual; 0 = já atingido; null = inalcançável.
 */
export function calcFaltamMesAtualMenorMelhor(
  meses: MesCalcLabel[],
  nMeses: number,
  threshold: number,
  hoje: Date = new Date(),
): FaltamMesAtual | null {
  if (meses.length === 0) return null;
  const idx = indiceMesAberto(meses, hoje);
  if (idx < 0) return null;
  const fechados = meses.filter((m, i) => i < idx && m.den > 0);
  const soma = fechados.reduce((s, m) => s + razao(m), 0);
  const abertos = Math.max(1, nMeses - fechados.length);
  const alvo = (nMeses * threshold - soma) / abertos;
  const atual = meses[idx];
  const base = { alvo, idxAberto: idx, mesAberto: atual.mes, fechados: fechados.length };

  if (alvo <= 0) return { faltam: null, ...base };
  if (atual.den > 0 && razao(atual) < alvo) return { faltam: 0, ...base };
  if (atual.num <= 0) return { faltam: 0, ...base };

  // (num) / (den + x) < alvo  ->  x > num/alvo − den
  const x = atual.num / alvo - atual.den;
  if (!isFinite(x)) return { faltam: null, ...base };
  return { faltam: x < 0 ? 0 : Math.floor(x) + 1, ...base };
}

/** Piso do B3: abaixo de 3% o conceito é Regular (faixa Ótimo/Bom é ≥ 3%). */
export const PISO_B3 = 0.03;

export interface FaltamB3 extends FaltamMesAtual {
  /** menor % que o mês atual pode ter para a média do período não cair do piso */
  alvoMin: number;
  /** exodontias a somar (num e den) para atingir o piso; 0 = já acima do piso */
  faltamExo: number;
}

/**
 * B3 com faixa: a média dos N meses precisa ficar em [piso, limite).
 *  - acima do limite  -> somar procedimentos ao denominador (sem novas exodontias);
 *  - abaixo do piso   -> são necessárias mais exodontias (mínimo).
 */
export function calcFaltamMesAtualB3(
  meses: MesCalcLabel[],
  nMeses: number,
  limite: number,
  piso: number = PISO_B3,
  hoje: Date = new Date(),
): FaltamB3 | null {
  const sup = calcFaltamMesAtualMenorMelhor(meses, nMeses, limite, hoje);
  if (!sup) return null;
  const atual = meses[sup.idxAberto];
  const fechados = meses.filter((m, i) => i < sup.idxAberto && m.den > 0);
  const soma = fechados.reduce((s, m) => s + razao(m), 0);
  const abertos = Math.max(1, nMeses - fechados.length);
  const alvoMin = (nMeses * piso - soma) / abertos;

  let faltamExo = 0;
  if (alvoMin > 0 && atual.den > 0 && razao(atual) < alvoMin && alvoMin < 1) {
    // (num + x) / (den + x) >= alvoMin
    faltamExo = Math.max(0, Math.ceil((alvoMin * atual.den - atual.num) / (1 - alvoMin) - 1e-9));
  }
  return { ...sup, alvoMin, faltamExo };
}

/** Semanas que restam no mês corrente (0 quando o mês em andamento não é o do calendário). */
export function semanasRestantesNoMes(mesAberto?: string, hoje: Date = new Date()): number {
  if (!mesAberto || chaveMes(mesAberto) !== hoje.getFullYear() * 12 + hoje.getMonth()) return 0;
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return Math.max(1, diasNoMes - hoje.getDate() + 1) / 7;
}
