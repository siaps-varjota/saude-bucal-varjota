import { defineTool } from "@lovable.dev/mcp-js";
import { DATASETS } from "../lib/datasets";

export default defineTool({
  name: "listar_fontes",
  title: "Listar fontes de dados",
  description:
    "Lista as fontes de dados (indicadores B1 a B6 e consolidado oficial) disponíveis no painel de Saúde Bucal de Varjota.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text" as const,
        text: DATASETS.map((d) => `- ${d.id}: ${d.titulo} — ${d.descricao}`).join("\n"),
      },
    ],
    structuredContent: {
      fontes: DATASETS.map(({ id, titulo, descricao }) => ({ id, titulo, descricao })),
    },
  }),
});
