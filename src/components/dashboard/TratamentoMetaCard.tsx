import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, AlertCircle, FlaskConical } from "lucide-react";
import { parse, isValid, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";

interface TratamentoMetaCardProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  quadrimestre?: string;
  denominadorB1?: number;
  consultasAba1Quad?: number;
  mesReferencia?: string[];
  equipe?: string;           // ← novo
  oficialData?: OficialData; // ← novo
}

const parseDateStr = (str: string): Date | null => {
  if (!str || str === "-" || str.trim() === "") return null;
  const fmts = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of fmts) {
    try {
      const parsed = parse(str.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth();
  const year  = date.getFullYear();
  if (month <= 3) return { quad: 1, year };
  if (month <= 7) return { quad: 2, year };
  return { quad: 3, year };
};

const getQuadRange = (quadKey: string) => {
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return null;
  const q = parseInt(match[1]);
  const y = parseInt(match[2]);
  const startMonth = q === 1 ? 0 : q === 2 ? 4 : 8;
  const now = new Date();
  const currentQuad = getQuadrimesterInfo(now);
  const isCurrentQuad = `Q${currentQuad.quad}-${currentQuad.year}` === quadKey;
  const actualEndMonth = isCurrentQuad ? now.getMonth() : startMonth + 3;
  return {
    start: startOfMonth(new Date(y, startMonth, 1)),
    end:   endOfMonth(new Date(y, actualEndMonth, 1)),
    startMonth,
    actualEndMonth,
    year: y,
  };
};

const resolveMonthB2 = (
  monthDate: Date,
  prelNum: number,
  prelDen: number,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; fonte: FonteDado } => {
  const mesNorm = normalizeMes(format(monthDate, "MM/yyyy")) ?? format(monthDate, "MM/yyyy");
  const ofRow   = oficialIndex?.get(makeOficialKey(mesNorm, equipe));
  if (!!ofRow) {
    return { num: ofRow.numB2, den: ofRow.denB2, fonte: "oficial" };
  }
  return { num: prelNum, den: prelDen, fonte: "preliminar" };
};

const resolveMonthB1 = (
  monthDate: Date,
  prelNum: number,
  prelDen: number,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; fonte: FonteDado } => {
  const mesNorm = normalizeMes(format(monthDate, "MM/yyyy")) ?? format(monthDate, "MM/yyyy");
  const ofRow   = oficialIndex?.get(makeOficialKey(mesNorm, equipe));
  if (!!ofRow) {
    return { num: ofRow.numB1, den: ofRow.denB1, fonte: "oficial" };
  }
  return { num: prelNum, den: prelDen, fonte: "preliminar" };
};

export const TratamentoMetaCard = ({
  patients,
  quadrimestre = "todos",
  denominadorB1 = 0,
  consultasAba1Quad = 0,
  mesReferencia = [],
  equipe = "all",
  oficialData,
}: TratamentoMetaCardProps) => {

  const metaData = useMemo(() => {
    const now         = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const quadKey     = quadrimestre !== "todos"
      ? quadrimestre
      : `Q${currentQuad.quad}-${currentQuad.year}`;
    const range = getQuadRange(quadKey);
    if (!range) return null;

    const inPeriodDate = (dateStr: string): boolean => {
      const d = parseDateStr(dateStr);
      if (!d) return false;
      if (mesReferencia.length > 0) {
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        return mesReferencia.includes(key);
      }
      return isWithinInterval(d, { start: range.start, end: range.end });
    };

    // ── Agrega meses B2 com merge oficial ─────────────────────────────────
    let totalNum          = 0;
    let totalDen          = 0;
    let todosMesesOficiais = true;

    for (let m = range.startMonth; m <= range.actualEndMonth; m++) {
      const monthDate = new Date(range.year, m, 1);
      const mStart    = startOfMonth(monthDate);
      const mEnd      = endOfMonth(monthDate);

      const inMonth = (dateStr: string): boolean => {
        const d = parseDateStr(dateStr);
        if (!d) return false;
        if (mesReferencia.length > 0) {
          const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          return mesReferencia.includes(key);
        }
        return isWithinInterval(d, { start: mStart, end: mEnd });
      };

      const prelNum = patients.filter(p => inMonth(p.tratamentoConcluido)).length;
      const prelDen = patients.filter(p => inMonth(p.primeiraConsulta)).length;

      const resolved = resolveMonthB2(monthDate, prelNum, prelDen, equipe, oficialData?.index);
      totalNum += resolved.num;
      totalDen += resolved.den;
      if (resolved.fonte !== "oficial") todosMesesOficiais = false;
    }

    // Fallback para mesReferencia quando iteração mensal não captura
    if (totalDen === 0 && mesReferencia.length > 0) {
      totalNum = patients.filter(p => inPeriodDate(p.tratamentoConcluido)).length;
      totalDen = patients.filter(p => inPeriodDate(p.primeiraConsulta)).length;
      todosMesesOficiais = false;
    }

    const fonte: FonteDado = todosMesesOficiais ? "oficial" : "preliminar";

    const pendentes = patients.filter(p => {
      if (!inPeriodDate(p.primeiraConsulta)) return false;
      const trat = (p.tratamentoConcluido || "").trim();
      return !trat || trat === "-";
    }).length;

    const currentPct  = totalDen > 0 ? (totalNum / totalDen) * 100 : 0;
    const faltamBom   = Math.max(0, Math.ceil(totalDen * 0.501) - totalNum);
    const faltamOtimo = Math.max(0, Math.ceil(totalDen * 0.751) - totalNum);

    // ── Simulações ────────────────────────────────────────────────────────
    const simulations = (() => {
      const match = quadKey.match(/Q(\d)-(\d{4})/);
      if (!match) return null;
      const q          = parseInt(match[1]);
      const startMonth = q === 1 ? 0 : q === 2 ? 4 : 8;
      const isCurrentQ = `Q${currentQuad.quad}-${currentQuad.year}` === quadKey;
      const endMonth   = isCurrentQ ? now.getMonth() : startMonth + 3;
      const meses      = endMonth - startMonth + 1;

      // Resolve B1 acumulado com oficial
      let denB1Quad = 0;
      let numB1Quad = 0;
      for (let m = startMonth; m <= endMonth; m++) {
        const monthDate = new Date(range.year, m, 1);
        const prelNumB1 = patients.filter(p => {
          const d = parseDateStr(p.primeiraConsulta);
          return d?.getMonth() === m && d?.getFullYear() === range.year;
        }).length;
        const resolved = resolveMonthB1(monthDate, prelNumB1, denominadorB1, equipe, oficialData?.index);
        denB1Quad += resolved.den;
        numB1Quad += resolved.num;
      }

      const denB1Rep = meses > 0 ? Math.round(denB1Quad / meses) : denominadorB1;

      const consultasBom   = (Math.floor(denB1Rep * 0.03) + 1) * meses;
      const consultasOtimo = (Math.floor(denB1Rep * 0.05) + 1) * meses;

      const aba1Real = numB1Quad > 0 ? numB1Quad : consultasAba1Quad;

      const aba1JaAtingiuBom   = aba1Real >= consultasBom;
      const aba1JaAtingiuOtimo = aba1Real >= consultasOtimo;
      const faltamAba1Bom      = Math.max(0, consultasBom   - aba1Real);
      const faltamAba1Otimo    = Math.max(0, consultasOtimo - aba1Real);

      const novasConsultasBom   = Math.max(0, consultasBom   - totalDen);
      const novasConsultasOtimo = Math.max(0, consultasOtimo - totalDen);

      const denomSimBom   = totalDen + novasConsultasBom;
      const denomSimOtimo = totalDen + novasConsultasOtimo;
      const numeradorSimBom   = totalNum + novasConsultasBom   * 0.5;
      const numeradorSimOtimo = totalNum + novasConsultasOtimo * 0.5;

      return {
        consultasBom, consultasOtimo,
        aba1JaAtingiuBom, aba1JaAtingiuOtimo,
        faltamAba1Bom, faltamAba1Otimo,
        tratNeedBomBom:     Math.max(0, Math.ceil(denomSimBom   * 0.501 - numeradorSimBom)),
        tratNeedBomOtimo:   Math.max(0, Math.ceil(denomSimBom   * 0.751 - numeradorSimBom)),
        tratNeedOtimoBom:   Math.max(0, Math.ceil(denomSimOtimo * 0.501 - numeradorSimOtimo)),
        tratNeedOtimoOtimo: Math.max(0, Math.ceil(denomSimOtimo * 0.751 - numeradorSimOtimo)),
      };
    })();

    const mesesDecorridos = range.actualEndMonth - range.startMonth + 1;

    return {
      consultasQuad: totalDen,
      tratamentosQuad: totalNum,
      pendentes,
      currentPct,
      faltamBom,
      faltamOtimo,
      alreadyBom:   currentPct > 50,
      alreadyOtimo: currentPct > 75,
      fonte,
      simulations,
      mesesDecorridos,
    };
  }, [patients, quadrimestre, denominadorB1, consultasAba1Quad, mesReferencia, equipe, oficialData]);

  if (!metaData) return null;

  const {
    consultasQuad, tratamentosQuad, pendentes, currentPct,
    faltamBom, faltamOtimo, alreadyBom, alreadyOtimo, fonte, simulations, mesesDecorridos,
  } = metaData;

  const semanasRestantes = Math.max(0, 4 - mesesDecorridos) * 4.33;
  const fmtSemanal = (faltam: number) =>
    semanasRestantes > 0 ? (faltam / semanasRestantes).toFixed(1) : "—";

  return (
    <>
      {/* ── Meta do Quadrimestre ─────────────────────────────────────────── */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-indigo-50 border-l-4 border-l-violet-500 col-span-2 lg:col-span-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Target className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-700">Meta do Quadrimestre — Tratamento Concluído</span>
            <FonteBadge fonte={fonte} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 place-items-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
              <p className="text-2xl font-bold text-violet-700">{currentPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{tratamentosQuad} de {consultasQuad}</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
              <p className="text-xs text-muted-foreground">com 1ª consulta sem conclusão</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Meta Bom (&gt;50%)</p>
              </div>
              {alreadyBom ? (
                <><p className="text-2xl font-bold text-emerald-600">✓</p><p className="text-xs text-emerald-600 font-medium">Meta atingida!</p></>
              ) : (
                <>
                  <p className="text-2xl font-bold text-emerald-700">{faltamBom}</p>
                  <p className="text-xs text-muted-foreground">tratamentos a concluir</p>
                  <p className="text-xs text-red-600 mt-0.5">Média/semana: {fmtSemanal(faltamBom)}</p>
                </>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <p className="text-xs text-muted-foreground">Meta Ótimo (&gt;75%)</p>
              </div>
              {alreadyOtimo ? (
                <><p className="text-2xl font-bold text-blue-600">✓</p><p className="text-xs text-blue-600 font-medium">Meta atingida!</p></>
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-700">{faltamOtimo}</p>
                  <p className="text-xs text-muted-foreground">tratamentos a concluir</p>
                  <p className="text-xs text-red-600 mt-0.5">Média/semana: {fmtSemanal(faltamOtimo)}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Simulação ────────────────────────────────────────────────────── */}
      {simulations && (
        <Card className="border-0 shadow-md bg-orange-50 border border-orange-200 col-span-2 lg:col-span-full">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
                Simulação — Se atingir meta na 1ª Consulta Odontológica (Aba 1)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs font-semibold text-emerald-700">
                    Se 1ª Consulta atingir Bom (&gt;3%) → {simulations.consultasBom} consultas
                  </p>
                  {simulations.aba1JaAtingiuBom
                    ? <span className="text-xs font-bold text-emerald-600">(✓ Atingida na Aba 1)</span>
                    : <span className="text-xs font-bold text-red-500">(faltam {simulations.faltamAba1Bom} na Aba 1)</span>
                  }
                </div>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">Para Bom Trat. (&gt;50%)</p>
                    {simulations.tratNeedBomBom === 0
                      ? <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-emerald-700">{simulations.tratNeedBomBom} <span className="text-xs font-normal">finalização(ões)</span></p>
                    }
                  </div>
                  <div className="w-px self-stretch bg-emerald-200" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">Para Ótimo Trat. (&gt;75%)</p>
                    {simulations.tratNeedBomOtimo === 0
                      ? <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-blue-700">{simulations.tratNeedBomOtimo} <span className="text-xs font-normal">finalização(ões)</span></p>
                    }
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs font-semibold text-blue-700">
                    Se 1ª Consulta atingir Ótimo (&gt;5%) → {simulations.consultasOtimo} consultas
                  </p>
                  {simulations.aba1JaAtingiuOtimo
                    ? <span className="text-xs font-bold text-emerald-600">(✓ Atingida na Aba 1)</span>
                    : <span className="text-xs font-bold text-red-500">(faltam {simulations.faltamAba1Otimo} na Aba 1)</span>
                  }
                </div>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">Para Bom Trat. (&gt;50%)</p>
                    {simulations.tratNeedOtimoBom === 0
                      ? <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-emerald-700">{simulations.tratNeedOtimoBom} <span className="text-xs font-normal">finalização(ões)</span></p>
                    }
                  </div>
                  <div className="w-px self-stretch bg-blue-200" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">Para Ótimo Trat. (&gt;75%)</p>
                    {simulations.tratNeedOtimoOtimo === 0
                      ? <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-blue-700">{simulations.tratNeedOtimoOtimo} <span className="text-xs font-normal">finalização(ões)</span></p>
                    }
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 italic">
              💡 Cada nova 1ª consulta aumenta o denominador (+1) e soma +0,5 tratamento esperado ao numerador.
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};
