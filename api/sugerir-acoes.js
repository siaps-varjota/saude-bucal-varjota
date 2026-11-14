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
          acoes: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};
const INSTRUCOES = `Voc\xEA \xE9 um apoiador t\xE9cnico de sa\xFAde bucal na Aten\xE7\xE3o Prim\xE1ria (SUS, Previne/Novo Financiamento).
Recebe resultados mensais por equipe dos indicadores B1 (1\xAA consulta program\xE1tica), B2 (tratamento conclu\xEDdo), B3 (taxa de exodontia \u2014 quanto MENOR melhor), B4 (escova\xE7\xE3o supervisionada), B5 (procedimentos preventivos) e B6 (ART/restaura\xE7\xF5es atraum\xE1ticas).
Conceitos: regular < suficiente < bom < \xF3timo. Use SEMPRE percentualPeriodo e conceitoPeriodo informados: s\xE3o a m\xE9dia dos percentuais dos meses selecionados (n\xE3o recalcule pela soma).
Identifique as prioridades de acompanhamento (indicadores mais distantes da meta, com maior peso, ou com tend\xEAncia de queda entre os meses) e sugira de 2 a 4 a\xE7\xF5es pr\xE1ticas, concretas e vi\xE1veis para a equipe se aproximar da meta (busca ativa, agenda, a\xE7\xF5es em escolas, registro correto no e-SUS etc.).
Responda em portugu\xEAs do Brasil, objetivo, sem inventar n\xFAmeros que n\xE3o estejam nos dados. Ordene as prioridades da mais urgente para a menos urgente; no m\xE1ximo 8.`;
const semAdditional = (o) => Array.isArray(o) ? o.map(semAdditional) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "additionalProperties").map(([k, v]) => [k, semAdditional(v)])) : o;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function chamarGemini(entrada, apiKey) {
  const lista = [process.env.GEMINI_MODELS, process.env.GEMINI_MODEL, "gemini-3.8-flash,gemini-flash-latest"].flatMap((v) => (v ?? "").split(",")).map((m) => m.trim().replace(/^models\//, "").replace(/^["']|["']$/g, "")).filter(Boolean);
  const modelos = [...new Set(lista)];
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCOES }] },
    contents: [{ role: "user", parts: [{ text: `Resultados mensais selecionados (JSON):
${entrada}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: semAdditional(SCHEMA), temperature: 0.3 }
  });
  let ultimo = 502;
  const limite = Date.now() + 100000; // orçamento total de ~100 s; depois disso desiste e o painel usa as regras fixas
  for (const modelo of modelos) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      if (Date.now() > limite) return { status: ultimo };
      if (tentativa > 0) await esperar(1500 * tentativa);
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: corpo,
          signal: AbortSignal.timeout(35000) // cada chamada espera no máximo 35 s
        });
      } catch (e) {
        console.error("gemini", modelo, "sem resposta (tempo esgotado ou rede)", String(e?.name ?? e));
        ultimo = 502;
        continue; // tenta de novo / próximo modelo
      }
      if (r.ok) {
        const j = await r.json();
        const texto = j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (texto) return { texto };
        ultimo = 502;
        break;
      }
      console.error("gemini", modelo, r.status, (await r.text()).slice(0, 300));
      ultimo = r.status === 429 ? 429 : 502;
      if (r.status !== 503 && r.status !== 429) break;
    }
  }
  return { status: ultimo };
}
const config = { maxDuration: 60 };
async function handler(req, res) {
  // GET /api/sugerir-acoes  -> lista os modelos que a sua chave pode usar (só nomes; ajuda a escolher GEMINI_MODELS)
  if (req.method === "GET") {
    const k = process.env.GEMINI_API_KEY;
    if (!k) return res.status(500).json({ error: "GEMINI_API_KEY não configurada." });
    try {
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": k }, signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      if (!r.ok) return res.status(502).json({ error: "Google recusou a listagem.", status: r.status });
      const modelos = (j.models ?? []).filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent")).map((m) => String(m.name).replace(/^models\//, ""));
      return res.status(200).json({ modelos });
    } catch (e) {
      return res.status(502).json({ error: "Não foi possível listar os modelos." });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "M\xE9todo n\xE3o permitido" });
  const dados = req.body?.dados;
  if (!Array.isArray(dados) || dados.length === 0) return res.status(400).json({ error: "Selecione ao menos uma equipe com dados." });
  const entrada = JSON.stringify(dados);
  if (entrada.length > 6e4) return res.status(400).json({ error: "Sele\xE7\xE3o grande demais; reduza meses ou equipes." });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falha ao processar a an\xE1lise. Chave GEMINI_API_KEY n\xE3o configurada." });
  try {
    const g = await chamarGemini(entrada, apiKey);
    if (g.texto) return res.status(200).json(JSON.parse(g.texto));
    if (g.status === 429) return res.status(429).json({ error: "Muitas solicita\xE7\xF5es no momento. Aguarde um pouco e tente de novo." });
    return res.status(502).json({ error: "N\xE3o foi poss\xEDvel gerar a an\xE1lise agora." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Falha ao processar a an\xE1lise." });
  }
}
export {
  config,
  handler as default
};
