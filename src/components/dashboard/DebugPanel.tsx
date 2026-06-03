import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, CheckCircle2, X } from "lucide-react";

export interface DebugSource {
  name: string;
  dataUpdatedAt: number;
  errorUpdatedAt?: number;
  isFetching: boolean;
  error: unknown;
  rows?: number;
}

interface DebugPanelProps {
  sources: DebugSource[];
  onRefetchAll: () => void;
  onClose: () => void;
}

const formatTime = (ts: number) => {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("pt-BR", { hour12: false });
};

const elapsed = (ts: number) => {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  return `há ${h}h`;
};

export const DebugPanel = ({ sources, onRefetchAll, onClose }: DebugPanelProps) => {
  const errors = sources.filter((s) => !!s.error);
  const anyFetching = sources.some((s) => s.isFetching);

  return (
    <Card className="border-amber-300 bg-amber-50/40 mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Modo de Depuração
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRefetchAll}
            disabled={anyFetching}
            className="gap-1.5 h-7"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${anyFetching ? "animate-spin" : ""}`} />
            Forçar atualização
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{errors.length} fonte(s) com erro</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
                {errors.map((e) => (
                  <li key={e.name}>
                    <strong>{e.name}:</strong>{" "}
                    {(e.error as Error)?.message || String(e.error)}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-1.5 px-2">Fonte</th>
                <th className="text-left py-1.5 px-2">Status</th>
                <th className="text-left py-1.5 px-2">Último fetch</th>
                <th className="text-left py-1.5 px-2">Há</th>
                <th className="text-right py-1.5 px-2">Registros</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.name} className="border-b last:border-0">
                  <td className="py-1.5 px-2 font-medium">{s.name}</td>
                  <td className="py-1.5 px-2">
                    {s.error ? (
                      <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                    ) : s.isFetching ? (
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> OK
                      </Badge>
                    )}
                  </td>
                  <td className="py-1.5 px-2 font-mono">{formatTime(s.dataUpdatedAt)}</td>
                  <td className="py-1.5 px-2 text-muted-foreground">{elapsed(s.dataUpdatedAt)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">
                    {s.rows ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Dica: se o Resultado Final não refletir mudanças recentes na planilha, clique em
          "Forçar atualização". O cache HTTP é ignorado a cada requisição.
        </p>
      </CardContent>
    </Card>
  );
};
