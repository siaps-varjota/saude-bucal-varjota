import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/dashboard/MultiSelect";
import { Sparkles, Loader2, FileDown } from "lucide-react";
import { QUADRIMESTRE_OPTIONS_SEM_TODOS } from "@/hooks/useQuadrimesterFilter";
import { gerarPrioridadesFallback } from "@/lib/prioridadesFallback";
import { conceitoPorIndicador, type EquipeResult } from "@/hooks/useResultadoFinal";
import { listarMeses, mesesDosQuadrimestres } from "@/lib/mesesFiltro";

export interface FiltrosPrioridades {
  equipes: string[];
  quads: string[];
  meses: string[];
  indicadores: string[];
}

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

const SEM_FILTRO: string[] = [];

interface PrioridadesIAProps {
  resultados: EquipeResult[];
  indicador?: string;
  /** Quando informado, os filtros vêm do componente pai e os seletores próprios são ocultados. */
  filtros?: FiltrosPrioridades;
}

export const PrioridadesIA = ({ resultados, indicador, filtros }: PrioridadesIAProps) => {
  const equipes = useMemo(() => [...new Set(resultados.map(r => r.equipe))].sort(), [resultados]);
  const meses = useMemo(() => listarMeses(resultados), [resultados]);

  const [ownEquipes, setOwnEquipes] = useState<string[]>([]);
  const [ownMeses, setOwnMeses] = useState<string[]>([]);
  const [ownQuads, setOwnQuads] = useState<string[]>([]);

  const controlado = !!filtros;
  const selEquipes = filtros?.equipes ?? ownEquipes;
  const selMeses = filtros?.meses ?? ownMeses;
  const selQuads = filtros?.quads ?? ownQuads;
  const selIndicadores = filtros?.indicadores ?? SEM_FILTRO;

  const mesesDosQuads = useMemo(() => mesesDosQuadrimestres(selQuads), [selQuads]);
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
        indicadores: r.indicadores.filter(i => (!indicador || i.indicador === indicador) && (selIndicadores.length === 0 || selIndicadores.includes(i.indicador))).map(i => {
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
  }, [resultados, selEquipes, selMeses, mesesDosQuads, equipes, indicador, selIndicadores]);

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

  const gerarPdf = async () => {
    if (!res) return;
    let jsPDF: typeof import("jspdf").default;
    try {
      ({ default: jsPDF } = await import("jspdf"));
    } catch (e) {
      console.error("Falha ao carregar jsPDF", e);
      setErro("Não foi possível carregar o gerador de PDF. Recarregue a página e tente novamente.");
      return;
    }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 14, maxW = W - 2 * M;
    const COR = {
      primaria: [2, 132, 199] as const, escura: [15, 23, 42] as const, texto: [51, 65, 85] as const,
      suave: [100, 116, 139] as const, fundo: [241, 245, 249] as const, borda: [226, 232, 240] as const,
      branco: [255, 255, 255] as const,
    };
    const NIVEL_PDF: Record<Prioridade["nivel"], { cor: readonly [number, number, number]; bg: readonly [number, number, number] }> = {
      alta: { cor: [220, 38, 38], bg: [254, 242, 242] },
      media: { cor: [217, 119, 6], bg: [255, 251, 235] },
      baixa: { cor: [100, 116, 139], bg: [248, 250, 252] },
    };
    const fill = (c: readonly [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
    const draw = (c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
    const ink = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
    const quebra = (t: string, w: number, size: number, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
      return doc.splitTextToSize(t, w) as string[];
    };
    const LH = (size: number) => size * 0.4 + 1.2;
    const rotuloIndicador = indicador ?? (selIndicadores.length ? selIndicadores.join(", ") : "");

    // Cabeçalho em faixa colorida
    fill(COR.primaria); doc.rect(0, 0, W, 34, "F");
    ink(COR.branco); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("Prioridades e ações sugeridas", M, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(rotuloIndicador ? `${usouFallback ? "Regras fixas" : "Análise por IA"} · ${rotuloIndicador}` : (usouFallback ? "Análise por regras fixas" : "Análise por IA"), M, 22);
    doc.setFontSize(8.5);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, M, 28.5);
    let y = 42;

    // Filtros aplicados (chips)
    const filtrosTxt: [string, string][] = [
      ["Equipes", selEquipes.length ? selEquipes.join(", ") : "Todas"],
      ["Quadrimestres", selQuads.length ? selQuads.join(", ") : "Todos"],
      ["Meses", selMeses.length ? selMeses.join(", ") : "Todos"],
    ];
    if (controlado) filtrosTxt.push(["Indicadores", selIndicadores.length ? selIndicadores.join(", ") : "Todos"]);
    ink(COR.suave); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("FILTROS APLICADOS", M, y); y += 4;
    filtrosTxt.forEach(([k, v]) => {
      const linhasV = quebra(v, maxW - 34, 9);
      ink(COR.suave); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(k, M, y);
      ink(COR.texto); doc.setFont("helvetica", "normal"); doc.text(linhasV, M + 32, y);
      y += linhasV.length * LH(9);
    });
    y += 3;

    const novaPaginaSe = (h: number) => { if (y + h > H - 18) { doc.addPage(); y = 16; } };

    // Resumo em caixa destacada
    const resumoL = quebra(res.resumo, maxW - 12, 10);
    const hResumo = 14 + resumoL.length * LH(10);
    novaPaginaSe(hResumo);
    fill(COR.fundo); draw(COR.borda); doc.roundedRect(M, y, maxW, hResumo, 2, 2, "FD");
    fill(COR.primaria); doc.rect(M, y, 1.8, hResumo, "F");
    ink(COR.primaria); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("RESUMO", M + 6, y + 6.5);
    ink(COR.escura); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    doc.text(resumoL, M + 6, y + 12.5);
    y += hResumo + 8;

    // Contagem por nível
    const cont = { alta: 0, media: 0, baixa: 0 };
    res.prioridades.forEach(p => { if (p.nivel in cont) cont[p.nivel]++; });
    ink(COR.escura); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`Prioridades (${res.prioridades.length})`, M, y);
    let bx = W - M;
    (["baixa", "media", "alta"] as const).forEach(n => {
      const t = `${NIVEL[n].label}: ${cont[n]}`;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      const tw = doc.getTextWidth(t) + 6;
      bx -= tw;
      fill(NIVEL_PDF[n].bg); draw(NIVEL_PDF[n].cor); doc.roundedRect(bx, y - 4.2, tw, 6, 3, 3, "FD");
      ink(NIVEL_PDF[n].cor); doc.text(t, bx + 3, y - 0.1);
      bx -= 2;
    });
    y += 6;

    // Cartões de prioridade
    res.prioridades.forEach((p, i) => {
      const nv = NIVEL_PDF[p.nivel] ?? NIVEL_PDF.baixa;
      const label = `Prioridade ${NIVEL[p.nivel]?.label ?? p.nivel}`;
      const tituloL = quebra(`${p.indicador}`, maxW - 62, 11, true);
      const motivoL = quebra(p.motivo, maxW - 12, 9.5);
      const acoesL = p.acoes.map(a => quebra(a, maxW - 19, 9.5));
      const hAcoes = acoesL.reduce((s, l) => s + l.length * LH(9.5) + 0.8, 0);
      const h = 7 + tituloL.length * LH(11) + 7 + motivoL.length * LH(9.5) + 3 + 4.5 + hAcoes + 4;
      novaPaginaSe(h + 4);

      fill(COR.branco); draw(COR.borda); doc.roundedRect(M, y, maxW, h, 2, 2, "FD");
      fill(nv.cor); doc.rect(M, y, 1.8, h, "F");

      // número + título
      fill(nv.cor); doc.circle(M + 9, y + 7.2, 3.6, "F");
      ink(COR.branco); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(String(i + 1), M + 9, y + 8.4, { align: "center" });
      ink(COR.escura); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(tituloL, M + 15, y + 8);
      // selo de nível
      doc.setFontSize(8); const lw = doc.getTextWidth(label) + 7;
      const lx = W - M - lw - 4;
      fill(nv.bg); draw(nv.cor); doc.roundedRect(lx, y + 3.8, lw, 6, 3, 3, "FD");
      ink(nv.cor); doc.text(label, lx + lw / 2, y + 7.9, { align: "center" });

      let cy = y + 7 + tituloL.length * LH(11);
      ink(COR.suave); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(p.equipe, M + 15, cy);
      cy += 5.5;
      ink(COR.texto); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      doc.text(motivoL, M + 6, cy);
      cy += motivoL.length * LH(9.5) + 3;

      ink(COR.primaria); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text("O QUE FAZER", M + 6, cy); cy += 4.5;
      acoesL.forEach(linhas => {
        fill(COR.primaria); doc.circle(M + 7.5, cy - 1.1, 0.8, "F");
        ink(COR.escura); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
        doc.text(linhas, M + 11, cy);
        cy += linhas.length * LH(9.5) + 0.8;
      });
      y += h + 4;
    });

    // Rodapé em todas as páginas
    const total = doc.getNumberOfPages();
    for (let n = 1; n <= total; n++) {
      doc.setPage(n);
      draw(COR.borda); doc.line(M, H - 13, W - M, H - 13);
      ink(COR.suave); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(usouFallback
        ? "Sugestões por regras fixas (IA indisponível). Revise com a equipe antes de aplicar."
        : "Sugestões geradas por IA. Revise com a equipe antes de aplicar.", M, H - 8);
      doc.text(`Página ${n} de ${total}`, W - M, H - 8, { align: "right" });
    }
    doc.save(`analise-ia${indicador ? "-" + indicador.replace(/\s+/g, "-") : ""}.pdf`);
  };

  const botoes = (
    <div className="flex items-center gap-3">
      <Button onClick={analisar} disabled={loading || dados.length === 0}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analisando..." : "Gerar análise"}
      </Button>
      <Button variant="outline" onClick={gerarPdf} disabled={!res}>
        <FileDown className="h-4 w-4" /> Gerar PDF
      </Button>
    </div>
  );

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Prioridades e ações sugeridas (IA){indicador ? ` — ${indicador}` : ""}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {controlado
                ? "Usa os filtros acima; a IA aponta onde acompanhar primeiro e o que fazer para chegar mais perto das metas."
                : "Escolha as equipes, o quadrimestre e os meses; a IA aponta onde acompanhar primeiro e o que fazer para chegar mais perto das metas."}
            </p>
          </div>
          {controlado && botoes}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!controlado && (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem_auto_auto] items-end">
            <MultiSelect options={equipes.map(e => ({ value: e, label: e }))} value={ownEquipes} onChange={setOwnEquipes} placeholderAll="Todas as equipes" width="w-full" />
            <MultiSelect options={QUADRIMESTRE_OPTIONS_SEM_TODOS.map(q => ({ value: q.value, label: q.label }))} value={ownQuads} onChange={setOwnQuads} placeholderAll="Todos os quadrimestres" width="w-full" />
            <MultiSelect options={meses.map(m => ({ value: m, label: m }))} value={ownMeses} onChange={setOwnMeses} placeholderAll="Todos os meses" width="w-full" />
            {botoes}
          </div>
        )}

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
