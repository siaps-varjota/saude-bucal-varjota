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

// Detecta os erros clássicos de "chunk desatualizado" que o Vite lança
// quando o navegador ainda tem o index.html de um deploy anterior em cache
// e tenta buscar um arquivo /assets/*.js que já não existe mais no servidor
// (foi substituído por um novo hash no deploy mais recente).
function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Failed to load resource/i.test(message) ||
    /Loading chunk .* failed/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
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

      const cardGap = 4;
      const usableWidth = pageW - 14 * 2;
      // Calcula a largura do card dinamicamente para caber todos os cards
      // sem estourar a página (antes era fixo em 50mm, o que jogava cards
      // para fora da folha quando havia mais de ~4-5 cards).
      const cardW = summaryCards.length > 0
        ? Math.min(50, (usableWidth - cardGap * (summaryCards.length - 1)) / summaryCards.length)
        : 50;
      const cardH = 16;
      summaryCards.forEach((card, i) => {
        const x = 14 + i * (cardW + cardGap);
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

      const tableColumns = columns.map((col) => ({
        header: col.header,
        dataKey: col.key,
      }));

      const tableRows = data.map(row =>
        columns.reduce((acc, col) => {
          acc[col.key] = row[col.key] ?? "-";
          return acc;
        }, {} as Record<string, any>)
      );

      // Índice da coluna "Nome" calculado dinamicamente (antes era fixo em 3,
      // o que quebrava o alinhamento se a ordem/quantidade de colunas mudasse).
      const nomeColIndex = columns.findIndex(
        (col) => col.key.toLowerCase() === "nome" || col.header.toLowerCase() === "nome"
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
        columnStyles: nomeColIndex >= 0 ? { [nomeColIndex]: { halign: "left" } } : {},
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

      // Caso especial: o chunk do jsPDF/autoTable não foi encontrado no servidor
      // porque o navegador ainda está com o index.html de um deploy anterior
      // (o Vite gera hashes novos a cada build e apaga os arquivos antigos).
      // Nesse caso, um reload resolve, então recarregamos automaticamente
      // em vez de deixar o usuário preso num erro genérico.
      if (isStaleChunkError(error)) {
        const alreadyReloaded = sessionStorage.getItem("pdf-chunk-reload");
        if (!alreadyReloaded) {
          sessionStorage.setItem("pdf-chunk-reload", "1");
          toast.error("Nova versão do site detectada. Atualizando a página...");
          setTimeout(() => window.location.reload(), 1200);
          return;
        }
        // Se já tentou recarregar uma vez e ainda falhou, evita loop.
        sessionStorage.removeItem("pdf-chunk-reload");
        toast.error("Erro ao carregar o gerador de PDF. Verifique sua conexão e tente novamente.");
        return;
      }

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
