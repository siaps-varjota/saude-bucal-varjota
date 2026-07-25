import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DATASETS, datasetUrl, getDataset } from "../lib/datasets";
import { fetchCsv, norm } from "../lib/csv";

export default defineTool({
  name: "listar_equipes",
  title: "Listar equipes",
  description:
    "Lista as equipes (ESB) encontradas em uma fonte de dados do painel, com a contagem de linhas de cada uma.",
  inputSchema: {
    fonte: z
      .string()
      .default("b1_primeira_consulta")
      .describe(`Id da fonte. Valores válidos: ${DATASETS.map((d) => d.id).join(", ")}`),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ fonte }) => {
    const ds = getDataset(fonte);
    if (!ds) {
      return {
        content: [{ type: "text" as const, text: `Fonte desconhecida: ${fonte}.` }],
        isError: true,
      };
    }
    try {
      const { headers, rows } = await fetchCsv(datasetUrl(ds));
      const colEquipe = headers.find((h) => ["equipe", "esb", "esf"].some((n) => norm(h).includes(n)));
      if (!colEquipe) {
        return {
          content: [
            { type: "text" as const, text: `A fonte ${ds.titulo} não possui coluna de equipe.` },
          ],
          isError: true,
        };
      }
      const counts = new Map<string, number>();
      for (const r of rows) {
        const nome = (r[colEquipe] ?? "").replace(/\bESF\b/gi, "ESB").trim();
        if (!nome) continue;
        counts.set(nome, (counts.get(nome) ?? 0) + 1);
      }
      const equipes = [...counts.entries()]
        .map(([equipe, linhas]) => ({ equipe, linhas }))
        .sort((a, b) => a.equipe.localeCompare(b.equipe));

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Equipes em ${ds.titulo}:\n` +
              equipes.map((e) => `- ${e.equipe} (${e.linhas} linhas)`).join("\n"),
          },
        ],
        structuredContent: { fonte: ds.id, equipes },
      };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: `Erro ao listar equipes: ${String(e)}` }],
        isError: true,
      };
    }
  },
});
