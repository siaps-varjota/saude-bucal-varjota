import { defineTool } from "@lovable.dev/mcp-js";

const PARAMETROS = [
  {
    indicador: "B1 — 1ª Consulta Odontológica",
    parametros: "Regular ≤ 0,25% | Suficiente 0,25–0,75% | Bom 0,75–1,25% | Ótimo > 1,25%",
  },
  {
    indicador: "B2 — Tratamento Odontológico Concluído",
    parametros: "Percentual de tratamentos concluídos sobre 1ª consultas.",
  },
  {
    indicador: "B3 — Taxa de Exodontias",
    parametros: "Ótimo ≥3% e <10% | Bom ≥10% e <12% | Suficiente ≥12% e <14% | Regular <3% ou ≥14%",
  },
  {
    indicador: "B4 — Escovação Dental Supervisionada",
    parametros: "Percentual de cobertura da população por escovação supervisionada.",
  },
  {
    indicador: "B5 — Procedimentos Odontológicos Preventivos",
    parametros: "Suficiente ≥40% e <55% | Bom ≥55% e <65% | Ótimo ≥65% e ≤85%",
  },
  {
    indicador: "B6 — Tratamento Restaurador Atraumático (ART)",
    parametros: "Bom > 6% | Ótimo > 8%",
  },
];

export default defineTool({
  name: "explicar_indicadores",
  title: "Explicar indicadores e parâmetros",
  description:
    "Explica os indicadores B1 a B6 do painel de Saúde Bucal de Varjota, seus conceitos (Regular, Suficiente, Bom, Ótimo) e a divisão em quadrimestres.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text" as const,
        text:
          PARAMETROS.map((p) => `${p.indicador}\n  ${p.parametros}`).join("\n\n") +
          "\n\nQuadrimestres: 1º (jan–abr), 2º (mai–ago), 3º (set–dez)." +
          "\nQuando existe dado oficial para mês/equipe, ele prevalece sobre o preliminar, mesmo se zerado.",
      },
    ],
    structuredContent: { indicadores: PARAMETROS },
  }),
});
