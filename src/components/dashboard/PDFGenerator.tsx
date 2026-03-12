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

const ROWS_PER_PAGE = 25;

export const PDFGenerator = ({
  title,
  subtitle,
  filterInfo,
  summaryCards,
  columns,
  data,
  fileName = "relatorio",
}: PDFGeneratorProps) => {
  const handleGeneratePDF = async () => {
    toast.info("Gerando PDF...");

    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const pdfContent = document.createElement("div");
      pdfContent.style.fontFamily = "Arial, sans-serif";
      pdfContent.style.padding = "20px";
      pdfContent.style.backgroundColor = "#fff";
      pdfContent.style.color = "#333";

      const headerCells = columns.map((col, idx) => {
        const isNameCol = idx === 3;
        return `<th style="
          border: 1px solid #ddd;
          padding: 6px 8px;
          text-align: ${isNameCol ? "left" : "center"};
          font-weight: 600;
          white-space: nowrap;
          background-color: #f5f5f5;
        ">${col.header}</th>`;
      }).join("");

      const bodyRows = data.map((row, index) => {
        const isPageBreak = index > 0 && index % ROWS_PER_PAGE === 0;
        const repeatHeader = isPageBreak
          ? `<tr style="background-color: #f5f5f5;">${headerCells}</tr>`
          : "";

        const cells = columns.map((col, idx) => {
          const isNameCol = idx === 3;
          return `<td style="
            border: 1px solid #ddd;
            padding: 4px 8px;
            white-space: nowrap;
            text-align: ${isNameCol ? "left" : "center"};
          ">${row[col.key] ?? "-"}</td>`;
        }).join("");

        return `${repeatHeader}<tr style="background-color: ${index % 2 === 0 ? "#fff" : "#fafafa"};">${cells}</tr>`;
      }).join("");

      pdfContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 5px 0; color: #1a1a1a;">Indicadores de Saúde Bucal de Varjota</h1>
          <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 10px 0; color: #333;">${title}</h2>
          ${filterInfo ? `<p style="font-size: 12px; color: #666; margin: 0;">Filtros aplicados: ${filterInfo}</p>` : ""}
        </div>

        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 10px 0; color: #333;">Resumo dos Indicadores</h3>
          <table style="border-collapse: collapse; width: auto;">
            <tr>
              ${summaryCards.map(card => `
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center; min-width: 120px;">
                  <div style="font-size: 11px; font-weight: 600; color: #666; margin-bottom: 5px;">${card.label}</div>
                  <div style="font-size: 16px; font-weight: bold; color: #1a1a1a;">${card.value}</div>
                  ${card.percentage ? `<div style="font-size: 12px; color: #666;">${card.percentage}</div>` : ""}
                </td>
              `).join("")}
            </tr>
          </table>
        </div>

        <div>
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 10px 0; color: #333;">Dados (${data.length} registros)</h3>
          <table style="border-collapse: collapse; width: 100%; font-size: 10px;">
            <thead>
              <tr>${headerCells}</tr>
            </thead>
            <tbody>
              ${bodyRows}
            </tbody>
          </table>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `${fileName}-${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const },
      };

      await html2pdf().set(opt).from(pdfContent).save();
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
