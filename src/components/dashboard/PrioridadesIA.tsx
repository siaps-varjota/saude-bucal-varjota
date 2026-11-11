import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/dashboard/MultiSelect";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import type { EquipeResult } from "@/hooks/useResultadoFinal";

interface Prioridade {
  equipe: string;
  indicador: string;
  nivel: "alta" | "media" | "baixa";
  motivo: string;
  acoes: string[];
}

const NIVEL: Record<Prioridade["nivel"], { label: string; cls: string }> = {
  alta: { label: "Alta", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  media: { label: "Média", cls: "bg-accent text-accent-foreground border-border" },
  baixa: { label: "Baixa", cls: "bg-muted text-muted-foreground border-border" },
};

const CONCEITO: Record<string, string> = { regular: "Regular", suficiente: "Suficiente", bom: "Bom", otimo: "Ótimo", none: "Sem dado" };

export const PrioridadesIA = ({ resultados }: { resultados: EquipeResult[] }) => {
  const equipes = useMemo(() => [...new Set(resultados.map(r => r.equipe))].sort(), [resultados]);
  const meses = useMemo(() => {
    const s = new Set<string>();
    resultados.forEach(r => r.indicadores.forEach(i => i.mesesDetalhe.forEach(m => s.add(m.mes))));
    const key = (m: string) => { const [mm, yy] = m.split("/"); return Number(yy) * 100 + Number(mm); };
    return [...s].sort((a, b) => key(a) - key(b));
  }, [resultados]);

  const [selEquipes, setSelEquipes] = useState<string[]>([]);
  const [selMeses, setSelMeses] = useState<string[]>([]);
  const [selQuads, setSelQuads] = useState<string[]>([]);

  const mesesDosQuads = useMemo(() => {
    if (selQuads.length === 0) return null;
    const set = new Set<string>();
    selQuads.forEach(q => {
      const [qn, ano] = q.split("-");
      const nums = qn === "Q1" ? [1, 2, 3, 4] : qn === "Q2" ? [5, 6, 7, 8] : [9, 10, 11, 12];
      nums.forEach(n => set.add(`${String(n).padStart(2, "0")}/${ano}`));
    });
    return set;
  }, [selQuads]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [res, setRes] = useState<{ resumo: string; prioridades: Prioridade[] } | null>(null);

  const dados = useMemo(() => {
    const eqs = selEquipes.length ? selEquipes : equipes;
    const vistos = new Set<string>();
    return resultados
      .filter(r => eqs.includes(r.equipe) && !vistos.has(r.equipe) && vistos.add(r.equipe))
      .map(r => ({
        equipe: r.equipe,
        notaFinal: Number(r.notaFinal.toFixed(2)),
        indicadores: r.indicadores.map(i => ({
          indicador: i.indicador,
          peso: i.peso,
          conceitoPeriodo: CONCEITO[i.conceito] ?? i.conceito,
          percentualPeriodo: Number(i.porcentagem.toFixed(1)),
          meses: i.mesesDetalhe
            .filter(m =>
              (selMeses.length === 0 || selMeses.includes(m.mes)) &&
              (mesesDosQuads === null || mesesDosQuads.has(m.mes))
            )
            .map(m => ({ mes: m.mes, numerador: m.numerador, denominador: m.denominador, percentual: Number(m.porcentagem.toFixed(1)), fonte: m.fonte })),
        })),
      }));
  }, [resultados, selEquipes, selMeses, mesesDosQuads, equipes]);

  const analisar = async () => {
    setLoading(true); setErro(null); setRes(null);
    const { data, error } = await supabase.functions.invoke("sugerir-acoes", { body: { dados } });
    setLoading(false);
    if (error || data?.error) {
      let msg = data?.error as string | undefined;
      if (!msg && error && "context" in error) {
        try { msg = (await (error as { context: Response }).context.json())?.error; } catch { /* ignore */ }
      }
      setErro(msg ?? "Não foi possível gerar a análise agora.");
      return;
    }
    setRes(data);
  };

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Prioridades e ações sugeridas (IA)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Escolha as equipes, o quadrimestre e os meses; a IA aponta onde acompanhar primeiro e o que fazer para chegar mais perto das metas.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end">
          <MultiSelect options={equipes.map(e => ({ value: e, label: e }))} value={selEquipes} onChange={setSelEquipes} placeholderAll="Todas as equipes" width="w-full" />
          <MultiSelect options={QUADRIMESTRE_OPTIONS_SEM_TODOS.map(q => ({ value: q.value, label: q.label }))} value={selQuads} onChange={setSelQuads} placeholderAll="Todos os quadrimestres" width="w-full" />
          <MultiSelect options={meses.map(m => ({ value: m, label: m }))} value={selMeses} onChange={setSelMeses} placeholderAll="Todos os meses" width="w-full" />
          <Button onClick={analisar} disabled={loading || dados.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analisando..." : "Gerar análise"}
          </Button>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        {res && (
          <div className="space-y-3">
            <p className="text-sm bg-muted/50 rounded-md p-3">{res.resumo}</p>
            {res.prioridades.map((p, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground">{i + 1}.</span>
                  <span className="font-semibold text-sm">{p.indicador}</span>
                  <span className="text-xs text-muted-foreground">— {p.equipe}</span>
                  <Badge variant="outline" className={NIVEL[p.nivel]?.cls}>Prioridade {NIVEL[p.nivel]?.label ?? p.nivel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{p.motivo}</p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  {p.acoes.map((a, j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">Sugestões geradas por IA — revise com a equipe antes de aplicar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
