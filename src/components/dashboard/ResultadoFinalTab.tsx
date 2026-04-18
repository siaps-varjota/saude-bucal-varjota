import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Trophy, Award, Filter, ChevronDown, ChevronRight,
  BarChart2, Target, FileDown, FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { EquipeResult, Conceito, IndicadorResult } from "@/hooks/useResultadoFinal";
import { Quadrimestre, QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";

interface ResultadoFinalTabProps {
  geral: EquipeResult;
  porEquipe: EquipeResult[];
  quadrimestre: Quadrimestre;
  onQuadrimestreChange: (q: Quadrimestre) => void;
  equipe: string;
  onEquipeChange: (e: string) => void;
  equipeOptions: string[];
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
const META_THRESHOLDS: Partial<Record<string, {
  labelBom: string;
  thresholdBom: number;
  labelOtimo: string;
  thresholdOtimo: number;
  unit?: string;
}>> = {
  "1ª Consulta Odontológica": {
    labelBom: "> 3%",    thresholdBom: 0.03,
    labelOtimo: "> 5%",  thresholdOtimo: 0.05,
  },
  "Tratamento Concluído": {
    labelBom: "> 50%",   thresholdBom: 0.501,
    labelOtimo: "> 75%", thresholdOtimo: 0.751,
    unit: "trat.",
  },
  "Proced. Odont. Preventivos": {
    labelBom: "> 60%",   thresholdBom: 0.601,
    labelOtimo: "> 80%", thresholdOtimo: 0.801,
    unit: "prev.",
  },
  "Escovação Supervisionada": {
    labelBom: "> 0,5%",  thresholdBom: 0.005,
    labelOtimo: "> 1%",  thresholdOtimo: 0.01,
  },
};

// ── Configuração do card Simulação por indicador ──────────────────────────────
const SIMULACAO_CONFIG: Partial<Record<string, {
  inputLabel: string;
  hint: string;
  deltaNum: number;
  deltaDenom: number;
}>> = {
  "Tratamento Concluído": {
    inputLabel: "trat.",
    hint: "Simule a conclusão de tratamentos já em andamento. O denominador (1ª consultas) permanece fixo.",
    deltaNum: 1,
    deltaDenom: 0,
  },
  "Proced. Odont. Preventivos": {
    inputLabel: "consultas",
    hint: "Cada nova 1ª consulta ou trat. concluído equivale a +2 no numerador e +2 no denominador.",
    deltaNum: 2,
    deltaDenom: 2,
  },
};

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

/** Deriva o conceito a partir da porcentagem e dos thresholds do indicador */
function derivaConceito(pct: number, thresholds: NonNullable<typeof META_THRESHOLDS[string]>): {
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

// ── Card Meta do Quadrimestre ─────────────────────────────────────────────────
const MetaQuadrimestreCard = ({
  denominador,
  numerador,
  thresholds,
  simConfig,
}: {
  denominador: number;
  numerador: number;
  thresholds: NonNullable<typeof META_THRESHOLDS[string]>;
  simConfig?: NonNullable<typeof SIMULACAO_CONFIG[string]>;
}) => {
  const calcFaltam = (threshold: number): number => {
    if (denominador > 0 && numerador / denominador >= threshold) return 0;
    if (simConfig && simConfig.deltaDenom > 0) {
      const dn  = simConfig.deltaNum;
      const dd  = simConfig.deltaDenom;
      const den = dn - dd * threshold;
      if (den <= 0) return 0;
      return Math.max(0, Math.ceil((threshold * denominador - numerador) / den));
    }
    return Math.max(0, Math.ceil(denominador * threshold) - numerador);
  };

  const metaBom     = Math.ceil(denominador * thresholds.thresholdBom);
  const metaOtimo   = Math.ceil(denominador * thresholds.thresholdOtimo);
  const faltamBom   = calcFaltam(thresholds.thresholdBom);
  const faltamOtimo = calcFaltam(thresholds.thresholdOtimo);
  const unit        = thresholds.unit || "atend.";
  const faltaUnit   = simConfig && simConfig.deltaDenom > 0 ? simConfig.inputLabel : unit;

  return (
    <div className="flex flex-col justify-center bg-violet-50 border border-violet-200 rounded-lg px-4 py-2 shadow-sm min-w-[260px]">
      <div className="flex items-center gap-1.5 mb-2">
        <Target className="h-3.5 w-3.5 text-violet-600 shrink-0" />
        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">
          Meta do Quadrimestre
        </span>
        <span className="text-xs text-muted-foreground ml-0.5">
          de {denominador.toLocaleString("pt-BR")}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Bom */}
        <div>
          <p className="text-xs font-semibold text-emerald-700">Bom ({thresholds.labelBom})</p>
          <p className="text-xl font-bold font-mono text-emerald-700 leading-tight">
            {metaBom.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">Média/mês: {(metaBom / 4).toFixed(1)}</p>
          {faltamBom > 0 ? (
            <p className="text-xs font-medium text-red-600">
              Faltam: {faltamBom.toLocaleString("pt-BR")} {faltaUnit}
            </p>
          ) : (
            <p className="text-xs font-medium text-emerald-600">✓ Meta atingida!</p>
          )}
        </div>

        {/* Ótimo */}
        <div>
          <p className="text-xs font-semibold text-blue-700">Ótimo ({thresholds.labelOtimo})</p>
          <p className="text-xl font-bold font-mono text-blue-700 leading-tight">
            {metaOtimo.toLocaleString("pt-BR")}{" "}
            <span className="text-sm font-normal">{unit}</span>
          </p>
          <p className="text-xs text-muted-foreground">Média/mês: {(metaOtimo / 4).toFixed(1)}</p>
          {faltamOtimo > 0 ? (
            <p className="text-xs font-medium text-red-600">
              Faltam: {faltamOtimo.toLocaleString("pt-BR")} {faltaUnit}
            </p>
          ) : (
            <p className="text-xs font-medium text-blue-600">✓ Meta atingida!</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Card de Simulação interativa (B4 + B1 + B2 vinculados) ───────────────────
const SimulacaoCard = ({
  numerador,
  denominador,
  thresholds,
  config,
  b1Numerador,
  b1Denominador,
  b2Numerador,
  b2Denominador,
}: {
  numerador: number;
  denominador: number;
  thresholds: NonNullable<typeof META_THRESHOLDS[string]>;
  config: NonNullable<typeof SIMULACAO_CONFIG[string]>;
  b1Numerador?: number;
  b1Denominador?: number;
  b2Numerador?: number;
  b2Denominador?: number;
}) => {
  const [extraConsultas,  setExtraConsultas]  = useState(0);
  const [extraConclusoes, setExtraConclusoes] = useState(0);

  const handleInput = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const n = parseInt(val.replace(/\D/g, ""), 10);
    setter(isNaN(n) ? 0 : Math.max(0, n));
  };

  const anyInput = extraConsultas > 0 || extraConclusoes > 0;

  // ── B4: cada consulta ou trat. concluído → +2 num / +2 denom ───────────────
  const b4NovoNum   = numerador   + (extraConsultas + extraConclusoes) * 2;
  const b4NovoDenom = denominador + (extraConsultas + extraConclusoes) * 2;
  const b4NovaPct   = b4NovoDenom > 0 ? (b4NovoNum / b4NovoDenom) * 100 : 0;
  const b4PctAtual  = denominador  > 0 ? (numerador  / denominador)  * 100 : 0;
  const b4Conceito  = derivaConceito(b4NovaPct, thresholds);

  // ── B1: cada consulta → +1 num; denominador fixo ───────────────────────────
  const showB1      = b1Numerador !== undefined && b1Denominador !== undefined;
  const b1NovoNum   = (b1Numerador  ?? 0) + extraConsultas;
  const b1NovaDenom = (b1Denominador ?? 0);
  const b1NovaPct   = b1NovaDenom > 0 ? (b1NovoNum / b1NovaDenom) * 100 : 0;
  const b1PctAtual  = b1NovaDenom > 0 ? ((b1Numerador ?? 0) / b1NovaDenom) * 100 : 0;
  const b1Thresholds = META_THRESHOLDS["1ª Consulta Odontológica"];
  const b1Conceito  = b1Thresholds ? derivaConceito(b1NovaPct, b1Thresholds) : null;

  // ── B2: consulta → +1 denom / +0,5 num; conclusão → +1 num ────────────────
  const showB2      = b2Numerador !== undefined && b2Denominador !== undefined;
  const b2NovoNum   = (b2Numerador  ?? 0) + extraConsultas * 0.5 + extraConclusoes;
  const b2NovaDenom = (b2Denominador ?? 0) + extraConsultas + extraConclusoes;
  const b2NovaPct   = b2NovaDenom > 0 ? (b2NovoNum / b2NovaDenom) * 100 : 0;
  const b2PctAtual  = (b2Denominador ?? 0) > 0
    ? ((b2Numerador ?? 0) / (b2Denominador ?? 0)) * 100 : 0;
  const b2Thresholds = META_THRESHOLDS["Tratamento Concluído"];
  const b2Conceito  = b2Thresholds ? derivaConceito(b2NovaPct, b2Thresholds) : null;

  // ── Sub-componente de bloco de projeção ────────────────────────────────────
  const ProjecaoBloco = ({
    titulo,
    descricao,
    novoNum,
    novoDenom,
    novaPct,
    pctAtual,
    conceitoInfo,
  }: {
    titulo: string;
    descricao: string;
    novoNum: number;
    novoDenom: number;
    novaPct: number;
    pctAtual: number;
    conceitoInfo: ReturnType<typeof derivaConceito> | null;
  }) => {
    const ganho = novaPct - pctAtual;
    return (
      <div className="flex flex-col gap-1 min-w-[130px]">
        <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide leading-tight">
          {titulo}
        </p>
        <p className="text-[9px] text-muted-foreground leading-snug">{descricao}</p>
        <p className="text-sm font-mono font-bold leading-tight mt-0.5">
          {Number.isInteger(novoNum)
            ? novoNum.toLocaleString("pt-BR")
            : novoNum.toFixed(1)}
          <span className="text-xs font-normal text-muted-foreground">
            {" "}/ {novoDenom.toLocaleString("pt-BR")}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {novaPct.toFixed(1)}%
          {anyInput && (
            <span className={`ml-1 font-medium ${ganho >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ({ganho >= 0 ? "+" : ""}{ganho.toFixed(1)} pp)
            </span>
          )}
        </p>
        {conceitoInfo && (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold w-fit ${conceitoInfo.bgBorder} ${conceitoInfo.textColor}`}>
            {conceitoInfo.label}
            <span className="font-normal opacity-60">({conceitoInfo.nota})</span>
          </div>
        )}
      </div>
    );
  };

  // ── Sub-componente de input ─────────────────────────────────────────────────
  const InputStepper = ({
    label,
    sublabel,
    value,
    onDecrement,
    onIncrement,
    onChange,
  }: {
    label: string;
    sublabel: string;
    value: number;
    onDecrement: () => void;
    onIncrement: () => void;
    onChange: (val: string) => void;
  }) => (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onDecrement}
          className="w-6 h-6 flex items-center justify-center rounded border border-orange-300 bg-white text-orange-700 font-bold text-sm hover:bg-orange-100 transition-colors select-none"
        >−</button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-6 text-center text-sm font-mono font-bold border border-orange-300 rounded bg-white text-orange-800 focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
        <button
          onClick={onIncrement}
          className="w-6 h-6 flex items-center justify-center rounded border border-orange-300 bg-white text-orange-700 font-bold text-sm hover:bg-orange-100 transition-colors select-none"
        >+</button>
      </div>
      <span className="text-[10px] text-muted-foreground">{sublabel}</span>
    </div>
  );

  return (
    <div className="flex flex-col bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 shadow-sm">

      {/* Cabeçalho */}
      <div className="flex items-center gap-1.5 mb-3">
        <FlaskConical className="h-3.5 w-3.5 text-orange-600 shrink-0" />
        <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
          Simulação
        </span>
      </div>

      {/* Inputs */}
      <div className="flex items-start gap-5 mb-3 flex-wrap">
        <InputStepper
          label="+ adicionar"
          sublabel="1ªs consultas"
          value={extraConsultas}
          onDecrement={() => setExtraConsultas(Math.max(0, extraConsultas - 1))}
          onIncrement={() => setExtraConsultas(extraConsultas + 1)}
          onChange={(v) => handleInput(v, setExtraConsultas)}
        />
        <InputStepper
          label="+ adicionar"
          sublabel="trat. concluídos"
          value={extraConclusoes}
          onDecrement={() => setExtraConclusoes(Math.max(0, extraConclusoes - 1))}
          onIncrement={() => setExtraConclusoes(extraConclusoes + 1)}
          onChange={(v) => handleInput(v, setExtraConclusoes)}
        />
      </div>

      {/* Divisor */}
      <div className="w-full h-px bg-orange-200 mb-3" />

      {/* Projeções */}
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <ProjecaoBloco
          titulo="Projeção B4"
          descricao="consulta ou trat. → +2 num / +2 den"
          novoNum={b4NovoNum}
          novoDenom={b4NovoDenom}
          novaPct={b4NovaPct}
          pctAtual={b4PctAtual}
          conceitoInfo={b4Conceito}
        />
        {showB1 && b1Conceito && (
          <>
            <div className="w-px self-stretch bg-orange-200" />
            <ProjecaoBloco
              titulo="Projeção B1"
              descricao="consulta → +1 num (den fixo)"
              novoNum={b1NovoNum}
              novoDenom={b1NovaDenom}
              novaPct={b1NovaPct}
              pctAtual={b1PctAtual}
              conceitoInfo={b1Conceito}
            />
          </>
        )}
        {showB2 && b2Conceito && (
          <>
            <div className="w-px self-stretch bg-orange-200" />
            <ProjecaoBloco
              titulo="Projeção B2"
              descricao="consulta → +0,5 num / +1 den · trat. → +1 num / +1 den"
              novoNum={b2NovoNum}
              novoDenom={b2NovaDenom}
              novaPct={b2NovaPct}
              pctAtual={b2PctAtual}
              conceitoInfo={b2Conceito}
            />
          </>
        )}
      </div>
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
  const metaThresholds  = META_THRESHOLDS[ind.indicador];
  const simulacaoConfig = SIMULACAO_CONFIG[ind.indicador];
  const hasMeses        = ind.mesesDetalhe && ind.mesesDetalhe.length > 0;

  const b1 = todosIndicadores?.find(i => i.indicador === "1ª Consulta Odontológica");
  const b2 = todosIndicadores?.find(i => i.indicador === "Tratamento Concluído");

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={colSpan} className="py-4 px-4">
        <div className="flex flex-wrap items-start gap-3">

          {/* Detalhamento Mensal */}
          {hasMeses && (
            <div className="flex flex-col items-center bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 shadow-sm">
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

          {/* Meta do Quadrimestre */}
          {metaThresholds && (
            <MetaQuadrimestreCard
              denominador={ind.denominador}
              numerador={ind.numerador}
              thresholds={metaThresholds}
              simConfig={simulacaoConfig}
            />
          )}

          {/* Simulação — B1, B2 e B4 (apenas quando indicador é B4) */}
         {metaThresholds && simulacaoConfig && (
            <SimulacaoCard
              numerador={ind.numerador}
              denominador={ind.denominador}
              thresholds={metaThresholds}
              config={simulacaoConfig}
              b1Numerador={b1?.numerador}
              b1Denominador={b1?.denominador}
              b2Numerador={b2?.numerador}
              b2Denominador={b2?.denominador}
            />
          )}

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
        <CardTitle className="flex items-center gap-2 text-lg">
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
                const isExpanded   = expandedRows.has(idx);
                const hasMeses     = showMeses && ind.mesesDetalhe && ind.mesesDetalhe.length > 0;
                const hasMetaCard  = showMeses && !!META_THRESHOLDS[ind.indicador];
                const isExpandable = hasMeses || hasMetaCard;

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
              <TableRow className="bg-muted/30 font-semibold">
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

              {showMeses && (geralInd.mesesDetalhe?.length > 0 || hasMetaCard) && (
                <DetalheRow ind={geralInd} colSpan={7} cardMinWidth="80px" todosIndicadores={geral.indicadores} />
              )}

              {equipeRows.map(({ equipe, ind }, idx) => (
                <>
                  <TableRow key={equipe}>
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

                  {showMeses && (ind.mesesDetalhe?.length > 0 || hasMetaCard) && (
                    <DetalheRow
                      key={`${equipe}-detail`}
                      ind={ind}
                      colSpan={7}
                      cardMinWidth="80px"
                      todosIndicadores={porEquipe.find(e => e.equipe === equipe)?.indicadores}
                    />
                  )}
                </>
              ))}
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
}: ResultadoFinalTabProps) => {
  const [indicadorFiltro, setIndicadorFiltro] = useState("todos");

  const sortedEquipes = useMemo(
    () => [...porEquipe].sort((a, b) => b.notaFinal - a.notaFinal),
    [porEquipe]
  );

  const showMeses = quadrimestre !== "todos";

  // ── Geração de PDF ──────────────────────────────────────────────────────────
  const handleGeneratePDF = async () => {
    toast.info("Gerando PDF...");
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new (jsPDF as any)({ orientation: "landscape", unit: "mm", format: "a4" });
      let y = 15;

      const filterText = [
        quadrimestre !== "todos"
          ? QUADRIMESTRE_OPTIONS_SEM_TODOS.find(o => o.value === quadrimestre)?.label
          : "Todos os quadrimestres",
        equipe !== "all" ? equipe : "Todas as equipes",
        indicadorFiltro !== "todos"
          ? INDICADOR_OPTIONS.find(o => o.value === indicadorFiltro)?.label
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Indicadores de Saúde Bucal de Varjota", 14, y);
      y += 8;
      doc.setFontSize(13);
      doc.text("Resultado Final", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Filtros: ${filterText}`, 14, y);
      y += 8;

      const rankEquipes = [
        { label: "Geral", nota: geral.notaFinal },
        ...[...porEquipe]
          .sort((a, b) => b.notaFinal - a.notaFinal)
          .map((eq, i) => ({ label: `#${i + 1} ${eq.equipe}`, nota: eq.notaFinal })),
      ];

      const cardW = 44;
      const cardH = 16;
      rankEquipes.forEach((item, i) => {
        const x = 14 + i * (cardW + 3);
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(item.label, x + cardW / 2, y + 5, { align: "center" });
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(item.nota.toFixed(2).replace(".", ","), x + cardW / 2, y + 12, { align: "center" });
      });
      y += cardH + 8;

      const equipesList =
        equipe !== "all"
          ? porEquipe.filter(e => e.equipe === equipe)
          : [...porEquipe].sort((a, b) => b.notaFinal - a.notaFinal);

      const resultsList = [
        { label: "Geral", result: geral },
        ...equipesList.map(e => ({ label: e.equipe, result: e })),
      ];

      for (const { label, result } of resultsList) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`${label} — Nota Final: ${result.notaFinal.toFixed(2).replace(".", ",")}`, 14, y);
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

        (doc as any).autoTable({
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
          headStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 8, halign: "center" },
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

  return (
    <div className="space-y-8">
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
        <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="h-9 gap-2 ml-auto">
          <FileDown className="h-4 w-4" />
          Gerar PDF
        </Button>
      </div>

      {/* Ranking Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        <Card className={`border shadow-md ${getNotaFinalBg(geral.notaFinal)} border-l-4`}>
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase text-primary">Geral</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${getNotaFinalColor(geral.notaFinal)}`}>
              {geral.notaFinal.toFixed(2).replace(".", ",")}
            </p>
            <p className="text-muted-foreground text-xs">Nota Final</p>
          </CardContent>
        </Card>
        {sortedEquipes.map((eq, idx) => (
          <Card key={eq.equipe} className={`border shadow-md ${getNotaFinalBg(eq.notaFinal)} border-l-4`}>
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
              </div>
              <p className="text-xs font-semibold truncate mb-1">{eq.equipe}</p>
              <p className={`text-2xl font-bold font-mono ${getNotaFinalColor(eq.notaFinal)}`}>
                {eq.notaFinal.toFixed(2).replace(".", ",")}
              </p>
            </CardContent>
          </Card>
        ))}
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
  );
};
