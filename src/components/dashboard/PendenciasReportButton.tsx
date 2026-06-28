import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePatientData } from "@/hooks/usePatientData";
import { useTratamentoData } from "@/hooks/useTratamentoData";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";
import type { EquipeResult, IndicadorResult } from "@/hooks/useResultadoFinal";

interface Props {
  equipe: string; // "all" or specific equipe name
  equipeResult?: EquipeResult; // resultado calculado da equipe selecionada
}

const normalizeEquipe = (e: string) => e.replace(/ESF/gi, "ESB").trim();

// Espelho dos thresholds usados no ResultadoFinalTab (Bom/Ótimo) para simulação
const SIM_CONFIG: Record<
  string,
  {
    label: string;
    unit: string;
    deltaNum: number;
    deltaDenom: number;
    thresholdBom: number;
    labelBom: string;
    thresholdOtimo: number;
    labelOtimo: string;
  }
> = {
  "1ª Consulta Odontológica": {
    label: "B1", unit: "atend.", deltaNum: 1, deltaDenom: 0,
    thresholdBom: 0.0075, labelBom: "> 0,75%",
    thresholdOtimo: 0.0125, labelOtimo: "> 1,25%",
  },
  "Tratamento Concluído": {
    label: "B2", unit: "trat.", deltaNum: 1, deltaDenom: 0,
    thresholdBom: 0.501, labelBom: "> 50%",
    thresholdOtimo: 0.751, labelOtimo: "> 75%",
  },
  "Proced. Odont. Preventivos": {
    label: "B5", unit: "consultas", deltaNum: 2, deltaDenom: 2,
    thresholdBom: 0.5499, labelBom: "≥ 55%",
    thresholdOtimo: 0.6499, labelOtimo: "≥ 65%",
  },
  "Escovação Supervisionada": {
    label: "B4", unit: "consultas", deltaNum: 1, deltaDenom: 0,
    thresholdBom: 0.005, labelBom: "> 0,5%",
    thresholdOtimo: 0.01, labelOtimo: "> 1%",
  },
};

const conceitoLabel = (c: string) =>
  c === "otimo" ? "Ótimo" : c === "bom" ? "Bom" : c === "suficiente" ? "Suficiente" : c === "regular" ? "Regular" : "—";

function calcFaltam(num: number, den: number, threshold: number, deltaNum: number, deltaDenom: number): number {
  if (den > 0 && num / den >= threshold) return 0;
  if (deltaDenom > 0) {
    const d = deltaNum - deltaDenom * threshold;
    if (d <= 0) return 0;
    return Math.max(0, Math.ceil((threshold * den - num) / d));
  }
  return Math.max(0, Math.ceil(den * threshold) - num);
}

function buildSimRow(ind: IndicadorResult) {
  const notaAtualPonderada = ind.nota * ind.peso;
  const cfg = SIM_CONFIG[ind.indicador];
  if (!cfg) {
    // B3 / B6 — sem simulação por incremento
    return {
      indicador: ind.indicador,
      atual: `${ind.numerador}/${ind.denominador} (${ind.porcentagem.toFixed(1)}%)`,
      conceitoAtual: conceitoLabel(ind.conceito),
      proximo: "—",
      faltam: "—",
      notaProj: notaAtualPonderada.toFixed(2).replace(".", ","),
      impacto: "—",
      obs: "Indicador sem simulação por incremento.",
    };
  }
  const pct = ind.denominador > 0 ? (ind.numerador / ind.denominador) * 100 : 0;
  const isOtimo = pct > cfg.thresholdOtimo * 100;
  const isBom = pct > cfg.thresholdBom * 100;
  const proximoLabel = isOtimo ? null : isBom ? `Ótimo (${cfg.labelOtimo})` : `Bom (${cfg.labelBom})`;
  const proximoThresh = isOtimo ? null : isBom ? cfg.thresholdOtimo : cfg.thresholdBom;
  const faltam = proximoThresh != null ? calcFaltam(ind.numerador, ind.denominador, proximoThresh, cfg.deltaNum, cfg.deltaDenom) : 0;
  const notaProjBase = isOtimo ? 1.0 : isBom ? 1.0 : 0.75;
  const notaProjPonderada = notaProjBase * ind.peso;
  const impactoPontos = notaProjPonderada - notaAtualPonderada;
  return {
    indicador: `${cfg.label} — ${ind.indicador}`,
    atual: `${ind.numerador}/${ind.denominador} (${pct.toFixed(1)}%)`,
    conceitoAtual: conceitoLabel(ind.conceito),
    proximo: proximoLabel ?? "—",
    faltam: isOtimo ? "✓ atingido" : `${faltam.toLocaleString("pt-BR")} ${cfg.unit}`,
    notaProj: notaProjPonderada.toFixed(2).replace(".", ","),
    impacto: isOtimo || impactoPontos <= 0 ? "—" : `+${impactoPontos.toFixed(2).replace(".", ",")} pts`,
    obs: isOtimo ? "Já no Ótimo." : `Atinge ${proximoLabel?.split(" ")[0]} com +${faltam} ${cfg.unit}.`,
  };
}

export const PendenciasReportButton = ({ equipe, equipeResult }: Props) => {
  const { data: patients = [] } = usePatientData();
  const { data: tratamentos = [] } = useTratamentoData();
  const disabled = !equipe || equipe === "all";


  const handleGenerate = async () => {
    if (disabled) return;
    toast.info("Gerando relatório de pendências...");

    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new (jsPDF as any)({ orientation: "landscape", unit: "mm", format: "a4" });

      const equipeNorm = normalizeEquipe(equipe);

      const b1Pendentes = patients
        .filter((p) => normalizeEquipe(p.equipe) === equipeNorm)
        .filter((p) => isConsultaPendente(p.primeiraConsulta))
        .sort((a, b) => {
          const am = parseInt(a.microarea) || 0;
          const bm = parseInt(b.microarea) || 0;
          if (am !== bm) return am - bm;
          return a.nome.localeCompare(b.nome);
        });

      const b2Pendentes = tratamentos
        .filter((p) => normalizeEquipe(p.equipe) === equipeNorm)
        .filter((p) => p.comTratamentoConcluido !== "Concluído")
        .sort((a, b) => {
          const am = parseInt(a.microarea) || 0;
          const bm = parseInt(b.microarea) || 0;
          if (am !== bm) return am - bm;
          return a.nome.localeCompare(b.nome);
        });

      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Pendências por Equipe", 14, y);
      y += 7;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Equipe: ${equipe}`, 14, y);
      y += 5;
      doc.setFontSize(9);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, y);
      y += 8;

      // Resumo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo", 14, y);
      y += 5;
      const cards = [
        { label: "Sem 1ª Consulta (B1)", value: String(b1Pendentes.length) },
        { label: "Tratamento Pendente (B2)", value: String(b2Pendentes.length) },
      ];
      const cardW = 80, cardH = 16;
      cards.forEach((c, i) => {
        const x = 14 + i * (cardW + 6);
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(c.label, x + cardW / 2, y + 6, { align: "center" });
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(c.value, x + cardW / 2, y + 13, { align: "center" });
      });
      y += cardH + 8;

      // ── Resumo de Simulação por Indicador ─────────────────────────────────
      if (equipeResult && equipeResult.indicadores?.length) {
        if (y > 160) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text("Resumo de Simulação — Próximo Conceito por Indicador", 14, y);
        y += 2;

        const ordem = ["1ª Consulta Odontológica", "Tratamento Concluído", "Taxa de Exodontias", "Proced. Odont. Preventivos", "Escovação Supervisionada", "Trat. Restaurador Atraumático"];
        const indSorted = [...equipeResult.indicadores].sort(
          (a, b) => ordem.indexOf(a.indicador) - ordem.indexOf(b.indicador),
        );

        const simRows = indSorted.map(buildSimRow);
        const notaAtual = equipeResult.notaFinal;
        const notaProjTotal = indSorted.reduce((acc, ind) => {
          const cfg = SIM_CONFIG[ind.indicador];
          if (!cfg) return acc + ind.nota * ind.peso;
          const pct = ind.denominador > 0 ? (ind.numerador / ind.denominador) * 100 : 0;
          const isOtimo = pct > cfg.thresholdOtimo * 100;
          const isBom = pct > cfg.thresholdBom * 100;
          const notaBase = isOtimo ? 1.0 : isBom ? 1.0 : 0.75;
          return acc + notaBase * ind.peso;
        }, 0);

        (doc as any).autoTable({
          startY: y + 3,
          head: [["Indicador", "Atual", "Conceito Atual", "Próximo Conceito", "Faltam", "Nota Projetada", "Impacto na Nota"]],
          body: simRows.map((r) => [r.indicador, r.atual, r.conceitoAtual, r.proximo, r.faltam, r.notaProj, r.impacto]),
          theme: "grid",
          headStyles: { fillColor: [255, 237, 213], textColor: [120, 53, 15], fontStyle: "bold", fontSize: 8, halign: "center" },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 65 },
            1: { halign: "center", cellWidth: 32 },
            2: { halign: "center", cellWidth: 25 },
            3: { halign: "center", cellWidth: 40 },
            4: { halign: "center", cellWidth: 40 },
            5: { halign: "center", cellWidth: 22, fontStyle: "bold" },
            6: { halign: "center", cellWidth: 26, fontStyle: "bold", textColor: [21, 128, 61] },
          },
          margin: { left: 14, right: 14 },
          alternateRowStyles: { fillColor: [253, 250, 245] },
          styles: { overflow: "linebreak", cellPadding: 2 },
        });
        y = (doc as any).lastAutoTable.finalY + 4;

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 53, 15);
        doc.text(
          `Nota Final Atual: ${notaAtual.toFixed(2).replace(".", ",")}   |   Nota Final Projetada (todos sobem de conceito): ${notaProjTotal.toFixed(2).replace(".", ",")}`,
          14,
          y,
        );
        doc.setTextColor(110);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        y += 4;
        const rodapeTexto = doc.splitTextToSize(
          "Simulação considera o incremento típico de cada indicador (B1/B2: +1 atend., B5: +2 num/+2 den). B3 e B6 não usam simulação por incremento. A coluna \"Impacto na Nota\" mostra quantos pontos aquele indicador especificamente ganha na Nota Final se atingir o próximo conceito (Bom/Ótimo).",
          pageW - 28,
        );
        doc.text(rodapeTexto, 14, y);
        y += rodapeTexto.length * 3 + 3;
      }



      // Nota: as listas nominais de pacientes pendentes (B1/B2) não são mais
      // impressas neste relatório consolidado por equipe — apenas as contagens
      // (cards de Resumo, acima) e a simulação de impacto na nota.
      if (y > 180) { doc.addPage(); y = 15; }
      doc.setDrawColor(220);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(14, y, pageW - 28, 16, 2, 2, "FD");
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(90);
      const notaRodape = doc.splitTextToSize(
        "As listas nominais de pacientes pendentes em B1 (sem 1ª consulta) e B2 (tratamento não concluído) não constam neste relatório consolidado. Consulte a tela de pacientes/tratamentos filtrada pela equipe selecionada para visualizar os nomes individuais.",
        pageW - 36,
      );
      doc.text(notaRodape, 14 + 4, y + 6);
      y += 20;

      const slug = equipe.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      doc.save(`pendencias-${slug}-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório de pendências gerado!");
    } catch (err) {
      console.error("Erro ao gerar relatório de pendências:", err);
      toast.error("Erro ao gerar relatório de pendências");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={disabled}
      className="h-9 gap-2"
      title={disabled ? "Selecione uma equipe para gerar o relatório de pendências" : undefined}
    >
      <FileDown className="h-4 w-4" />
      Pendências por Equipe
    </Button>
  );
};
