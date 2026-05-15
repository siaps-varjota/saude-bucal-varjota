import { Card, CardContent } from "@/components/ui/card";
import { Patient } from "@/hooks/usePatientData";
import { Calendar } from "lucide-react";
import { format, parse, subMonths, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";

interface MonthlyCardsProps {
  patients: Patient[];
  totalPatients: number;
  quadrimestre?: string;
  mesReferencia?: string[];
  equipe?: string;           // ← novo: equipe filtrada (ou "all")
  oficialData?: OficialData; // ← novo: dados oficiais
}

const getQuadrimesterMonths = (quadKey: string): number[] | null => {
  if (!quadKey || quadKey === "todos") return null;
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return null;
  const quadNum = parseInt(match[1]);
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return null;
  }
};

const getQuadrimesterYear = (quadKey: string): number | null => {
  if (!quadKey || quadKey === "todos") return null;
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  return match ? parseInt(match[2]) : null;
};

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

const getMonthYearKey  = (date: Date): string => format(date, "MM/yyyy");
const getMonthYearLabel = (date: Date): string => format(date, "MMM/yyyy", { locale: ptBR });

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
    case "regular":
      return { bg: "bg-gradient-to-br from-red-100 to-red-50 border-l-4 border-l-red-500", icon: "text-red-600", label: "text-red-700", count: "text-red-700" };
    case "suficiente":
      return { bg: "bg-gradient-to-br from-amber-100 to-amber-50 border-l-4 border-l-amber-500", icon: "text-amber-600", label: "text-amber-700", count: "text-amber-700" };
    case "bom":
      return { bg: "bg-gradient-to-br from-emerald-100 to-emerald-50 border-l-4 border-l-emerald-500", icon: "text-emerald-600", label: "text-emerald-700", count: "text-emerald-700" };
    case "otimo":
      return { bg: "bg-gradient-to-br from-blue-100 to-blue-50 border-l-4 border-l-blue-500", icon: "text-blue-600", label: "text-blue-700", count: "text-blue-700" };
    default:
      return { bg: "bg-muted/30", icon: "text-muted-foreground", label: "text-muted-foreground", count: "text-muted-foreground" };
  }
};

export const MonthlyCards = ({
  patients,
  totalPatients,
  quadrimestre = "todos",
  mesReferencia = [],
  equipe = "all",
  oficialData,
}: MonthlyCardsProps) => {

  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(now, i);
    return { key: getMonthYearKey(date), label: getMonthYearLabel(date), date };
  }).reverse();

  const quadMonths = getQuadrimesterMonths(quadrimestre);
  const quadYear   = getQuadrimesterYear(quadrimestre);

  const filteredMonths = quadMonths && quadYear
    ? last12Months.filter(m => m.date.getFullYear() === quadYear && quadMonths.includes(m.date.getMonth()))
    : last12Months;

  // Contagem preliminar por mês
  const monthCounts = new Map<string, number>();
  patients.forEach((patient) => {
    const consultaDate = parseConsultaDate(patient.primeiraConsulta);
    if (consultaDate) {
      const key = getMonthYearKey(consultaDate);
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
    }
  });

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${filteredMonths.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12"}`}>
        {filteredMonths.map((month) => {
          const prelCount = monthCounts.get(month.key) || 0;

          // ── Merge oficial vs preliminar ──────────────────────────────────
          const mesNorm = normalizeMes(month.key) ?? month.key;
          const ofKey   = makeOficialKey(mesNorm, equipe);
          const ofRow   = oficialData?.index.get(ofKey);

          // Usa oficial se existir e tiver valor
          const isOficial = !!ofRow;
          const count      = isOficial ? ofRow!.numB1  : prelCount;
          const den        = isOficial ? ofRow!.denB1  : totalPatients;
          const fonte      = isOficial ? "oficial" as const : "preliminar" as const;
          // ─────────────────────────────────────────────────────────────────

          const percentage = den > 0 ? (count / den) * 100 : 0;
          const category   = getScoreCategory(percentage);
          const styles     = getScoreStyles(category);

          return (
            <Card key={month.key} className={`border-0 shadow-md transition-all hover:shadow-lg ${styles.bg}`}>
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className={`h-3 w-3 ${styles.icon}`} />
                  <span className={`text-xs font-medium uppercase ${styles.label}`}>
                    {month.label}
                  </span>
                </div>

                <p className={`text-2xl font-bold ${styles.count}`}>{count}</p>

                <p className="text-xs text-center">
                  <span className="text-muted-foreground font-medium">de {den}</span>
                  <span className={`font-medium ${styles.label}`}> | {percentage.toFixed(1)}%</span>
                </p>

                {/* Badge Oficial / Preliminar */}
                <div className="mt-1.5 flex justify-center">
                  <FonteBadge fonte={fonte} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Pontuação</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span>
          <span className="text-red-600 text-xs">≤ 0,25%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span>
          <span className="text-amber-600 text-xs">&gt; 0,25% e ≤ 0,75%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span>
          <span className="text-emerald-600 text-xs">&gt; 0,75% e ≤ 1,25%</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span>
          <span className="text-blue-600 text-xs">&gt; 1,25%</span>
        </div>
        {/* Legenda das fontes */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
          <FonteBadge fonte="oficial" />
          <FonteBadge fonte="preliminar" />
        </div>
      </div>
    </div>
  );
};
