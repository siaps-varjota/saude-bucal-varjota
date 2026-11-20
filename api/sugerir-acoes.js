import { METODOLOGIA_ESB } from "./_metodologia-esb.js";
import { METODOLOGIA_EMULTI } from "./_metodologia-emulti.js";
import { METODOLOGIA_ESF } from "./_metodologia-esf.js";
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
const INSTRUCOES_EMULTI = `Voc\xEA \xE9 um apoiador t\xE9cnico da eMulti (equipes multiprofissionais) na Aten\xE7\xE3o Prim\xE1ria do SUS (Novo Financiamento).
A nota final do Componente III vale at\xE9 10 pontos: indicador M1 (m\xE9dia de atendimentos por pessoa, peso 6) e M2 (a\xE7\xF5es compartilhadas, peso 4). Conceitos: Regular < Suficiente < Bom < \xD3timo (pontos 0,25 / 0,5 / 0,75 / 1 por peso).
Limites: M1 \xD3timo > 3, Bom > 2, Suficiente > 1; M2 (%) \xD3timo > 5, Bom > 2,5, Suficiente > 1. Use SEMPRE valorPeriodo e conceitoPeriodo informados; n\xE3o recalcule.
Priorize indicadores mais distantes do \xD3timo, de maior peso ou com queda entre os meses, e sugira de 2 a 4 a\xE7\xF5es pr\xE1ticas e vi\xE1veis (registro no e-SUS PEC, retorno de usu\xE1rios, atendimentos e atividades coletivas conjuntas, reuni\xF5es de caso/PTS).
Responda em portugu\xEAs do Brasil, objetivo, sem inventar n\xFAmeros. Ordene da mais urgente para a menos urgente; no m\xE1ximo 8. No campo "indicador" use o nome do indicador e em "equipe" o nome da equipe.`;
const INSTRUCOES_ESF = `Voc\xEA \xE9 um apoiador t\xE9cnico das equipes de Sa\xFAde da Fam\xEDlia (eSF/eAP) na Aten\xE7\xE3o Prim\xE1ria do SUS (Novo Financiamento, Componente III).
A nota final vale at\xE9 10 pontos e soma os indicadores C1 Acesso APS (peso 1), C2 Desenvolvimento Infantil (2), C3 Gesta\xE7\xE3o e Puerp\xE9rio (2), C4 Diabetes (1), C5 Hipertens\xE3o (1), C6 Pessoa Idosa (1) e C7 Sa\xFAde da Mulher (2). Conceitos: Regular < Suficiente < Bom < \xD3timo (pontos 0,25 / 0,5 / 0,75 / 1 vezes o peso).
Faixas de C2 a C7 (% do indicador): Regular at\xE9 25, Suficiente acima de 25, Bom acima de 50, \xD3timo acima de 75. C1: \xD3timo entre 50 e 70, Bom acima de 30 e at\xE9 50, Suficiente acima de 10 e at\xE9 30, Regular at\xE9 10 ou acima de 70. Use SEMPRE valorPeriodo e conceitoPeriodo informados; n\xE3o recalcule.
Priorize indicadores de maior peso e mais distantes do \xD3timo e sugira de 2 a 4 a\xE7\xF5es pr\xE1ticas e vi\xE1veis (busca ativa com os ACS, agendamento, registro correto no e-SUS PEC, organiza\xE7\xE3o da agenda).
Responda em portugu\xEAs do Brasil, objetivo, sem inventar n\xFAmeros. Ordene da mais urgente para a menos urgente; no m\xE1ximo 8. No campo "indicador" use o c\xF3digo e o nome (ex.: "C3 — Gesta\xE7\xE3o e Puerp\xE9rio") e em "equipe" o nome da equipe.`;
const INSTRUCOES_ESF_ABA = `Voc\xEA \xE9 um apoiador t\xE9cnico das equipes de Sa\xFAde da Fam\xEDlia (eSF/eAP) na Aten\xE7\xE3o Prim\xE1ria do SUS (Novo Financiamento).
Voc\xEA recebe UMA aba tem\xE1tica do painel (campo "aba"), a regra de pontua\xE7\xE3o dela ("regraPontuacao"), os quadrimestres e as equipes selecionados e a lista de indicadores (boas pr\xE1ticas) com quantos registros atendem ("atendem"), o total, quantos faltam e o percentual.
Analise SOMENTE esta aba e esta sele\xE7\xE3o. Identifique as boas pr\xE1ticas com maior n\xFAmero de faltantes e menor percentual, considerando a regra de pontua\xE7\xE3o (indicadores de maior peso rendem mais ponto) e sugira de 2 a 4 a\xE7\xF5es pr\xE1ticas, concretas e espec\xEDficas para cada indicador (busca ativa com os ACS, agendamento, registro correto no e-SUS PEC, organiza\xE7\xE3o da agenda). Use SEMPRE os n\xFAmeros informados; n\xE3o recalcule nem invente dados.
Responda em portugu\xEAs do Brasil, objetivo. Fa\xE7a UMA prioridade para CADA indicador recebido (todas as boas pr\xE1ticas da aba, no m\xE1ximo 12), ordenadas da mais urgente para a menos urgente; n\xE3o omita indicador que esteja bom: nele, diga que est\xE1 em dia e que a a\xE7\xE3o \xE9 manter o registro. No campo "indicador" use o t\xEDtulo do indicador exatamente como recebido e em "equipe" as equipes selecionadas (ou "Todas as equipes"). N\xEDvel: alta se o percentual for menor que 50%, m\xE9dia entre 50% e 75%, baixa acima de 75%.
Se vier o campo "visitaAcsPorAcs" (desempenho da Visita ACS (2+) por ACS: nome, equipe, microárea, atendem, total, faltam e percentual), no indicador de Visita ACS cite NOMINALMENTE, na justificativa ("motivo") e nas ações, os ACS com percentual abaixo de "limitePct" (os de menor percentual primeiro, no máximo 6), com os números recebidos, e proponha ações específicas para eles (lista de quem falta, rota de visitas, segunda visita com intervalo mínimo de 30 dias, conferência do registro no e-SUS). Nunca invente nomes: use só os ACS informados.`;
const SCHEMA_ESF_BP = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "prioridades", "recomendacoes", "pontosPositivos"],
  properties: {
    resumo: { type: "string" },
    prioridades: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["unidade", "equipe", "aba", "indicador", "nivel", "justificativa", "acoes"],
        properties: {
          unidade: { type: "string" },
          equipe: { type: "string" },
          aba: { type: "string" },
          indicador: { type: "string" },
          nivel: { type: "string", enum: ["alta", "media", "baixa"] },
          justificativa: { type: "string" },
          acoes: { type: "array", items: { type: "string" } }
        }
      }
    },
    recomendacoes: { type: "array", items: { type: "string" } },
    pontosPositivos: { type: "array", items: { type: "string" } }
  }
};
const INSTRUCOES_ESF_BP = `Você é um analista da Atenção Primária à Saúde do município de Varjota-CE.
Você recebe dados AGREGADOS da aba "Análise de Boas Práticas" do painel: boas práticas por indicador, aba e equipe ou ACS/microárea. Analise somente esses dados. Não invente números, nomes, fatos ou causas. Use os números exatos recebidos.
O campo recorte.nivelComparacao informa se as unidades são equipes ou ACS/microárea. Em "unidade" use o nome da unidade e em "equipe" a equipe dela (campo equipe de unidadesCriticas).
Considere cobertura abaixo de 90% como ponto de atenção. Priorize juntos: menor coberturaPct, maior volume de naoRealizados e unidades que aparecem em unidadesPrioritariasPareto ou em unidadesPrioritariasEmVariosIndicadores (concentração de falhas recorrentes).
Não faça diagnósticos clínicos. Produza recomendações operacionais realistas para gestores, enfermeiros e ACS: busca ativa, planejamento de agenda e rotas, supervisão, treinamento e conferência dos registros no e-SUS.
Use resumoPorAba para comparar as abas sem recalcular médias. Nunca recalcule coberturas por conta própria. Se indicadoresOmitidos existir, informe que a análise considera os indicadores de menor cobertura.
Reconheça boas coberturas (90% ou mais) e unidades de referência sem repetir o resumo. Escreva em português do Brasil, de forma objetiva.
Limites: resumo até 100 palavras; no máximo 6 prioridades, da mais urgente para a menos urgente, cada uma com 2 a 3 ações de até 25 palavras e justificativa de até 45 palavras; no máximo 5 recomendações e 3 pontos positivos.`;
function ressalvasTemporais(ref) {
  const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "long", year: "numeric" });
  const hoje = fmt.format(new Date());
  const mesAtual = typeof ref?.mesAtual === "string" ? ref.mesAtual.slice(0, 10) : "";
  return `DATA DE HOJE: ${hoje}${mesAtual ? " (mês corrente: " + mesAtual + ")" : ""}.
RESSALVAS OBRIGATÓRIAS (aplique sempre, no resumo e nas prioridades):
1. Cada mês traz o campo "situacao": "fechado" (mês passado com dados), "em_andamento" (mês corrente: a produção ainda está sendo registrada e enviada, os números são PARCIAIS), "futuro" (ainda não começou) ou "sem_dados" (mês passado sem denominador registrado).
2. Mês "em_andamento" ou "futuro" com denominador zero é ESPERADO, não é falha da equipe nem problema de registro. Diga isso de forma explícita no resumo (ex.: "os dados de Dez/2026 ainda não existem porque o mês está em andamento"). Nunca fale em "ausência de dados processados", "sub-registro" ou "auditoria" por causa de mês em andamento ou futuro.
3. Mês "sem_dados" (já encerrado) pode indicar produção não enviada ou não registrada: trate como hipótese a conferir (envio ao SISAB/e-SUS), nunca como conclusão.
4. NÃO calcule tendência, queda ou melhora usando mês "em_andamento", "futuro" ou "sem_dados". Compare apenas meses "fechado". Com menos de 2 meses fechados, diga que não há como avaliar tendência.
5. Resultados são preliminares: o mês corrente é parcial, a extração do SIAPS ocorre no 20º dia útil e o envio tardio pode alterar os números. Quando "fonte" for "preliminar", avise que o valor pode mudar; quando for "oficial", pode tratá-lo como consolidado.
6. A média do período usa poucos meses e denominadores pequenos oscilam muito: se o denominador for baixo, diga que a variação mensal é pouco confiável. Não classifique prioridade ALTA com base apenas em mês parcial.
7. Ao interpretar movimento, respeite a polaridade: B3 menor é melhor, mas abaixo de 3% também é Regular; B5 é Regular abaixo de 40% e acima de 85%. Não chame de "queda acentuada" ou "melhora" sem dizer se o movimento aproxima ou afasta o indicador da faixa Ótima.
8. Ações devem valer para o mês corrente e os próximos do quadrimestre; não proponha "recuperar" mês já encerrado, e não peça correção de dados de mês que ainda não terminou.
9. Não afirme causas que os dados não mostram; use "pode indicar" e sugira conferir. Se todos os indicadores estiverem Ótimos nos meses fechados, não invente prioridades.
10. Se o período tiver poucos meses fechados, termine o resumo com uma frase curta avisando que a análise é provisória.`;
}
const semAdditional = (o) => Array.isArray(o) ? o.map(semAdditional) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).filter(([k]) => k !== "additionalProperties").map(([k, v]) => [k, semAdditional(v)])) : o;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function chamarGemini(entrada, apiKey, instrucoes, schema = SCHEMA) {
  const lista = [process.env.GEMINI_MODELS, process.env.GEMINI_MODEL, "gemini-3.8-flash,gemini-flash-latest"].flatMap((v) => (v ?? "").split(",")).map((m) => m.trim().replace(/^models\//, "").replace(/^["']|["']$/g, "")).filter(Boolean);
  const modelos = [...new Set(lista)];
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: instrucoes }] },
    contents: [{ role: "user", parts: [{ text: `Resultados mensais selecionados (JSON):
${entrada}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: semAdditional(schema), temperature: 0.3 }
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
const ORIGENS = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean);
async function handler(req, res) {
  // CORS: permite que o painel eMulti (outro dom\u00EDnio) chame esta fun\u00E7\u00E3o. Restrinja com ALLOWED_ORIGINS (lista separada por v\u00EDrgula).
  const origem = req.headers?.origin;
  if (origem && (ORIGENS.length === 0 || ORIGENS.includes(origem))) {
    res.setHeader("Access-Control-Allow-Origin", ORIGENS.length === 0 ? "*" : origem);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
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
    if (req.body?.contexto === "esf-boas-praticas") {
      const gb = await chamarGemini(entrada, apiKey, INSTRUCOES_ESF_BP, SCHEMA_ESF_BP);
      if (gb.texto) return res.status(200).json(JSON.parse(gb.texto));
      if (gb.status === 429) return res.status(429).json({ error: "Muitas solicita\xE7\xF5es no momento. Aguarde um pouco e tente de novo." });
      return res.status(502).json({ error: "N\xE3o foi poss\xEDvel gerar a an\xE1lise agora." });
    }
    const g = await chamarGemini(entrada, apiKey, req.body?.contexto === "emulti" ? INSTRUCOES_EMULTI + "\n\n" + METODOLOGIA_EMULTI : req.body?.contexto === "esf" ? INSTRUCOES_ESF + "\n\n" + METODOLOGIA_ESF : req.body?.contexto === "esf-aba" ? INSTRUCOES_ESF_ABA + "\n\n" + METODOLOGIA_ESF   : INSTRUCOES + "\n\n" + ressalvasTemporais(req.body?.referencia) + "\n\n" + METODOLOGIA_ESB);
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
