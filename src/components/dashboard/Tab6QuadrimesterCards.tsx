import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tab6Patient } from "@/hooks/useTab6Data";
import { CalendarDays } from "lucide-react";
import { parse, isValid, getMonth, getYear } from "date-fns";

interface Tab6QuadrimesterCardsProps {
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

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage <= 25) return "regular";
  if (percentage <= 50) return "suficiente";
  if (percentage <= 75) return "bom";
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

const getQuadrimesterForMonth = (month: number): number => {
  if (month <= 3) return 1;
  if (month <= 7) return 2;
  return 3;
};

const getQuadrimesterLabel = (quadNum: number, year: number): string =>
  `${quadNum}º Quad/${year}`;

const getQuadrimesterMonths = (quadNum: number): number[] => {
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return [];
  }
};

export const Tab6QuadrimesterCards = ({ patients }: Tab6QuadrimesterCardsProps) => {
  const now = new Date();
  const currentMonth = getMonth(now);
  const currentYear = getYear(now);
  const currentQuad = getQuadrimesterForMonth(currentMonth);

  const quadCounts = useMemo(() => {
    const quadrimesters: { label: string; months: number[]; year: number }[] = [];
    let quad = currentQuad;
    let year = currentYear;

    for (let i = 0; i < 3; i++) {
      quadrimesters.push({
        label: getQuadrimesterLabel(quad, year),
        months: getQuadrimesterMonths(quad),
        year,
      });
      quad--;
      if (quad < 1) { quad = 3; year--; }
    }
    quadrimesters.reverse();

    return quadrimesters.map((q) => {
      let totalRecords = 0;
      let countSim = 0;

      patients.forEach((patient) => {
        const d = parseDateField(patient.ultimaData);
        if (d) {
          const m = getMonth(d);
          const y = getYear(d);
          if (y === q.year && q.months.includes(m)) {
            totalRecords++;
            if (patient.teveTRA === "SIM") countSim++;
          }
        }
      });

      const percentage = totalRecords > 0 ? (countSim / totalRecords) * 100 : 0;
      return { ...q, countSim, totalRecords, percentage };
    });
  }, [patients, currentQuad, currentYear]);

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
              <p className={`text-3xl font-bold ${styles.count}`}>{quad.countSim}</p>
              <p className="text-xs text-muted-foreground mt-1">de {quad.totalRecords} registros</p>
              <p className="text-[10px] text-muted-foreground">{quad.percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
