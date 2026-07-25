import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { datasetUrl, getDataset } from "../lib/datasets";
import { fetchCsv, norm } from "../lib/csv";

const isPendente = (valor: string) => {
  const v = norm(valor);
  if (!v) return true;
  return !(
    v.includes("sim") ||
    v.includes("conclu") ||
    v.includes("realizad") ||
    v.includes("finaliz")
  );
};

export default defineTool({
  name: "listar_pendencias",
  title: "Listar pendências por equipe",
  description:
    "Lista pacientes pendentes de uma equipe: B1 (sem 1ª consulta odontológica) ou B2 (tratamento odontológico não concluído).",
  inputSchema: {
    indicador: z.enum(["b1", "b2"]).describe("b1 = sem 1ª consulta; b2 = tratamento pendente."),
    equipe: z.string().min(1).describe("Nome (ou parte) da equipe, ex.: 'Acampamento'."),
    limite: z.number().int().min(1).max(500).optional().describe("Máximo de pacientes (padrão 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ indicador, equipe, limite }) => {
    const ds = getDataset(indicador === "b1" ? "b1_primeira_consulta" : "b2_tratamento");
    if (!ds) {
      return { content: [{ type: "text" as const, text: "Fonte indisponível." }], isError: true };
    }
    try {
      const { headers, rows } = await fetchCsv(datasetUrl(ds));
      const find = (needles: string[]) =>
        headers.find((h) => needles.some((n) => norm(h).includes(n)));

      const colEquipe = find(["equipe", "esb", "esf"]);
      const colNome = find(["nome", "paciente", "cidadao"]);
      const colMicro = find(["microarea", "micro area", "area"]);
      const colStatus =
        indicador === "b1"
          ? find(["1a consulta", "primeira consulta", "consulta", "situacao", "status"])
          : find(["tratamento", "situacao", "status", "conclu"]);

      const daEquipe = rows.filter((r) => (colEquipe ? norm(r[colEquipe]).includes(norm(equipe)) : false));
      const pendentes = daEquipe.filter((r) => (colStatus ? isPendente(r[colStatus]) : false));

      const max = limite ?? 200;
      const lista = pendentes.slice(0, max).map((r) => ({
        nome: colNome ? r[colNome] : "",
        microarea: colMicro ? r[colMicro] : "",
        equipe: colEquipe ? (r[colEquipe] ?? "").replace(/\bESF\b/gi, "ESB") : "",
        situacao: colStatus ? r[colStatus] : "",
      }));
      lista.sort(
        (a, b) => a.microarea.localeCompare(b.microarea) || a.nome.localeCompare(b.nome),
      );

      return {
        content: [
          {
            type: "text" as const,
            text:
              `${ds.titulo} — equipe "${equipe}": ${daEquipe.length} pacientes, ${pendentes.length} pendentes (exibindo ${lista.length}).\n\n` +
              lista.map((p) => `- MA ${p.microarea} | ${p.nome} | ${p.situacao}`).join("\n"),
          },
        ],
        structuredContent: {
          indicador,
          equipe,
          total_equipe: daEquipe.length,
          total_pendentes: pendentes.length,
          pendentes: lista,
        },
      };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: `Erro ao listar pendências: ${String(e)}` }],
        isError: true,
      };
    }
  },
});
