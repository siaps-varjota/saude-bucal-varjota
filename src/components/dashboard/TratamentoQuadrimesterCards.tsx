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

const getScoreCategory = (score: number): string => {
  if (score < 0.25) return "regular";
  if (score < 0.50) return "suficiente";
  if (score < 0.75) return "bom";
  return "otimo";
};

const getScoreStyles = (category: string) => {
  switch (category) {
    case "regular":
      return { border: "border-l-red-500", dot: "bg-red-500", bg: "bg-red-50" };
    case "suficiente":
      return { border: "border-l-amber-500", dot: "bg-amber-500", bg: "bg-amber-50" };
    case "bom":
      return { border: "border-l-blue-500", dot: "bg-blue-500", bg: "bg-blue-50" };
    case "otimo":
      return { border: "border-l-emerald-500", dot: "bg-emerald-500", bg: "bg-emerald-50" };
    default:
      return { border: "border-l-muted-foreground", dot: "bg-muted-foreground", bg: "bg-muted" };
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
    
    const quadrimesters: { label: string; average: number; total: number; months: number }[] = [];
    
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
      
      const count = patients.filter(p => {
        const tratamentoDate = parseTratamentoDate(p.tratamentoConcluido);
        if (!tratamentoDate) return false;
        return isWithinInterval(tratamentoDate, { start: startDate, end: endDate });
      }).length;
      
      const average = monthsCount > 0 ? Math.round(count / monthsCount) : 0;
      
      quadrimesters.push({
        label,
        average,
        total: count,
        months: monthsCount
      });
    }
    
    return quadrimesters;
  }, [patients]);

  return (
    <>
      {quadrimesterData.map(({ label, average, total, months }) => {
        const totalPatients = patients.length;
        const score = totalPatients > 0 ? average / totalPatients : 0;
        const category = getScoreCategory(score);
        const styles = getScoreStyles(category);
        
        return (
          <Card key={label} className={`border-l-4 ${styles.border} ${styles.bg} transition-all hover:shadow-md`}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <span className="text-3xl font-bold text-foreground">{average.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground mt-1">
                  Média/mês ({total} total)
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  {(score * 100).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
