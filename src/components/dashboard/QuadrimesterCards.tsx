import { Card, CardContent } from "@/components/ui/card";
import { Patient } from "@/hooks/usePatientData";
import { CalendarDays, Target } from "lucide-react";
import { parse, isValid, getMonth, getYear } from "date-fns";

interface QuadrimesterCardsProps {
  patients: Patient[];
  totalPatients: number;
  quadFiltered?: string;
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
  if (percentage <= 1) return "regular";
  if (percentage <= 3) return "suficiente";
  if (percentage <= 5) return "bom";
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

const getQuadrimesterLabel = (quadNum: number, year: number): string => `${quadNum}º Quad/${year}`;

const getQuadrimesterMonths = (quadNum: number): number[] => {
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return [];
  }
};

export const QuadrimesterCards = ({ patients, quadFiltered = "todos" }: QuadrimesterCardsProps) => {
  const now = new Date();
  const currentMonth = getMonth(now);
  const currentYear  = getYear(now);
  const currentQuad  = getQuadrimesterForMonth(currentMonth);

  const totalCadastrados = patients.length;
  const denominador = totalCadastrados * 4;

  // Metas B1: Bom > 3% e ≤ 5%, Ótimo > 5%
  const metaBom   = Math.ceil(denominador * 0.03) + 1; // mínimo para entrar em Bom (>3%)
  const metaOtimo = Math.ceil(denominador * 0.05) + 1; // mínimo para entrar em Ótimo (>5%)
  const mediaMensalBom   = totalCadastrados > 0 ? (denominador * 0.03 / 4) + 0.25 : 0;
  const mediaMensalOtimo = totalCadastrados > 0 ? (denominador * 0.05 / 4) + 0.25 : 0;

  const quadrimesters: Quadrimester[] = [];
  let quad = currentQuad;
  let year = currentYear;
  for (let i = 0; i < 3; i++) {
    quadrimesters.push({ label: getQuadrimesterLabel(quad, year), months: getQuadrimesterMonths(quad), year, quadKey: `Q${quad}-${year}` });
    quad--;
    if (quad < 1) { quad = 3; year--; }
  }
  quadrimesters.reverse();

  const quadCounts = quadrimesters.map(q => {
    let count = 0;
    patients.forEach(patient => {
      const d = parseConsultaDate(patient.primeiraConsulta);
      if (d && getYear(d) === q.year && q.months.includes(getMonth(d))) count++;
    });

    let monthsWithData = 0;
    q.months.forEach(m => {
      if (q.year < currentYear || (q.year === currentYear && m <= currentMonth)) monthsWithData++;
    });

    const average = monthsWithData > 0 ? count / monthsWithData : 0;
    return { ...q, total: count, average, monthsWithData };
  });

  const visibleCards = quadFiltered !== "todos"
    ? quadCounts.filter(q => q.quadKey === quadFiltered)
    : quadCounts;

  // Card de meta: fixo, não depende do quadrimestre selecionado
  const metaCard = (
    <Card className="border-0 shadow-md bg-gradient-to-br from-purple-100 to-purple-50 border-l-4 border-l-purple-500">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Meta do Quadrimestre</span>
        </div>
        <div className="space-y-2 mt-1">
          <div>
            <p className="text-xs font-semibold text-emerald-700">Bom (&gt; 3%)</p>
            <p className="text-lg font-bold text-emerald-700">{metaBom} atend.</p>
            <p className="text-xs text-muted-foreground">Média/mês: {mediaMensalBom.toFixed(1)}</p>
          </div>
          <div className="border-t pt-2">
            <p className="text-xs font-semibold text-blue-700">Ótimo (&gt; 5%)</p>
            <p className="text-lg font-bold text-blue-700">{metaOtimo} atend.</p>
            <p className="text-xs text-muted-foreground">Média/mês: {mediaMensalOtimo.toFixed(1)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {visibleCards.map(quad => {
        const percentage = denominador > 0 ? (quad.total / denominador) * 100 : 0;
        const category = getScoreCategory(percentage);
        const styles   = getScoreStyles(category);
        return (
          <Card key={quad.label} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>{quad.label}</span>
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>{quad.total}</p>
              <p className="text-xs text-muted-foreground mt-1">de {denominador}</p>
              <p className="text-xs text-muted-foreground">Média/mês: {quad.average.toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${styles.label}`}>{percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
      {metaCard}
    </>
  );
};
