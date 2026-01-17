import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { isTratamentoPendente } from "@/hooks/useFilteredTratamento";
import { parse, isValid, format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";

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
      return "bg-red-500/10 border-red-500/30 text-red-700";
    case "suficiente":
      return "bg-amber-500/10 border-amber-500/30 text-amber-700";
    case "bom":
      return "bg-blue-500/10 border-blue-500/30 text-blue-700";
    case "otimo":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700";
    default:
      return "bg-muted border-muted-foreground/20 text-muted-foreground";
  }
};

export const TratamentoMonthlyCards = ({ patients }: TratamentoMonthlyCardsProps) => {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: Date; label: string; count: number; total: number }[] = [];
    
    // Get last 12 months including current
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const monthKey = format(month, "MM/yyyy");
      const label = format(month, "MMM/yy", { locale: ptBR });
      
      // Count patients with treatment in this month
      const count = patients.filter(p => {
        const tratamentoDate = parseTratamentoDate(p.tratamentoConcluido);
        if (!tratamentoDate) return false;
        return format(tratamentoDate, "MM/yyyy") === monthKey;
      }).length;
      
      months.push({
        month,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        count,
        total: patients.length
      });
    }
    
    return months;
  }, [patients]);

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
      {monthlyData.map(({ label, count, total }) => {
        const score = total > 0 ? count / total : 0;
        const category = getScoreCategory(score);
        const styles = getScoreStyles(category);
        
        return (
          <Card
            key={label}
            className={`p-3 text-center border ${styles} transition-all hover:shadow-md`}
          >
            <div className="text-xs font-medium opacity-80 mb-1">{label}</div>
            <div className="text-xl font-bold">{count}</div>
            <div className="text-xs opacity-70">
              {(score * 100).toFixed(1)}%
            </div>
          </Card>
        );
      })}
    </div>
  );
};
