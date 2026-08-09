// ── Pontuação de desempate (0–1000) ───────────────────────────────────────────
// Cada indicador B1–B6 é normalizado numa escala contínua 0–100 (respeitando as
// faixas de conceito Regular/Suficiente/Bom/Ótimo) e depois ponderado pelo peso
// oficial do indicador. Soma dos pesos = 10 → máximo teórico = 1000 pontos.
// Serve APENAS como critério de desempate quando duas equipes têm a mesma nota
// final (a nota final continua sendo 0–10 por conceito).

// ===== B1 - Consulta odontológica (razão, sem teto natural) =====
export function normalizarB1(a: number): number {
  if (a <= 0.25) return (a / 0.25) * 25;
  if (a <= 0.75) return 26 + ((a - 0.25) / (0.75 - 0.25)) * (50 - 26);
  if (a <= 1.25) return 51 + ((a - 0.75) / (1.25 - 0.75)) * (75 - 51);
  const teto = 1.25 * 2; // 2.5
  if (a <= teto) return 76 + ((a - 1.25) / (teto - 1.25)) * (100 - 76);
  return 100;
}

// ===== B2 - Tratamento concluído (já é 0-100 com os mesmos cortes) =====
export function normalizarB2(a: number): number {
  return Math.max(0, Math.min(100, a));
}

// ===== B3 - Taxa de exodontia (menor-melhor; Ótimo é a faixa 3 ≤ x < 10) =====
// Polaridade menor-melhor: dentro da própria faixa Ótima, o valor mais baixo
// (perto de 3) é o melhor, caindo a nota conforme "a" sobe em direção a 10.
// Abaixo de 3 volta a Regular (provável subnotificação/piso).
export function normalizarB3(a: number): number {
  if (a < 3) return Math.max(0, (a / 3) * 25); // Regular (piso)
  if (a < 10) return 100 - ((a - 3) / (10 - 3)) * (100 - 76); // Ótimo: 100 em a=3 → 76 em a=10
  if (a < 12) return 75 - ((a - 10) / (12 - 10)) * (75 - 51); // Bom: 75 → 51
  if (a < 14) return 50 - ((a - 12) / (14 - 12)) * (50 - 26); // Suficiente: 50 → 26
  const tetoAlto = 14 * 1.5; // 21
  if (a < tetoAlto) return 25 - ((a - 14) / (tetoAlto - 14)) * 25; // Regular (excesso)
  return 0;
}

// ===== B4 - Escovação supervisionada (razão, sem teto natural) =====
export function normalizarB4(a: number): number {
  if (a <= 0.25) return (a / 0.25) * 25;
  if (a <= 0.5) return 26 + ((a - 0.25) / (0.5 - 0.25)) * (50 - 26);
  if (a <= 1) return 51 + ((a - 0.5) / (1 - 0.5)) * (75 - 51);
  const teto = 1 * 2; // 2
  if (a <= teto) return 76 + ((a - 1) / (teto - 1)) * (100 - 76);
  return 100;
}

// ===== B5 - Procedimentos preventivos (maior-melhor; Ótimo é 65 ≤ x ≤ 85) =====
// Polaridade maior-melhor: dentro da própria faixa Ótima, o valor mais alto
// (perto de 85) é o melhor, subindo a nota conforme "a" cresce de 65 a 85.
// Acima de 85 volta a Regular (provável excesso/erro de registro).
export function normalizarB5(a: number): number {
  if (a < 40) return Math.max(0, (a / 40) * 25); // Regular (piso)
  if (a < 55) return 26 + ((a - 40) / (55 - 40)) * (50 - 26); // Suficiente: 26 → 50
  if (a < 65) return 51 + ((a - 55) / (65 - 55)) * (75 - 51); // Bom: 51 → 75
  if (a <= 85) return 76 + ((a - 65) / (85 - 65)) * (100 - 76); // Ótimo: 76 em a=65 → 100 em a=85
  const tetoAlto = 85 * 1.3; // ~110.5
  if (a < tetoAlto) return 25 - ((a - 85) / (tetoAlto - 85)) * 25; // Regular (excesso)
  return 0;
}

// ===== B6 - Tratamento restaurador atraumático (razão, sem teto natural) =====
export function normalizarB6(a: number): number {
  if (a <= 3) return (a / 3) * 25;
  if (a <= 6) return 26 + ((a - 3) / (6 - 3)) * (50 - 26);
  if (a <= 8) return 51 + ((a - 6) / (8 - 6)) * (75 - 51);
  const teto = 8 * 2; // 16
  if (a <= teto) return 76 + ((a - 8) / (teto - 8)) * (100 - 76);
  return 100;
}

export type IndicadorKey = "B1" | "B2" | "B3" | "B4" | "B5" | "B6";

const NORMALIZADORES: Record<IndicadorKey, (a: number) => number> = {
  B1: normalizarB1,
  B2: normalizarB2,
  B3: normalizarB3,
  B4: normalizarB4,
  B5: normalizarB5,
  B6: normalizarB6,
};

/** Normaliza o percentual do indicador para a escala 0–100 (clampada). */
export const normalizarIndicador = (key: IndicadorKey, pct: number): number => {
  const fn = NORMALIZADORES[key];
  if (!fn || !Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, fn(pct)));
};

/**
 * Pontuação parcial do indicador na escala de desempate:
 * normalizado (0–100) × peso. Soma dos pesos = 10 → total máximo 1000.
 */
export const pontosDesempateIndicador = (
  key: IndicadorKey,
  pct: number,
  peso: number,
): number => normalizarIndicador(key, pct) * peso;

/** Mapeia o rótulo exibido do indicador para sua chave B1–B6. */
export const LABEL_TO_KEY: Record<string, IndicadorKey> = {
  "1ª Consulta Odontológica": "B1",
  "Tratamento Concluído": "B2",
  "Taxa de Exodontias": "B3",
  "Escovação Supervisionada": "B4",
  "Proced. Odont. Preventivos": "B5",
  "Trat. Restaurador Atraumático": "B6",
};

/** Formata a pontuação de desempate (0–1000) com 1 casa decimal, vírgula. */
export const formatDesempate = (v: number): string =>
  v.toFixed(1).replace(".", ",");
