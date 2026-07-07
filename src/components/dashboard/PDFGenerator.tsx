import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PDFSummaryCard {
  label: string;
  value: string;
  percentage?: string;
}

interface PDFColumn {
  key: string;
  header: string;
}

interface PDFGeneratorProps {
  title: string;
  subtitle?: string;
  filterInfo?: string;
  summaryCards: PDFSummaryCard[];
  columns: PDFColumn[];
  data: Record<string, any>[];
  fileName?: string;
}

export const PDFGenerator = ({
  title,
  filterInfo,
  summaryCards,
  columns,
  data,
  fileName = "relatorio",
}: PDFGeneratorProps) => {
  const handleGeneratePDF = async () => {
    toast.info("Gerando PDF...");

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new (jsPDF as any)({ orientation: "landscape", unit: "mm", format: "a4" });

      const pageW = doc.internal.pageSize.getWidth();
      let y = 15;

      // Título
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Indicadores de Saúde Bucal de Varjota", 14, y);
      y += 8;

      doc.setFontSize(13);
      doc.text(title, 14, y);
      y += 6;

      if (filterInfo) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Filtros aplicados: ${filterInfo}`, 14, y);
        y += 6;
      }

      // Cards de resumo
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo dos Indicadores", 14, y);
      y += 5;

      const cardW = 50;
      const cardH = 16;
      summaryCards.forEach((card, i) => {
        const x = 14 + i * (cardW + 4);
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(card.label, x + cardW / 2, y + 5, { align: "center" });
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(card.value, x + cardW / 2, y + 11, { align: "center" });
        if (card.percentage) {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(card.percentage, x + cardW / 2, y + 15, { align: "center" });
        }
      });
      y += cardH + 8;

      // Tabela com cabeçalho repetido em cada página
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30);
      doc.text(`Dados (${data.length} registros)`, 14, y);
      y += 4;

      const tableColumns = columns.map((col, idx) => ({
        header: col.header,
        dataKey: col.key,
      }));

      const tableRows = data.map(row =>
        columns.reduce((acc, col) => {
          acc[col.key] = row[col.key] ?? "-";
          return acc;
        }, {} as Record<string, any>)
      );

      autoTable(doc, {
        startY: y,
        columns: tableColumns,
        body: tableRows,
        theme: "grid",
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [30, 30, 30],
          fontStyle: "bold",
          fontSize: 8,
          halign: "center",
        },
        bodyStyles: {
          fontSize: 8,
          halign: "center",
        },
        columnStyles: {
          // Coluna Nome (índice 3) alinhada à esquerda
          3: { halign: "left" },
        },
        // Repete o cabeçalho em cada página automaticamente
        showHead: "everyPage",
        margin: { left: 14, right: 14 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        styles: { overflow: "linebreak", cellPadding: 2 },
      });

      doc.save(`${fileName}-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleGeneratePDF} className="h-9 gap-2">
      <FileDown className="h-4 w-4" />
      Gerar PDF
    </Button>
  );
};
