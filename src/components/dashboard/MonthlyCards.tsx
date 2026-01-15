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

export const MonthlyCards = ({ patients }: MonthlyCardsProps) => {
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
        const hasData = count > 0;
        
        return (
          <Card
            key={month.key}
            className={`border-0 shadow-md transition-all hover:shadow-lg ${
              hasData 
                ? "bg-gradient-to-br from-primary/10 to-primary/5" 
                : "bg-muted/30"
            }`}
          >
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className={`h-3 w-3 ${hasData ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium uppercase ${hasData ? "text-primary" : "text-muted-foreground"}`}>
                  {month.label}
                </span>
              </div>
              <p className={`text-2xl font-bold ${hasData ? "text-primary" : "text-muted-foreground"}`}>
                {count}
              </p>
              <p className="text-[10px] text-muted-foreground">consultas</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
