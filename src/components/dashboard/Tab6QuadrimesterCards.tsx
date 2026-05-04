import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tab6Record } from "@/hooks/useTab6Data";
import { CalendarDays, Target } from "lucide-react";
import { format } from "date-fns";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";

interface Tab6QuadrimesterCardsProps {
  records: Tab6Record[];
  quadrimestres?: string[];
  equipe?: string;
  oficialData?: OficialData;
}

type ScoreCategory = "regular" | "suficiente" | "bom" | "otimo" | "none";

const getScoreCategory = (percentage: number): ScoreCategory => {
  if (percentage <= 0) return "none";
  if (percentage > 8) return "otimo";
  if (percentage > 6) return "bom";
  if (percentage > 3) return "suficiente";
  return "regular";
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

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const getQuadrimesterForMonth = (month: number): number => {
  if (month <= 3) return 1;
  if (month <= 7) return 2;
  return 3;
};

const getQuadrimesterLabel  = (quadNum: number, year: number): string => `${quadNum}º Quad/${year}`;
const getQuadrimesterMonths = (quadNum: number): number[] => {
  switch (quadNum) {
    case 1: return [0, 1, 2, 3];
    case 2: return [4, 5, 6, 7];
    case 3: return [8, 9, 10, 11];
    default: return [];
  }
};

export const Tab6QuadrimesterCards = ({
  records,
  quadrimestres = [],
  equipe = "all",
  oficialData,
}: Tab6QuadrimesterCardsProps) => {
  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const currentQuad  = getQuadrimesterForMonth(currentMonth);

  const quadCounts = useMemo(() => {
    // Mantém 3 quadrimestres (Tab6 depende de records reais, não de pacientes)
    const quadrimesters: { label: string; quadNum: number; year: number; quadKey: string }[] = [];
    let quad = currentQuad;
    let year = currentYear;
    for (let i = 0; i < 3; i++) {
      quadrimesters.push({
        label:   getQuadrimesterLabel(quad, year),
        quadNum: quad,
        year,
        quadKey: `Q${quad}-${year}`,
      });
      quad--;
      if (quad < 1) { quad = 3; year--; }
    }
    quadrimesters.reverse();

    return quadrimesters.map((q) => {
      const quadMonths = getQuadrimesterMonths(q.quadNum);
      let totalExodontias    = 0;
      let totalProcedimentos = 0;
      let todosMesesOficiais = true;
      let monthsWithData     = 0;

      quadMonths.forEach((m) => {
        const inPast = q.year < currentYear || (q.year === currentYear && m <= currentMonth);
        if (!inPast) return;
        monthsWithData++;

        const monthDate = new Date(q.year, m, 1);
        const mmyyyy    = format(monthDate, "MM/yyyy");
        const mesNorm   = normalizeMes(mmyyyy) ?? mmyyyy;
        const ofRow     = oficialData?.index.get(makeOficialKey(mesNorm, equipe));
        const isOficial = !!ofRow && (ofRow.numB6 > 0 || ofRow.denB6 > 0);

        if (isOficial) {
          totalExodontias    += ofRow!.numB6;
          totalProcedimentos += ofRow!.denB6;
        } else {
          // Preliminar: soma direto dos records do mês
          records.forEach((r) => {
            const parts   = r.mesAno.split("/");
            const mesName = parts[0]?.toLowerCase().trim();
            const ano     = parseInt(parts[1]);
            const mesIdx  = MONTH_MAP[mesName];
            if (mesIdx === m && ano === q.year) {
              totalExodontias    += r.exodontias;
              totalProcedimentos += r.totalProcedimentos;
            }
          });
          todosMesesOficiais = false;
        }
      });

      if (monthsWithData === 0) monthsWithData = 1;

      const percentage           = totalProcedimentos > 0 ? (totalExodontias / totalProcedimentos) * 100 : 0;
      const avgMonthlyExodontias = totalExodontias / monthsWithData;
      const fonte: FonteDado     = todosMesesOficiais ? "oficial" : "preliminar";

      return { ...q, totalExodontias, totalProcedimentos, percentage, avgMonthlyExodontias, monthsWithData, fonte };
    });
  }, [records, currentQuad, currentYear, equipe, oficialData]);

  const visibleCards = quadrimestres.length > 0
    ? quadCounts.filter((q) => quadrimestres.includes(q.quadKey))
    : quadCounts;

  // Meta baseada no quadrimestre atual (último visível)
  const currentQuadData  = visibleCards[visibleCards.length - 1];
  const totalProcQuad    = currentQuadData?.totalProcedimentos ?? 0;
  const metaBom          = totalProcQuad > 0 ? Math.ceil(totalProcQuad * 0.06) + 1 : 0;
  const metaOtimo        = totalProcQuad > 0 ? Math.ceil(totalProcQuad * 0.08) + 1 : 0;
  const mediaMensalBom   = metaBom   / 4;
  const mediaMensalOtimo = metaOtimo / 4;
  const totalAtual       = currentQuadData?.totalExodontias ?? 0;
  const faltamBom        = Math.max(0, metaBom   - totalAtual);
  const faltamOtimo      = Math.max(0, metaOtimo - totalAtual);
  const atingiuBom       = totalAtual >= metaBom  && metaBom  > 0;
  const atingiuOtimo     = totalAtual >= metaOtimo && metaOtimo > 0;
  const fonteMeta        = currentQuadData?.fonte ?? "preliminar";
  const mesesComDados    = currentQuadData?.monthsWithData ?? 1;
  const semanasRestantes = Math.max(0, (4 - mesesComDados)) * 4.33;
  const fmtSemanal = (faltam: number) =>
    semanasRestantes > 0 ? (faltam / semanasRestantes).toFixed(1) : "—";

  const metaCard = (
    <Card className="border-0 shadow-md bg-gradient-to-br from-purple-100 to-purple-50 border-l-4 border-l-purple-500 h-full col-span-2">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Target className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Meta do Quadrimestre</span>
          <span className="text-xs text-muted-foreground ml-1">de {totalProcQuad} proc.</span>
          <FonteBadge fonte={fonteMeta} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-r pr-4">
            <p className="text-xs font-semibold text-emerald-700 mb-1">Bom (&gt; 6%)</p>
            <p className="text-2xl font-bold text-emerald-700">{metaBom} TRA</p>
            <p className="text-xs text-muted-foreground">Média/mês: {mediaMensalBom.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Média/semana: {(mediaMensalBom / 4.33).toFixed(1)}</p>
            {atingiuBom
              ? <p className="text-xs font-semibold text-emerald-600 mt-1">✓ Meta atingida!</p>
              : <>
                  <p className="text-xs font-semibold text-red-600 mt-1">Faltam: {faltamBom} TRA</p>
                  <p className="text-xs text-red-600">Média/semana: {fmtSemanal(faltamBom)}</p>
                </>
            }
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">Ótimo (&gt; 8%)</p>
            <p className="text-2xl font-bold text-blue-700">{metaOtimo} TRA</p>
            <p className="text-xs text-muted-foreground">Média/mês: {mediaMensalOtimo.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Média/semana: {(mediaMensalOtimo / 4.33).toFixed(1)}</p>
            {atingiuOtimo
              ? <p className="text-xs font-semibold text-emerald-600 mt-1">✓ Meta atingida!</p>
              : <>
                  <p className="text-xs font-semibold text-red-600 mt-1">Faltam: {faltamOtimo} TRA</p>
                  <p className="text-xs text-red-600">Média/semana: {fmtSemanal(faltamOtimo)}</p>
                </>
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      {visibleCards.map((quad) => {
        const category = getScoreCategory(quad.percentage);
        const styles   = getScoreStyles(category);
        return (
          <Card key={quad.label} className={`border-0 shadow-md transition-all hover:shadow-lg h-full ${styles.bg}`}>
            <CardContent className="p-4 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CalendarDays className={`h-4 w-4 ${styles.icon}`} />
                <span className={`text-sm font-medium ${styles.label}`}>{quad.label}</span>
                <FonteBadge fonte={quad.fonte} />
              </div>
              <p className={`text-3xl font-bold ${styles.count}`}>{quad.totalExodontias}</p>
              <p className="text-xs text-muted-foreground mt-1">de {quad.totalProcedimentos} procedimentos</p>
              <p className="text-xs text-muted-foreground">Média/mês: {quad.avgMonthlyExodontias.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Média/semana: {(quad.avgMonthlyExodontias / 4.33).toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${styles.label}`}>{quad.percentage.toFixed(1)}%</p>
            </CardContent>
          </Card>
        );
      })}
      {metaCard}
    </>
  );
};
