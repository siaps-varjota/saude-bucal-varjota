/** B2 is capped before monthly averaging; actual treatment counts stay intact. */
export const limitarPercentualB2 = (percentage: number): number =>
  Math.min(100, percentage);

export const percentualB2 = (numerador: number, denominador: number): number =>
  denominador > 0 ? limitarPercentualB2((numerador / denominador) * 100) : 0;