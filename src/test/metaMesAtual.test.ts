import { describe, it, expect } from "vitest";
import { calcFaltamMesAtual, projetaMediaMensal } from "@/lib/metaThresholds";

const hoje = new Date(2026, 10, 12); // 12/nov/2026

describe("método do mês atual", () => {
  const b5 = [
    { mes: "Set/2026", num: 335, den: 693 },
    { mes: "Out/2026", num: 227, den: 484 },
    { mes: "Nov/2026", num: 133, den: 256 },
    { mes: "Dez/2026", num: 0, den: 0 },
  ];

  it("B5 Ótimo: mês atual precisa de ~82,4%", () => {
    const r = calcFaltamMesAtual(b5, 4, 0.65 - 1e-9, 2, 2, undefined, hoje)!;
    expect(r.fechados).toBe(2);
    expect(r.mesAberto).toBe("Nov/2026");
    expect(r.alvo * 100).toBeCloseTo(82.4, 0);
    // (133+2x)/(256+2x) >= alvo
    const x = r.faltam!;
    expect((133 + 2 * x) / (256 + 2 * x)).toBeGreaterThanOrEqual(r.alvo);
    expect((133 + 2 * (x - 1)) / (256 + 2 * (x - 1))).toBeLessThan(r.alvo);
  });

  it("B1 já Ótimo: nada falta", () => {
    const b1 = [
      { mes: "Set/2026", num: 27, den: 1963 },
      { mes: "Out/2026", num: 52, den: 1963 },
      { mes: "Nov/2026", num: 11, den: 1963 },
    ];
    expect(calcFaltamMesAtual(b1, 4, 0.0125, 1, 0, undefined, hoje)!.faltam).toBe(0);
    expect(calcFaltamMesAtual(b1, 4, 0.0075, 1, 0, undefined, hoje)!.faltam).toBe(0);
  });

  it("B5 simulado com 36 consultas fecha a média de 4 meses em Bom (≥55%)", () => {
    const p = projetaMediaMensal(b5, 72, 72, undefined, hoje, 4)!;
    expect(p).toBeGreaterThanOrEqual(55 - 1e-6);
    const sem = projetaMediaMensal(b5, 70, 70, undefined, hoje, 4)!; // 35 consultas: ainda não fecha
    expect(sem).toBeLessThan(55);
  });

  it("projeta a média somando só no mês atual", () => {
    const p0 = projetaMediaMensal(b5, 0, 0, undefined, hoje)!;
    expect(p0).toBeCloseTo((335 / 693 + 227 / 484 + 133 / 256) / 3 * 100, 5);
    const p1 = projetaMediaMensal(b5, 100, 100, undefined, hoje)!;
    expect(p1).toBeGreaterThan(p0);
  });
});
