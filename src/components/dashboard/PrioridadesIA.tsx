import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/dashboard/MultiSelect";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import { conceitoPorIndicador, type EquipeResult } from "@/hooks/useResultadoFinal";

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

const MESES_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesNumero = (m: string) => { const i = MESES_ABBR.indexOf(m); return i >= 0 ? i + 1 : Number(m); };

const CONCEITO: Record<string, string> = { regular: "Regular", suficiente: "Suficiente", bom: "Bom", otimo: "Ótimo", none: "Sem dado" };

export const PrioridadesIA = ({ resultados, indicador }: { resultados: EquipeResult[]; indicador?: string }) => {
  const equipes = useMemo(() => [...new Set(resultados.map(r => r.equipe))].sort(), [resultados]);
  const meses = useMemo(() => {
    const s = new Set<string>();
    resultados.forEach(r => r.indicadores.forEach(i => i.mesesDetalhe.forEach(m => s.add(m.mes))));
    const key = (m: string) => { const [mm, yy] = m.split("/"); return Number(yy) * 100 + mesNumero(mm); };
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
      nums.forEach(n => { set.add(`${String(n).padStart(2, "0")}/${ano}`); set.add(`${MESES_ABBR[n - 1]}/${ano}`); });
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
        indicadores: r.indicadores.filter(i => !indicador || i.indicador === indicador).map(i => {
          const mesesSel = i.mesesDetalhe.filter(m =>
            (selMeses.length === 0 || selMeses.includes(m.mes)) &&
            (mesesDosQuads === null || mesesDosQuads.has(m.mes))
          );
          const comDado = mesesSel.filter(m => m.denominador > 0);
          const pct = comDado.length ? comDado.reduce((s, m) => s + m.porcentagem, 0) / comDado.length : 0;
          return {
            indicador: i.indicador,
            peso: i.peso,
            conceitoPeriodo: comDado.length ? (CONCEITO[conceitoPorIndicador(i.indicador, pct)] ?? "Sem dado") : "Sem dado",
            percentualPeriodo: Number(pct.toFixed(1)),
            numeradorPeriodo: mesesSel.reduce((s, m) => s + m.numerador, 0),
            denominadorPeriodo: mesesSel.reduce((s, m) => s + m.denominador, 0),
            meses: mesesSel.map(m => ({ mes: m.mes, numerador: m.numerador, denominador: m.denominador, percentual: Number(m.porcentagem.toFixed(1)), fonte: m.fonte })),
          };
        }).filter(i => i.meses.some(m => m.denominador > 0)),
      }))
      .filter(r => r.indicadores.length > 0);
  }, [resultados, selEquipes, selMeses, mesesDosQuads, equipes, indicador]);

  const analisar = async () => {
    setErro(null); setRes(null);
    if (dados.length === 0) {
      setErro("Nenhuma equipe tem resultados nos meses escolhidos. Escolha outro período ou outra equipe.");
      return;
    }
    setLoading(true);
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
          <Sparkles className="h-4 w-4 text-primary" /> Prioridades e ações sugeridas (IA){indicador ? ` — ${indicador}` : ""}
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
