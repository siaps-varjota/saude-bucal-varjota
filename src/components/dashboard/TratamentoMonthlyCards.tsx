import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { parse, isValid, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface TratamentoMonthlyCardsProps {
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

export const TratamentoMonthlyCards = ({ patients }: TratamentoMonthlyCardsProps) => {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: Date; label: string; tratamentoCount: number; consultaCount: number }[] = [];
    
    // Get last 12 months including current
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthKey = format(month, "MM/yyyy");
      const label = format(month, "MMM/yy", { locale: ptBR });
      
      // Count patients with tratamento concluído in this month
      const tratamentoCount = patients.filter(p => {
        const tratamentoDate = parseTratamentoDate(p.tratamentoConcluido);
        if (!tratamentoDate) return false;
        return format(tratamentoDate, "MM/yyyy") === monthKey;
      }).length;
      
      // Count patients with 1ª consulta in this month
      const consultaCount = patients.filter(p => {
        const consultaDate = parseTratamentoDate(p.primeiraConsulta);
        if (!consultaDate) return false;
        return format(consultaDate, "MM/yyyy") === monthKey;
      }).length;
      
      months.push({
        month,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        tratamentoCount,
        consultaCount
      });
    }
    
    return months;
  }, [patients]);

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
      {monthlyData.map(({ label, tratamentoCount, consultaCount }) => {
        const score = consultaCount > 0 ? tratamentoCount / consultaCount : 0;
        const category = getScoreCategory(score);
        const styles = getScoreStyles(category);
        
        return (
          <Card
            key={label}
            className={`p-3 border-l-4 ${styles.border} ${styles.bg} transition-all hover:shadow-md`}
          >
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{tratamentoCount}</div>
            <div className="text-xs text-muted-foreground">
              {(score * 100).toFixed(1)}%
            </div>
          </Card>
        );
      })}
    </div>
  );
};
