import { Card, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { FonteDado } from "@/hooks/useOficialMerge";
import { calcFaltamMesAtual, semanasRestantesNoMes, MesCalcLabel } from "@/lib/metaThresholds";

interface Props {
  /** Meses decorridos do período, com rótulo "MM/yyyy" (ou "Nov/2026"). */
  meses: MesCalcLabel[];
  nMeses?: number;
  labelBom: string;
  labelOtimo: string;
  thresholdBom: number;
  thresholdOtimo: number;
  deltaNum?: number;
  deltaDenom?: number;
  capMensal?: number;
  /** Unidade da meta/faltam (ex.: "atend.", "escov.", "TRA"). */
  unit: string;
  fonte?: FonteDado;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const rotuloMes = (label?: string) => {
  if (!label) return "";
  const [a, b] = label.split("/");
  const n = parseInt(a, 10);
  return !isNaN(n) && n >= 1 && n <= 12 ? `${MESES[n - 1]}/${b}` : label;
};

/**
 * Meta do Quadrimestre pelo método do mês atual: a média dos N meses precisa
 * bater o limite; (N × limite − Σ meses fechados) é dividido entre o mês em
 * andamento e os meses que ainda não aconteceram.
 */
export const MetaMesAtualCard = ({
  meses, nMeses = 4, labelBom, labelOtimo, thresholdBom, thresholdOtimo,
  deltaNum = 1, deltaDenom = 0, capMensal, unit, fonte,
}: Props) => {
  const bom   = calcFaltamMesAtual(meses, nMeses, thresholdBom,   deltaNum, deltaDenom, capMensal);
  const otimo = calcFaltamMesAtual(meses, nMeses, thresholdOtimo, deltaNum, deltaDenom, capMensal);
  const mesAtual = bom ? meses[bom.idxAberto] : undefined;
  const semanas = semanasRestantesNoMes(mesAtual?.mes);
  const fmtSemanal = (faltam: number) => (semanas > 0 ? (faltam / semanas).toFixed(1) : "—");
  const pct = (v: number) => (v * 100).toFixed(1).replace(".", ",");

  const coluna = (r: typeof bom, cor: string, border: boolean) => (
    <div className={border ? "border-r pr-4" : ""}>
      {r && mesAtual ? (
        <>
          <p className={`text-2xl font-bold ${cor}`}>
            {r.faltam === null ? "—" : (mesAtual.num + r.faltam * deltaNum).toLocaleString("pt-BR")}{" "}
            <span className="text-base font-semibold">{unit}</span>
          </p>
          <p className="text-xs font-semibold text-foreground">Neste mês{mesAtual.mes ? ` (${rotuloMes(mesAtual.mes)})` : ""}: ≥ {pct(r.alvo)}%</p>
          <p className="text-xs text-muted-foreground">
            Média/semana: {r.faltam === null ? "—" : ((mesAtual.num + r.faltam * deltaNum) / 4.33).toFixed(1)}
          </p>
          {r.faltam === null ? (
            <p className="text-xs font-semibold text-red-600 mt-1">Inalcançável neste mês</p>
          ) : r.faltam > 0 ? (
            <>
              <p className="text-xs font-semibold text-red-600 mt-1">Faltam neste mês: {r.faltam.toLocaleString("pt-BR")} {unit}</p>
              <p className="text-xs text-red-600">Média/semana: {fmtSemanal(r.faltam)}</p>
            </>
          ) : (
            <p className="text-xs font-semibold text-emerald-600 mt-1">✓ Meta atingida!</p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Sem dados mensais</p>
      )}
    </div>
  );

  return (
    <Card className="border-0 shadow-md bg-gradient-to-br from-purple-100 to-purple-50 border-l-4 border-l-purple-500 h-full col-span-2 transition-all hover:shadow-xl hover:-translate-y-0.5">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Target className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">Meta do Quadrimestre</span>
          {mesAtual?.mes && <span className="text-xs text-muted-foreground ml-1">— {rotuloMes(mesAtual.mes)}</span>}
          {fonte && <FonteBadge fonte={fonte} />}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border-r pr-4">
            <p className="text-xs font-semibold text-emerald-700 mb-1">Bom ({labelBom})</p>
            {coluna(bom, "text-emerald-700", false)}
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">Ótimo ({labelOtimo})</p>
            {coluna(otimo, "text-blue-700", false)}
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          Média dos {nMeses} meses ≥ meta: o restante após os meses fechados é dividido entre o mês atual e os próximos.
        </p>
      </CardContent>
    </Card>
  );
};
