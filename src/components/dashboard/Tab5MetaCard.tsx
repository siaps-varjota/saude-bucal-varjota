import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, TrendingUp, AlertCircle, FlaskConical } from "lucide-react";
import { Tab5Record } from "@/hooks/useTab5Data";
import { TratamentoPatient } from "@/hooks/useTratamentoData";
import { isValid, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns";
import { parse } from "@/lib/fastParse";
import { FonteBadge } from "@/components/dashboard/FonteBadge";
import { OficialData, makeOficialKey, normalizeMes } from "@/hooks/useOficialData";
import { FonteDado } from "@/hooks/useOficialMerge";
import { calcFaltamMesAtual, indiceMesAberto, semanasRestantesNoMes, META_THRESHOLDS } from "@/lib/metaThresholds";

interface Tab5MetaCardProps {
  records: Tab5Record[];
  allTratamentoPatients: TratamentoPatient[];
  quadrimestre?: string;
  pendentesTab1: number;
  denominadorB1?: number;
  consultasAba1Quad?: number;
  equipe?: string;           // ← novo
  oficialData?: OficialData; // ← novo
}

const MONTH_MAP: Record<string, number> = {
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const parseDateStr = (str: string): Date | null => {
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

const getQuadrimesterInfo = (date: Date) => {
  const month = date.getMonth();
  const year  = date.getFullYear();
  if (month <= 3) return { quad: 1, year };
  if (month <= 7) return { quad: 2, year };
  return { quad: 3, year };
};

const getQuadMonths = (q: number): number[] => {
  if (q === 1) return [0, 1, 2, 3];
  if (q === 2) return [4, 5, 6, 7];
  return [8, 9, 10, 11];
};

const getQuadRange = (quadKey: string) => {
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return null;
  const q = parseInt(match[1]);
  const y = parseInt(match[2]);
  const startMonth = q === 1 ? 0 : q === 2 ? 4 : 8;
  const now = new Date();
  const currentQuad = getQuadrimesterInfo(now);
  const isCurrentQuad = `Q${currentQuad.quad}-${currentQuad.year}` === quadKey;
  const actualEndMonth = isCurrentQuad ? now.getMonth() : startMonth + 3;
  return {
    start: startOfMonth(new Date(y, startMonth, 1)),
    end:   endOfMonth(new Date(y, actualEndMonth, 1)),
    startMonth,
    actualEndMonth,
    year: y,
  };
};

export const Tab5MetaCard = ({
  records,
  allTratamentoPatients,
  quadrimestre = "todos",
  pendentesTab1,
  denominadorB1 = 0,
  consultasAba1Quad = 0,
  equipe = "all",
  oficialData,
}: Tab5MetaCardProps) => {

  const metaData = useMemo(() => {
    const now         = new Date();
    const currentQuad = getQuadrimesterInfo(now);
    const quadKey     = quadrimestre !== "todos" ? quadrimestre : `Q${currentQuad.quad}-${currentQuad.year}`;

    const match = quadKey.match(/Q(\d)-(\d{4})/);
    if (!match) return null;
    const q = parseInt(match[1]);
    const y = parseInt(match[2]);
    const quadMonths = getQuadMonths(q);
    const range = getQuadRange(quadKey);
    if (!range) return null;

    // ── Agrega B5 mês a mês com merge oficial ─────────────────────────────
    let preventivos       = 0;
    let totalIndividuais  = 0;
    let todosMesesOficiais = true;
    let somaPctMensal      = 0;
    let mesesComPct        = 0;
    const mesesLista: { mes: string; num: number; den: number }[] = [];

    quadMonths.forEach(mesIdx => {
      const inPast = y < now.getFullYear() || (y === now.getFullYear() && mesIdx <= range.actualEndMonth);
      if (!inPast) return;

      const mmyyyy  = `${String(mesIdx + 1).padStart(2, "0")}/${y}`;
      const mesNorm = normalizeMes(mmyyyy) ?? mmyyyy;
      const ofRow   = oficialData?.index.get(makeOficialKey(mesNorm, equipe));
      const isOficial = !!ofRow;

      let mesNum = 0;
      let mesDen = 0;

      if (isOficial) {
        mesNum = ofRow!.numB5;
        mesDen = ofRow!.denB5;
      } else {
        records.forEach((r) => {
          const parts   = r.mesAno.split("/");
          const rMesIdx = MONTH_MAP[parts[0]?.toLowerCase().trim()];
          const rAno    = parseInt(parts[1]);
          if (rMesIdx === mesIdx && rAno === y && quadMonths.includes(rMesIdx)) {
            mesNum += r.preventivos;
            mesDen += r.totalIndividuais;
          }
        });
        todosMesesOficiais = false;
      }

      preventivos      += mesNum;
      totalIndividuais += mesDen;
      mesesLista.push({ mes: mmyyyy, num: mesNum, den: mesDen });
      if (mesDen > 0) {
        somaPctMensal += (mesNum / mesDen) * 100;
        mesesComPct++;
      }
    });

    const fonte: FonteDado = todosMesesOficiais ? "oficial" : "preliminar";
    // ─────────────────────────────────────────────────────────────────────

    // Percentual do período = média dos percentuais mensais
    const currentPct = mesesComPct > 0
      ? somaPctMensal / mesesComPct
      : (totalIndividuais > 0 ? (preventivos / totalIndividuais) * 100 : 0);

    const pendentesTab2 = allTratamentoPatients.filter(p => {
      const dConsulta = parseDateStr(p.primeiraConsulta);
      if (!dConsulta || !isWithinInterval(dConsulta, { start: range.start, end: range.end })) return false;
      const status = (p.comTratamentoConcluido || "").toUpperCase().trim();
      return status !== "SIM";
    }).length;

    const consultasTab2Quad = allTratamentoPatients.filter(p => {
      const d = parseDateStr(p.primeiraConsulta);
      return d ? isWithinInterval(d, { start: range.start, end: range.end }) : false;
    }).length;

    // "Faltam" pelo método do mês atual: média dos 4 meses ≥ meta; o que sobra após os
    // meses fechados é dividido entre o mês em andamento e os que ainda não aconteceram.
    const thB5 = META_THRESHOLDS["Proced. Odont. Preventivos"]!;
    const rBom   = calcFaltamMesAtual(mesesLista, 4, thB5.thresholdBom,   thB5.deltaNum, thB5.deltaDenom);
    const rOtimo = calcFaltamMesAtual(mesesLista, 4, thB5.thresholdOtimo, thB5.deltaNum, thB5.deltaDenom);
    const faltamBom   = rBom?.faltam ?? 0;
    const faltamOtimo = rOtimo?.faltam ?? 0;

    // ── Simulações com B1 oficial ──────────────────────────────────────────
    // Método do mês atual: a 1ª Consulta atinge a meta NESTE MÊS; cada consulta nova soma
    // +2 preventivos esperados (+2 no numerador e +2 no denominador) no mês do B5.
    const simulations = (() => {
      const isCurrentQ  = `Q${currentQuad.quad}-${currentQuad.year}` === quadKey;
      const startMonth  = q === 1 ? 0 : q === 2 ? 4 : 8;
      const endMonth    = isCurrentQ ? now.getMonth() : startMonth + 3;

      // B1 mês a mês: oficial; senão consultas (1ª consulta) do mês nos pacientes
      const b1Meses: { mes: string; num: number; den: number }[] = [];
      for (let m = startMonth; m <= endMonth; m++) {
        const mmyyyy  = `${String(m + 1).padStart(2, "0")}/${y}`;
        const mesNorm = normalizeMes(mmyyyy) ?? mmyyyy;
        const ofRow   = oficialData?.index.get(makeOficialKey(mesNorm, equipe));
        if (ofRow) {
          b1Meses.push({ mes: mmyyyy, num: ofRow.numB1, den: ofRow.denB1 });
        } else {
          const prelNum = allTratamentoPatients.filter(p => {
            const d = parseDateStr(p.primeiraConsulta);
            return d?.getMonth() === m && d?.getFullYear() === y;
          }).length;
          b1Meses.push({ mes: mmyyyy, num: prelNum, den: denominadorB1 });
        }
      }
      const thB1 = META_THRESHOLDS["1ª Consulta Odontológica"]!;
      const b1Bom   = calcFaltamMesAtual(b1Meses, 4, thB1.thresholdBom,   1, 0);
      const b1Otimo = calcFaltamMesAtual(b1Meses, 4, thB1.thresholdOtimo, 1, 0);
      const faltamAba1Bom   = b1Bom?.faltam   ?? 0;
      const faltamAba1Otimo = b1Otimo?.faltam ?? 0;
      const numMesB1 = b1Bom ? b1Meses[b1Bom.idxAberto].num : 0;

      const b5Need = (extraConsultas: number, threshold: number): number | null => {
        if (mesesLista.length === 0) return 0;
        const idx = indiceMesAberto(mesesLista);
        const mod = mesesLista.map((m, i) => i === idx ? { ...m, num: m.num + 2 * extraConsultas, den: m.den + 2 * extraConsultas } : m);
        return calcFaltamMesAtual(mod, 4, threshold, 2, 2)?.faltam ?? 0;
      };

      return {
        mesLabel: b1Bom?.mesAberto ?? "",
        consultasAlvo1Bom:   numMesB1 + faltamAba1Bom,
        consultasAlvo1Otimo: numMesB1 + faltamAba1Otimo,
        aba1JaAtingiuBom:   faltamAba1Bom === 0,
        aba1JaAtingiuOtimo: faltamAba1Otimo === 0,
        faltamAba1Bom, faltamAba1Otimo,
        faltamBomBom:     b5Need(faltamAba1Bom,   thB5.thresholdBom),
        faltamBomOtimo:   b5Need(faltamAba1Bom,   thB5.thresholdOtimo),
        faltamOtimoBom:   b5Need(faltamAba1Otimo, thB5.thresholdBom),
        faltamOtimoOtimo: b5Need(faltamAba1Otimo, thB5.thresholdOtimo),
      };
    })();

    const mesesDecorridos = range.actualEndMonth - range.startMonth + 1;

    return {
      preventivos, totalIndividuais, currentPct,
      faltamBom, faltamOtimo, rBom, rOtimo,
      alreadyBom:   rBom   ? rBom.faltam   === 0 : currentPct >= 55,
      alreadyOtimo: rOtimo ? rOtimo.faltam === 0 : currentPct >= 65,
      pendentesTab2,
      fonte,
      simulations,
      mesesDecorridos,
    };
  }, [records, allTratamentoPatients, quadrimestre, denominadorB1, consultasAba1Quad, equipe, oficialData]);

  if (!metaData) return null;

  const {
    preventivos, totalIndividuais, currentPct,
    faltamBom, faltamOtimo, rBom, rOtimo, alreadyBom, alreadyOtimo,
    pendentesTab2, fonte, simulations,
  } = metaData;

  const fmtNeed = (v: number | null) => (v === null ? "—" : v);
  const semanasRestantes = semanasRestantesNoMes(rBom?.mesAberto);
  const pctMes = (r: typeof rBom) => (r ? `${(r.alvo * 100).toFixed(1).replace(".", ",")}%` : "");
  const fmtSemanal = (faltam: number) =>
    semanasRestantes > 0 ? (faltam / semanasRestantes).toFixed(1) : "—";

  return (
    <>
      {/* ── Meta do Quadrimestre ─────────────────────────────────────────── */}
      <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-indigo-50 border-l-4 border-l-violet-500 col-span-2 lg:col-span-full transition-all hover:shadow-xl hover:-translate-y-0.5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Target className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold text-violet-700">Meta do Quadrimestre — Proced. Odont. Preventivos{rBom?.mesAberto ? ` (${rBom.mesAberto})` : ""}</span>
            <FonteBadge fonte={fonte} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 place-items-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Status Atual</p>
              <p className="text-2xl font-bold text-violet-700">{currentPct.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{preventivos} de {totalIndividuais}</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <p className="text-xs text-muted-foreground">Pendentes 1ª Consulta</p>
              </div>
              <p className="text-2xl font-bold text-amber-600">{pendentesTab1}</p>
              <p className="text-xs text-muted-foreground">sem 1ª consulta (Aba 1)</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="w-3 h-3 text-orange-600" />
                <p className="text-xs text-muted-foreground">Tratamentos Pendentes</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{pendentesTab2}</p>
              <p className="text-xs text-muted-foreground">com 1ª consulta sem conclusão (Aba 2)</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Meta Bom (≥55%)</p>
              </div>
              {alreadyBom ? (
                <><p className="text-2xl font-bold text-emerald-600">✓</p><p className="text-xs text-emerald-600 font-medium">Meta atingida!</p></>
              ) : (
                <>
                  <p className="text-2xl font-bold text-emerald-700">{rBom?.faltam === null ? "—" : faltamBom}</p>
                  <p className="text-xs font-semibold text-foreground">1ª consultas ou tratamentos concluídos neste mês{rBom?.mesAberto ? ` (${rBom.mesAberto})` : ""}</p>
                  <p className="text-xs text-muted-foreground">Mês atual precisa de ≥ {pctMes(rBom)}</p>
                  {rBom?.faltam === null && <p className="text-xs font-semibold text-red-600">Inalcançável neste mês</p>}
                  <p className="text-xs text-red-600 mt-0.5">Média/semana p/ atingir: {fmtSemanal(faltamBom)}</p>
                </>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-blue-600" />
                <p className="text-xs text-muted-foreground">Meta Ótimo (≥65%)</p>
              </div>
              {alreadyOtimo ? (
                <><p className="text-2xl font-bold text-blue-600">✓</p><p className="text-xs text-blue-600 font-medium">Meta atingida!</p></>
              ) : (
                <>
                  <p className="text-2xl font-bold text-blue-700">{rOtimo?.faltam === null ? "—" : faltamOtimo}</p>
                  <p className="text-xs font-semibold text-foreground">1ª consultas ou tratamentos concluídos neste mês{rBom?.mesAberto ? ` (${rBom.mesAberto})` : ""}</p>
                  <p className="text-xs text-muted-foreground">Mês atual precisa de ≥ {pctMes(rOtimo)}</p>
                  {rOtimo?.faltam === null && <p className="text-xs font-semibold text-red-600">Inalcançável neste mês</p>}
                  <p className="text-xs text-red-600 mt-0.5">Média/semana p/ atingir: {fmtSemanal(faltamOtimo)}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Simulação ────────────────────────────────────────────────────── */}
      {simulations && (
        <Card className="border-0 shadow-md bg-orange-50 border border-orange-200 col-span-2 lg:col-span-full transition-all hover:shadow-xl hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
                Simulação — Se atingir meta na 1ª Consulta Odontológica (Aba 1) neste mês{simulations.mesLabel ? ` (${simulations.mesLabel})` : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs font-semibold text-emerald-700">
                    Se Aba 1 atingir Bom (&gt;0,75%) → {simulations.consultasAlvo1Bom} consultas no mês
                  </p>
                  {simulations.aba1JaAtingiuBom
                    ? <span className="text-xs font-bold text-emerald-600">(✓ Atingida na Aba 1)</span>
                    : <span className="text-xs font-bold text-red-500">(faltam {simulations.faltamAba1Bom} na Aba 1 neste mês)</span>
                  }
                </div>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Bom Aba 5 (≥55%)</p>
                    {simulations.faltamBomBom === 0
                      ? <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-emerald-700">{fmtNeed(simulations.faltamBomBom)} <span className="text-xs font-normal">1ª Consultas ou Trat. Concluído(s)</span></p>
                    }
                  </div>
                  <div className="w-px self-stretch bg-emerald-200" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Ótimo Aba 5 (≥65%)</p>
                    {simulations.faltamBomOtimo === 0
                      ? <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-blue-700">{fmtNeed(simulations.faltamBomOtimo)} <span className="text-xs font-normal">1ª Consultas ou Trat. Concluído(s)</span></p>
                    }
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-xs font-semibold text-blue-700">
                    Se Aba 1 atingir Ótimo (&gt;1,25%) → {simulations.consultasAlvo1Otimo} consultas no mês
                  </p>
                  {simulations.aba1JaAtingiuOtimo
                    ? <span className="text-xs font-bold text-emerald-600">(✓ Atingida na Aba 1)</span>
                    : <span className="text-xs font-bold text-red-500">(faltam {simulations.faltamAba1Otimo} na Aba 1 neste mês)</span>
                  }
                </div>
                <div className="flex gap-4">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Bom Aba 5 (≥55%)</p>
                    {simulations.faltamOtimoBom === 0
                      ? <p className="text-lg font-bold text-emerald-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-emerald-700">{fmtNeed(simulations.faltamOtimoBom)} <span className="text-xs font-normal">1ª Consultas ou Trat. Concluído(s)</span></p>
                    }
                  </div>
                  <div className="w-px self-stretch bg-blue-200" />
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground">p/ Ótimo Aba 5 (≥65%)</p>
                    {simulations.faltamOtimoOtimo === 0
                      ? <p className="text-lg font-bold text-blue-600">✓ Atingida</p>
                      : <p className="text-lg font-bold text-blue-700">{fmtNeed(simulations.faltamOtimoOtimo)} <span className="text-xs font-normal">1ª Consultas ou Trat. Concluído(s)</span></p>
                    }
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3 italic">
              💡 Valores NESTE MÊS: cada nova 1ª consulta ou tratamento pendente concluído equivale a +2 Proced. Odont. Preventivos esperados (+2 no numerador e +2 no denominador do mês).
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
};
