import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, AlertCircle } from "lucide-react";
import { Tab5Record } from "@/hooks/useTab5Data";

interface Tab5MetaCardProps {
  records: Tab5Record[];
  quadrimestre?: string;
  pendentesTab1: number;
  pendentesTab2: number;
}

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  if (month <= 3) return { quad: 1, year };
  if (month <= 7) return { quad: 2, year };
  return { quad: 3, year };
};

const getQuadMonths = (q: number): number[] => {
  if (q === 1) return [0, 1, 2, 3];
  if (q === 2) return [4, 5, 6, 7];
  return [8, 9, 10, 11];
};

export const Tab5MetaCard = ({ records, quadrimestre = "todos", pendentesTab1, pendentesTab2 }: Tab5MetaCardProps) => {
  const metaData = useMemo(() => {
    const now = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const quadKey = quadrimestre !== "todos" ? quadrimestre : `Q${currentQuad.quad}-${currentQuad.year}`;

    const match = quadKey.match(/Q(\d)-(\d{4})/);
    if (!match) return null;
    const q = parseInt(match[1]);
    const y = parseInt(match[2]);
    const quadMonths = getQuadMonths(q);

    // Aggregate records for the quadrimester
    let preventivos = 0;
    let totalIndividuais = 0;

    records.forEach((r) => {
      const parts = r.mesAno.split("/");
      const mesName = parts[0]?.toLowerCase().trim();
      const ano = parseInt(parts[1]);
      const mesIdx = MONTH_MAP[mesName];
      if (mesIdx === undefined || ano !== y || !quadMonths.includes(mesIdx)) return;
      preventivos += r.preventivos;
      totalIndividuais += r.totalIndividuais;
    });

    const currentPct = totalIndividuais > 0 ? (preventivos / totalIndividuais) * 100 : 0;

    // Each new 1ª consulta or tratamento concluído = +2 numerador, +2 denominador
    // Formula: (preventivos + 2X) / (totalIndividuais + 2X) > target
    // Solving: X > (target * totalIndividuais - preventivos) / (2 * (1 - target))
    const calcNeeded = (target: number): number => {
      if (totalIndividuais > 0 && (preventivos / totalIndividuais) >= target) return 0;
      if (totalIndividuais === 0 && target <= 1) return 1; // edge case
      const numerator = target * totalIndividuais - preventivos;
      const denominator = 2 * (1 - target);
      if (denominator <= 0) return 0;
      const x = numerator / denominator;
      return Math.max(0, Math.ceil(x));
    };

    const faltamBom = calcNeeded(0.60);
    const faltamOtimo = calcNeeded(0.80);

    const alreadyBom = currentPct >= 60;
    const alreadyOtimo = currentPct >= 80;

    const totalPendentes = pendentesTab1 + pendentesTab2;

    return {
      preventivos,
      totalIndividuais,
      currentPct,
      faltamBom,
      faltamOtimo,
      alreadyBom,
      alreadyOtimo,
      pendentesTab1,
      pendentesTab2,
      totalPendentes,
    };
  }, [records, quadrimestre, pendentesTab1, pendentesTab2]);

  if (!metaData) return null;

  const {
    preventivos, totalIndividuais, currentPct,
    faltamBom, faltamOtimo, alreadyBom, alreadyOtimo,
    totalPendentes,
  } = metaData;

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-indigo-50 border-l-4 border-l-violet-500 col-span-2 lg:col-span-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-violet-700">Meta do Quadrimestre — Proced. Odont. Preventivos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* Status atual */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
            <p className="text-2xl font-bold text-violet-700">{currentPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{preventivos} de {totalIndividuais}</p>
          </div>

          {/* Pendentes Tab 1 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pendentes 1ª Consulta</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendentesTab1}</p>
            <p className="text-xs text-muted-foreground">sem 1ª consulta (Aba 1)</p>
          </div>

          {/* Pendentes Tab 2 */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-orange-600" />
              <p className="text-xs text-muted-foreground">Pendentes Tratamento</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{pendentesTab2}</p>
            <p className="text-xs text-muted-foreground">sem conclusão (Aba 2)</p>
          </div>

          {/* Meta Bom */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Meta Bom (≥60%)</p>
            </div>
            {alreadyBom ? (
              <>
                <p className="text-2xl font-bold text-emerald-600">✓</p>
                <p className="text-xs text-emerald-600 font-medium">Meta atingida!</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-emerald-700">{faltamBom}</p>
                <p className="text-xs text-muted-foreground">1ª consultas ou tratamentos</p>
                <p className="text-xs text-muted-foreground">a concluir</p>
              </>
            )}
          </div>

          {/* Meta Ótimo */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              <p className="text-xs text-muted-foreground">Meta Ótimo (≥80%)</p>
            </div>
            {alreadyOtimo ? (
              <>
                <p className="text-2xl font-bold text-blue-600">✓</p>
                <p className="text-xs text-blue-600 font-medium">Meta atingida!</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-700">{faltamOtimo}</p>
                <p className="text-xs text-muted-foreground">1ª consultas ou tratamentos</p>
                <p className="text-xs text-muted-foreground">a concluir</p>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3 italic">
          💡 Cada nova 1ª consulta ou tratamento pendente concluído equivale a +2 Proced. Odont. Preventivos esperado (+2 no numerador e +2 no denominador).
        </p>
      </CardContent>
    </Card>
  );
};
