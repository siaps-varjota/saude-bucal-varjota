import { Card, CardContent } from "@/components/ui/card";
import { Tab6Patient } from "@/hooks/useTab6Data";
import { Calendar } from "lucide-react";
import { format, parse, subMonths, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tab6MonthlyCardsProps {
  patients: Tab6Patient[];
}

const parseDateField = (dateStr: string): Date | null => {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const getMonthYearKey = (date: Date): string => format(date, "MM/yyyy");
const getMonthYearLabel = (date: Date): string => format(date, "MMM/yyyy", { locale: ptBR });

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage <= 3) return "regular";
  if (percentage <= 6) return "suficiente";
  if (percentage <= 8) return "bom";
  return "otimo";
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

export const Tab6MonthlyCards = ({ patients }: Tab6MonthlyCardsProps) => {
  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(now, i);
    return { key: getMonthYearKey(date), label: getMonthYearLabel(date), date };
  }).reverse();

  // Count total and SIM per month based on ultimaData
  const monthTotal = new Map<string, number>();
  const monthSim = new Map<string, number>();

  patients.forEach((patient) => {
    const d = parseDateField(patient.ultimaData);
    if (d) {
      const key = getMonthYearKey(d);
      monthTotal.set(key, (monthTotal.get(key) || 0) + 1);
      if (patient.teveTRA === "SIM") {
        monthSim.set(key, (monthSim.get(key) || 0) + 1);
      }
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        {last12Months.map((month) => {
          const total = monthTotal.get(month.key) || 0;
          const sim = monthSim.get(month.key) || 0;
          const percentage = total > 0 ? (sim / total) * 100 : 0;
          const category = getScoreCategory(percentage);
          const styles = getScoreStyles(category);

          return (
            <Card key={month.key} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className={`h-3 w-3 ${styles.icon}`} />
                  <span className={`text-xs font-medium uppercase ${styles.label}`}>{month.label}</span>
                </div>
                <p className={`text-2xl font-bold ${styles.count}`}>{sim}</p>
                <p className="text-[10px] text-muted-foreground">{percentage.toFixed(1)}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Score Legend */}
      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Pontuação</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span>
          <span className="text-red-600 text-xs">≤ 3%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span>
          <span className="text-amber-600 text-xs">&gt; 3% e ≤ 6%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span>
          <span className="text-emerald-600 text-xs">&gt; 6% e ≤ 8%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span>
          <span className="text-blue-600 text-xs">&gt; 8%</span>
        </div>
      </div>
    </div>
  );
};
