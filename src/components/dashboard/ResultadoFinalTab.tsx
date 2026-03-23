import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Award, Filter, ChevronDown, ChevronRight, BarChart2 } from "lucide-react";
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
  { value: "Proced. Odont. Preventivos",     label: "B4 — Proced. Odont. Preventivos" },
  { value: "Escovação Supervisionada",       label: "B5 — Escovação Supervisionada" },
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

// ── Tabela completa por equipe ────────────────────────────────────────────────
const ResultTable = ({ result, title, showMeses }: { result: EquipeResult; title: string; showMeses: boolean }) => {
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
                const isExpanded = expandedRows.has(idx);
                const hasMeses = showMeses && ind.mesesDetalhe && ind.mesesDetalhe.length > 0;
                return (
                  <>
                    <TableRow
                      key={idx}
                      className={hasMeses ? "cursor-pointer hover:bg-muted/40" : ""}
                      onClick={() => hasMeses && toggleRow(idx)}
                    >
                      {showMeses && (
                        <TableCell className="w-8 pr-0">
                          {hasMeses ? (isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />) : null}
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
                      <TableCell className="text-center font-mono font-semibold">{ind.notaFinal.toFixed(2).replace(".", ",")}</TableCell>
                    </TableRow>
                    {hasMeses && isExpanded && (
                      <TableRow key={`${idx}-detail`} className="bg-muted/20">
                        <TableCell colSpan={showMeses ? 9 : 8} className="py-2 px-4">
                          <div className="flex flex-wrap gap-3">
                            {ind.mesesDetalhe.map((mes) => (
                              <div key={mes.mes} className="flex flex-col items-center bg-background border rounded-lg px-3 py-2 min-w-[90px] shadow-sm">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{mes.mes}</span>
                                <span className="text-sm font-mono font-bold">{mes.numerador}</span>
                                <span className="text-xs text-muted-foreground">de {mes.denominador}</span>
                                <span className="text-xs font-medium text-primary mt-0.5">{mes.porcentagem.toFixed(1)}%</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
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
              {/* Linha Geral */}
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
                <TableCell className="text-center font-mono font-semibold">{geralInd.notaFinal.toFixed(2).replace(".", ",")}</TableCell>
              </TableRow>
              {showMeses && geralInd.mesesDetalhe?.length > 0 && (
                <TableRow className="bg-muted/10">
                  <TableCell colSpan={7} className="py-2 px-4">
                    <div className="flex flex-wrap gap-2">
                      {geralInd.mesesDetalhe.map((mes) => (
                        <div key={mes.mes} className="flex flex-col items-center bg-background border rounded-lg px-3 py-2 min-w-[80px] shadow-sm">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{mes.mes}</span>
                          <span className="text-sm font-mono font-bold">{mes.numerador}</span>
                          <span className="text-xs text-muted-foreground">de {mes.denominador}</span>
                          <span className="text-xs font-medium text-primary mt-0.5">{mes.porcentagem.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {/* Linhas por equipe */}
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
                    <TableCell className="text-center font-mono font-semibold">{ind.notaFinal.toFixed(2).replace(".", ",")}</TableCell>
                  </TableRow>
                  {showMeses && ind.mesesDetalhe?.length > 0 && (
                    <TableRow key={`${equipe}-detail`} className="bg-muted/10">
                      <TableCell colSpan={7} className="py-2 px-4">
                        <div className="flex flex-wrap gap-2">
                          {ind.mesesDetalhe.map((mes) => (
                            <div key={mes.mes} className="flex flex-col items-center bg-background border rounded-lg px-3 py-2 min-w-[80px] shadow-sm">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{mes.mes}</span>
                              <span className="text-sm font-mono font-bold">{mes.numerador}</span>
                              <span className="text-xs text-muted-foreground">de {mes.denominador}</span>
                              <span className="text-xs font-medium text-primary mt-0.5">{mes.porcentagem.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
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
export const ResultadoFinalTab = ({ geral, porEquipe, quadrimestre, onQuadrimestreChange, equipe, onEquipeChange, equipeOptions }: ResultadoFinalTabProps) => {
  const [indicadorFiltro, setIndicadorFiltro] = useState("todos");

  const sortedEquipes = useMemo(
    () => [...porEquipe].sort((a, b) => b.notaFinal - a.notaFinal),
    [porEquipe]
  );

  const showMeses = quadrimestre !== "todos";

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border-2 shadow-xl rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
        </div>
        <Select value={equipe} onValueChange={onEquipeChange}>
          <SelectTrigger className="w-[200px] h-9">
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

      {/* Conteúdo principal — comparativo ou tabelas completas */}
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

      {/* Legends */}
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
        {showMeses && <span className="text-muted-foreground text-xs ml-2">· Detalhe mensal exibido por equipe</span>}
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
