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

const getScoreCategory = (percentage: number): string => {
  if (percentage <= 25) return "regular";      // Vermelho
  if (percentage <= 50) return "suficiente";   // Amarelo
  if (percentage <= 75) return "bom";          // Verde
  return "otimo";                              // Azul
};

const getScoreStyles = (category: string) => {
  switch (category) {
    case "regular":
      return { border: "border-l-red-500", bg: "bg-red-50", text: "text-red-600" };
    case "suficiente":
      return { border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-600" };
    case "bom":
      return { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-600" };
    case "otimo":
      return { border: "border-l-blue-500", bg: "bg-blue-50", text: "text-blue-600" };
    default:
      return { border: "border-l-muted-foreground", bg: "bg-muted", text: "text-muted-foreground" };
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
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
        {monthlyData.map(({ label, tratamentoCount, consultaCount }) => {
          const percentage = consultaCount > 0 ? (tratamentoCount / consultaCount) * 100 : 0;
          const category = getScoreCategory(percentage);
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
              <div className={`text-xs font-medium ${styles.text}`}>
                {percentage.toFixed(1)}%
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Score Legend */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-blue-500">●</span>
          <span className="font-medium text-muted-foreground">Pontuação</span>
        </div>
        <div className="flex items-center border rounded-md divide-x text-xs">
          <div className="px-3 py-1.5 flex flex-col items-center">
            <span className="font-medium text-red-600">Regular</span>
            <span className="text-muted-foreground">≤ 25%</span>
          </div>
          <div className="px-3 py-1.5 flex flex-col items-center">
            <span className="font-medium text-amber-600">Suficiente</span>
            <span className="text-muted-foreground">&gt; 25% e ≤ 50%</span>
          </div>
          <div className="px-3 py-1.5 flex flex-col items-center">
            <span className="font-medium text-emerald-600">Bom</span>
            <span className="text-muted-foreground">&gt; 50% e ≤ 75%</span>
          </div>
          <div className="px-3 py-1.5 flex flex-col items-center">
            <span className="font-medium text-blue-600">Ótimo</span>
            <span className="text-muted-foreground">&gt; 75%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
