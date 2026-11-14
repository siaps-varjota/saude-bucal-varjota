import { generateResponse, GatewayError } from "npm:@lovable.dev/ai-gateway@0.1.11";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "prioridades"],
  properties: {
    resumo: { type: "string" },
    prioridades: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["equipe", "indicador", "nivel", "motivo", "acoes"],
        properties: {
          equipe: { type: "string" },
          indicador: { type: "string" },
          nivel: { type: "string", enum: ["alta", "media", "baixa"] },
          motivo: { type: "string" },
          acoes: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const INSTRUCOES = `Você é um apoiador técnico de saúde bucal na Atenção Primária (SUS, Previne/Novo Financiamento).
Recebe resultados mensais por equipe dos indicadores B1 (1ª consulta programática), B2 (tratamento concluído), B3 (taxa de exodontia — quanto MENOR melhor), B4 (escovação supervisionada), B5 (procedimentos preventivos) e B6 (ART/restaurações atraumáticas).
Conceitos: regular < suficiente < bom < ótimo. Use SEMPRE percentualPeriodo e conceitoPeriodo informados: são a média dos percentuais dos meses selecionados (não recalcule pela soma).
Identifique as prioridades de acompanhamento (indicadores mais distantes da meta, com maior peso, ou com tendência de queda entre os meses) e sugira de 2 a 4 ações práticas, concretas e viáveis para a equipe se aproximar da meta (busca ativa, agenda, ações em escolas, registro correto no e-SUS etc.).
Responda em português do Brasil, objetivo, sem inventar números que não estejam nos dados. Ordene as prioridades da mais urgente para a menos urgente; no máximo 8.`;

// ── Provedor alternativo: Google Gemini (chave própria, tem camada gratuita) ──
// Defina o segredo GEMINI_API_KEY no Supabase para usar este provedor em vez do gateway Lovable.
const semAdditional = (o: any): any =>
  Array.isArray(o) ? o.map(semAdditional)
  : o && typeof o === "object"
    ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "additionalProperties").map(([k, v]) => [k, semAdditional(v)]))
    : o;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Tenta os modelos em ordem; em 503/429 (sobrecarga/limite) repete com pausa curta.
async function chamarGemini(entrada: string, apiKey: string) {
  // Lista de modelos, do preferido ao reserva. Pode ser trocada pelo segredo GEMINI_MODELS (separado por vírgula).
  const modelos = (Deno.env.get("GEMINI_MODELS") ?? Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash,gemini-flash-latest")
    .split(",").map((m) => m.trim()).filter(Boolean);
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCOES }] },
    contents: [{ role: "user", parts: [{ text: `Resultados mensais selecionados (JSON):\n${entrada}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: semAdditional(SCHEMA), temperature: 0.3 },
  });
  let ultimo = 502;
  for (const modelo of modelos) {
    // 503 (alta demanda) e 429 (limite) costumam passar em segundos: tenta até 3 vezes por modelo.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      if (tentativa > 0) await new Promise((r) => setTimeout(r, 1500 * tentativa));
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: corpo,
      });
      if (r.ok) {
        const j = await r.json();
        const texto = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
        if (texto) return { texto } as const;
        ultimo = 502;
        break;
      }
      console.error("gemini", modelo, r.status, (await r.text()).slice(0, 300));
      ultimo = r.status === 429 ? 429 : 502;
      if (r.status !== 503 && r.status !== 429) break; // 400/401/403/404: outro modelo, sem repetir
    }
  }
  return { status: ultimo } as const;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  let dados: unknown;
  try {
    dados = (await req.json())?.dados;
  } catch {
    return json({ error: "Dados inválidos" }, 400);
  }
  if (!Array.isArray(dados) || dados.length === 0) return json({ error: "Selecione ao menos uma equipe com dados." }, 400);
  const entrada = JSON.stringify(dados);
  if (entrada.length > 60000) return json({ error: "Seleção grande demais; reduza meses ou equipes." }, 400);

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      const g = await chamarGemini(entrada, geminiKey);
      if ("texto" in g && g.texto) return json(JSON.parse(g.texto));
      if ("status" in g && g.status === 429) return json({ error: "Muitas solicitações no momento. Aguarde um pouco e tente de novo." }, 429);
      // outro erro: tenta o gateway Lovable abaixo
    } catch (e) {
      console.error("gemini falhou", e);
    }
  }

  try {
    const resp = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCOES,
      input: `Resultados mensais selecionados (JSON):\n${entrada}`,
      text: { format: { type: "json_schema", name: "prioridades", schema: SCHEMA, strict: true } },
    });
    let texto = "";
    for (const item of resp.output ?? []) {
      if (item.type === "message") {
        for (const c of item.content) {
          if (c.type === "output_text") texto += c.text;
          if (c.type === "refusal") return json({ error: "O modelo recusou a solicitação." }, 422);
        }
      }
    }
    return json(JSON.parse(texto));
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("gateway", e.code, e.httpStatus, e.ids);
      const status = e.httpStatus === 429 ? 429 : e.httpStatus === 402 ? 402 : 502;
      const msg = status === 429
        ? "Muitas solicitações no momento. Aguarde um pouco e tente de novo."
        : status === 402
          ? "Créditos de IA esgotados no espaço de trabalho."
          : "Não foi possível gerar a análise agora.";
      return json({ error: msg }, status);
    }
    console.error(e);
    return json({ error: "Falha ao processar a análise." }, 500);
  }
});
