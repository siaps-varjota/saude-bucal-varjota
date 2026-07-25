import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listarFontes from "./tools/listar-fontes";
import consultarDados from "./tools/consultar-dados";
import listarEquipes from "./tools/listar-equipes";
import listarPendencias from "./tools/listar-pendencias";
import explicarIndicadores from "./tools/explicar-indicadores";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "saude-bucal-varjota-mcp",
  title: "Saúde Bucal Varjota",
  version: "0.1.0",
  instructions:
    "Ferramentas do painel de Indicadores de Saúde Bucal de Varjota. Use listar_fontes para descobrir as bases, explicar_indicadores para entender os parâmetros B1–B6, consultar_dados para ler linhas de uma base, listar_equipes para ver as equipes (ESB) e listar_pendencias para pacientes pendentes de 1ª consulta (B1) ou tratamento (B2).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listarFontes, explicarIndicadores, consultarDados, listarEquipes, listarPendencias],
});
