// Função serverless da Vercel (independe do Lovable/Supabase).
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  (obrigatória)  chave do Google AI Studio
//   GEMINI_MODELS   (opcional)     modelos separados por vírgula, do preferido ao reserva
//   GEMINI_MODEL    (opcional)     um modelo (alternativa ao GEMINI_MODELS)

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


const semAdditional = (o: any): any =>
  Array.isArray(o) ? o.map(semAdditional)
  : o && typeof o === "object"
    ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "additionalProperties").map(([k, v]) => [k, semAdditional(v)]))
    : o;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function chamarGemini(entrada: string, apiKey: string) {
  const lista = [process.env.GEMINI_MODELS, process.env.GEMINI_MODEL, "gemini-3.8-flash,gemini-flash-latest"]
    .flatMap((v) => (v ?? "").split(","))
    .map((m) => m.trim().replace(/^models\//, "").replace(/^["']|["']$/g, ""))
    .filter(Boolean);
  const modelos = [...new Set(lista)];
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCOES }] },
    contents: [{ role: "user", parts: [{ text: `Resultados mensais selecionados (JSON):\n${entrada}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: semAdditional(SCHEMA), temperature: 0.3 },
  });
  let ultimo = 502;
  for (const modelo of modelos) {
    // 503 (alta demanda) e 429 (limite) costumam passar em segundos: até 3 tentativas por modelo.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      if (tentativa > 0) await esperar(1500 * tentativa);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: corpo,
      });
      if (r.ok) {
        const j: any = await r.json();
        const texto = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
        if (texto) return { texto };
        ultimo = 502;
        break;
      }
      console.error("gemini", modelo, r.status, (await r.text()).slice(0, 300));
      ultimo = r.status === 429 ? 429 : 502;
      if (r.status !== 503 && r.status !== 429) break; // 400/401/403/404: tenta o próximo modelo
    }
  }
  return { status: ultimo };
}

export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const dados = req.body?.dados;
  if (!Array.isArray(dados) || dados.length === 0) return res.status(400).json({ error: "Selecione ao menos uma equipe com dados." });
  const entrada = JSON.stringify(dados);
  if (entrada.length > 60000) return res.status(400).json({ error: "Seleção grande demais; reduza meses ou equipes." });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falha ao processar a análise. Chave GEMINI_API_KEY não configurada." });

  try {
    const g: any = await chamarGemini(entrada, apiKey);
    if (g.texto) return res.status(200).json(JSON.parse(g.texto));
    if (g.status === 429) return res.status(429).json({ error: "Muitas solicitações no momento. Aguarde um pouco e tente de novo." });
    return res.status(502).json({ error: "Não foi possível gerar a análise agora." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Falha ao processar a análise." });
  }
}
