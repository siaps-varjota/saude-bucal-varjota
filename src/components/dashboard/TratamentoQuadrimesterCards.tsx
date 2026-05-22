import { useMemo } from "react";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { parse, isValid, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";

interface TratamentoQuadrimesterCardsProps {
  patients: TratamentoPatient[];
  allPatients: TratamentoPatient[];
  totalComConsulta: number;
  quadrimestres?: string[];
  mesReferencia?: string[];
  equipe?: string;
  oficialData?: OficialData;
}

const parseTratamentoDate = (str: string): Date | null => {
  if (!str || str === "-" || str.trim() === "") return null;
  const fmts = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of fmts) {
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

const quadContainsMesReferencia = (
  mesReferencia: string[],
  startDate: Date,
  endDate: Date,
): boolean => {
  if (mesReferencia.length === 0) return false;
  return mesReferencia.some(mmyyyy => {
    const [mm, yyyy] = mmyyyy.split("/").map(Number);
    if (!mm || !yyyy) return false;
    return isWithinInterval(new Date(yyyy, mm - 1, 1), { start: startDate, end: endDate });
  });
};

const inPeriod = (
  dateStr: string,
  startDate: Date,
  endDate: Date,
  mesReferencia: string[],
  quadContainsMes: boolean,
): boolean => {
  const d = parseTratamentoDate(dateStr);
  if (!d) return false;
  if (mesReferencia.length > 0 && quadContainsMes) {
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    return mesReferencia.includes(key);
  }
  return isWithinInterval(d, { start: startDate, end: endDate });
};

// ── Resolve num/den B2 para um mês via oficial ou preliminar ──────────────────
const resolveMonthB2 = (
  monthDate: Date,
  prelNum: number,
  prelDen: number,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; fonte: FonteDado } => {
  const mesNorm = normalizeMes(format(monthDate, "MM/yyyy")) ?? format(monthDate, "MM/yyyy");
  const ofRow   = oficialIndex?.get(makeOficialKey(mesNorm, equipe));
  if (!!ofRow) {
    return { num: ofRow.numB2, den: ofRow.denB2, fonte: "oficial" };
  }
  return { num: prelNum, den: prelDen, fonte: "preliminar" };
};

export const TratamentoQuadrimesterCards = ({
  patients,
  quadrimestres = [],
  mesReferencia = [],
  equipe = "all",
  oficialData,
}: TratamentoQuadrimesterCardsProps) => {

  const quadrimesterData = useMemo(() => {
    const now         = new Date();
    const currentQuad = getQuadrimesterInfo(now);

    const result: {
      label: string;
      total: number;
      totalConsultasQuad: number;
      average: number;
      months: number;
      percentage: number;
      quadKey: string;
      fonte: FonteDado;
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

      const startDate  = startOfMonth(new Date(targetYear, startMonth, 1));
      const endDate    = endOfMonth(new Date(targetYear, actualEndMonth, 1));
      const containsMes = quadContainsMesReferencia(mesReferencia, startDate, endDate);

      // ── Agrega meses com merge oficial ────────────────────────────────────
      let totalNum          = 0;
      let totalDen          = 0;
      let todosMesesOficiais = true;

      for (let m = startMonth; m <= actualEndMonth; m++) {
        const monthDate = new Date(targetYear, m, 1);

        // Preliminar: filtra pacientes no mês
        const prelNum = patients.filter(p =>
       p.comTratamentoConcluido === "SIM" &&
       inPeriod(p.primeiraConsulta, startOfMonth(monthDate), endOfMonth(monthDate), mesReferencia, containsMes)
       ).length;
        const prelDen = patients.filter(p =>
          inPeriod(p.primeiraConsulta, startOfMonth(monthDate), endOfMonth(monthDate), mesReferencia, containsMes)
        ).length;

        const resolved = resolveMonthB2(monthDate, prelNum, prelDen, equipe, oficialData?.index);
        totalNum += resolved.num;
        totalDen += resolved.den;
        if (resolved.fonte !== "oficial") todosMesesOficiais = false;
      }
      // ─────────────────────────────────────────────────────────────────────

      const percentage = totalDen > 0 ? (totalNum / totalDen) * 100 : 0;
      const average    = monthsCount > 0 ? totalNum / monthsCount    : 0;
      const fonte: FonteDado = todosMesesOficiais ? "oficial" : "preliminar";

      result.push({
        label,
        total: totalNum,
        totalConsultasQuad: totalDen,
        average,
        months: monthsCount,
        percentage,
        quadKey: `Q${targetQuad}-${targetYear}`,
        fonte,
      });
    }

    return result;
  }, [patients, mesReferencia, equipe, oficialData]);

  const visibleCards = quadrimestres.length > 0
    ? quadrimesterData.filter(q => quadrimestres.includes(q.quadKey))
    : quadrimesterData;

  return (
    <>
      {visibleCards.map(({ label, total, totalConsultasQuad, average, percentage, fonte }) => {
        const category = getScoreCategory(percentage, total);
        const styles   = getScoreStyles(category);
        return (
          <Card key={label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <Calendar className={`w-3.5 h-3.5 ${styles.icon}`} />
                  <span className={`text-xs font-medium ${styles.label}`}>{label}</span>
                  <FonteBadge fonte={fonte} />
                </div>
                <span className={`text-3xl font-bold ${styles.count}`}>{total}</span>
                <span className="text-xs text-muted-foreground mt-1">de {totalConsultasQuad}</span>
                <span className="text-xs text-muted-foreground">Média/mês: {average.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">Média/semana: {(average / 4.33).toFixed(1)}</span>
                <span className={`text-xs mt-0.5 ${styles.label}`}>{percentage.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
};
