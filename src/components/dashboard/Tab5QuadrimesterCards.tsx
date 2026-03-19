import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tab5Record } from "@/hooks/useTab5Data";
import { CalendarDays } from "lucide-react";

interface Tab5QuadrimesterCardsProps {
  records: Tab5Record[];
  quadrimestre?: string;
}

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

// Critérios B5 — Proced. Odont. Preventivos
const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage >= 80 && percentage <= 85) return "otimo";
  if (percentage >= 60 && percentage < 80)  return "bom";
  if (percentage >= 40 && percentage < 60)  return "suficiente";
  return "regular"; // < 40 ou > 85
};

const getScoreStyles = (category: ScoreCategory) => {
  switch (category) {
    case "regular":    return { bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500",             icon: "text-red-600",     label: "text-red-700",     count: "text-red-700"     };
    case "suficiente": return { bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500",       icon: "text-amber-600",   label: "text-amber-700",   count: "text-amber-700"   };
    case "bom":        return { bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500", icon: "text-emerald-600", label: "text-emerald-700", count: "text-emerald-700" };
    case "otimo":      return { bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500",           icon: "text-blue-600",    label: "text-blue-700",    count: "text-blue-700"    };
    default:           return { bg: "bg-muted/30", icon: "text-muted-foreground", label: "text-muted-foreground", count: "text-muted-foreground" };
  }
};

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
};

const getQuadrimesterForMonth = (month: number): number => {
  if (month <= 3) return 1;
  if (month <= 7) return 2;
  return 3;
};

const getQuadrimesterLabel = (quadNum: number, year: number): string => `${quadNum}º Quad/${year}`;

export const Tab5QuadrimesterCards = ({ records, quadrimestre = "todos" }: Tab5QuadrimesterCardsProps) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentQuad = getQuadrimesterForMonth(currentMonth);

  const quadCounts = useMemo(() => {
    const quadrimesters: { label: string; quadNum: number; year: number; quadKey: string }[] = [];
    let quad = currentQuad;
    let year = currentYear;
    for (let i = 0; i < 3; i++) {
      quadrimesters.push({ label: getQuadrimesterLabel(quad, year), quadNum: quad, year, quadKey: `Q${quad}-${year}` });
      quad--;
      if (quad < 1) { quad = 3; year--; }
    }
    quadrimesters.reverse();

    return quadrimesters.map((q) => {
      const quadMonths = q.quadNum === 1 ? [0, 1, 2, 3] : q.quadNum === 2 ? [4, 5, 6, 7] : [8, 9, 10, 11];
      const byMonth = new Map<number, { preventivos: number; total: number }>();

      records.forEach((r) => {
        const parts = r.mesAno.split("/");
        const mesName = parts[0]?.toLowerCase().trim();
        const ano = parseInt(parts[1]);
        const mesIdx = MONTH_MAP[mesName];
        if (mesIdx === undefined || ano !== q.year || !quadMonths.includes(mesIdx)) return;
        const existing = byMonth.get(mesIdx) || { preventivos: 0, total: 0 };
        existing.preventivos += r.preventivos;
        existing.total += r.totalIndividuais;
        byMonth.set(mesIdx, existing);
      });

      let totalPreventivos = 0, totalIndividuais = 0;
      byMonth.forEach(({ preventivos, total }) => {
        totalPreventivos += preventivos;
        totalIndividuais += total;
      });

      // % = sumPreventivos / sumIndividuais (divisão direta)
      const percentage = totalIndividuais > 0 ? (totalPreventivos / totalIndividuais) * 100 : 0;
      const monthsWithData = byMonth.size;
      const avgMonthlyPreventivos = monthsWithData > 0 ? totalPreventivos / monthsWithData : 0;

      return { ...q, totalPreventivos, totalIndividuais, percentage, avgMonthlyPreventivos };
    });
  }, [records, currentQuad, currentYear]);

  const visibleCards = quadrimestre !== "todos"
    ? quadCounts.filter(q => q.quadKey === quadrimestre)
    : quadCounts;

  return (
    <>
      {visibleCards.map((quad) => {
        const category = getScoreCategory(quad.percentage);
        const styles = getScoreStyles(category);
        return (
          <Card key={quad.label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>{quad.label}</span>
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>{quad.totalPreventivos}</p>
              <p className="text-xs text-muted-foreground mt-1">de {quad.totalIndividuais} individuais</p>
              <p className="text-xs text-muted-foreground">Média mensal: {quad.avgMonthlyPreventivos.toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${styles.label}`}>{quad.percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
