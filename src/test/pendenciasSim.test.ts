import { describe, it, expect, vi } from "vitest";
import { buildSimRow } from "@/components/dashboard/PendenciasReportButton";

vi.useFakeTimers();
vi.setSystemTime(new Date(2026, 10, 12));

const ind = (over: any) => ({
  indicador: "Proced. Odont. Preventivos", peso: 2, nota: 0.5, conceito: "suficiente",
  numerador: 695, denominador: 1433, porcentagem: 49.06, ...over,
});

describe("PDF de pendências — método do mês atual", () => {
  it("B5: faltam consultas no mês atual (Set/Out fechados)", () => {
    const row = buildSimRow(ind({
      mesesDetalhe: [
        { mes: "Set/2026", numerador: 335, denominador: 693, porcentagem: 48.3 },
        { mes: "Out/2026", numerador: 227, denominador: 484, porcentagem: 46.9 },
        { mes: "Nov/2026", numerador: 133, denominador: 256, porcentagem: 52.0 },
      ],
    }) as any);
    expect(row.proximo).toContain("Bom");
    expect(row.faltamCurto).toBe("36 consultas");
    expect(row.faltam).toContain("Nov/2026");
    expect(row.pendente).toBe(true);
  });

  it("B3: acima do limite pede denominador", () => {
    const row = buildSimRow(ind({
      indicador: "Taxa de Exodontias", nota: 0.25, conceito: "regular",
      numerador: 40, denominador: 280, porcentagem: 14.3,
      mesesDetalhe: [
        { mes: "Set/2026", numerador: 10, denominador: 100, porcentagem: 10 },
        { mes: "Out/2026", numerador: 10, denominador: 100, porcentagem: 10 },
        { mes: "Nov/2026", numerador: 20, denominador: 80, porcentagem: 25 },
      ],
    }) as any);
    expect(row.indicador).toContain("B3");
    expect(row.faltamCurto).toMatch(/proced\./);
    expect(row.pendente).toBe(true);
  });
});
