import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { parse, isValid, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface TratamentoQuadrimesterCardsProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  totalComConsulta: number;
  quadrimestre?: string;
  mesReferencia?: string[]; // ← novo
}

const parseTratamentoDate = (str: string): Date | null => {
  if (!str || str === "-" || str.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(str.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

const getScoreCategory = (percentage: number, total: number): string => {
  if (total === 0) return "none";
  if (percentage > 75) return "otimo";
  if (percentage > 50) return "bom";
  if (percentage > 25) return "suficiente";
  return "regular";
};

const getScoreStyles = (category: string) => {
  switch (category) {
    case "regular":    return { bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500",             icon: "text-red-600",     label: "text-red-700",     count: "text-red-700"     };
    case "suficiente": return { bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500",       icon: "text-amber-600",   label: "text-amber-700",   count: "text-amber-700"   };
    case "bom":        return { bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500", icon: "text-emerald-600", label: "text-emerald-700", count: "text-emerald-700" };
    case "otimo":      return { bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500",           icon: "text-blue-600",    label: "text-blue-700",    count: "text-blue-700"    };
    default:           return { bg: "bg-muted/30", icon: "text-muted-foreground", label: "text-muted-foreground", count: "text-muted-foreground" };
  }
};

const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth();
  const year  = date.getFullYear();
  if (month <= 3) return { quad: 1, year };
  if (month <= 7) return { quad: 2, year };
  return { quad: 3, year };
};

// Verifica se uma data cai no período: mesReferencia tem prioridade sobre o range
const inPeriod = (
  dateStr: string,
  startDate: Date,
  endDate: Date,
  mesReferencia: string[]
): boolean => {
  const d = parseTratamentoDate(dateStr);
  if (!d) return false;
  if (mesReferencia.length > 0) {
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return mesReferencia.includes(key);
  }
  return isWithinInterval(d, { start: startDate, end: endDate });
};

export const TratamentoQuadrimesterCards = ({
  patients,
  quadrimestre = "todos",
  mesReferencia = [], // ← novo
}: TratamentoQuadrimesterCardsProps) => {
  const quadrimesterData = useMemo(() => {
    const now = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const result: {
      label: string; total: number; totalConsultasQuad: number;
      average: number; months: number; percentage: number; quadKey: string;
    }[] = [];

    for (let i = 2; i >= 0; i--) {
      let targetYear = currentQuad.year;
      let targetQuad = currentQuad.quad - i;
      while (targetQuad <= 0) { targetQuad += 3; targetYear -= 1; }

      let startMonth: number, endMonth: number, label: string;
      if (targetQuad === 1)      { startMonth = 0; endMonth = 3;  label = `1º Quad/${targetYear}`; }
      else if (targetQuad === 2) { startMonth = 4; endMonth = 7;  label = `2º Quad/${targetYear}`; }
      else                       { startMonth = 8; endMonth = 11; label = `3º Quad/${targetYear}`; }

      const isCurrentQuad  = i === 0;
      const actualEndMonth = isCurrentQuad ? now.getMonth() : endMonth;
      const monthsCount    = actualEndMonth - startMonth + 1;

      const startDate = startOfMonth(new Date(targetYear, startMonth, 1));
      const endDate   = endOfMonth(new Date(targetYear, actualEndMonth, 1));

      // ── DENOMINADOR: primeiraConsulta no período ──────────────────────────
      const consultasQuad = patients.filter(p =>
        inPeriod(p.primeiraConsulta, startDate, endDate, mesReferencia)
      ).length;

      // ── NUMERADOR: tratamentoConcluido no período ─────────────────────────
      const tratamentoCount = patients.filter(p =>
        inPeriod(p.tratamentoConcluido, startDate, endDate, mesReferencia)
      ).length;

      const percentage = consultasQuad > 0 ? (tratamentoCount / consultasQuad) * 100 : 0;
      const average    = monthsCount    > 0 ? tratamentoCount / monthsCount          : 0;

      result.push({
        label,
        total: tratamentoCount,
        totalConsultasQuad: consultasQuad,
        average,
        months: monthsCount,
        percentage,
        quadKey: `Q${targetQuad}-${targetYear}`,
      });
    }

    return result;
  }, [patients, mesReferencia]); // ← mesReferencia na dep

  const visibleCards = quadrimestre !== "todos"
    ? quadrimesterData.filter(q => q.quadKey === quadrimestre)
    : quadrimesterData;

  return (
    <>
      {visibleCards.map(({ label, total, totalConsultasQuad, average, percentage }) => {
        const category = getScoreCategory(percentage, total);
        const styles   = getScoreStyles(category);
        return (
          <Card key={label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className={`w-3.5 h-3.5 ${styles.icon}`} />
                  <span className={`text-xs font-medium ${styles.label}`}>{label}</span>
                </div>
                <span className={`text-3xl font-bold ${styles.count}`}>{total}</span>
                <span className="text-xs text-muted-foreground mt-1">de {totalConsultasQuad}</span>
                <span className="text-xs text-muted-foreground">Média/mês: {average.toFixed(1)}</span>
                <span className={`text-xs mt-0.5 ${styles.label}`}>{percentage.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
