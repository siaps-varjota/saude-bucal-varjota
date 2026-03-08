import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { parse, isValid, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface TratamentoQuadrimesterCardsProps {
  patients: TratamentoPatient[];
}

const parseTratamentoDate = (tratamento: string): Date | null => {
  if (!tratamento || tratamento === "-" || tratamento.trim() === "") return null;
  
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  
  for (const fmt of formats) {
    try {
      const parsed = parse(tratamento.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const getScoreCategory = (percentage: number): string => {
  if (percentage <= 25) return "regular";      // Vermelho
  if (percentage <= 50) return "suficiente";   // Amarelo
  if (percentage <= 75) return "bom";          // Verde
  return "otimo";                              // Azul
};

const getScoreStyles = (category: string) => {
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

// Helper to get quadrimester info
const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  
  if (month >= 0 && month <= 3) {
    return { quad: 1, year, startMonth: 0, endMonth: 3, label: `1º Quad ${year}` };
  } else if (month >= 4 && month <= 7) {
    return { quad: 2, year, startMonth: 4, endMonth: 7, label: `2º Quad ${year}` };
  } else {
    return { quad: 3, year, startMonth: 8, endMonth: 11, label: `3º Quad ${year}` };
  }
};

export const TratamentoQuadrimesterCards = ({ patients }: TratamentoQuadrimesterCardsProps) => {
  const quadrimesterData = useMemo(() => {
    const now = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    
    const quadrimesters: { label: string; average: number; total: number; months: number; percentage: number }[] = [];
    
    // Get current and 2 previous quadrimesters
    for (let i = 2; i >= 0; i--) {
      // Calculate the target quadrimester by going back i quadrimesters
      let targetYear = currentQuad.year;
      let targetQuad = currentQuad.quad - i;
      
      while (targetQuad <= 0) {
        targetQuad += 3;
        targetYear -= 1;
      }
      
      let startMonth: number, endMonth: number, label: string;
      
      if (targetQuad === 1) {
        startMonth = 0;
        endMonth = 3;
        label = `1º Quad ${targetYear}`;
      } else if (targetQuad === 2) {
        startMonth = 4;
        endMonth = 7;
        label = `2º Quad ${targetYear}`;
      } else {
        startMonth = 8;
        endMonth = 11;
        label = `3º Quad ${targetYear}`;
      }
      
      // For current quadrimester, only count months that have passed (including current)
      const isCurrentQuadrimester = i === 0;
      let actualEndMonth = endMonth;
      let monthsCount = 4;
      
      if (isCurrentQuadrimester) {
        actualEndMonth = now.getMonth();
        monthsCount = actualEndMonth - startMonth + 1;
      }
      
      // Count treatments in this quadrimester
      const startDate = startOfMonth(new Date(targetYear, startMonth, 1));
      const endDate = endOfMonth(new Date(targetYear, actualEndMonth, 1));
      
      const tratamentoCount = patients.filter(p => {
        const tratamentoDate = parseTratamentoDate(p.tratamentoConcluido);
        if (!tratamentoDate) return false;
        return isWithinInterval(tratamentoDate, { start: startDate, end: endDate });
      }).length;
      
      // Count 1ª consultas in this quadrimester
    // Denominador fixo: total de pacientes com 1ª consulta registrada
// Denominador: pacientes com 1ª consulta no mesmo quadrimestre
const consultaCount = patients.filter(p => {
  const consultaDate = parseTratamentoDate(p.primeiraConsulta);
  if (!consultaDate) return false;
  return isWithinInterval(consultaDate, { start: startDate, end: endDate });
}).length;

const average = monthsCount > 0 ? Math.round(tratamentoCount / monthsCount) : 0;
const percentage = consultaCount > 0 ? (tratamentoCount / consultaCount) * 100 : 0;
      
      quadrimesters.push({
        label,
        average,
        total: tratamentoCount,
        months: monthsCount,
        percentage
      });
    }
    
    return quadrimesters;
  }, [patients]);

  return (
    <>
      {quadrimesterData.map(({ label, average, total, months, percentage }) => {
        const category = getScoreCategory(percentage);
        const styles = getScoreStyles(category);
        
        return (
          <Card key={label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className={`w-3.5 h-3.5 ${styles.icon}`} />
                  <span className={`text-xs font-medium ${styles.label}`}>{label}</span>
                </div>
                <span className={`text-3xl font-bold ${styles.count}`}>{average.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground mt-1">
                  Média/mês ({total} total)
                </span>
                <span className={`text-xs mt-0.5 ${styles.label}`}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
