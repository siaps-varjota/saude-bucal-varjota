import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Award, Filter } from "lucide-react";
import { EquipeResult, Conceito } from "@/hooks/useResultadoFinal";
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

const CONCEITO_LABELS: Record<Conceito, string> = {
  regular: "Regular",
  suficiente: "Suficiente",
  bom: "Bom",
  otimo: "Ótimo",
  none: "-",
};

const CONCEITO_COLORS: Record<Conceito, string> = {
  regular: "bg-red-100 text-red-700 border-red-200",
  suficiente: "bg-amber-100 text-amber-700 border-amber-200",
  bom: "bg-emerald-100 text-emerald-700 border-emerald-200",
  otimo: "bg-blue-100 text-blue-700 border-blue-200",
  none: "bg-muted text-muted-foreground border-border",
};

const NOTA_SCORE: Record<Conceito, string> = {
  regular: "0,25",
  suficiente: "0,50",
  bom: "0,75",
  otimo: "1,00",
  none: "0,00",
};

function getNotaFinalColor(nota: number): string {
  if (nota >= 7.5) return "text-blue-700";
  if (nota >= 5) return "text-emerald-700";
  if (nota >= 2.5) return "text-amber-700";
  return "text-red-700";
}

function getNotaFinalBg(nota: number): string {
  if (nota >= 7.5) return "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200";
  if (nota >= 5) return "bg-gradient-to-br from-emerald-100 to-emerald-50 border-emerald-200";
  if (nota >= 2.5) return "bg-gradient-to-br from-amber-100 to-amber-50 border-amber-200";
  return "bg-gradient-to-br from-red-100 to-red-50 border-red-200";
}

const ResultTable = ({ result, title }: { result: EquipeResult; title: string }) => (
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
              <TableHead className="font-semibold">Indicador (A)</TableHead>
              <TableHead className="text-center font-semibold">Peso (B)</TableHead>
              <TableHead className="text-center font-semibold">% Obtido</TableHead>
              <TableHead className="text-center font-semibold">Conceito</TableHead>
              <TableHead className="text-center font-semibold">Nota</TableHead>
              <TableHead className="text-center font-semibold">A × B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.indicadores.map((ind, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{ind.indicador}</TableCell>
                <TableCell className="text-center">{ind.peso}</TableCell>
                <TableCell className="text-center">{ind.porcentagem.toFixed(2)}%</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`${CONCEITO_COLORS[ind.conceito]} text-xs`}>
                    {CONCEITO_LABELS[ind.conceito]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">{NOTA_SCORE[ind.conceito]}</TableCell>
                <TableCell className="text-center font-mono font-semibold">{ind.notaFinal.toFixed(2).replace(".", ",")}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-bold">
              <TableCell>Total</TableCell>
              <TableCell className="text-center">10</TableCell>
              <TableCell />
              <TableCell />
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

export const ResultadoFinalTab = ({ geral, porEquipe, quadrimestre, onQuadrimestreChange }: ResultadoFinalTabProps) => {
  const sortedEquipes = useMemo(
    () => [...porEquipe].sort((a, b) => b.notaFinal - a.notaFinal),
    [porEquipe]
  );

  return (
    <div className="space-y-8">
      {/* Quadrimester Filter */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-card border-2 shadow-xl rounded-xl">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        </div>
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

      {/* Geral Table */}
      <ResultTable result={geral} title="Resultado Geral" />

      {/* Legend */}
      <div className="gap-2 text-sm flex items-center justify-center flex-wrap">
        <span className="font-medium text-muted-foreground">Conceito no Indicador:</span>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-red-200 bg-red-50">
          <span className="text-red-700 font-medium">Regular</span>
          <span className="text-red-600 text-xs">= 0,25</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-amber-200 bg-amber-50">
          <span className="text-amber-700 font-medium">Suficiente</span>
          <span className="text-amber-600 text-xs">= 0,50</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-emerald-200 bg-emerald-50">
          <span className="text-emerald-700 font-medium">Bom</span>
          <span className="text-emerald-600 text-xs">= 0,75</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded border border-blue-200 bg-blue-50">
          <span className="text-blue-700 font-medium">Ótimo</span>
          <span className="text-blue-600 text-xs">= 1,00</span>
        </div>
      </div>

      {/* Per Team Tables */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Award className="h-5 w-5" />
          Resultado por Equipe
        </h2>
        {sortedEquipes.map((eq) => (
          <ResultTable key={eq.equipe} result={eq} title={eq.equipe} />
        ))}
      </div>
    </div>
  );
};
