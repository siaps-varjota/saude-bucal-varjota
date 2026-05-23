import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { parse, isValid, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";

interface TratamentoMonthlyCardsProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  quadrimestre?: string;
  mesReferencia?: string[];
  equipe?: string;
  oficialData?: OficialData;
}

const getQuadrimesterMonths = (quadKey: string): number[] | null => {
  if (!quadKey || quadKey === "todos") return null;
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return null;
  const quadNum = parseInt(match[1]);
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return null;
  }
};

const getQuadrimesterYear = (quadKey: string): number | null => {
  if (!quadKey || quadKey === "todos") return null;
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  return match ? parseInt(match[2]) : null;
};

const parseTratamentoDate = (tratamento: string): Date | null => {
  if (!tratamento || tratamento === "-" || tratamento.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(tratamento.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number, total: number): ScoreCategory => {
  if (total === 0) return "none";
  if (percentage <= 25) return "regular";
  if (percentage <= 50) return "suficiente";
  if (percentage <= 75) return "bom";
  return "otimo";
};

const getScoreStyles = (category: ScoreCategory) => {
  switch (category) {
    case "regular":
      return { bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500", border: "border-l-red-500", label: "text-red-700", count: "text-red-700" };
    case "suficiente":
      return { bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500", border: "border-l-amber-500", label: "text-amber-700", count: "text-amber-700" };
    case "bom":
      return { bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500", border: "border-l-emerald-500", label: "text-emerald-700", count: "text-emerald-700" };
    case "otimo":
      return { bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500", border: "border-l-blue-500", label: "text-blue-700", count: "text-blue-700" };
    default:
      return { bg: "bg-muted/30", border: "border-l-muted", label: "text-muted-foreground", count: "text-muted-foreground" };
  }
};

export const TratamentoMonthlyCards = ({
  patients,
  allPatients,
  quadrimestre = "todos",
  mesReferencia = [],
  equipe = "all",
  oficialData,
}: TratamentoMonthlyCardsProps) => {
  const quadMonths = getQuadrimesterMonths(quadrimestre);
  const quadYear   = getQuadrimesterYear(quadrimestre);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: {
      label: string;
      monthKey: string;
      tratamentoCount: number;
      consultaCount: number;
      date: Date;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const month    = subMonths(now, i);
      const monthKey = format(month, "MM/yyyy");
      const label    = format(month, "MMM/yy", { locale: ptBR });

      // Denominador: pacientes com primeiraConsulta neste mês
      const denPatients = allPatients.filter(p => {
        const d = parseTratamentoDate(p.primeiraConsulta);
        return d ? format(d, "MM/yyyy") === monthKey : false;
      });
      const consultaCount = denPatients.length;

      // Numerador: subconjunto do denominador com tratamento não pendente
      // (mesma lógica do StatsCard "Com Tratamento")
      const tratamentoCount = denPatients.filter(p =>
        !isTratamentoPendente(p.tratamentoConcluido)
      ).length;

      months.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        monthKey,
        tratamentoCount,
        consultaCount,
        date: month,
      });
    }
    return months;
  }, [patients, allPatients]);

  // Filtro por quadrimestre
  let filteredMonthlyData = quadMonths && quadYear
    ? monthlyData.filter(m => m.date.getFullYear() === quadYear && quadMonths.includes(m.date.getMonth()))
    : monthlyData;

  // Filtro por mês específico
  if (mesReferencia.length > 0) {
    filteredMonthlyData = filteredMonthlyData.map(m =>
      mesReferencia.includes(m.monthKey)
        ? m
        : { ...m, tratamentoCount: 0, consultaCount: 0 }
    );
  }

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${filteredMonthlyData.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12"}`}>
        {filteredMonthlyData.map(({ label, monthKey, tratamentoCount, consultaCount, date }) => {

          // ── Merge oficial vs preliminar (B2) ─────────────────────────────
          const mesNorm = normalizeMes(monthKey) ?? monthKey;
          const ofKey   = makeOficialKey(mesNorm, equipe);
          const ofRow   = oficialData?.index.get(ofKey);

          const isOficial = !!ofRow;
          const finalNum  = isOficial ? ofRow!.numB2 : tratamentoCount;
          const finalDen  = isOficial ? ofRow!.denB2 : consultaCount;
          const fonte     = isOficial ? "oficial" as const : "preliminar" as const;
          // ─────────────────────────────────────────────────────────────────

          const percentage = finalDen > 0 ? (finalNum / finalDen) * 100 : 0;
          const category   = getScoreCategory(percentage, finalNum);
          const styles     = getScoreStyles(category);

          return (
            <Card key={label} className={`p-3 border-l-4 ${styles.border} ${styles.bg} transition-all hover:shadow-md text-center`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${styles.count}`}>{finalNum}</div>
              <p className="text-xs">
                <span className="text-muted-foreground font-medium">de {finalDen}</span>
                <span className={`font-medium ${styles.label}`}> | {percentage.toFixed(1)}%</span>
              </p>
              <div className="mt-1.5 flex justify-center">
                <FonteBadge fonte={fonte} />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
        <span className="font-medium text-muted-foreground">Pontuação</span>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-medium border border-red-200">Regular ≤ 25%</span>
          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">Suficiente &gt; 25% e ≤ 50%</span>
          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">Bom &gt; 50% e ≤ 75%</span>
          <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200">Ótimo &gt; 75%</span>
        </div>
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <FonteBadge fonte="oficial" />
          <FonteBadge fonte="preliminar" />
        </div>
      </div>
    </div>
  );
};
