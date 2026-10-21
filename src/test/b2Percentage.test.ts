import { describe, expect, it } from "vitest";
import { limitarPercentualB2, percentualB2 } from "@/lib/b2Percentage";
import { calcFaltamMediaMensal, calcFaltamPar } from "@/lib/metaThresholds";
import { useResultadoFinal } from "@/hooks/useResultadoFinal";
import { makeOficialKey, type OficialData, type OficialRow } from "@/hooks/useOficialData";
import type { TratamentoPatient } from "@/hooks/useTratamentoData";

describe("B2 ceiling", () => {
  it("limits a month with 50 treatments and 32 consultations to 100%", () => {
    expect(percentualB2(50, 32)).toBe(100);
    expect(percentualB2(37, 56)).toBeCloseTo(66.07142857);
    expect(percentualB2(50, 0)).toBe(0);
  });

  it("limits projected B2 to 100% without changing values below the ceiling", () => {
    expect(limitarPercentualB2(86.36 + 300 / 239 * 100)).toBe(100);
    expect(limitarPercentualB2(75)).toBe(75);
  });

  it("averages capped official months and preserves the actual counts", () => {
    const tratamento: TratamentoPatient[] = [{
      id: 1, equipe: "ESB Centro", microarea: "1", nome: "",
      dataNascimento: "", cpfCns: "", sexo: "", idade: 0,
      primeiraConsulta: "01/05/2026", tratamentoConcluido: "-",
      comTratamentoConcluido: "Pendente",
    }];
    const rows: OficialRow[] = [[37, 56], [43, 65], [49, 86], [50, 32]].map(([numB2, denB2], i) => ({
      mes: `0${i + 5}/2026`, equipe: "ESB Centro", numB2, denB2,
      numB1: 0, denB1: 0, numB3: 0, denB3: 0,
      numB4: 0, denB4: 0, numB5: 0, denB5: 0, numB6: 0, denB6: 0,
    }));
    const oficialData: OficialData = {
      rows, index: new Map(rows.map(row => [makeOficialKey(row.mes, row.equipe), row])),
    };
    const { porEquipe } = useResultadoFinal([], tratamento, [], [], [], [], "Q2-2026", "all", { porEquipe: {}, total: 0 }, oficialData);
    const b2 = porEquipe[0]?.indicadores.find(ind => ind.indicador === "Tratamento Concluído");
    expect(b2?.mesesDetalhe[3]?.porcentagem).toBe(100);
    expect(b2?.porcentagem).toBeCloseTo((37 / 56 * 100 + 43 / 65 * 100 + 49 / 86 * 100 + 100) / 4);
    expect(b2?.numerador).toBe(179);
    expect(b2?.denominador).toBe(239);
    expect(b2?.conceito).toBe("bom");
  });
});