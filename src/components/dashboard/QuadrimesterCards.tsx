import { Card, CardContent } from "@/components/ui/card";
import { Patient } from "@/hooks/usePatientData";
import { CalendarDays } from "lucide-react";
import { parse, isValid, getMonth, getYear } from "date-fns";

interface QuadrimesterCardsProps {
  patients: Patient[];
}

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(consulta.trim(), fmt, new Date());
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
  if (percentage <= 1) return "regular";
  if (percentage <= 3) return "suficiente";
  if (percentage <= 5) return "bom";
  return "otimo";
};

const getScoreStyles = (category: ScoreCategory) => {
  switch (category) {
    case "regular":
      return {
        bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500",
        icon: "text-red-600",
        label: "text-red-700",
        count: "text-red-700",
      };
    case "suficiente":
      return {
        bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500",
        icon: "text-amber-600",
        label: "text-amber-700",
        count: "text-amber-700",
      };
    case "bom":
      return {
        bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500",
        icon: "text-emerald-600",
        label: "text-emerald-700",
        count: "text-emerald-700",
      };
    case "otimo":
      return {
        bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500",
        icon: "text-blue-600",
        label: "text-blue-700",
        count: "text-blue-700",
      };
    default:
      return {
        bg: "bg-muted/30",
        icon: "text-muted-foreground",
        label: "text-muted-foreground",
        count: "text-muted-foreground",
      };
  }
};

interface Quadrimester {
  label: string;
  months: number[]; // 0-indexed months (0 = Jan, 11 = Dec)
  year: number;
}

const getQuadrimesterForMonth = (month: number): number => {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  if (month <= 3) return 1; // Jan-Apr (Q1)
  if (month <= 7) return 2; // May-Aug (Q2)
  return 3; // Sep-Dec (Q3)
};

const getQuadrimesterLabel = (quadNum: number, year: number): string => {
  return `${quadNum}º Quad/${year}`;
};

const getQuadrimesterMonths = (quadNum: number): number[] => {
  switch (quadNum) {
    case 1: return [0, 1, 2, 3]; // Jan-Apr
    case 2: return [4, 5, 6, 7]; // May-Aug
    case 3: return [8, 9, 10, 11]; // Sep-Dec
    default: return [];
  }
};

export const QuadrimesterCards = ({ patients }: QuadrimesterCardsProps) => {
  const totalPatients = patients.length;
  const now = new Date();
  const currentMonth = getMonth(now);
  const currentYear = getYear(now);
  const currentQuad = getQuadrimesterForMonth(currentMonth);

  // Generate last 3 quadrimesters including current
  const quadrimesters: Quadrimester[] = [];
  
  let quad = currentQuad;
  let year = currentYear;
  
  for (let i = 0; i < 3; i++) {
    quadrimesters.push({
      label: getQuadrimesterLabel(quad, year),
      months: getQuadrimesterMonths(quad),
      year,
    });
    
    quad--;
    if (quad < 1) {
      quad = 3;
      year--;
    }
  }
  
  // Reverse to show oldest first
  quadrimesters.reverse();

  // Count consultations per quadrimester with monthly breakdown
  const quadCounts = quadrimesters.map((q) => {
    const monthlyData: { count: number }[] = [];

    q.months.forEach((m) => {
      // Only consider months that have passed or are current
      if (q.year < currentYear || (q.year === currentYear && m <= currentMonth)) {
        let monthCount = 0;
        patients.forEach((patient) => {
          const consultaDate = parseConsultaDate(patient.primeiraConsulta);
          if (consultaDate) {
            const consultaMonth = getMonth(consultaDate);
            const consultaYear = getYear(consultaDate);
            if (consultaYear === q.year && consultaMonth === m) {
              monthCount++;
            }
          }
        });
        monthlyData.push({ count: monthCount });
      }
    });

    const total = monthlyData.reduce((s, m) => s + m.count, 0);
    const avgMonthlySim = monthlyData.length > 0 ? total / monthlyData.length : 0;
    const monthlyPercentages = monthlyData.map((m) =>
      totalPatients > 0 ? (m.count / totalPatients) * 100 : 0
    );
    const avgPercentage = monthlyPercentages.length > 0
      ? monthlyPercentages.reduce((s, p) => s + p, 0) / monthlyPercentages.length
      : 0;

    return {
      ...q,
      total,
      avgMonthlySim,
      percentage: avgPercentage,
    };
  });

  return (
    <>
      {quadCounts.map((quad) => {
        const category = getScoreCategory(quad.percentage);
        const styles = getScoreStyles(category);
        
        return (
          <Card
            key={quad.label}
            className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>
                  {quad.label}
                </span>
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>
                {quad.total}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                de {totalPatients} registros
              </p>
              <p className="text-xs text-muted-foreground">
                Média mensal: {quad.avgMonthlySim.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {quad.percentage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
