import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, AlertCircle } from "lucide-react";
import { parse, isValid, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface TratamentoMetaCardProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  quadrimestre?: string;
  denominadorB1?: number;
}

const parseDateStr = (str: string): Date | null => {
  if (!str || str === "-" || str.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(str.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 3) return { quad: 1, year };
  if (month <= 7) return { quad: 2, year };
  return { quad: 3, year };
};

const getQuadRange = (quadKey: string) => {
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return null;
  const q = parseInt(match[1]);
  const y = parseInt(match[2]);
  let startMonth: number;
  if (q === 1) startMonth = 0;
  else if (q === 2) startMonth = 4;
  else startMonth = 8;
  const endMonth = startMonth + 3;

  const now = new Date();
  const currentQuad = getQuadrimesterInfo(now);
  const isCurrentQuad = `Q${currentQuad.quad}-${currentQuad.year}` === quadKey;
  const actualEndMonth = isCurrentQuad ? now.getMonth() : endMonth;

  return {
    start: startOfMonth(new Date(y, startMonth, 1)),
    end: endOfMonth(new Date(y, actualEndMonth, 1)),
  };
};

export const TratamentoMetaCard = ({ patients, allPatients, quadrimestre = "todos", denominadorB1 = 0 }: TratamentoMetaCardProps) => {
  const metaData = useMemo(() => {
    const now = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const quadKey = quadrimestre !== "todos" ? quadrimestre : `Q${currentQuad.quad}-${currentQuad.year}`;
    const range = getQuadRange(quadKey);
    if (!range) return null;

    const consultasQuad = allPatients.filter(p => {
      const d = parseDateStr(p.primeiraConsulta);
      return d ? isWithinInterval(d, { start: range.start, end: range.end }) : false;
    }).length;

    const tratamentosQuad = patients.filter(p => {
      const d = parseDateStr(p.tratamentoConcluido);
      return d ? isWithinInterval(d, { start: range.start, end: range.end }) : false;
    }).length;

    const pendentes = allPatients.filter(p => {
      const dConsulta = parseDateStr(p.primeiraConsulta);
      if (!dConsulta || !isWithinInterval(dConsulta, { start: range.start, end: range.end })) return false;
      const status = (p.comTratamentoConcluido || "").toUpperCase().trim();
      return status !== "SIM";
    }).length;

    const currentPct = consultasQuad > 0 ? (tratamentosQuad / consultasQuad) * 100 : 0;

    const needBom = Math.ceil(consultasQuad * 0.501) - tratamentosQuad;
    const faltamBom = Math.max(0, needBom);
    const needOtimo = Math.ceil(consultasQuad * 0.751) - tratamentosQuad;
    const faltamOtimo = Math.max(0, needOtimo);

    const calcViaConsulta = (target: number): number | null => {
      if (target <= 0.5) {
        if (tratamentosQuad > target * consultasQuad) return 0;
        return null;
      }
      const numerator = tratamentosQuad - target * consultasQuad;
      const denominator = target - 0.5;
      if (numerator >= 0) return 0;
      const x = Math.abs(numerator) / denominator;
      return Math.ceil(x);
    };

    const viaConsultaBom = calcViaConsulta(0.501);
    const viaConsultaOtimo = calcViaConsulta(0.751);

    const simulations = denominadorB1 > 0 ? (() => {
      const match = quadKey.match(/Q(\d)-(\d{4})/);
      if (!match) return null;
      const q = parseInt(match[1]);
      let startMonth = q === 1 ? 0 : q === 2 ? 4 : 8;
      const currentQuadInfo = getQuadrimesterInfo(now);
      const isCurrentQuad = `Q${currentQuadInfo.quad}-${currentQuadInfo.year}` === quadKey;
      const endMonth = isCurrentQuad ? now.getMonth() : startMonth + 3;
      const meses = endMonth - startMonth + 1;

      const denomMensal = denominadorB1 * meses;

      // Consultas totais simuladas para atingir Bom (>3%) e Ótimo (>5%) na Aba 1
      const consultasBom   = Math.ceil(denomMensal * 0.031);
      const consultasOtimo = Math.ceil(denomMensal * 0.051);

      // Novas consultas adicionais além das já existentes no quadrimestre
      const novasConsultasBom   = Math.max(0, consultasBom   - consultasQuad);
      const novasConsultasOtimo = Math.max(0, consultasOtimo - consultasQuad);

      // Cada nova 1ª consulta: +1 no denominador, +0,5 no numerador (esperado)
      const denomSimBom   = consultasQuad + novasConsultasBom;
      const denomSimOtimo = consultasQuad + novasConsultasOtimo;

      const numeradorSimBom   = tratamentosQuad + novasConsultasBom   * 0.5;
      const numeradorSimOtimo = tratamentosQuad + novasConsultasOtimo * 0.5;

      // Tratamentos adicionais ainda necessários após o ganho automático das novas consultas
      const tratNeedBomBom    = Math.max(0, Math.ceil(denomSimBom   * 0.501 - numeradorSimBom));
      const tratNeedBomOtimo  = Math.max(0, Math.ceil(denomSimBom   * 0.751 - numeradorSimBom));
      const tratNeedOtimoBom  = Math.max(0, Math.ceil(denomSimOtimo * 0.501 - numeradorSimOtimo));
      const tratNeedOtimoOtimo = Math.max(0, Math.ceil(denomSimOtimo * 0.751 - numeradorSimOtimo));

      return {
        consultasBom, consultasOtimo,
        denomBom: denomSimBom, denomOtimo: denomSimOtimo,
        numeradorSimBom, numeradorSimOtimo,
        tratNeedBomBom, tratNeedBomOtimo,
        tratNeedOtimoBom, tratNeedOtimoOtimo,
      };
    })() : null;

    return {
      consultasQuad, tratamentosQuad, pendentes, currentPct,
      faltamBom, faltamOtimo, viaConsultaBom, viaConsultaOtimo,
      alreadyBom: currentPct > 50, alreadyOtimo: currentPct > 75,
      simulations,
    };
  }, [patients, allPatients, quadrimestre, denominadorB1]);

  if (!metaData) return null;

  const { consultasQuad, tratamentosQuad, pendentes, currentPct, faltamBom, faltamOtimo, viaConsultaBom, viaConsultaOtimo, alreadyBom, alreadyOtimo, simulations } = metaData;

  const renderViaConsulta = (valor: number | null) => {
    if (valor === null) return <p className="text-xs text-red-500 font-medium mt-0.5">Impossível somente via 1ª Consulta</p>;
    if (valor === 0) return null;
    return <p className="text-xs text-violet-600 font-medium mt-0.5">ou {valor} via 1ª Consulta (×0,5)</p>;
  };

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-indigo-50 border-l-4 border-l-violet-500 col-span-2 lg:col-span-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-700">Meta do Quadrimestre — Tratamento Concluído</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Status atual */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
            <p className="text-2xl font-bold text-violet-700">{currentPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{tratamentosQuad} de {consultasQuad}</p>
          </div>

          {/* Pendentes */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground">com 1ª consulta sem conclusão</p>
          </div>

          {/* Meta Bom */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Meta Bom (&gt;50%)</p>
            </div>
            {alreadyBom ? (
              <>
                <p className="text-2xl font-bold text-emerald-600">✓</p>
                <p className="text-xs text-emerald-600 font-medium">Meta atingida!</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-700">{faltamBom}</p>
                <p className="text-xs text-muted-foreground">tratamentos a concluir</p>
                {renderViaConsulta(viaConsultaBom)}
              </>
            )}
          </div>

          {/* Meta Ótimo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              <p className="text-xs text-muted-foreground">Meta Ótimo (&gt;75%)</p>
            </div>
            {alreadyOtimo ? (
              <>
                <p className="text-2xl font-bold text-blue-600">✓</p>
                <p className="text-xs text-blue-600 font-medium">Meta atingida!</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-700">{faltamOtimo}</p>
                <p className="text-xs text-muted-foreground">tratamentos a concluir</p>
                {renderViaConsulta(viaConsultaOtimo)}
              </>
            )}
          </div>
        </div>

        {/* Simulação: atingindo Bom/Ótimo na Aba 1 */}
        {simulations && (
          <div className="mt-4 pt-3 border-t border-violet-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-700">Simulação — Se atingir meta na 1ª Consulta Odontológica (Aba 1)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Simulação Bom Tab 1 */}
              <div className="rounded-lg bg-emerald-50/80 border border-emerald-200 p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-2">
                  Se Aba 1 atingir Bom (&gt;3%) → {simulations.consultasBom} consultas
                </p>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Bom Tab 2 (&gt;50%)</p>
                    {simulations.tratNeedBomBom === 0 ? (
                      <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                    ) : (
                      <p className="text-lg font-bold text-emerald-700">{simulations.tratNeedBomBom} <span className="text-xs font-normal">trat.</span></p>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Ótimo Tab 2 (&gt;75%)</p>
                    {simulations.tratNeedBomOtimo === 0 ? (
                      <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                    ) : (
                      <p className="text-lg font-bold text-blue-700">{simulations.tratNeedBomOtimo} <span className="text-xs font-normal">trat.</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulação Ótimo Tab 1 */}
              <div className="rounded-lg bg-blue-50/80 border border-blue-200 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">
                  Se Aba 1 atingir Ótimo (&gt;5%) → {simulations.consultasOtimo} consultas
                </p>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Bom Tab 2 (&gt;50%)</p>
                    {simulations.tratNeedOtimoBom === 0 ? (
                      <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                    ) : (
                      <p className="text-lg font-bold text-emerald-700">{simulations.tratNeedOtimoBom} <span className="text-xs font-normal">trat.</span></p>
                    )}
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Ótimo Tab 2 (&gt;75%)</p>
                    {simulations.tratNeedOtimoOtimo === 0 ? (
                      <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                    ) : (
                      <p className="text-lg font-bold text-blue-700">{simulations.tratNeedOtimoOtimo} <span className="text-xs font-normal">trat.</span></p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 Cada nova 1ª consulta aumenta o denominador (+1) e soma +0,5 tratamento esperado ao numerador.
        </p>
      </CardContent>
    </Card>
  );
};
