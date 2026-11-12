import { parse as dateFnsParse } from "date-fns";

/**
 * Substituto direto de `parse` do date-fns com cache.
 * O painel faz milhares de chamadas repetidas (mesmas strings de data,
 * 6 formatos tentados cada vez, a cada render). Com o cache cada
 * combinação (texto, formato) é interpretada uma única vez.
 */
const cache = new Map<string, number>(); // valor: timestamp, ou NaN se inválido

export function parse(dateStr: string, fmt: string, ref: Date): Date {
  const key = `${fmt}|${dateStr}`;
  let ts = cache.get(key);
  if (ts === undefined) {
    ts = dateFnsParse(dateStr, fmt, ref).getTime();
    if (cache.size > 50000) cache.clear();
    cache.set(key, ts);
  }
  return new Date(ts);
}
