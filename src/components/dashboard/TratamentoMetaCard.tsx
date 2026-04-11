import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, AlertCircle } from "lucide-react";
import { parse, isValid, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface TratamentoMetaCardProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  quadrimestre?: string;
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

export const TratamentoMetaCard = ({ patients, allPatients, quadrimestre = "todos" }: TratamentoMetaCardProps) => {
  const metaData = useMemo(() => {
    const now = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const quadKey = quadrimestre !== "todos" ? quadrimestre : `Q${currentQuad.quad}-${currentQuad.year}`;
    const range = getQuadRange(quadKey);
    if (!range) return null;

    // Consultas no quadrimestre (denominador)
    const consultasQuad = allPatients.filter(p => {
      const d = parseDateStr(p.primeiraConsulta);
      return d ? isWithinInterval(d, { start: range.start, end: range.end }) : false;
    }).length;

    // Tratamentos concluídos no quadrimestre (numerador)
    const tratamentosQuad = patients.filter(p => {
      const d = parseDateStr(p.tratamentoConcluido);
      return d ? isWithinInterval(d, { start: range.start, end: range.end }) : false;
    }).length;

    // Pendentes: têm 1ª consulta no quad mas sem tratamento concluído
    const pendentes = allPatients.filter(p => {
      const dConsulta = parseDateStr(p.primeiraConsulta);
      if (!dConsulta || !isWithinInterval(dConsulta, { start: range.start, end: range.end })) return false;
      const status = (p.comTratamentoConcluido || "").toUpperCase().trim();
      return status !== "SIM";
    }).length;

    const currentPct = consultasQuad > 0 ? (tratamentosQuad / consultasQuad) * 100 : 0;

    // Para meta Bom (>50%): quantos tratamentos faltam
    const needBom = Math.ceil(consultasQuad * 0.501) - tratamentosQuad;
    const faltamBom = Math.max(0, needBom);

    // Para meta Ótimo (>75%): quantos tratamentos faltam
    const needOtimo = Math.ceil(consultasQuad * 0.751) - tratamentosQuad;
    const faltamOtimo = Math.max(0, needOtimo);

    // Via 1ª Consulta: cada +1 consulta → +1 no denominador e +0.5 tratamento
    // Fórmula: (T + 0.5X) / (C + X) > alvo
    // Resolvendo: X < (T - alvo*C) / (alvo - 0.5)
    // Se alvo = 0.5 → denominador (alvo-0.5)=0 → converge a 50%, nunca ultrapassa
    // Se alvo > 0.5 (ex: 0.75) → precisa T > alvo*C, senão impossível
    const calcViaConsulta = (target: number): number | null => {
      if (target <= 0.5) {
        // Converge a 50% mas nunca ultrapassa — impossível se abaixo
        if (tratamentosQuad > target * consultasQuad) return 0; // já atingiu
        return null; // impossível
      }
      // target > 0.5: X = (T - target*C) / (target - 0.5) — precisa ser positivo
      const numerator = tratamentosQuad - target * consultasQuad;
      const denominator = target - 0.5;
      if (numerator >= 0) return 0; // já atingiu
      const x = Math.abs(numerator) / denominator;
      return Math.ceil(x);
    };

    // target 0.501 para >50%, 0.751 para >75%
    const viaConsultaBom = calcViaConsulta(0.501);
    const viaConsultaOtimo = calcViaConsulta(0.751);

    return {
      consultasQuad,
      tratamentosQuad,
      pendentes,
      currentPct,
      faltamBom,
      faltamOtimo,
      viaConsultaBom,
      viaConsultaOtimo,
      alreadyBom: currentPct > 50,
      alreadyOtimo: currentPct > 75,
    };
  }, [patients, allPatients, quadrimestre]);

  if (!metaData) return null;

  const { consultasQuad, tratamentosQuad, pendentes, currentPct, faltamBom, faltamOtimo, viaConsultaBom, viaConsultaOtimo, alreadyBom, alreadyOtimo } = metaData;

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

        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 Cada nova 1ª consulta aumenta o denominador (+1) e soma +0,5 tratamento esperado ao numerador.
        </p>
      </CardContent>
    </Card>
  );
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
                <p className="text-xs text-violet-600 font-medium mt-0.5">
                  ou {faltamBom * 2} via 1ª Consulta (×0,5)
                </p>
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
                <p className="text-xs text-violet-600 font-medium mt-0.5">
                  ou {faltamOtimo * 2} via 1ª Consulta (×0,5)
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 Cada nova 1ª consulta odontológica realizada equivale a +0,5 tratamento concluído esperado na meta.
        </p>
      </CardContent>
    </Card>
  );
};
