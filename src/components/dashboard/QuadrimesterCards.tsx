import { Card, CardContent } from "@/components/ui/card";
import { Patient } from "@/hooks/usePatientData";
import { CalendarDays } from "lucide-react";
import { isValid, getMonth, getYear, format } from "date-fns";
import { parse } from "@/lib/fastParse";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";
import { MetaMesAtualCard } from "@/components/dashboard/MetaMesAtualCard";

interface QuadrimesterCardsProps {
  patients: Patient[];
  totalPatients: number;
  quadrimestres?: string[]; // [] = mostra padrão (2 últimos)
  equipe?: string;
  oficialData?: OficialData;
}

const parseConsultaDate = (consulta: string): Date | null => {
  if (!consulta || consulta === "-" || consulta.trim() === "") return null;
  const formats = ["dd/MM/yyyy", "d/MM/yyyy", "dd/M/yyyy", "d/M/yyyy", "MM/yyyy", "yyyy-MM-dd"];
  for (const fmt of formats) {
    try {
      const parsed = parse(consulta.trim(), fmt, new Date());
      if (isValid(parsed)) return parsed;
    } catch { continue; }
  }
  return null;
};

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage <= 0.25) return "regular";
  if (percentage <= 0.75) return "suficiente";
  if (percentage <= 1.25) return "bom";
  return "otimo";
};

const getScoreStyles = (category: ScoreCategory) => {
  switch (category) {
    case "regular":    return { bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500",             icon: "text-red-600",     label: "text-red-700",     count: "text-red-700"     };
    case "suficiente": return { bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500",       icon: "text-amber-600",   label: "text-amber-700",   count: "text-amber-700"   };
    case "bom":        return { bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500", icon: "text-emerald-600", label: "text-emerald-700", count: "text-emerald-700" };
    case "otimo":      return { bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500",           icon: "text-blue-600",    label: "text-blue-700",    count: "text-blue-700"    };
    default:           return { bg: "bg-muted/30", icon: "text-muted-foreground", label: "text-muted-foreground", count: "text-muted-foreground" };
  }
};

interface Quadrimester {
  label: string;
  months: number[];
  year: number;
  quadKey: string;
}

const getQuadrimesterForMonth = (month: number): number => {
  if (month <= 3) return 1;
  if (month <= 7) return 2;
  return 3;
};

const getQuadrimesterLabel   = (quadNum: number, year: number): string => `${quadNum}º Quad/${year}`;
const getQuadrimesterMonths  = (quadNum: number): number[] => {
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return [];
  }
};

// ── Resolve num/den para um mês via oficial ou preliminar ─────────────────────
const resolveMonth = (
  monthDate: Date,
  prelNum: number,
  prelDen: number,
  equipe: string,
  oficialIndex: OficialData["index"] | undefined,
): { num: number; den: number; fonte: FonteDado } => {
  const mesNorm = normalizeMes(format(monthDate, "MM/yyyy")) ?? format(monthDate, "MM/yyyy");
  const ofRow   = oficialIndex?.get(makeOficialKey(mesNorm, equipe));
  if (!!ofRow) {
    return { num: ofRow.numB1, den: ofRow.denB1, fonte: "oficial" };
  }
  return { num: prelNum, den: prelDen, fonte: "preliminar" };
};

export const QuadrimesterCards = ({
  patients,
  totalPatients,
  quadrimestres = [],
  equipe = "all",
  oficialData,
}: QuadrimesterCardsProps) => {
  const now          = new Date();
  const currentMonth = getMonth(now);
  const currentYear  = getYear(now);
  const currentQuad  = getQuadrimesterForMonth(currentMonth);

  // Gera os 2 últimos quadrimestres
  const quadrimesters: Quadrimester[] = [];
  let quad = currentQuad;
  let year = currentYear;
  for (let i = 0; i < 2; i++) {
    quadrimesters.push({
      label:   getQuadrimesterLabel(quad, year),
      months:  getQuadrimesterMonths(quad),
      year,
      quadKey: `Q${quad}-${year}`,
    });
    quad--;
    if (quad < 1) { quad = 3; year--; }
  }
  quadrimesters.reverse();

  // Para cada quadrimestre, agrega meses com merge oficial
  const quadCounts = quadrimesters.map(q => {
    let totalNum = 0;
    let totalDen = 0;
    let todosMesesOficiais = true;
    let monthsWithData    = 0;
    let somaPctMensal     = 0;
    let mesesComPct       = 0;
    const mesesLista: { mes: string; num: number; den: number }[] = [];

    q.months.forEach(m => {
      const inPast = q.year < currentYear || (q.year === currentYear && m <= currentMonth);
      if (!inPast) return;
      monthsWithData++;

      const monthDate = new Date(q.year, m, 1);

      // Preliminar: conta pacientes com consulta neste mês
      const prelNum = patients.filter(p => {
        const d = parseConsultaDate(p.primeiraConsulta);
        return d && getYear(d) === q.year && getMonth(d) === m;
      }).length;
      const prelDen = totalPatients;

      const resolved = resolveMonth(monthDate, prelNum, prelDen, equipe, oficialData?.index);
      totalNum += resolved.num;
      totalDen += resolved.den; // acumula denominadores (podem variar por mês no oficial)
      mesesLista.push({ mes: format(monthDate, "MM/yyyy"), num: resolved.num, den: resolved.den });
      if (resolved.den > 0) {
        somaPctMensal += (resolved.num / resolved.den) * 100;
        mesesComPct++;
      }
      if (resolved.fonte !== "oficial") todosMesesOficiais = false;
    });

    if (monthsWithData === 0) monthsWithData = 1;

    // Denominador representativo: média dos denominadores acumulados
    const denRepresentativo = monthsWithData > 0 ? Math.round(totalDen / monthsWithData) : totalPatients;
    const average           = totalNum / monthsWithData;
    const fonte: FonteDado  = todosMesesOficiais ? "oficial" : "preliminar";

    // Percentual do período = média dos percentuais mensais
    const percentage = mesesComPct > 0 ? somaPctMensal / mesesComPct : 0;

    return {
      ...q,
      total: totalNum,
      den:   denRepresentativo,
      average,
      percentage,
      monthsWithData,
      mesesLista,
      fonte,
    };
  });

  const visibleCards = quadrimestres.length > 0
    ? quadCounts.filter(q => quadrimestres.includes(q.quadKey))
    : quadCounts;

  // ── Meta baseada no quadrimestre atual (último visível) ───────────────────
  const currentQuadData = visibleCards[visibleCards.length - 1];
  const mesesComDados   = currentQuadData?.monthsWithData ?? 1;
  const denominador     = currentQuadData?.den ?? totalPatients;

  const fonteMeta = currentQuadData?.fonte ?? "preliminar";
  const metaCard = (
    <MetaMesAtualCard
      meses={currentQuadData?.mesesLista ?? []}
      labelBom="> 0,75%" labelOtimo="> 1,25%"
      thresholdBom={0.0075} thresholdOtimo={0.0125}
      unit="atend." fonte={fonteMeta}
    />
  );

  return (
    <>
      {visibleCards.map(q => {
        const percentage = q.percentage;
        const category   = getScoreCategory(percentage);
        const styles     = getScoreStyles(category);
        return (
          <Card key={q.label} className={`border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 h-full ${styles.bg}`}>
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>{q.label}</span>
                <FonteBadge fonte={q.fonte} />
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>{q.total}</p>
              <p className="text-xs text-muted-foreground mt-1">de {q.den}</p>
              <p className="text-xs text-muted-foreground">Média/mês: {q.average.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Média/semana: {(q.average / 4.33).toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${styles.label}`}>{percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
      {metaCard}
    </>
  );
};
