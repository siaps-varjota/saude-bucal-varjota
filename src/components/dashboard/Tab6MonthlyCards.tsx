import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tab6Record } from "@/hooks/useTab6Data";
import { Calendar } from "lucide-react";

interface Tab6MonthlyCardsProps {
  records: Tab6Record[];
}

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage > 8) return "otimo";
  if (percentage > 6) return "bom";
  if (percentage > 3) return "suficiente";
  return "regular";
};

const getScoreStyles = (category: ScoreCategory) => {
  switch (category) {
    case "regular":
      return {
        bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500",
        icon: "text-red-600", label: "text-red-700", count: "text-red-700",
      };
    case "suficiente":
      return {
        bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500",
        icon: "text-amber-600", label: "text-amber-700", count: "text-amber-700",
      };
    case "bom":
      return {
        bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500",
        icon: "text-emerald-600", label: "text-emerald-700", count: "text-emerald-700",
      };
    case "otimo":
      return {
        bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500",
        icon: "text-blue-600", label: "text-blue-700", count: "text-blue-700",
      };
    default:
      return {
        bg: "bg-muted/30",
        icon: "text-muted-foreground", label: "text-muted-foreground", count: "text-muted-foreground",
      };
  }
};

const MONTH_ORDER = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export const Tab6MonthlyCards = ({ records }: Tab6MonthlyCardsProps) => {
  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, { exodontias: number; total: number }>();

    records.forEach((r) => {
      const existing = byMonth.get(r.mesAno) || { exodontias: 0, total: 0 };
      existing.exodontias += r.exodontias;
      existing.total += r.totalProcedimentos;
      byMonth.set(r.mesAno, existing);
    });

    return Array.from(byMonth.entries())
      .map(([mesAno, data]) => {
        const percentage = data.total > 0 ? (data.exodontias / data.total) * 100 : 0;
        return { mesAno, ...data, percentage };
      })
      .sort((a, b) => {
        const [mesA, anoA] = a.mesAno.split("/");
        const [mesB, anoB] = b.mesAno.split("/");
        const yearDiff = parseInt(anoA) - parseInt(anoB);
        if (yearDiff !== 0) return yearDiff;
        return MONTH_ORDER.indexOf(mesA.toLowerCase()) - MONTH_ORDER.indexOf(mesB.toLowerCase());
      });
  }, [records]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        {monthlyData.map((month) => {
          const category = getScoreCategory(month.percentage);
          const styles = getScoreStyles(category);

          return (
            <Card key={month.mesAno} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className={`h-3 w-3 ${styles.icon}`} />
                  <span className={`text-xs font-medium uppercase ${styles.label}`}>
                    {month.mesAno.split("/")[0].slice(0, 3)}/{month.mesAno.split("/")[1]}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${styles.count}`}>{month.exodontias}</p>
                <p className="text-[10px] text-muted-foreground">de {month.total} | {month.percentage.toFixed(1)}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score Legend */}
      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Pontuação</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span>
          <span className="text-blue-600 text-xs">&gt; 8%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span>
          <span className="text-emerald-600 text-xs">&gt; 6% e ≤ 8%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span>
          <span className="text-amber-600 text-xs">&gt; 3% e ≤ 6%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span>
          <span className="text-red-600 text-xs">≤ 3%</span>
        </div>
      </div>
    </div>
  );
};
