import { describe, it, expect, vi, afterEach } from "vitest";
import { analisarEstrategia, janelaEstrategica, pendenciasParaIA, type LinhaEstrategia } from "@/lib/estrategiaFimDeMes";
import { buildSimRow } from "@/components/dashboard/PendenciasReportButton";
import { gerarPrioridadesFallback } from "@/lib/prioridadesFallback";

afterEach(() => vi.useRealTimers());

const base = (over: Partial<LinhaEstrategia>): LinhaEstrategia => ({
  codigo: "B3", nome: "Taxa de Exodontias", indicador: "B3 — Taxa de Exodontias", atual: "", conceitoAtual: "Regular",
  proximo: "Ótimo (< 10%)", faltamCurto: "", pendente: true, mesCorrente: true, faltamNum: 4,
  unidadeEsforco: "exodontia(s)", impactoNum: 1.5, notaProjNum: 2, ...over,
});

describe("janela estratégica", () => {
  it("meses 1–3 só a partir do dia 20; mês 4 inteiro", () => {
    expect(janelaEstrategica(new Date(2026, 10, 26)).ativa).toBe(true);  // Nov (3º) dia 26
    expect(janelaEstrategica(new Date(2026, 10, 19)).ativa).toBe(false); // Nov (3º) dia 19
    expect(janelaEstrategica(new Date(2026, 9, 20)).ativa).toBe(true);   // Out (2º) dia 20
    expect(janelaEstrategica(new Date(2026, 8, 5)).ativa).toBe(false);   // Set (1º) dia 5
    const dez = janelaEstrategica(new Date(2026, 11, 2));                // Dez (4º) dia 2
    expect(dez.ativa).toBe(true);
    expect(dez.fase).toBe("mes_inteiro");
    expect(janelaEstrategica(new Date(2027, 3, 1)).fase).toBe("mes_inteiro"); // Abr (4º)
    expect(janelaEstrategica(new Date(2027, 4, 25)).ativa).toBe(true);   // Mai (1º) dia 25
  });
});

describe("estratégia B3 x B5", () => {
  const b3 = base({ b3: { modo: "exodontia", mesNum: 4, mesDen: 300, alvoMin: 0.025 } });
  const b5 = base({
    codigo: "B5", nome: "Proced. Odont. Preventivos", indicador: "B5 — Proced. Odont. Preventivos", proximo: "Bom (>= 55%)",
    faltamNum: 164, unidadeEsforco: "1ª Cons/Trat. Conc.", impactoNum: 0.5,
  });

  it("prioriza as 4 exodontias e adia B5, explicando a diluição do denominador", () => {
    const e = analisarEstrategia([b3, b5], new Date(2026, 10, 26));
    expect(e.ativa).toBe(true);
    expect(e.ranking.map(i => i.codigo)).toEqual(["B3", "B5"]);
    expect(e.foco).toEqual(["B3"]);
    expect(e.adiar).toEqual(["B5"]);
    expect(e.avisos[0]).toMatch(/B5 x B3/);
    expect(e.avisos[0]).toMatch(/exodontia\(s\) a mais/);
    expect(e.ordemSugerida).toMatch(/B3 \(4 exodontia\(s\), \+1,50 pts\)/);
  });

  it("fora da janela não gera estratégia", () => {
    expect(analisarEstrategia([b3, b5], new Date(2026, 10, 10)).ativa).toBe(false);
  });

  it("B3 acima do limite: B5 ajuda e não é adiado", () => {
    const b3Alto = base({ faltamNum: 120, unidadeEsforco: "proced. (denominador)", b3: { modo: "denominador", mesNum: 40, mesDen: 280, alvoMin: 0.03 } });
    const e = analisarEstrategia([b3Alto, b5], new Date(2026, 10, 26));
    expect(e.adiar).toEqual([]);
    expect(e.avisos.join(" ")).toMatch(/ajudam B3/);
  });

  it("ignora indicador de mês que não é o corrente e indicador inalcançável vira aviso", () => {
    const e = analisarEstrategia([base({ mesCorrente: false }), base({ codigo: "B1", nome: "x", faltamNum: null })], new Date(2026, 10, 26));
    expect(e.ranking).toEqual([]);
    expect(e.inalcancaveis).toEqual(["B1"]);
  });
});

describe("integração com buildSimRow (mesma base do relatório)", () => {
  const ind = (over: any) => ({
    indicador: "Proced. Odont. Preventivos", peso: 2, nota: 0.5, conceito: "suficiente",
    numerador: 800, denominador: 1700, porcentagem: 47, ...over,
  });

  it("B3 abaixo de 3% + B5 suficiente: foco em B3", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 26));
    const b3 = buildSimRow(ind({
      indicador: "Taxa de Exodontias", nota: 0.25, conceito: "regular", numerador: 65, denominador: 2300, porcentagem: 2.56,
      mesesDetalhe: [
        { mes: "Set/2026", numerador: 30, denominador: 1000, porcentagem: 3 },
        { mes: "Out/2026", numerador: 30, denominador: 1000, porcentagem: 3 },
        { mes: "Nov/2026", numerador: 5, denominador: 300, porcentagem: 1.67 },
      ],
    }) as any);
    const b5 = buildSimRow(ind({
      mesesDetalhe: [
        { mes: "Set/2026", numerador: 330, denominador: 700, porcentagem: 47 },
        { mes: "Out/2026", numerador: 330, denominador: 700, porcentagem: 47 },
        { mes: "Nov/2026", numerador: 140, denominador: 300, porcentagem: 46.7 },
      ],
    }) as any);
    expect(b3.b3?.modo).toBe("exodontia");
    expect(b3.mesCorrente).toBe(true);
    const e = analisarEstrategia([b3, b5]);
    expect(e.foco).toEqual(["B3"]);
    expect(e.adiar).toEqual(["B5"]);

    const pend = pendenciasParaIA([b3, b5], { notaFinalAtual: 2, semPrimeiraConsulta: 690, tratamentoPendente: 212 });
    expect(pend.contagens.semPrimeiraConsultaB1).toBe(690);
    expect(pend.estrategiaFimDeMes.ativa).toBe(true);

    const r = gerarPrioridadesFallback([{
      equipe: "ESB X",
      pendencias: pend,
      indicadores: [
        { indicador: "Taxa de Exodontias", peso: 2, conceitoPeriodo: "Regular", percentualPeriodo: 2.6, numeradorPeriodo: 65, denominadorPeriodo: 2300, meses: [] },
        { indicador: "Proced. Odont. Preventivos", peso: 2, conceitoPeriodo: "Suficiente", percentualPeriodo: 47, numeradorPeriodo: 800, denominadorPeriodo: 1700, meses: [] },
      ],
    }]);
    expect(r.prioridades[0].indicador).toBe("Taxa de Exodontias");
    expect(r.prioridades[1].motivo).toMatch(/compete com o foco/);
    expect(r.resumo).toMatch(/Estratégia de fim de mês/);
  });
});
