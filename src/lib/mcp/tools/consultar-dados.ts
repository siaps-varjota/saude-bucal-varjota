import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DATASETS, datasetUrl, getDataset } from "../lib/datasets";
import { fetchCsv, norm } from "../lib/csv";

export default defineTool({
  name: "consultar_dados",
  title: "Consultar dados de um indicador",
  description:
    "Retorna as linhas de uma fonte de dados do painel (ex.: b1_primeira_consulta, b5_preventivos). Permite filtrar por equipe, microárea ou mês e limitar a quantidade de linhas.",
  inputSchema: {
    fonte: z
      .string()
      .describe(`Id da fonte. Valores válidos: ${DATASETS.map((d) => d.id).join(", ")}`),
    equipe: z.string().optional().describe("Filtro parcial por equipe (ESB/ESF são equivalentes)."),
    microarea: z.string().optional().describe("Filtro parcial por microárea."),
    mes: z.string().optional().describe("Filtro parcial por mês de referência."),
    limite: z.number().int().min(1).max(500).optional().describe("Máximo de linhas (padrão 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ fonte, equipe, microarea, mes, limite }) => {
    const ds = getDataset(fonte);
    if (!ds) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Fonte desconhecida: ${fonte}. Use listar_fontes para ver as opções.`,
          },
        ],
        isError: true,
      };
    }

    try {
      const { headers, rows } = await fetchCsv(datasetUrl(ds));

      const findCol = (needles: string[]) =>
        headers.find((h) => needles.some((n) => norm(h).includes(n)));
      const colEquipe = findCol(["equipe", "esb", "esf"]);
      const colMicro = findCol(["microarea", "micro area", "area"]);
      const colMes = findCol(["mes", "referencia", "competencia"]);

      const matches = (row: Record<string, string>, col?: string, value?: string) =>
        !value || (col ? norm(row[col]).includes(norm(value)) : false);

      const filtered = rows.filter(
        (r) =>
          matches(r, colEquipe, equipe) &&
          matches(r, colMicro, microarea) &&
          matches(r, colMes, mes),
      );

      const max = limite ?? 100;
      const page = filtered.slice(0, max);

      return {
        content: [
          {
            type: "text" as const,
            text:
              `${ds.titulo} — ${filtered.length} linha(s) após filtro (exibindo ${page.length}).\n` +
              `Colunas: ${headers.join(" | ")}\n\n` +
              page.map((r) => headers.map((h) => r[h]).join(" | ")).join("\n"),
          },
        ],
        structuredContent: {
          fonte: ds.id,
          titulo: ds.titulo,
          colunas: headers,
          total: filtered.length,
          exibindo: page.length,
          linhas: page,
        },
      };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: `Erro ao consultar dados: ${String(e)}` }],
        isError: true,
      };
    }
  },
});
