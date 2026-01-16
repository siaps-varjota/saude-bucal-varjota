import { Card, CardContent } from "@/components/ui/card";
import { Patient } from "@/hooks/usePatientData";
import { Calendar } from "lucide-react";
import { format, parse, subMonths, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthlyCardsProps {
  patients: Patient[];
}

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  
  // Try different date formats
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

const getMonthYearKey = (date: Date): string => {
  return format(date, "MM/yyyy");
};

const getMonthYearLabel = (date: Date): string => {
  return format(date, "MMM/yyyy", { locale: ptBR });
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

export const MonthlyCards = ({ patients }: MonthlyCardsProps) => {
  const totalPatients = patients.length;
  
  // Generate last 12 months
  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(now, i);
    return {
      key: getMonthYearKey(date),
      label: getMonthYearLabel(date),
      date,
    };
  }).reverse();

  // Count patients per month based on "1ª Consulta" date (primeiraConsulta field)
  const monthCounts = new Map<string, number>();
  
  patients.forEach((patient) => {
    const consultaDate = parseConsultaDate(patient.primeiraConsulta);
    if (consultaDate) {
      const key = getMonthYearKey(consultaDate);
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    }
  });

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
      {last12Months.map((month) => {
        const count = monthCounts.get(month.key) || 0;
        const percentage = totalPatients > 0 ? (count / totalPatients) * 100 : 0;
        const category = getScoreCategory(percentage);
        const styles = getScoreStyles(category);
        
        return (
          <Card
            key={month.key}
            className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}
          >
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className={`h-3 w-3 ${styles.icon}`} />
                <span className={`text-xs font-medium uppercase ${styles.label}`}>
                  {month.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${styles.count}`}>
                {count}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {percentage.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
