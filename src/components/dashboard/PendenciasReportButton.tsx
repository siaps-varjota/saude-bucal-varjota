import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePatientData } from "@/hooks/usePatientData";
import { useTratamentoData } from "@/hooks/useTratamentoData";
import { isConsultaPendente } from "@/hooks/useFilteredPatients";

interface Props {
  equipe: string; // "all" or specific equipe name
}

const normalizeEquipe = (e: string) => e.replace(/ESF/gi, "ESB").trim();

export const PendenciasReportButton = ({ equipe }: Props) => {
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

      const drawTable = (title: string, rows: any[], headers: string[], keys: string[]) => {
        if (y > 180) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`${title} (${rows.length})`, 14, y);
        y += 4;
        (doc as any).autoTable({
          startY: y,
          head: [headers],
          body: rows.length
            ? rows.map((r, i) => [String(i + 1), ...keys.map((k) => r[k] ?? "-")])
            : [["", "Sem registros pendentes", ...keys.slice(1).map(() => "")]],
          theme: "grid",
          headStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold", fontSize: 8, halign: "center" },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 0: { halign: "center", cellWidth: 10 }, 3: { halign: "left" } },
          showHead: "everyPage",
          margin: { left: 14, right: 14 },
          alternateRowStyles: { fillColor: [250, 250, 250] },
          styles: { overflow: "linebreak", cellPadding: 2 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      };

      drawTable(
        "B1 — Pacientes sem 1ª Consulta Odontológica",
        b1Pendentes.map((p) => ({
          microarea: p.microarea,
          equipe: normalizeEquipe(p.equipe),
          nome: p.nome,
          idade: String(p.idade),
          sexo: p.sexo,
          cpfCns: p.cpfCns,
          primeiraConsulta: p.primeiraConsulta || "-",
        })),
        ["#", "Microárea", "Equipe", "Nome", "Idade", "Sexo", "CPF/CNS", "Última 1ª Consulta"],
        ["microarea", "equipe", "nome", "idade", "sexo", "cpfCns", "primeiraConsulta"],
      );

      drawTable(
        "B2 — Pacientes com Tratamento Pendente",
        b2Pendentes.map((p) => ({
          microarea: p.microarea,
          equipe: normalizeEquipe(p.equipe),
          nome: p.nome,
          idade: String(p.idade),
          sexo: p.sexo,
          cpfCns: p.cpfCns,
          primeiraConsulta: p.primeiraConsulta || "-",
          status: p.comTratamentoConcluido || "Pendente",
        })),
        ["#", "Microárea", "Equipe", "Nome", "Idade", "Sexo", "CPF/CNS", "1ª Consulta", "Status"],
        ["microarea", "equipe", "nome", "idade", "sexo", "cpfCns", "primeiraConsulta", "status"],
      );

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
