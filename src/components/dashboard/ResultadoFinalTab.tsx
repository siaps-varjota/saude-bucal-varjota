import { createContext, useContext, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Trophy, Award, Filter, ChevronDown, ChevronRight,
  BarChart2, Target, FileDown, FlaskConical, HelpCircle, X, GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { EquipeResult, Conceito, IndicadorResult } from "@/hooks/useResultadoFinal";
import { Quadrimestre, QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";

import { META_THRESHOLDS, strictMeta, calcFaltam as calcFaltamShared } from "@/lib/metaThresholds";
import { formatDesempate } from "@/lib/desempateScore";
import { MesReferenciaMultiSelect } from "./MesReferenciaMultiSelect";
import { PendenciasReportButton } from "./PendenciasReportButton";

interface ResultadoFinalTabProps {
  geral: EquipeResult;
  porEquipe: EquipeResult[];
  quadrimestre: Quadrimestre;
  onQuadrimestreChange: (q: Quadrimestre) => void;
  equipe: string;
  onEquipeChange: (e: string) => void;
  equipeOptions: string[];
  mesesFiltro?: string[];
  onMesesFiltroChange?: (v: string[]) => void;
}

const INDICADOR_OPTIONS = [
  { value: "todos",                          label: "Todos os Indicadores" },
  { value: "1ª Consulta Odontológica",       label: "B1 — 1ª Consulta Odontológica" },
  { value: "Tratamento Concluído",           label: "B2 — Tratamento Concluído" },
  { value: "Taxa de Exodontias",             label: "B3 — Taxa de Exodontias" },
  { value: "Escovação Supervisionada",       label: "B4 — Escovação Supervisionada" },
  { value: "Proced. Odont. Preventivos",     label: "B5 — Proced. Odont. Preventivos" },
  { value: "Trat. Restaurador Atraumático",  label: "B6 — Trat. Restaurador Atraumático" },
];

const CONCEITO_LABELS: Record<Conceito, string> = {
  regular: "Regular", suficiente: "Suficiente", bom: "Bom", otimo: "Ótimo", none: "-",
};

const CONCEITO_COLORS: Record<Conceito, string> = {
  regular:    "bg-red-100 text-red-700 border-red-200",
  suficiente: "bg-amber-100 text-amber-700 border-amber-200",
  bom:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  otimo:      "bg-blue-100 text-blue-700 border-blue-200",
  none:       "bg-muted text-muted-foreground border-border",
};

const NOTA_SCORE: Record<Conceito, string> = {
  regular: "0,25", suficiente: "0,50", bom: "0,75", otimo: "1,00", none: "0,00",
};

// ── Thresholds para Meta do Quadrimestre ─────────────────────────────────────
// Regra única compartilhada com o PDF de pendências (src/lib/metaThresholds.ts)


// ── Indicadores que exibem o card de Simulação ────────────────────────────────
const INDICADORES_COM_SIMULACAO = new Set([
  "1ª Consulta Odontológica",
  "Tratamento Concluído",
  "Proced. Odont. Preventivos",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNotaFinalColor(nota: number): string {
  if (nota > 7.5)  return "text-blue-700";
  if (nota >= 5)   return "text-emerald-700";
  if (nota >= 2.6) return "text-amber-700";
  return "text-red-700";
}

function getNotaFinalBg(nota: number): string {
  if (nota > 7.5)  return "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200";
  if (nota >= 5)   return "bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200";
  if (nota >= 2.6) return "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200";
  return "bg-gradient-to-br from-red-100 to-red-50 border-red-200";
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function derivaConceito(pct: number, thresholds: NonNullable<(typeof META_THRESHOLDS)[string]>): {
  label: string; textColor: string; bgBorder: string; nota: string;
} {
  if (pct > thresholds.thresholdOtimo * 100)
    return { label: "Ótimo",      textColor: "text-blue-700",    bgBorder: "bg-blue-50 border-blue-200",       nota: "1,00" };
  if (pct > thresholds.thresholdBom * 100)
    return { label: "Bom",        textColor: "text-emerald-700", bgBorder: "bg-emerald-50 border-emerald-200", nota: "0,75" };
  if (pct > 0)
    return { label: "Suficiente", textColor: "text-amber-700",   bgBorder: "bg-amber-50 border-amber-200",     nota: "0,50" };
  return   { label: "Regular",   textColor: "text-red-700",     bgBorder: "bg-red-50 border-red-200",         nota: "0,25" };
}

// ── B3 (Taxa de Exodontias) — menor-melhor, faixa NÃO monotônica ────────────
// Conforme Nota Metodológica B3: Ótimo é uma faixa intermediária (≥3% e <10%),
// não o extremo — abaixo de 3% também é Regular. derivaConceito() genérico
// (que assume "maior % = melhor", crescente) não serve aqui; B3 precisa de
// função própria fiel à tabela de parâmetros da nota metodológica:
//   Ótimo:      ≥ 3%  e < 10%
//   Bom:        ≥ 10% e < 12%
//   Suficiente: ≥ 12% e < 14%
//   Regular:    < 3%  ou ≥ 14%
function derivaConceitoB3(pct: number): {
  label: string; textColor: string; bgBorder: string; nota: string;
} {
  if (pct >= 3 && pct < 10)
    return { label: "Ótimo",      textColor: "text-blue-700",    bgBorder: "bg-blue-50 border-blue-200",       nota: "1,00" };
  if (pct >= 10 && pct < 12)
    return { label: "Bom",        textColor: "text-emerald-700", bgBorder: "bg-emerald-50 border-emerald-200", nota: "0,75" };
  if (pct >= 12 && pct < 14)
    return { label: "Suficiente", textColor: "text-amber-700",   bgBorder: "bg-amber-50 border-amber-200",     nota: "0,50" };
  return   { label: "Regular",   textColor: "text-red-700",     bgBorder: "bg-red-50 border-red-200",         nota: "0,25" };
}

// Nº de meses do período visualizado (4 = quadrimestre completo)
const PeriodoMesesContext = createContext(4);

// ── Card Meta do Quadrimestre ─────────────────────────────────────────────────
const MetaQuadrimestreCard = ({
  denominador,
  numerador,
  thresholds,
  deltaNum,
  deltaDenom,
  faltaUnit: faltaUnitProp,
  mesesDecorridos,
}: {
  denominador: number;
  numerador: number;
  thresholds: NonNullable<(typeof META_THRESHOLDS)[string]>;
  deltaNum?: number;
  deltaDenom?: number;
  faltaUnit?: string;
  mesesDecorridos?: number;
}) => {
  const periodoMeses = useContext(PeriodoMesesContext);
  const metaBom   = strictMeta(denominador, thresholds.thresholdBom);
  const metaOtimo = strictMeta(denominador, thresholds.thresholdOtimo);
  const unit      = thresholds.unit || "atend.";

  const calcFaltam = (threshold: number): number =>
    calcFaltamShared(numerador, denominador, threshold, deltaNum ?? 1, deltaDenom ?? 0);

  const faltamBom   = calcFaltam(thresholds.thresholdBom);
  const faltamOtimo = calcFaltam(thresholds.thresholdOtimo);
  const exibeUnit   = faltaUnitProp ?? unit;

  const mesesUsados      = mesesDecorridos ?? 0;
  const semanasRestantes = Math.max(0, periodoMeses - mesesUsados) * 4.33;
  const fmtSemanal = (faltam: number) =>
    semanasRestantes > 0 ? (faltam / semanasRestantes).toFixed(1) : "—";

  return (
    <div className="flex flex-col justify-center bg-violet-50 border border-violet-200 rounded-lg px-4 py-2 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="h-3.5 w-3.5 text-violet-600 shrink-0" />
        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
          {periodoMeses === 1 ? "Meta do Mês" : periodoMeses === 4 ? "Meta do Quadrimestre" : `Meta do Período (${periodoMeses} meses)`}
        </span>
        <span className="text-xs text-muted-foreground ml-0.5">
          de {denominador.toLocaleString("pt-BR")}
        </span>
      </div>

      <div className="flex gap-6">
        <div>
          <p className="text-xs font-semibold text-emerald-700">Bom ({thresholds.labelBom})</p>
          <p className="text-xl font-bold font-mono text-emerald-700 leading-tight">
            {metaBom.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">Média/mês: {(metaBom / periodoMeses).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Média/semana: {(metaBom / (periodoMeses * 4.33)).toFixed(1)}</p>
          {faltamBom > 0
            ? <>
                <p className="text-xs font-medium text-red-600">Faltam: {faltamBom.toLocaleString("pt-BR")} {exibeUnit}</p>
                <p className="text-xs text-red-600">Média/semana: {fmtSemanal(faltamBom)}</p>
              </>
            : <p className="text-xs font-medium text-emerald-600">✓ Meta atingida!</p>}
        </div>
        <div>
          <p className="text-xs font-semibold text-blue-700">Ótimo ({thresholds.labelOtimo})</p>
          <p className="text-xl font-bold font-mono text-blue-700 leading-tight">
            {metaOtimo.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">Média/mês: {(metaOtimo / periodoMeses).toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Média/semana: {(metaOtimo / (periodoMeses * 4.33)).toFixed(1)}</p>
          {faltamOtimo > 0
            ? <>
                <p className="text-xs font-medium text-red-600">Faltam: {faltamOtimo.toLocaleString("pt-BR")} {exibeUnit}</p>
                <p className="text-xs text-red-600">Média/semana: {fmtSemanal(faltamOtimo)}</p>
              </>
            : <p className="text-xs font-medium text-blue-600">✓ Meta atingida!</p>}
        </div>
      </div>
    </div>
  );
};

// ── ProjecaoBloco ─────────────────────────────────────────────────────────────
const ProjecaoBloco = ({
  titulo,
  descricao,
  novoNum,
  novoDenom,
  novaPct,
  pctAtual,
  anyInput,
  conceitoInfo,
}: {
  titulo: string;
  descricao: string;
  novoNum: number;
  novoDenom: number;
  novaPct: number;
  pctAtual: number;
  anyInput: boolean;
  conceitoInfo: ReturnType<typeof derivaConceito>;
}) => {
  const ganho = novaPct - pctAtual;
  return (
    <div className="flex flex-col gap-1 min-w-[110px] max-w-[150px]">
      <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide leading-tight">{titulo}</p>
      <p className="text-[9px] text-muted-foreground leading-snug whitespace-pre-line">{descricao}</p>
      <p className="text-sm font-mono font-bold leading-tight mt-0.5">
        {Number.isInteger(novoNum) ? novoNum.toLocaleString("pt-BR") : novoNum.toFixed(1)}
        <span className="text-xs font-normal text-muted-foreground"> / {novoDenom.toLocaleString("pt-BR")}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {novaPct.toFixed(1)}%
        {anyInput && (
          <span className={`ml-1 font-medium ${ganho >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            ({ganho >= 0 ? "+" : ""}{ganho.toFixed(1)} pp)
          </span>
        )}
      </p>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold w-fit ${conceitoInfo.bgBorder} ${conceitoInfo.textColor}`}>
        {conceitoInfo.label}
        <span className="font-normal opacity-60">({conceitoInfo.nota})</span>
      </div>
    </div>
  );
};

// ── InputStepper ──────────────────────────────────────────────────────────────
const InputStepper = ({
  label,
  sublabel,
  rawValue,
  onRawChange,
  onDecrement,
  onIncrement,
}: {
  label: string;
  sublabel: string;
  rawValue: string;
  onRawChange: (v: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
    <div className="flex items-center gap-1">
      <button
        onMouseDown={(e) => { e.preventDefault(); onDecrement(); }}
        className="w-6 h-6 flex items-center justify-center rounded border border-orange-300 bg-white text-orange-700 font-bold text-sm hover:bg-orange-100 transition-colors select-none"
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        value={rawValue}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "");
          onRawChange(v === "" ? "0" : v);
        }}
        onFocus={(e) => e.target.select()}
        className="w-16 h-6 text-center text-sm font-mono font-bold border border-orange-300 rounded bg-white text-orange-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
      />
      <button
        onMouseDown={(e) => { e.preventDefault(); onIncrement(); }}
        className="w-6 h-6 flex items-center justify-center rounded border border-orange-300 bg-white text-orange-700 font-bold text-sm hover:bg-orange-100 transition-colors select-none"
      >+</button>
    </div>
    <span className="text-[10px] text-muted-foreground">{sublabel}</span>
  </div>
);

// ── Card de Simulação ─────────────────────────────────────────────────────────
const SimulacaoCard = ({
  b1Numerador,
  b1Denominador,
  b2Numerador,
  b2Denominador,
  b3Numerador,
  b3Denominador,
  b5Numerador,
  b5Denominador,
  todosIndicadores,
}: {
  b1Numerador: number;
  b1Denominador: number;
  b2Numerador: number;
  b2Denominador: number;
  b3Numerador: number;
  b3Denominador: number;
  b5Numerador: number;
  b5Denominador: number;
  todosIndicadores?: IndicadorResult[];
}) => {
  const [rawConsultas,  setRawConsultas]  = useState("0");
  const [rawConclusoes, setRawConclusoes] = useState("0");

  const extraConsultas  = Math.max(0, parseInt(rawConsultas,  10) || 0);
  const extraConclusoes = Math.max(0, parseInt(rawConclusoes, 10) || 0);
  const anyInput = extraConsultas > 0 || extraConclusoes > 0;

  const b1Thresh = META_THRESHOLDS["1ª Consulta Odontológica"]!;
  const b2Thresh = META_THRESHOLDS["Tratamento Concluído"]!;
  const b5Thresh = META_THRESHOLDS["Proced. Odont. Preventivos"]!;

  const b1NovoNum   = b1Numerador + extraConsultas;
  const b1NovaDenom = b1Denominador;
  const b1NovaPct   = b1NovaDenom > 0 ? (b1NovoNum / b1NovaDenom) * 100 : 0;
  const b1PctAtual  = b1NovaDenom > 0 ? (b1Numerador / b1NovaDenom) * 100 : 0;
  const b1Conceito  = derivaConceito(b1NovaPct, b1Thresh);

  const b2NovoNum   = b2Numerador + extraConsultas * 0.5 + extraConclusoes;
  const b2NovaDenom = b2Denominador + extraConsultas;
  const b2NovaPct   = b2NovaDenom > 0 ? (b2NovoNum / b2NovaDenom) * 100 : 0;
  const b2PctAtual  = b2Denominador > 0 ? (b2Numerador / b2Denominador) * 100 : 0;
  const b2Conceito  = derivaConceito(b2NovaPct, b2Thresh);

  // B3: consulta ou trat. concluído → +2 den (entram no total de proced.
  // individuais, denominador de B3), sem mexer no numerador (exodontias)
  const extraB3Den  = (extraConsultas + extraConclusoes) * 2;
  const b3NovoNum   = b3Numerador;
  const b3NovaDenom = b3Denominador + extraB3Den;
  const b3NovaPct   = b3NovaDenom > 0 ? (b3NovoNum / b3NovaDenom) * 100 : 0;
  const b3PctAtual  = b3Denominador > 0 ? (b3Numerador / b3Denominador) * 100 : 0;
  const b3Conceito  = derivaConceitoB3(b3NovaPct);

  const b5NovoNum   = b5Numerador + (extraConsultas + extraConclusoes) * 2;
  const b5NovaDenom = b5Denominador + (extraConsultas + extraConclusoes) * 2;
  const b5NovaPct   = b5NovaDenom > 0 ? (b5NovoNum / b5NovaDenom) * 100 : 0;
  const b5PctAtual  = b5Denominador > 0 ? (b5Numerador / b5Denominador) * 100 : 0;
  const b5Conceito  = derivaConceito(b5NovaPct, b5Thresh);

  const notaFinalAtual = todosIndicadores?.reduce((s, i) => s + i.notaFinal, 0) ?? 0;

  const notaNum = (c: ReturnType<typeof derivaConceito>): number =>
    parseFloat(c.nota.replace(",", "."));

  const b1Ind = todosIndicadores?.find(i => i.indicador === "1ª Consulta Odontológica");
  const b2Ind = todosIndicadores?.find(i => i.indicador === "Tratamento Concluído");
  const b3Ind = todosIndicadores?.find(i => i.indicador === "Taxa de Exodontias");
  const b5Ind = todosIndicadores?.find(i => i.indicador === "Proced. Odont. Preventivos");

  const b1ConceitoAtual = derivaConceito(b1PctAtual, b1Thresh);
  const b2ConceitoAtual = derivaConceito(b2PctAtual, b2Thresh);
  const b3ConceitoAtual = derivaConceitoB3(b3PctAtual);
  const b5ConceitoAtual = derivaConceito(b5PctAtual, b5Thresh);

  const ajusteSeConceitoMudou = (
    ind: IndicadorResult | undefined,
    atual: ReturnType<typeof derivaConceito>,
    novo: ReturnType<typeof derivaConceito>,
  ): number => {
    if (!ind) return 0;
    if (atual.label === novo.label) return 0;
    return (notaNum(novo) - notaNum(atual)) * ind.peso;
  };

  const notaFinalProjetada = !todosIndicadores
    ? 0
    : !anyInput
      ? notaFinalAtual
      : notaFinalAtual
          + ajusteSeConceitoMudou(b1Ind, b1ConceitoAtual, b1Conceito)
          + ajusteSeConceitoMudou(b2Ind, b2ConceitoAtual, b2Conceito)
          + ajusteSeConceitoMudou(b3Ind, b3ConceitoAtual, b3Conceito)
          + ajusteSeConceitoMudou(b5Ind, b5ConceitoAtual, b5Conceito);

  const notaDelta = notaFinalProjetada - notaFinalAtual;
  const hasNota   = notaFinalAtual > 0;

  return (
    <div className="flex flex-col w-full max-w-[640px] bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <FlaskConical className="h-3.5 w-3.5 text-orange-600 shrink-0" />
        <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Simulação</span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <div className="flex items-start gap-5 flex-wrap">
          <InputStepper
            label="+ adicionar"
            sublabel="1ªs consultas"
            rawValue={rawConsultas}
            onRawChange={setRawConsultas}
            onDecrement={() => setRawConsultas(String(Math.max(0, extraConsultas - 1)))}
            onIncrement={() => setRawConsultas(String(extraConsultas + 1))}
          />
          <InputStepper
            label="+ adicionar"
            sublabel="trat. concluídos"
            rawValue={rawConclusoes}
            onRawChange={setRawConclusoes}
            onDecrement={() => setRawConclusoes(String(Math.max(0, extraConclusoes - 1)))}
            onIncrement={() => setRawConclusoes(String(extraConclusoes + 1))}
          />
        </div>

        {hasNota && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Nota atual</span>
              <span className={`text-lg font-bold font-mono ${getNotaFinalColor(notaFinalAtual)}`}>
                {notaFinalAtual.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Com simulação</span>
              <span className={`text-lg font-bold font-mono ${getNotaFinalColor(notaFinalProjetada)}`}>
                {notaFinalProjetada.toFixed(2).replace(".", ",")}
              </span>
              {anyInput && notaDelta !== 0 && (
                <span className={`text-xs font-medium ${notaDelta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ({notaDelta > 0 ? "+" : ""}{notaDelta.toFixed(2).replace(".", ",")})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-px bg-orange-200 mb-2" />

      <div className="flex gap-x-3 content-start">
        <ProjecaoBloco
          titulo="Projeção B1"
          descricao="consulta → +1 num (den fixo)"
          novoNum={b1NovoNum}
          novoDenom={b1NovaDenom}
          novaPct={b1NovaPct}
          pctAtual={b1PctAtual}
          anyInput={anyInput}
          conceitoInfo={b1Conceito}
        />
        <div className="w-px self-stretch bg-orange-200" />
        <ProjecaoBloco
          titulo="Projeção B2"
          descricao={"consulta → +0,5 num / +1 den\ntrat. → +1 num"}
          novoNum={b2NovoNum}
          novoDenom={b2NovaDenom}
          novaPct={b2NovaPct}
          pctAtual={b2PctAtual}
          anyInput={anyInput}
          conceitoInfo={b2Conceito}
        />
        <div className="w-px self-stretch bg-orange-200" />
        <ProjecaoBloco
          titulo="Projeção B3"
          descricao={"consulta ou trat. → +2 den\n(num fixo — menor-melhor)"}
          novoNum={b3NovoNum}
          novoDenom={b3NovaDenom}
          novaPct={b3NovaPct}
          pctAtual={b3PctAtual}
          anyInput={anyInput}
          conceitoInfo={b3Conceito}
        />
        <div className="w-px self-stretch bg-orange-200" />
        <ProjecaoBloco
          titulo="Projeção B5"
          descricao="consulta ou trat. → +2 num / +2 den"
          novoNum={b5NovoNum}
          novoDenom={b5NovaDenom}
          novaPct={b5NovaPct}
          pctAtual={b5PctAtual}
          anyInput={anyInput}
          conceitoInfo={b5Conceito}
        />
      </div>
    </div>
  );
};

// ── Configuração dos cards de status relacionados ────────────────────────────
const STATUS_RELACIONADOS: Partial<Record<string, string[]>> = {
  "1ª Consulta Odontológica": ["Tratamento Concluído", "Proced. Odont. Preventivos"],
  "Tratamento Concluído":     ["1ª Consulta Odontológica", "Proced. Odont. Preventivos"],
  "Proced. Odont. Preventivos": ["1ª Consulta Odontológica", "Tratamento Concluído"],
};

// ── Correlação cruzada B3 / B5 / B6 ──────────────────────────────────────────
// Conforme as Notas Metodológicas (SIGTAP):
//  · ART (03.07.01.007-4) é numerador de B6 e, simultaneamente, compõe os
//    denominadores de B3 (proced. preventivos+curativos+exodontias) e B5
//    (total de proced. individuais).
//  · Restaurações convencionais (003-1, 008-2, 010-4, 011-2, 012-0) compõem
//    os denominadores de B3, B5 e B6 ao mesmo tempo, sem entrar em nenhum
//    numerador além do seu próprio indicador.
//  · Exodontia (013-8 / 014-6) é numerador de B3 e também compõe o
//    denominador de B5.
// Por isso B3 (menor-melhor) e B5/B6 (maior-melhor) tendem a se mover em
// direções opostas a partir do mesmo lançamento clínico — e essa correlação
// não é visível olhando cada indicador isoladamente.
const POLARIDADE: Partial<Record<string, "maior_melhor" | "menor_melhor">> = {
  "Taxa de Exodontias":             "menor_melhor",
  "Proced. Odont. Preventivos":     "maior_melhor",
  "Trat. Restaurador Atraumático":  "maior_melhor",
};

const CRUZADO_RELACIONADOS: Partial<Record<string, string[]>> = {
  "Taxa de Exodontias":            ["Proced. Odont. Preventivos", "Trat. Restaurador Atraumático"],
  "Proced. Odont. Preventivos":    ["Taxa de Exodontias", "Trat. Restaurador Atraumático"],
  "Trat. Restaurador Atraumático": ["Taxa de Exodontias", "Proced. Odont. Preventivos"],
};

// Conceito ordenado para permitir comparação de "subiu/caiu" entre indicadores
// com polaridades diferentes (B3 é menor-melhor; B5/B6 são maior-melhor).
const CONCEITO_RANK: Record<Conceito, number> = {
  regular: 0, suficiente: 1, bom: 2, otimo: 3, none: -1,
};

function direcaoConceito(c: Conceito): "favoravel" | "desfavoravel" | "neutro" {
  if (c === "none") return "neutro";
  if (CONCEITO_RANK[c] >= CONCEITO_RANK.bom) return "favoravel";
  if (CONCEITO_RANK[c] <= CONCEITO_RANK.regular) return "desfavoravel";
  return "neutro";
}

const STATUS_CONFIG: Record<string, { label: string; unit: string; deltaNum: number; deltaDenom: number }> = {
  "1ª Consulta Odontológica": { label: "B1",  unit: "atend.",    deltaNum: 1, deltaDenom: 0 },
  "Tratamento Concluído":     { label: "B2",  unit: "trat.",     deltaNum: 1, deltaDenom: 0 },
  "Proced. Odont. Preventivos": { label: "B5", unit: "consultas", deltaNum: 2, deltaDenom: 2 },
};

// ── Causa da divergência e ação recomendada, por indicador ──────────────────
// Texto fixo derivado das Notas Metodológicas B3/B5/B6 — explica POR QUE a
// divergência acontece (qual código SIGTAP é compartilhado) e O QUE fazer
// na rotina clínica para melhorar especificamente aquele indicador.
const CAUSA_E_ACAO: Partial<Record<string, { causa: string; acao: string }>> = {
  "Taxa de Exodontias": {
    causa: "Toda exodontia (04.14.02.013-8 / 014-6) soma no numerador de B3 e, ao mesmo tempo, entra no denominador de B5 — diluindo a % de preventivos sem mexer no numerador de B5.",
    acao: "Priorizar diagnóstico precoce e procedimentos preventivos/curativos antes da indicação de exodontia, quando clinicamente viável.",
  },
  "Proced. Odont. Preventivos": {
    causa: "Exodontias e restaurações convencionais entram no denominador de B5 sem entrar no numerador — cada uma dessas dilui a % de preventivos, mesmo que o número absoluto de preventivos não caia.",
    acao: "Aumentar o registro de procedimentos preventivos (flúor, selante, profilaxia, orientação de higiene) no mesmo volume de atendimentos, e considerar ART em vez de restauração convencional quando indicado.",
  },
  "Trat. Restaurador Atraumático": {
    causa: "Restaurações convencionais (resina/ionômero) competem pelo mesmo denominador do ART (total de procedimentos restauradores) sem entrar no numerador de B6.",
    acao: "Substituir restaurações convencionais por ART (03.07.01.007-4) quando clinicamente indicado — cada substituição soma no numerador de B6 sem aumentar o denominador.",
  },
};

// ── Efeito estimado de cada procedimento candidato sobre os 3 indicadores ───
// "unidade" é 1 lançamento do procedimento. Cada efeito descreve o delta no
// numerador e no denominador do indicador afetado (em unidades de
// procedimento), com base nas regras de cálculo das Notas Metodológicas.
// Isto é uma ESTIMATIVA PROPORCIONAL sobre os totais agregados já calculados
// (numerador/denominador atuais de cada indicador) — não uma contagem real
// de procedimentos individuais, que esta tela não possui por código SIGTAP.
type EfeitoIndicador = { indicador: string; deltaNum: number; deltaDenom: number };
const PROCEDIMENTO_CANDIDATOS: Record<
  string,
  { label: string; efeitos: EfeitoIndicador[] }
> = {
  art: {
    label: "ART (em vez de restauração convencional)",
    efeitos: [
      // B6: ART soma 1 no numerador (é o próprio ART) e 1 no denominador
      // (toda restauração, incluindo ART, compõe o denominador de B6).
      { indicador: "Trat. Restaurador Atraumático", deltaNum: 1, deltaDenom: 1 },
      // B3: ART não é exodontia (deltaNum 0), mas compõe o denominador de B3.
      { indicador: "Taxa de Exodontias",             deltaNum: 0, deltaDenom: 1 },
      // B5: ART não é "preventivo" (deltaNum 0), mas compõe o denominador de B5.
      { indicador: "Proced. Odont. Preventivos",     deltaNum: 0, deltaDenom: 1 },
    ],
  },
  preventivo: {
    label: "Procedimento preventivo (flúor, selante, profilaxia...)",
    efeitos: [
      // B5: soma 1 no numerador (é preventivo) e 1 no denominador.
      { indicador: "Proced. Odont. Preventivos",     deltaNum: 1, deltaDenom: 1 },
      // B3: a maior parte dos preventivos também compõe o denominador de B3.
      { indicador: "Taxa de Exodontias",             deltaNum: 0, deltaDenom: 1 },
    ],
  },
  restauracaoConvencional: {
    label: "Restauração convencional",
    efeitos: [
      // B6: compõe o denominador (é restauração) mas não o numerador (não é ART).
      { indicador: "Trat. Restaurador Atraumático", deltaNum: 0, deltaDenom: 1 },
      // B3 e B5: idem — só dilui o denominador.
      { indicador: "Taxa de Exodontias",             deltaNum: 0, deltaDenom: 1 },
      { indicador: "Proced. Odont. Preventivos",     deltaNum: 0, deltaDenom: 1 },
    ],
  },
};

// Sugere, por indicador em foco, qual procedimento-candidato é a "ação direta"
// que melhora aquele indicador especificamente — usado para pré-selecionar a
// opção recomendada no simulador. Para B3 (menor-melhor), aumentar preventivos
// dilui o denominador sem tocar o numerador de exodontias, o que já melhora
// a taxa — por isso a ação direta de B3 também é "preventivo".
const ACAO_DIRETA_POR_INDICADOR: Partial<Record<string, keyof typeof PROCEDIMENTO_CANDIDATOS>> = {
  "Trat. Restaurador Atraumático": "art",
  "Proced. Odont. Preventivos":    "preventivo",
  "Taxa de Exodontias":            "preventivo",
};

// ── Diagrama: correlação SIGTAP entre B3 / B5 / B6 ───────────────────────────
// Recriação compacta (em JSX/Tailwind, não imagem) do diagrama estrutural que
// mostra quais códigos SIGTAP são compartilhados entre os três indicadores —
// e se cada um entra no numerador, no denominador, ou em ambos.
const SigtapCorrelacaoDiagrama = () => (
  <div className="flex flex-col gap-2 text-[10px] min-w-0 w-full">
    <div className="grid grid-cols-3 gap-2">
      <div className="min-w-0 rounded border border-red-200 bg-red-50 px-2 py-1 text-center break-words">
        <p className="font-bold text-red-700">B3 — Taxa de Exodontia</p>
        <p className="text-red-600">menor-melhor</p>
      </div>
      <div className="min-w-0 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-center break-words">
        <p className="font-bold text-emerald-700">B5 — Preventivos</p>
        <p className="text-emerald-600">maior-melhor</p>
      </div>
      <div className="min-w-0 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-center break-words">
        <p className="font-bold text-indigo-700">B6 — ART</p>
        <p className="text-indigo-600">maior-melhor</p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2">
      <div className="min-w-0 rounded border border-red-200 bg-red-50/60 px-2 py-1 text-center text-red-700 break-words">
        Exodontia · 013-8 / 014-6
      </div>
      <div className="min-w-0 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-center text-emerald-700 break-words">
        Preventivos · 005-8 … 012-0, 004-0
      </div>
      <div className="min-w-0 rounded border border-indigo-200 bg-indigo-50/60 px-2 py-1 text-center text-indigo-700 break-words">
        ART · 007-4
      </div>
    </div>
    <p className="text-center text-muted-foreground">↑ numerador de cada indicador (entrar aqui aumenta o %)</p>

    <div className="flex flex-col gap-1 rounded border border-dashed border-border px-2 py-1.5 min-w-0">
      <p className="text-muted-foreground break-words">denominador — códigos que entram no cálculo de cada indicador (entrar aqui dilui e diminui o %):</p>
      <div className="rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-indigo-700 break-words">
        <span className="font-bold">ART · 007-4</span> → denominador de B3, B5 e B6 (compartilhado pelos 3)
      </div>
      <div className="rounded border border-muted bg-muted/40 px-2 py-1 text-foreground break-words">
        <span className="font-bold">Restaurações convencionais</span> · 003-1, 008-2, 010-4, 011-2, 012-0 → denominador de B3, B5 e B6 (sem somar em numerador algum)
      </div>
      <div className="rounded border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700 break-words">
        <span className="font-bold">Exodontia</span> · 013-8 / 014-6 → numerador de B3 e também denominador de B5
      </div>
      <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700 line-through decoration-rose-400 break-words">
        Amálgama · 009-0 e 013-9 — excluído do denominador de B3 e B6 (NM maio/2026)
      </div>
    </div>

    <p className="text-muted-foreground leading-snug break-words">
      Leitura: melhorar B6 (mais ART) e B5 (mais preventivos) tende a melhorar B3 também — mas qualquer
      restauração convencional dilui B5 sem ajudar B6, e exodontia piora B3 e dilui B5 ao mesmo tempo.
    </p>
  </div>
);

// ── Diagrama: árvore de decisão clínica (ART × restauração × exodontia) ─────
// Recriação compacta do fluxograma que resume o efeito de cada opção
// restauradora sobre os três indicadores simultaneamente.
const ArvoreDecisaoClinicaDiagrama = () => (
  <div className="flex flex-col gap-2 text-[10px]">
    <div className="rounded border border-border bg-muted/30 px-2 py-1 text-center font-semibold text-foreground">
      Dente cariado a tratar
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="min-w-0 rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-center break-words">
        <p className="font-bold text-emerald-700">ART</p>
        <p className="text-emerald-600">007-4 — minimamente invasivo</p>
      </div>
      <div className="min-w-0 rounded border border-border bg-muted/40 px-2 py-1.5 text-center break-words">
        <p className="font-bold text-foreground">Restauração convencional</p>
        <p className="text-muted-foreground">003-1, 008-2, 010-4, 011-2, 012-0</p>
      </div>
      <div className="min-w-0 rounded border border-orange-300 bg-orange-50 px-2 py-1.5 text-center break-words">
        <p className="font-bold text-orange-700">Exodontia</p>
        <p className="text-orange-600">013-8 / 014-6 — extração</p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="min-w-0 flex flex-col gap-1">
        <div className="rounded border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-center text-emerald-700 break-words">B6 ↑ favorável</div>
        <div className="rounded border border-muted bg-muted/30 px-2 py-1 text-center text-muted-foreground break-words">B3 neutro · B5 neutro</div>
      </div>
      <div className="min-w-0 flex flex-col gap-1">
        <div className="rounded border border-muted bg-muted/30 px-2 py-1 text-center text-muted-foreground break-words">B6 ↓ desfavorável</div>
        <div className="rounded border border-muted bg-muted/30 px-2 py-1 text-center text-muted-foreground break-words">B3 neutro · B5 neutro</div>
      </div>
      <div className="min-w-0 flex flex-col gap-1">
        <div className="rounded border border-orange-200 bg-orange-50/70 px-2 py-1 text-center text-orange-700 break-words">B3 ↑ desfavorável</div>
        <div className="rounded border border-orange-200 bg-orange-50/70 px-2 py-1 text-center text-orange-700 break-words">B5 ↓ desfavorável</div>
      </div>
    </div>
    <div className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-emerald-800 break-words">
      <span className="font-bold">ART é a única opção sem efeito desfavorável em nenhum dos três</span> — melhora B6
      diretamente e mantém B3/B5 neutros; a exodontia penaliza B3 e B5 ao mesmo tempo.
    </div>
    <p className="text-muted-foreground leading-snug break-words">
      Indicação clínica vem primeiro: ART não substitui exodontia quando há indicação real de extração — a meta
      é só evitar escolher restauração convencional ou exodontia por hábito quando ART seria adequado.
    </p>
  </div>
);

// Modal simples (sem dependência de Dialog) para o fluxograma de decisão clínica.
const AjudaDecisaoClinicaModal = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Como decidir entre ART, restauração e exodontia?"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-current opacity-60 hover:opacity-100 shrink-0"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-lg w-full max-h-[85vh] overflow-y-auto overflow-x-hidden bg-background border rounded-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <GitBranch className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground break-words">
                  Como decidir entre ART, restauração e exodontia?
                </span>
              </div>
              <button onClick={() => setOpen(false)} className="opacity-60 hover:opacity-100 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ArvoreDecisaoClinicaDiagrama />
          </div>
        </div>
      )}
    </>
  );
};

// ── Card de correlação cruzada B3 / B5 / B6 ──────────────────────────────────
// Mostra, ao lado do indicador expandido, o estado dos indicadores que
// compartilham códigos SIGTAP no denominador — para sinalizar quando uma
// melhora em um decorre (ou ocorre às custas) de um movimento no outro, por
// que isso acontece, o que fazer, e o efeito quantitativo estimado.
const CorrelacaoCruzadaCard = ({
  ind,
  todosIndicadores,
}: {
  ind: IndicadorResult;
  todosIndicadores?: IndicadorResult[];
}) => {
  const [rawQtd, setRawQtd] = useState("0");
  const qtd = Math.max(0, parseInt(rawQtd, 10) || 0);
  const [mostrarDiagrama, setMostrarDiagrama] = useState(false);

  const relacionados = CRUZADO_RELACIONADOS[ind.indicador];
  if (!relacionados || !todosIndicadores) return null;

  const direcaoAtual = direcaoConceito(ind.conceito);

  const linhas = relacionados
    .map((nome) => todosIndicadores.find((i) => i.indicador === nome))
    .filter((rel): rel is IndicadorResult => !!rel)
    .map((rel) => ({
      rel,
      direcaoRel: direcaoConceito(rel.conceito),
    }));

  if (linhas.length === 0) return null;

  // Amostra baixa: com poucos casos no período (ex.: 3 ART em 147
  // procedimentos restauradores), uma queda de % costuma ser ruído
  // estatístico, não uma troca real com outro indicador — o percentual
  // sozinho não distingue isso. Esta checagem é aplicada tanto ao indicador
  // em foco quanto a cada relacionado individualmente, para que os dois
  // cards (ex.: B5 e B6) cheguem ao MESMO diagnóstico sobre o mesmo evento,
  // em vez de um dizer "ruído" e o outro "disputa real" sobre o mesmo dado.
  const AMOSTRA_MINIMA_DENOM = 20;
  const AMOSTRA_MINIMA_NUM = 5;
  const temAmostraBaixa = (i: IndicadorResult, direcao: "favoravel" | "desfavoravel" | "neutro") =>
    direcao === "desfavoravel" &&
    ((i.denominador > 0 && i.denominador < AMOSTRA_MINIMA_DENOM) || i.numerador < AMOSTRA_MINIMA_NUM);

  const amostraBaixa = temAmostraBaixa(ind, direcaoAtual);

  // Conflito = este indicador está favorável e algum relacionado está
  // desfavorável (ou vice-versa) — sinal de que o mesmo procedimento clínico
  // pode estar empurrando os dois indicadores em direções opostas. Um
  // relacionado com amostra baixa não conta como conflito real (é ruído
  // dele, não disputa com este indicador).
  const linhasEmConflito = linhas.filter(
    ({ rel, direcaoRel }) =>
      ((direcaoAtual === "favoravel" && direcaoRel === "desfavoravel") ||
        (direcaoAtual === "desfavoravel" && direcaoRel === "favoravel")) &&
      !temAmostraBaixa(rel, direcaoRel),
  );
  const temConflito = linhasEmConflito.length > 0;

  const estado: "conflito" | "amostra" | "ok" =
    amostraBaixa ? "amostra" : temConflito ? "conflito" : "ok";
  const corTitulo =
    estado === "conflito" ? "text-rose-700" : estado === "amostra" ? "text-amber-700" : "text-sky-700";
  const corCardBg =
    estado === "conflito"
      ? "bg-rose-50 border-rose-200"
      : estado === "amostra"
        ? "bg-amber-50 border-amber-200"
        : "bg-sky-50 border-sky-200";
  const corTextoVeredito =
    estado === "conflito" ? "text-rose-600" : estado === "amostra" ? "text-amber-700" : "text-sky-600";

  const infoCausal = CAUSA_E_ACAO[ind.indicador];
  const acaoKey = ACAO_DIRETA_POR_INDICADOR[ind.indicador];
  const candidato = acaoKey ? PROCEDIMENTO_CANDIDATOS[acaoKey] : undefined;

  // Para cada indicador da tríade (o próprio + relacionados), calcula a nova
  // % se "qtd" unidades do procedimento-candidato forem lançadas, a partir
  // dos totais agregados já calculados (numerador/denominador atuais).
  // É uma projeção proporcional — não uma contagem real por código SIGTAP.
  const todosTriade = [ind, ...linhas.map((l) => l.rel)];
  const projecoes = candidato
    ? todosTriade.map((indAlvo) => {
        const efeito = candidato.efeitos.find((e) => e.indicador === indAlvo.indicador);
        const dNum = (efeito?.deltaNum ?? 0) * qtd;
        const dDen = (efeito?.deltaDenom ?? 0) * qtd;
        const novoNum = indAlvo.numerador + dNum;
        const novoDenom = indAlvo.denominador + dDen;
        const pctAtual = indAlvo.denominador > 0 ? (indAlvo.numerador / indAlvo.denominador) * 100 : 0;
        const novaPct = novoDenom > 0 ? (novoNum / novoDenom) * 100 : 0;
        return { indAlvo, pctAtual, novaPct, afetado: !!efeito };
      })
    : [];

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-lg px-3 py-2.5 shadow-sm w-full max-w-[640px] border ${corCardBg}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col shrink-0">
          <p className={`text-[13px] font-bold uppercase tracking-wide ${corTitulo}`}>
            Correlação SIGTAP
          </p>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Mesmos procedimentos no denominador de:
          </p>
          <p className="text-[11px] text-muted-foreground/80 leading-snug">
            (entrar no denominador dilui e diminui o %; entrar no numerador aumenta o %)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {linhas.map(({ rel, direcaoRel }) => {
            const relComAmostraBaixa = temAmostraBaixa(rel, direcaoRel);
            const conflitoLinha =
              ((direcaoAtual === "favoravel" && direcaoRel === "desfavoravel") ||
                (direcaoAtual === "desfavoravel" && direcaoRel === "favoravel")) &&
              !relComAmostraBaixa;
            return (
              <div key={rel.indicador} className="flex items-center gap-2">
                <span className="text-[13px] text-foreground" title={rel.indicador}>
                  {rel.indicador}
                  {relComAmostraBaixa && (
                    <span className="text-amber-600" title="Amostra baixa neste relacionado">
                      {" "}
                      (amostra baixa)
                    </span>
                  )}
                </span>
                <Badge
                  variant="outline"
                  className={`${CONCEITO_COLORS[rel.conceito]} text-[13px] shrink-0 ${conflitoLinha ? "ring-1 ring-rose-400" : ""}`}
                >
                  {CONCEITO_LABELS[rel.conceito]}
                </Badge>
              </div>
            );
          })}
        </div>

        {estado === "amostra" ? (
          <p className="text-[13px] font-medium text-amber-700 leading-snug flex-1 min-w-[200px]">
            Atenção: volume baixo, não necessariamente piora — são apenas {fmtNum(ind.numerador)} de{" "}
            {fmtNum(ind.denominador)} procedimentos no período ({ind.indicador} quase não está sendo realizado
            nesta equipe). Com tão poucos casos, o percentual oscila muito e não dá pra concluir que há disputa
            com os indicadores relacionados — o que precisa de atenção aqui é aumentar o volume de registros.
          </p>
        ) : estado === "conflito" ? (() => {
          const nomesConflito = linhasEmConflito.map(({ rel }) => rel.indicador);
          const verboRelacionado = nomesConflito.length > 1 ? "pioraram" : "piorou";
          const fraseEste = direcaoAtual === "favoravel" ? "melhorou" : "piorou";
          const fraseRelacionado = direcaoAtual === "favoravel" ? verboRelacionado : (nomesConflito.length > 1 ? "melhoraram" : "melhorou");
          return (
            <p className={`text-[13px] font-medium ${corTextoVeredito} leading-snug flex-1 min-w-[200px]`}>
              Atenção: este indicador {fraseEste}, mas {nomesConflito.join(" e ")} {fraseRelacionado} —
              provavelmente pelo mesmo procedimento. Confira antes de comemorar.
            </p>
          );
        })() : (
          <p className={`text-[13px] font-medium ${corTextoVeredito}`}>
            Sem divergência no momento.
          </p>
        )}
      </div>

      {infoCausal && (
        <div className="w-full h-px bg-current opacity-10" />
      )}

      {infoCausal && (
        <div className="flex flex-col gap-1">
          <p className="text-[13px] text-foreground leading-snug">
            <span className={`font-bold ${temConflito ? "text-rose-700" : "text-sky-700"}`}>Por quê: </span>
            {infoCausal.causa}
          </p>
          <p className="text-[13px] text-foreground leading-snug">
            <span className={`font-bold ${temConflito ? "text-rose-700" : "text-sky-700"}`}>O que fazer: </span>
            {infoCausal.acao}
          </p>
          <button
            type="button"
            onClick={() => setMostrarDiagrama((v) => !v)}
            className={`self-start flex items-center gap-1 text-[13px] font-medium mt-0.5 ${
              temConflito ? "text-rose-700" : "text-sky-700"
            } opacity-80 hover:opacity-100`}
          >
            {mostrarDiagrama ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {mostrarDiagrama ? "Ocultar diagrama" : "Ver diagrama de correlação SIGTAP"}
          </button>
          {mostrarDiagrama && (
            <div className="mt-1 min-w-0 w-full overflow-x-hidden rounded-lg border border-current/20 bg-background/60 p-2">
              <SigtapCorrelacaoDiagrama />
            </div>
          )}
        </div>
      )}

      {candidato && (
        <>
          <div className="w-full h-px bg-current opacity-10" />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-center gap-0.5 shrink-0">
            <span className="flex items-start gap-1">
            <span className="text-[13px] text-muted-foreground text-center leading-snug whitespace-nowrap">
                  simular +N · {candidato.label}
                </span>
                <AjudaDecisaoClinicaModal />
              </span>
              <div className="flex items-center gap-1">
                <button
                  onMouseDown={(e) => { e.preventDefault(); setRawQtd(String(Math.max(0, qtd - 1))); }}
                  className="w-6 h-6 flex items-center justify-center rounded border border-current opacity-70 hover:opacity-100 font-bold text-[18px] select-none"
                >−</button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={rawQtd}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setRawQtd(v === "" ? "0" : v);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-14 h-6 text-center text-[18px] font-mono font-bold border border-current rounded bg-background focus:outline-none"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); setRawQtd(String(qtd + 1)); }}
                  className="w-6 h-6 flex items-center justify-center rounded border border-current opacity-70 hover:opacity-100 font-bold text-[18px] select-none"
                >+</button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {projecoes.map(({ indAlvo, pctAtual, novaPct, afetado }) => {
                const ganho = novaPct - pctAtual;
                const polaridade = POLARIDADE[indAlvo.indicador];
                const isBomGanho = polaridade === "menor_melhor" ? ganho <= 0 : ganho >= 0;
                return (
                  <div key={indAlvo.indicador} className="flex items-baseline gap-1.5">
                    <span className="text-[13px] text-muted-foreground" title={indAlvo.indicador}>
                      {indAlvo.indicador}:
                    </span>
                    <span className="text-[14px] font-mono font-bold">
                      {novaPct.toFixed(1)}%
                    </span>
                    {qtd > 0 && afetado && ganho !== 0 && (
                      <span className={`text-[13px] font-medium ${isBomGanho ? "text-emerald-600" : "text-red-600"}`}>
                        ({ganho >= 0 ? "+" : ""}{ganho.toFixed(1)} pp)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground leading-snug">
            Estimativa proporcional sobre os totais atuais — não é uma contagem real por procedimento individual.
          </p>
        </>
      )}
    </div>
  );
};

// ── Card de status de um indicador relacionado ────────────────────────────────
const StatusRelacionadoCard = ({ ind }: { ind: IndicadorResult }) => {
  const thresholds = META_THRESHOLDS[ind.indicador];
  const cfg        = STATUS_CONFIG[ind.indicador];
  if (!thresholds || !cfg) return null;

  const pct = ind.denominador > 0 ? (ind.numerador / ind.denominador) * 100 : 0;
  const conceito = derivaConceito(pct, thresholds);

  const calcFaltam = (threshold: number): number =>
    calcFaltamShared(ind.numerador, ind.denominador, threshold, cfg.deltaNum, cfg.deltaDenom);

  const isOtimo   = pct > thresholds.thresholdOtimo * 100;
  const isBom     = pct > thresholds.thresholdBom   * 100;
  const proximoLabel    = isOtimo ? null : isBom ? `Ótimo (${thresholds.labelOtimo})` : `Bom (${thresholds.labelBom})`;
  const proximoThresh   = isOtimo ? null : isBom ? thresholds.thresholdOtimo : thresholds.thresholdBom;
  const faltamProximo   = proximoThresh !== null ? calcFaltam(proximoThresh) : 0;

  return (
    <div className="flex flex-col justify-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 shadow-sm min-w-[150px]">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{cfg.label}</p>
      <p className="text-[10px] text-muted-foreground leading-snug mb-1.5 truncate" title={ind.indicador}>
        {ind.indicador}
      </p>
      <p className="text-sm font-mono font-bold leading-tight">
        {fmtNum(ind.numerador)}
        <span className="text-xs font-normal text-muted-foreground"> / {fmtNum(ind.denominador)}</span>
      </p>
      <p className="text-xs text-muted-foreground mb-1.5">{pct.toFixed(1)}%</p>
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold w-fit mb-1.5 ${conceito.bgBorder} ${conceito.textColor}`}>
        {conceito.label}
      </div>
      {isOtimo ? (
        <p className="text-[10px] font-medium text-blue-600">✓ Ótimo atingido!</p>
      ) : faltamProximo > 0 ? (
        <p className="text-[10px] font-medium text-red-600 leading-snug">
          Faltam {faltamProximo.toLocaleString("pt-BR")} {cfg.unit}<br />
          <span className="text-muted-foreground">p/ {proximoLabel}</span>
        </p>
      ) : (
        <p className="text-[10px] font-medium text-emerald-600">✓ {proximoLabel} atingido!</p>
      )}
    </div>
  );
};

// ── Row de detalhe compartilhado ─────────────────────────────────────────────
const DetalheRow = ({
  ind,
  colSpan,
  cardMinWidth = "90px",
  todosIndicadores,
}: {
  ind: IndicadorResult;
  colSpan: number;
  cardMinWidth?: string;
  todosIndicadores?: IndicadorResult[];
}) => {
  const metaThresholds = META_THRESHOLDS[ind.indicador];
  const hasMeses       = ind.mesesDetalhe && ind.mesesDetalhe.length > 0;
  const hasSimCard     = INDICADORES_COM_SIMULACAO.has(ind.indicador);
  const hasCruzadoCard = !!CRUZADO_RELACIONADOS[ind.indicador];

  const b1 = todosIndicadores?.find(i => i.indicador === "1ª Consulta Odontológica");
  const b2 = todosIndicadores?.find(i => i.indicador === "Tratamento Concluído");
  const b5 = todosIndicadores?.find(i => i.indicador === "Proced. Odont. Preventivos");

  const hasLeftCol = metaThresholds || hasMeses;

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={colSpan} className="py-2 px-2">
        <div className="flex items-center justify-center">
          <div className="flex items-stretch gap-2">
            {hasLeftCol && (
              <div className="flex flex-col gap-2">
                {metaThresholds && (
                  <div className="flex items-stretch gap-2 flex-wrap">
                    <MetaQuadrimestreCard
                      denominador={ind.denominador}
                      numerador={ind.numerador}
                      thresholds={metaThresholds}
                      mesesDecorridos={ind.mesesDetalhe?.filter(m => (m.denominador ?? 0) > 0 || (m.numerador ?? 0) > 0).length ?? 0}
                      {...(ind.indicador === "Proced. Odont. Preventivos" && {
                        deltaNum: 2,
                        deltaDenom: 2,
                        faltaUnit: "consultas",
                      })}
                    />
                    {(STATUS_RELACIONADOS[ind.indicador] ?? []).map((nomeRel) => {
                      const relInd = todosIndicadores?.find(i => i.indicador === nomeRel);
                      return relInd ? (
                        <StatusRelacionadoCard key={nomeRel} ind={relInd} />
                      ) : null;
                    })}
                  </div>
                )}

                {hasMeses && (
                  <div className="flex flex-col items-center bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 shadow-sm flex-grow">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                        Detalhamento Mensal
                      </span>
                    </div>
                    <div className="flex flex-wrap items-stretch justify-center gap-3">
                      {ind.mesesDetalhe.map((mes) => (
                        <div
                          key={mes.mes}
                          className="flex flex-col items-center text-center bg-background border rounded-lg px-3 py-2 shadow-sm"
                          style={{ minWidth: cardMinWidth }}
                        >
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            {mes.mes}
                          </span>
                          <span className="text-sm font-mono font-bold">{mes.numerador}</span>
                          <span className="text-xs text-muted-foreground">de {mes.denominador}</span>
                          <span className="text-xs font-medium text-primary mt-0.5">
                            {mes.porcentagem.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(hasSimCard || hasCruzadoCard) && (
              <div className="self-start flex flex-col gap-2">
                {hasSimCard && (
                  <SimulacaoCard
                    b1Numerador={b1?.numerador ?? 0}
                    b1Denominador={b1?.denominador ?? 0}
                    b2Numerador={b2?.numerador ?? 0}
                    b2Denominador={b2?.denominador ?? 0}
                    b3Numerador={todosIndicadores?.find(i => i.indicador === "Taxa de Exodontias")?.numerador ?? 0}
                    b3Denominador={todosIndicadores?.find(i => i.indicador === "Taxa de Exodontias")?.denominador ?? 0}
                    b5Numerador={b5?.numerador ?? 0}
                    b5Denominador={b5?.denominador ?? 0}
                    todosIndicadores={todosIndicadores}
                  />
                )}
                {hasCruzadoCard && (
                  <CorrelacaoCruzadaCard ind={ind} todosIndicadores={todosIndicadores} />
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ── Tabela completa por equipe ────────────────────────────────────────────────
const ResultTable = ({
  result,
  title,
  showMeses,
}: {
  result: EquipeResult;
  title: string;
  showMeses: boolean;
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-4 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showMeses && <TableHead className="w-8" />}
                <TableHead className="font-semibold">Indicador (A)</TableHead>
                <TableHead className="text-center font-semibold">Peso (B)</TableHead>
                <TableHead className="text-center font-semibold">Numerador</TableHead>
                <TableHead className="text-center font-semibold">Denominador</TableHead>
                <TableHead className="text-center font-semibold">% Obtido</TableHead>
                <TableHead className="text-center font-semibold">Conceito</TableHead>
                <TableHead className="text-center font-semibold">Nota</TableHead>
                <TableHead className="text-center font-semibold">A × B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.indicadores.map((ind, idx) => {
                const isExpanded    = expandedRows.has(idx);
                const hasMeses      = showMeses && ind.mesesDetalhe && ind.mesesDetalhe.length > 0;
                const hasMetaCard   = showMeses && !!META_THRESHOLDS[ind.indicador];
                const hasCruzCard   = !!CRUZADO_RELACIONADOS[ind.indicador];
                const isExpandable  = hasMeses || hasMetaCard || hasCruzCard;

                return (
                  <>
                    <TableRow
                      key={idx}
                      className={isExpandable ? "cursor-pointer hover:bg-muted/40" : ""}
                      onClick={() => isExpandable && toggleRow(idx)}
                    >
                      {showMeses && (
                        <TableCell className="w-8 pr-0">
                          {isExpandable
                            ? (isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />)
                            : null}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{ind.indicador}</TableCell>
                      <TableCell className="text-center">{ind.peso}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{fmtNum(ind.numerador)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{fmtNum(ind.denominador)}</TableCell>
                      <TableCell className="text-center">{ind.porcentagem.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`${CONCEITO_COLORS[ind.conceito]} text-xs`}>
                          {CONCEITO_LABELS[ind.conceito]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{NOTA_SCORE[ind.conceito]}</TableCell>
                      <TableCell className="text-center font-mono font-semibold">
                        {ind.notaFinal.toFixed(2).replace(".", ",")}
                        <div className="text-[10px] font-normal text-muted-foreground" title="Pontos de desempate deste indicador">
                          {formatDesempate(ind.desempatePontos)} pts
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpandable && isExpanded && (
                      <DetalheRow
                        key={`${idx}-detail`}
                        ind={ind}
                        colSpan={showMeses ? 9 : 8}
                        todosIndicadores={result.indicadores}
                      />
                    )}
                  </>
                );
              })}
              <TableRow className="bg-muted/30 font-bold">
                {showMeses && <TableCell />}
                <TableCell>Total</TableCell>
                <TableCell className="text-center">10</TableCell>
                <TableCell /><TableCell /><TableCell /><TableCell />
                <TableCell className="text-center">Nota Final</TableCell>
                <TableCell className={`text-center text-lg font-mono ${getNotaFinalColor(result.notaFinal)}`}>
                  {result.notaFinal.toFixed(2).replace(".", ",")}
                  <div className="text-[10px] font-normal text-muted-foreground" title="Pontuação de desempate (0–1000)">
                    {formatDesempate(result.desempate)} pts
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Visão comparativa por indicador ──────────────────────────────────────────
const IndicadorComparativo = ({
  indicadorNome,
  geral,
  porEquipe,
  showMeses,
}: {
  indicadorNome: string;
  geral: EquipeResult;
  porEquipe: EquipeResult[];
  showMeses: boolean;
}) => {
  const [expandedGeral, setExpandedGeral] = useState(false);
  const [expandedEquipes, setExpandedEquipes] = useState<Set<string>>(new Set());

  const toggleEquipe = (equipe: string) => {
    setExpandedEquipes(prev => {
      const next = new Set(prev);
      next.has(equipe) ? next.delete(equipe) : next.add(equipe);
      return next;
    });
  };

  const getInd = (result: EquipeResult): IndicadorResult | undefined =>
    result.indicadores.find(i => i.indicador === indicadorNome);

  const geralInd = getInd(geral);
  if (!geralInd) return null;

  const equipeRows = porEquipe
    .map((eq, idx) => ({ equipe: eq.equipe, ind: getInd(eq), rank: idx + 1 }))
    .filter((r): r is { equipe: string; ind: IndicadorResult; rank: number } => !!r.ind)
    .sort((a, b) => {
      const CONCEITO_ORDER: Record<string, number> = { otimo: 0, bom: 1, suficiente: 2, regular: 3, none: 4 };
      const cc = (CONCEITO_ORDER[a.ind.conceito] ?? 4) - (CONCEITO_ORDER[b.ind.conceito] ?? 4);
      return cc !== 0 ? cc : b.ind.porcentagem - a.ind.porcentagem;
    });

  const hasMetaCard = !!META_THRESHOLDS[indicadorNome];
  const hasCruzCard = !!CRUZADO_RELACIONADOS[indicadorNome];
  const geralExpandable = showMeses && (geralInd.mesesDetalhe?.length > 0 || hasMetaCard || hasCruzCard);

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart2 className="h-5 w-5 text-primary" />
          Comparativo por Equipe — {indicadorNome}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showMeses && <TableHead className="w-8" />}
                <TableHead className="font-semibold">Equipe</TableHead>
                <TableHead className="text-center font-semibold">Numerador</TableHead>
                <TableHead className="text-center font-semibold">Denominador</TableHead>
                <TableHead className="text-center font-semibold">% Obtido</TableHead>
                <TableHead className="text-center font-semibold">Conceito</TableHead>
                <TableHead className="text-center font-semibold">Nota</TableHead>
                <TableHead className="text-center font-semibold">A × B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* ── Linha Geral ── */}
              <TableRow
                className={`bg-muted/30 font-semibold ${geralExpandable ? "cursor-pointer hover:bg-muted/40" : ""}`}
                onClick={() => geralExpandable && setExpandedGeral(v => !v)}
              >
                {showMeses && (
                  <TableCell className="w-8 pr-0">
                    {geralExpandable
                      ? (expandedGeral
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />)
                      : null}
                  </TableCell>
                )}
                <TableCell>🏆 Geral</TableCell>
                <TableCell className="text-center font-mono text-sm">{fmtNum(geralInd.numerador)}</TableCell>
                <TableCell className="text-center font-mono text-sm">{fmtNum(geralInd.denominador)}</TableCell>
                <TableCell className="text-center">{geralInd.porcentagem.toFixed(2)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`${CONCEITO_COLORS[geralInd.conceito]} text-xs`}>
                    {CONCEITO_LABELS[geralInd.conceito]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">{NOTA_SCORE[geralInd.conceito]}</TableCell>
                <TableCell className="text-center font-mono font-semibold">
                  {geralInd.notaFinal.toFixed(2).replace(".", ",")}
                </TableCell>
              </TableRow>

              {geralExpandable && expandedGeral && (
                <DetalheRow
                  ind={geralInd}
                  colSpan={showMeses ? 8 : 7}
                  cardMinWidth="80px"
                  todosIndicadores={geral.indicadores}
                />
              )}

              {/* ── Linhas por equipe ── */}
              {equipeRows.map(({ equipe, ind }, idx) => {
                const isExpandable = showMeses && (ind.mesesDetalhe?.length > 0 || hasMetaCard || hasCruzCard);
                const isExpanded   = expandedEquipes.has(equipe);

                return (
                  <>
                    <TableRow
                      key={equipe}
                      className={isExpandable ? "cursor-pointer hover:bg-muted/40" : ""}
                      onClick={() => isExpandable && toggleEquipe(equipe)}
                    >
                      {showMeses && (
                        <TableCell className="w-8 pr-0">
                          {isExpandable
                            ? (isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />)
                            : null}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">#{idx + 1} {equipe}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{fmtNum(ind.numerador)}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{fmtNum(ind.denominador)}</TableCell>
                      <TableCell className="text-center">{ind.porcentagem.toFixed(2)}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`${CONCEITO_COLORS[ind.conceito]} text-xs`}>
                          {CONCEITO_LABELS[ind.conceito]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono">{NOTA_SCORE[ind.conceito]}</TableCell>
                      <TableCell className="text-center font-mono font-semibold">
                        {ind.notaFinal.toFixed(2).replace(".", ",")}
                      </TableCell>
                    </TableRow>

                    {isExpandable && isExpanded && (
                      <DetalheRow
                        key={`${equipe}-detail`}
                        ind={ind}
                        colSpan={showMeses ? 8 : 7}
                        cardMinWidth="80px"
                        todosIndicadores={porEquipe.find(e => e.equipe === equipe)?.indicadores}
                      />
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const ResultadoFinalTab = ({
  geral,
  porEquipe,
  quadrimestre,
  onQuadrimestreChange,
  equipe,
  onEquipeChange,
  equipeOptions,
  mesesFiltro = [],
  onMesesFiltroChange,
}: ResultadoFinalTabProps) => {
  const [indicadorFiltro, setIndicadorFiltro] = useState("todos");

  const mesesOptions = useMemo(() => {
    const m = quadrimestre.match(/Q(\d)-(\d{4})/);
    if (!m) return [];
    const q = parseInt(m[1], 10);
    const year = m[2];
    const base = q === 1 ? [1, 2, 3, 4] : q === 2 ? [5, 6, 7, 8] : [9, 10, 11, 12];
    return base.map(mm => `${String(mm).padStart(2, "0")}/${year}`);
  }, [quadrimestre]);

  const sortedEquipes = useMemo(
    () =>
      [...porEquipe].sort(
        (a, b) => b.notaFinal - a.notaFinal || b.desempate - a.desempate
      ),
    [porEquipe]
  );

  const showMeses = quadrimestre !== "todos";

  // ── Geração de PDF ──────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    toast.info("Gerando PDF...");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new (jsPDF as any)({ orientation: "landscape", unit: "mm", format: "a4" });
      let y = 15;

      // ── Rótulos legíveis para cada filtro ──────────────────────────────────
      const labelQuad =
        quadrimestre !== "todos"
          ? QUADRIMESTRE_OPTIONS_SEM_TODOS.find(o => o.value === quadrimestre)?.label ?? quadrimestre
          : "Todos os quadrimestres";

      const labelEquipe = equipe !== "all" ? equipe : "Todas as equipes";

      const labelIndicador =
        indicadorFiltro !== "todos"
          ? INDICADOR_OPTIONS.find(o => o.value === indicadorFiltro)?.label ?? indicadorFiltro
          : "Todos os indicadores";

      const labelMeses =
        mesesFiltro && mesesFiltro.length > 0
          ? mesesFiltro.join(", ")
          : mesesOptions.length > 0
            ? "Todos os meses do quadrimestre"
            : null;

      const filtrosAtivos: { label: string; valor: string }[] = [
        { label: "Quadrimestre", valor: labelQuad },
        { label: "Equipe",       valor: labelEquipe },
        { label: "Indicador",    valor: labelIndicador },
        ...(labelMeses ? [{ label: "Meses", valor: labelMeses }] : []),
      ];

      // ── Cabeçalho ────────────────────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text("Indicadores de Saúde Bucal de Varjota", 14, y);
      y += 8;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Resultado Final", 14, y);
      y += 8;

      // ── Boxes de filtros ──────────────────────────────────────────────────────
      const filtroBoxH   = 7;
      const filtroBoxGap = 3;
      const pageW        = 297;
      const filtroX      = 14;
      const filtroBoxW   =
        (pageW - filtroX * 2 - filtroBoxGap * (filtrosAtivos.length - 1)) / filtrosAtivos.length;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80);
      doc.text("FILTROS APLICADOS", filtroX, y);
      y += 4;

      filtrosAtivos.forEach((f, i) => {
        const bx = filtroX + i * (filtroBoxW + filtroBoxGap);

        doc.setFillColor(245, 247, 255);
        doc.setDrawColor(180, 185, 220);
        doc.roundedRect(bx, y, filtroBoxW, filtroBoxH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 160);
        doc.text(f.label.toUpperCase(), bx + 2.5, y + 2.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(30);
        const maxChars = Math.floor(filtroBoxW / 1.55);
        const valor = f.valor.length > maxChars ? f.valor.slice(0, maxChars - 1) + "…" : f.valor;
        doc.text(valor, bx + 2.5, y + 5.5);
      });

      y += filtroBoxH + 6;

      // ── Cards de ranking ──────────────────────────────────────────────────────
      const rankEquipes = [
        { label: "Geral", nota: geral.notaFinal, isGeral: true, rank: 0 },
        ...[...porEquipe]
          .sort((a, b) => b.notaFinal - a.notaFinal)
          .map((eq, i) => ({ label: eq.equipe, nota: eq.notaFinal, isGeral: false, rank: i + 1 })),
      ];

      const gap    = 2;
      const cardH  = 19;
      const totalC = rankEquipes.length;
      const cardW  = (pageW - 14 * 2 - gap * (totalC - 1)) / totalC;

      rankEquipes.forEach((item, i) => {
        const x = 14 + i * (cardW + gap);

        if (item.isGeral) {
          doc.setFillColor(238, 242, 255); doc.setDrawColor(99, 102, 241);
        } else if (item.rank === 1) {
          doc.setFillColor(254, 252, 232); doc.setDrawColor(202, 138, 4);
        } else if (item.rank === 2) {
          doc.setFillColor(248, 250, 252); doc.setDrawColor(148, 163, 184);
        } else if (item.rank === 3) {
          doc.setFillColor(255, 247, 237); doc.setDrawColor(194, 120, 53);
        } else {
          doc.setFillColor(250, 250, 250); doc.setDrawColor(210, 210, 210);
        }
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        if (item.isGeral) {
          doc.setTextColor(79, 70, 229);
          doc.text("GERAL", x + cardW / 2, y + 4.5, { align: "center" });
        } else {
          doc.setTextColor(120, 120, 120);
          doc.text(`#${item.rank}`, x + cardW / 2, y + 4.5, { align: "center" });
        }

        if (!item.isGeral) {
          const maxChars = Math.floor(cardW / 1.6);
          const nome = item.label.length > maxChars ? item.label.slice(0, maxChars) + "…" : item.label;
          doc.setFontSize(5.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(60, 60, 60);
          doc.text(nome, x + cardW / 2, y + 9, { align: "center" });
        }

        const [nr, ng, nb] =
          item.nota > 7.5  ? [29, 78, 216]  :
          item.nota >= 5   ? [4, 120, 87]   :
          item.nota >= 2.6 ? [180, 83, 9]   : [185, 28, 28];
        doc.setTextColor(nr, ng, nb);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(
          item.nota.toFixed(2).replace(".", ","),
          x + cardW / 2,
          y + (item.isGeral ? 14 : 16),
          { align: "center" }
        );
      });

      y += cardH + 7.2;

      // ── Tabelas por equipe ────────────────────────────────────────────────────
      const equipesList =
        equipe !== "all"
          ? porEquipe.filter(e => e.equipe === equipe)
          : [...porEquipe].sort((a, b) => b.notaFinal - a.notaFinal);

      const resultsList = [
        { label: "Geral", result: geral },
        ...equipesList.map(e => ({ label: e.equipe, result: e })),
      ];

      for (const { label, result } of resultsList) {
        const pageH  = 210;
        const margin = 15;
        if (y > pageH - margin - 40) {
          doc.addPage();
          y = 15;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(
          `${label} — Nota Final: ${result.notaFinal.toFixed(2).replace(".", ",")}  |  Desempate: ${formatDesempate(result.desempate)} / 1000`,
          14,
          y
        );
        y += 4;

        const rows = result.indicadores
          .filter(ind => indicadorFiltro === "todos" || ind.indicador === indicadorFiltro)
          .map(ind => ({
            indicador:   ind.indicador,
            peso:        String(ind.peso),
            numerador:   fmtNum(ind.numerador),
            denominador: fmtNum(ind.denominador),
            porcentagem: `${ind.porcentagem.toFixed(2)}%`,
            conceito:    CONCEITO_LABELS[ind.conceito],
            nota:        NOTA_SCORE[ind.conceito],
            axb:         ind.notaFinal.toFixed(2).replace(".", ","),
          }));

        autoTable(doc, {
          startY: y,
          columns: [
            { header: "Indicador (A)",  dataKey: "indicador" },
            { header: "Peso (B)",       dataKey: "peso" },
            { header: "Numerador",      dataKey: "numerador" },
            { header: "Denominador",    dataKey: "denominador" },
            { header: "% Obtido",       dataKey: "porcentagem" },
            { header: "Conceito",       dataKey: "conceito" },
            { header: "Nota",           dataKey: "nota" },
            { header: "A × B",          dataKey: "axb" },
          ],
          body: rows,
          theme: "grid",
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: [30, 30, 30],
            fontStyle: "bold",
            fontSize: 8,
            halign: "center",
          },
          bodyStyles: { fontSize: 8, halign: "center" },
          columnStyles: { 0: { halign: "left" } },
          showHead: "everyPage",
          margin: { left: 14, right: 14 },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          styles: { overflow: "linebreak", cellPadding: 2 },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.column.dataKey === "conceito") {
              const c = data.cell.raw as string;
              if (c === "Ótimo")           data.cell.styles.textColor = [29, 78, 216];
              else if (c === "Bom")        data.cell.styles.textColor = [4, 120, 87];
              else if (c === "Suficiente") data.cell.styles.textColor = [180, 83, 9];
              else if (c === "Regular")    data.cell.styles.textColor = [185, 28, 28];
            }
          },
        });

        y = (doc as any).lastAutoTable.finalY + 8;
      }

      doc.save(`resultado-final-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const periodoMeses = mesesFiltro && mesesFiltro.length > 0 ? mesesFiltro.length : 4;

  return (
    <PeriodoMesesContext.Provider value={periodoMeses}>
    <div className="space-y-8 font-display">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border-2 shadow-xl rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>
        <Select value={equipe} onValueChange={onEquipeChange}>
          <SelectTrigger className="w-[280px] h-9">
            <SelectValue placeholder="Selecione a equipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Equipes</SelectItem>
            {equipeOptions.map((eq) => (
              <SelectItem key={eq} value={eq}>{eq}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={quadrimestre} onValueChange={(v) => onQuadrimestreChange(v as Quadrimestre)}>
          <SelectTrigger className="w-[260px] h-9">
            <SelectValue placeholder="Selecione o quadrimestre" />
          </SelectTrigger>
          <SelectContent>
            {QUADRIMESTRE_OPTIONS_SEM_TODOS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onMesesFiltroChange && mesesOptions.length > 0 && (
          <MesReferenciaMultiSelect
            value={mesesFiltro}
            options={mesesOptions}
            onChange={onMesesFiltroChange}
          />
        )}
        <Select value={indicadorFiltro} onValueChange={setIndicadorFiltro}>
          <SelectTrigger className="w-[280px] h-9">
            <SelectValue placeholder="Selecione o indicador" />
          </SelectTrigger>
          <SelectContent>
            {INDICADOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <PendenciasReportButton
            equipe={equipe}
            equipeResult={porEquipe.find((e) => e.equipe === equipe)}
          />

          <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="h-9 gap-2">
            <FileDown className="h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Ranking Cards */}
      <div className="relative">
        <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
          <div className={`
            flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5
            px-5 py-3 rounded-xl border-2 shadow-md
            bg-gradient-to-b from-white to-primary/5 border-primary/30
          `}>
            <div className="flex items-center gap-1 mb-0.5">
              <Trophy className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Geral</span>
            </div>
            <p className={`text-2xl font-bold font-mono leading-tight ${getNotaFinalColor(geral.notaFinal)}`}>
              {geral.notaFinal.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-[10px] text-muted-foreground">Nota Final</p>
            <p className="text-[9px] text-muted-foreground font-mono" title="Pontuação de desempate (0–1000)">
              {formatDesempate(geral.desempate)} pts
            </p>
          </div>

          <div className="self-stretch w-px bg-border mx-1" />

          {sortedEquipes.map((eq, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
            const ringClass =
              idx === 0 ? "border-yellow-300 shadow-yellow-100" :
              idx === 1 ? "border-slate-300 shadow-slate-100" :
              idx === 2 ? "border-orange-300 shadow-orange-100" :
                          "border-border shadow-sm";
            const bgClass =
              idx === 0 ? "from-yellow-50 to-white" :
              idx === 1 ? "from-slate-50 to-white" :
              idx === 2 ? "from-orange-50 to-white" :
                          "from-white to-white";

            return (
              <div
                key={eq.equipe}
                className={`
                  flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5
                  px-4 py-3 rounded-xl border-2 shadow-md
                  bg-gradient-to-b ${bgClass} ${ringClass}
                `}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  {medal
                    ? <span className="text-sm leading-none">{medal}</span>
                    : <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                  }
                </div>
                <p className="text-[10px] font-semibold text-center leading-tight text-foreground truncate w-full text-center px-1" title={eq.equipe}>
                  {eq.equipe}
                </p>
                <p className={`text-2xl font-bold font-mono leading-tight ${getNotaFinalColor(eq.notaFinal)}`}>
                  {eq.notaFinal.toFixed(2).replace(".", ",")}
                </p>
                <p className="text-[9px] text-muted-foreground font-mono" title="Pontuação de desempate (0–1000)">
                  {formatDesempate(eq.desempate)} pts
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conteúdo principal */}
      {indicadorFiltro !== "todos" ? (
        <IndicadorComparativo
          indicadorNome={indicadorFiltro}
          geral={geral}
          porEquipe={sortedEquipes}
          showMeses={showMeses}
        />
      ) : (
        <>
          <ResultTable result={geral} title="Resultado Geral" showMeses={showMeses} />
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Award className="h-5 w-5" />
              Resultado por Equipe
            </h2>
            {sortedEquipes.map((eq) => (
              <ResultTable key={eq.equipe} result={eq} title={eq.equipe} showMeses={showMeses} />
            ))}
          </div>
        </>
      )}

      {/* Legendas */}
      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Conceito no Indicador:</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span><span className="text-red-600 text-xs">= 0,25</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span><span className="text-amber-600 text-xs">= 0,50</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span><span className="text-emerald-600 text-xs">= 0,75</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span><span className="text-blue-600 text-xs">= 1,00</span>
        </div>
        {showMeses && (
          <span className="text-muted-foreground text-xs ml-2">· Clique na linha para expandir detalhes</span>
        )}
      </div>

      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Nota Final:</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span><span className="text-red-600 text-xs">≥ 2,5</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span><span className="text-amber-600 text-xs">2,6 a 4,9</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span><span className="text-emerald-600 text-xs">5 a 7,5</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span><span className="text-blue-600 text-xs">&gt; 7,5</span>
        </div>
      </div>
    </div>
    </PeriodoMesesContext.Provider>
  );
};
