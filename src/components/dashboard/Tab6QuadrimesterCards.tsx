import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tab6Record } from "@/hooks/useTab6Data";
import { CalendarDays } from "lucide-react";

interface Tab6QuadrimesterCardsProps {
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

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const getQuadrimesterForMonth = (month: number): number => {
  if (month <= 3) return 1;
  if (month <= 7) return 2;
  return 3;
};

const getQuadrimesterLabel = (quadNum: number, year: number): string => `${quadNum}º Quad/${year}`;

export const Tab6QuadrimesterCards = ({ records }: Tab6QuadrimesterCardsProps) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentQuad = getQuadrimesterForMonth(currentMonth);

  const quadCounts = useMemo(() => {
    const quadrimesters: { label: string; quadNum: number; year: number }[] = [];
    let quad = currentQuad;
    let year = currentYear;
    for (let i = 0; i < 3; i++) {
      quadrimesters.push({ label: getQuadrimesterLabel(quad, year), quadNum: quad, year });
      quad--;
      if (quad < 1) { quad = 3; year--; }
    }
    quadrimesters.reverse();

    return quadrimesters.map((q) => {
      const quadMonths = q.quadNum === 1 ? [0, 1, 2, 3] : q.quadNum === 2 ? [4, 5, 6, 7] : [8, 9, 10, 11];
      const byMonth = new Map<number, { exodontias: number; total: number }>();

      records.forEach((r) => {
        const parts = r.mesAno.split("/");
        const mesName = parts[0]?.toLowerCase().trim();
        const ano = parseInt(parts[1]);
        const mesIdx = MONTH_MAP[mesName];
        if (mesIdx === undefined || ano !== q.year || !quadMonths.includes(mesIdx)) return;

        const existing = byMonth.get(mesIdx) || { exodontias: 0, total: 0 };
        existing.exodontias += r.exodontias;
        existing.total += r.totalProcedimentos;
        byMonth.set(mesIdx, existing);
      });

      const monthlyData: { exodontias: number; total: number }[] = [];
      byMonth.forEach((data) => {
        if (data.total > 0) monthlyData.push(data);
      });

      const totalExodontias = monthlyData.reduce((s, m) => s + m.exodontias, 0);
      const totalProcedimentos = monthlyData.reduce((s, m) => s + m.total, 0);
      const monthlyPercentages = monthlyData.map((m) => (m.exodontias / m.total) * 100);
      const avgPercentage = monthlyPercentages.length > 0
        ? monthlyPercentages.reduce((s, p) => s + p, 0) / monthlyPercentages.length
        : 0;
      const avgMonthlyExodontias = monthlyData.length > 0 ? totalExodontias / monthlyData.length : 0;

      return {
        ...q,
        totalExodontias,
        totalProcedimentos,
        percentage: avgPercentage,
        avgMonthlyExodontias,
      };
    });
  }, [records, currentQuad, currentYear]);

  return (
    <>
      {quadCounts.map((quad) => {
        const category = getScoreCategory(quad.percentage);
        const styles = getScoreStyles(category);
        return (
          <Card key={quad.label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>{quad.label}</span>
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>{quad.totalExodontias}</p>
              <p className="text-xs text-muted-foreground mt-1">de {quad.totalProcedimentos} procedimentos</p>
              <p className="text-xs text-muted-foreground">Média mensal: {quad.avgMonthlyExodontias.toFixed(1)}</p>
              <p className="text-muted-foreground text-sm">{quad.percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
