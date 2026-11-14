import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/dashboard/MultiSelect";
import { Sparkles, Loader2, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import { gerarPrioridadesFallback } from "@/lib/prioridadesFallback";
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
  const [usouFallback, setUsouFallback] = useState(false);

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
    setErro(null); setRes(null); setUsouFallback(false);
    if (dados.length === 0) {
      setErro("Nenhuma equipe tem resultados nos meses escolhidos. Escolha outro período ou outra equipe.");
      return;
    }
    setLoading(true);
    // Função serverless da Vercel (api/sugerir-acoes.ts), independente do Lovable/Supabase.
    let data: any = null;
    let error: unknown = null;
    try {
      const resp = await fetch("/api/sugerir-acoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados }),
      });
      data = await resp.json().catch(() => null);
      if (!resp.ok && !data?.error) error = new Error(`HTTP ${resp.status}`);
    } catch (e) {
      error = e;
    }
    setLoading(false);
    if (error || data?.error) {
      const msg = data?.error as string | undefined;
      // IA indisponível (sem créditos, limite, falha do serviço): usa regras fixas.
      const iaIndisponivel = !msg || /créditos|muitas solicitações|não foi possível|falha ao processar/i.test(msg);
      if (iaIndisponivel) {
        setRes(gerarPrioridadesFallback(dados));
        setUsouFallback(true);
        return;
      }
      setErro(msg);
      return;
    }
    setRes(data);
  };

  const gerarPdf = () => {
    if (!res) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, M = 14, maxW = W - 2 * M;
    let y = 16;
    const linhas = (t: string, size: number, bold = false, gap = 1.5) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      for (const l of doc.splitTextToSize(t, maxW) as string[]) {
        if (y > 282) { doc.addPage(); y = 16; }
        doc.text(l, M, y); y += size * 0.42 + gap;
      }
    };
    linhas(`Prioridades e ações sugeridas (IA)${indicador ? " — " + indicador : ""}`, 15, true);
    linhas(`Equipes: ${selEquipes.length ? selEquipes.join(", ") : "Todas"}  |  Quadrimestres: ${selQuads.length ? selQuads.join(", ") : "Todos"}  |  Meses: ${selMeses.length ? selMeses.join(", ") : "Todos"}`, 9);
    linhas(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 9); y += 3;
    linhas("Resumo", 12, true); linhas(res.resumo, 10); y += 3;
    res.prioridades.forEach((p, i) => {
      linhas(`${i + 1}. ${p.indicador} — ${p.equipe} (Prioridade ${NIVEL[p.nivel]?.label ?? p.nivel})`, 11, true);
      linhas(p.motivo, 10);
      p.acoes.forEach(a => linhas(`• ${a}`, 10));
      y += 3;
    });
    linhas(usouFallback ? "Sugestões por regras fixas (IA indisponível). Revise com a equipe antes de aplicar." : "Sugestões geradas por IA — revise com a equipe antes de aplicar.", 8);
    doc.save(`analise-ia${indicador ? "-" + indicador.replace(/\s+/g, "-") : ""}.pdf`);
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
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto_auto] items-end">
          <MultiSelect options={equipes.map(e => ({ value: e, label: e }))} value={selEquipes} onChange={setSelEquipes} placeholderAll="Todas as equipes" width="w-full" />
          <MultiSelect options={QUADRIMESTRE_OPTIONS_SEM_TODOS.map(q => ({ value: q.value, label: q.label }))} value={selQuads} onChange={setSelQuads} placeholderAll="Todos os quadrimestres" width="w-full" />
          <MultiSelect options={meses.map(m => ({ value: m, label: m }))} value={selMeses} onChange={setSelMeses} placeholderAll="Todos os meses" width="w-full" />
          <Button onClick={analisar} disabled={loading || dados.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analisando..." : "Gerar análise"}
          </Button>
          <Button variant="outline" onClick={gerarPdf} disabled={!res}>
            <FileDown className="h-4 w-4" /> Gerar PDF
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
            <p className="text-[11px] text-muted-foreground">
              {usouFallback
                ? "A IA está indisponível no momento: estas sugestões seguem regras fixas e são mais genéricas. Revise com a equipe antes de aplicar."
                : "Sugestões geradas por IA — revise com a equipe antes de aplicar."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
