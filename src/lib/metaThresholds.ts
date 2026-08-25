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
