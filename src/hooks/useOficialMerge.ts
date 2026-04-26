import { useMemo } from "react";
import { OficialData, makeOficialKey, normalizeMes } from "./useOficialData";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FonteDado = "oficial" | "preliminar";

export interface ValorIndicador {
  numerador: number;
  denominador: number;
  fonte: FonteDado;
}

export interface MesIndicadores {
  mes: string; // "MM/YYYY"
  b1: ValorIndicador;
  b2: ValorIndicador;
  b3: ValorIndicador;
  b4: ValorIndicador;
  b5: ValorIndicador;
  b6: ValorIndicador;
}

export interface PreliminarMes {
  mes: string;
  equipe?: string;
  numB1?: number; denB1?: number;
  numB2?: number; denB2?: number;
  numB3?: number; denB3?: number;
  numB4?: number; denB4?: number;
  numB5?: number; denB5?: number;
  numB6?: number; denB6?: number;
}

// ── Função pura de merge ──────────────────────────────────────────────────────

export const mergeIndicadores = (
  mes: string,
  equipe: string,
  preliminar: Partial<Record<keyof Omit<PreliminarMes, "mes" | "equipe">, number>>,
  oficialIndex: OficialData["index"] | null | undefined,
): MesIndicadores => {
  const mesNorm = normalizeMes(mes) ?? mes;
  const key = makeOficialKey(mesNorm, equipe);
  const of = oficialIndex?.get(key);

  const resolve = (
    indicador: 1 | 2 | 3 | 4 | 5 | 6,
    prelNum: number,
    prelDen: number,
  ): ValorIndicador => {
    if (of) {
      const numerador   = of[`numB${indicador}` as keyof typeof of] as number;
      const denominador = of[`denB${indicador}` as keyof typeof of] as number;
      if (numerador > 0 || denominador > 0) {
        return { numerador, denominador, fonte: "oficial" };
      }
    }
    return { numerador: prelNum, denominador: prelDen, fonte: "preliminar" };
  };

  return {
    mes: mesNorm,
    b1: resolve(1, preliminar.numB1 ?? 0, preliminar.denB1 ?? 0),
    b2: resolve(2, preliminar.numB2 ?? 0, preliminar.denB2 ?? 0),
    b3: resolve(3, preliminar.numB3 ?? 0, preliminar.denB3 ?? 0),
    b4: resolve(4, preliminar.numB4 ?? 0, preliminar.denB4 ?? 0),
    b5: resolve(5, preliminar.numB5 ?? 0, preliminar.denB5 ?? 0),
    b6: resolve(6, preliminar.numB6 ?? 0, preliminar.denB6 ?? 0),
  };
};

// ── Hook: lista de meses (MonthlyCards / QuadrimesterCards) ───────────────────

export const useMergedByMonth = (
  items: PreliminarMes[],
  oficialData: OficialData | null | undefined,
): MesIndicadores[] =>
  useMemo(
    () =>
      items.map(item =>
        mergeIndicadores(item.mes, item.equipe ?? "all", item, oficialData?.index),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items), oficialData],
  );

// ── Utilitário: soma de meses para card quadrimestral ─────────────────────────

/**
 * Fonte do quadrimestre = "oficial" somente se TODOS os meses forem oficiais.
 */
export const somarQuadrimestre = (meses: MesIndicadores[]): MesIndicadores => {
  const soma = (ind: keyof Omit<MesIndicadores, "mes">): ValorIndicador => {
    let num = 0;
    let den = 0;
    let todosOficiais = meses.length > 0;
    for (const m of meses) {
      const v = m[ind] as ValorIndicador;
      num += v.numerador;
      den += v.denominador;
      if (v.fonte !== "oficial") todosOficiais = false;
    }
    return { numerador: num, denominador: den, fonte: todosOficiais ? "oficial" : "preliminar" };
  };
  return {
    mes: meses[0]?.mes ?? "",
    b1: soma("b1"), b2: soma("b2"), b3: soma("b3"),
    b4: soma("b4"), b5: soma("b5"), b6: soma("b6"),
  };
};
