import { describe, it, expect } from "vitest";
import { calcFaltamMesAtual, calcFaltamMesAtualMenorMelhor, calcFaltamMesAtualB3, projetaMediaMensal } from "@/lib/metaThresholds";

const hoje = new Date(2026, 10, 12); // 12/nov/2026

describe("método do mês atual", () => {
  const b5 = [
    { mes: "Set/2026", num: 335, den: 693 },
    { mes: "Out/2026", num: 227, den: 484 },
    { mes: "Nov/2026", num: 133, den: 256 },
    { mes: "Dez/2026", num: 0, den: 0 },
  ];

  it("B5 Bom: mês atual carrega sozinho a meta da média dos meses decorridos", () => {
    // Exemplo real: Set 38,8% e Out 52,4% -> 3 × 55 − 91,2 = 73,8% (e não 64,4%)
    const real = [
      { mes: "Set/2026", num: 388, den: 1000 },
      { mes: "Out/2026", num: 524, den: 1000 },
      { mes: "Nov/2026", num: 195, den: 384 },
      { mes: "Dez/2026", num: 0, den: 0 },
    ];
    const r = calcFaltamMesAtual(real, 4, 0.55 - 1e-9, 2, 2, undefined, hoje)!;
    expect(r.fechados).toBe(2);
    expect(r.dividePróximos).toBe(false);
    expect(r.alvo * 100).toBeCloseTo(73.8, 1);
    const x = r.faltam!;
    expect((195 + 2 * x) / (384 + 2 * x)).toBeGreaterThanOrEqual(r.alvo);
    expect((195 + 2 * (x - 1)) / (384 + 2 * (x - 1))).toBeLessThan(r.alvo);
  });

  it("B5 Ótimo: mês atual sozinho (≈ 99,8%, ainda ≤ 100%)", () => {
    const r = calcFaltamMesAtual(b5, 4, 0.65 - 1e-9, 2, 2, undefined, hoje)!;
    expect(r.fechados).toBe(2);
    expect(r.mesAberto).toBe("Nov/2026");
    expect(r.dividePróximos).toBe(false);
    expect(r.alvo * 100).toBeCloseTo(99.8, 0);
  });

  it("só divide com os próximos quando o mês atual precisaria passar de 100%", () => {
    const fraco = [
      { mes: "Set/2026", num: 30, den: 100 },
      { mes: "Out/2026", num: 30, den: 100 },
      { mes: "Nov/2026", num: 10, den: 100 },
      { mes: "Dez/2026", num: 0, den: 0 },
    ];
    // Ótimo (65%): 3 × 65 − 60 = 135% > 100% -> divide: (4 × 65 − 60)/2 = 100%
    const r = calcFaltamMesAtual(fraco, 4, 0.65 - 1e-9, 1, 0, undefined, hoje)!;
    expect(r.dividePróximos).toBe(true);
    expect(r.alvo * 100).toBeCloseTo(100, 0);
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

  it("B3 (menor é melhor): mês atual precisa ficar abaixo do alvo", () => {
    const b3 = [
      { mes: "Set/2026", num: 10, den: 100 },   // 10%
      { mes: "Out/2026", num: 9, den: 100 },    // 9%
      { mes: "Nov/2026", num: 15, den: 100 },   // 15%
      { mes: "Dez/2026", num: 0, den: 0 },
    ];
    // Ótimo < 10%: alvo Nov = (40 − 19)/2 = 10,5%
    const r = calcFaltamMesAtualMenorMelhor(b3, 4, 0.10, hoje)!;
    expect(r.alvo * 100).toBeCloseTo(10.5, 5);
    const x = r.faltam!;
    expect(15 / (100 + x)).toBeLessThan(r.alvo);
    expect(15 / (100 + x - 1)).toBeGreaterThanOrEqual(r.alvo);
  });

  it("B3 com piso de 3%: abaixo do mínimo pede exodontias; acima do máximo pede denominador", () => {
    const baixo = [
      { mes: "Set/2026", num: 1, den: 100 },   // 1%
      { mes: "Out/2026", num: 1, den: 100 },   // 1%
      { mes: "Nov/2026", num: 0, den: 100 },   // 0%
      { mes: "Dez/2026", num: 0, den: 0 },
    ];
    const r = calcFaltamMesAtualB3(baixo, 4, 0.10, 0.03, hoje)!;
    expect(r.alvoMin * 100).toBeCloseTo(5, 5);   // (12 − 2)/2
    expect(r.faltam).toBe(0);
    expect(r.faltamExo).toBeGreaterThan(0);
    expect((0 + r.faltamExo) / (100 + r.faltamExo)).toBeGreaterThanOrEqual(r.alvoMin - 1e-9);

    const alto = [
      { mes: "Set/2026", num: 5, den: 100 },
      { mes: "Out/2026", num: 5, den: 100 },
      { mes: "Nov/2026", num: 20, den: 100 },
      { mes: "Dez/2026", num: 0, den: 0 },
    ];
    const r2 = calcFaltamMesAtualB3(alto, 4, 0.10, 0.03, hoje)!;
    expect(r2.faltam).toBeGreaterThan(0);
    expect(r2.faltamExo).toBe(0);
  });
});
