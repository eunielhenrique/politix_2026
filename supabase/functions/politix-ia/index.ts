// Politix IA — responde perguntas da campanha usando os dados reais (placar/ranking),
// via Google Gemini. Estratégia: tenta o modelo FREE; se a cota estourar (429/RESOURCE_EXHAUSTED),
// cai para o modelo PAGO. Chaves ficam em secrets (nunca no front).
//
// Secrets:
//   GEMINI_API_KEY        (obrigatória) — chave da versão free
//   GEMINI_API_KEY_PAID   (opcional)    — chave da versão paga (se ausente, reusa a free)
//   GEMINI_MODEL_FREE     (opcional)    — default "gemini-2.5-flash"
//   GEMINI_MODEL_PAID     (opcional)    — default "gemini-2.5-pro"
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });
}

async function callGemini(model: string, key: string, system: string, question: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: question.slice(0, 4000) }] }],
      // O 2.5-flash é modelo de RACIOCÍNIO: os tokens de pensamento saem do mesmo
      // maxOutputTokens. Com 800 e pensamento ligado, a resposta visível era cortada
      // no meio da frase. Aqui a tarefa é redação curta sobre números prontos, então
      // o pensamento é desligado e a folga de saída é maior.
      generationConfig: {
        maxOutputTokens: 1400,
        temperature: 0.4,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  const exhausted = res.status === 429 || data?.error?.status === "RESOURCE_EXHAUSTED";
  const cand = data?.candidates?.[0];
  const text = cand?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  // MAX_TOKENS = resposta truncada. Melhor devolver como falha e deixar o chamador
  // tentar de novo do que entregar uma frase pela metade como se fosse análise.
  const truncado = cand?.finishReason === "MAX_TOKENS";
  return { ok: res.ok && !!text && !truncado, exhausted, truncado, text, error: data?.error?.message as string | undefined };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { question, ctx, ctxType } = await req.json();
    const freeKey = Deno.env.get("GEMINI_API_KEY");
    if (!freeKey) return json({ answer: "A Politix IA ainda não está configurada (falta a chave do Google no backend)." });
    const paidKey = Deno.env.get("GEMINI_API_KEY_PAID") || freeKey;
    const freeModel = Deno.env.get("GEMINI_MODEL_FREE") || "gemini-2.5-flash";
    const paidModel = Deno.env.get("GEMINI_MODEL_PAID") || "gemini-2.5-pro";

    const system = [
      "Você é a Politix IA, assistente da campanha eleitoral de Wesley Cezar (Lelinho) a deputado federal por São Paulo (eleição em 04/10/2026).",
      "Fale em português do Brasil, de forma objetiva, prática e motivadora — como um estrategista de campanha.",
      "Escreva em TEXTO CORRIDO, sem markdown: nada de asterisco, cerquilha, traço de lista ou negrito. A tela mostra o texto cru.",
      "Termine sempre o raciocínio: prefira menos frases a uma frase cortada.",
      "Use SOMENTE os números do CONTEXTO abaixo; nunca invente dados. Se algo não estiver no contexto, diga que ainda não tem esse dado.",
      `Perfil de quem pergunta: ${ctxType === "assessor" ? "assessor (visão da campanha inteira)" : "líder (a própria rede)"}.`,
      "",
      "CONTEXTO (dados reais):",
      String(ctx || "(sem contexto)"),
    ].join("\n");
    const q = String(question || "");

    // 1) tenta free
    let r = await callGemini(freeModel, freeKey, system, q);
    let via = "free";
    // 2) se a cota free estourou, cai para o pago
    if (r.exhausted) { r = await callGemini(paidModel, paidKey, system, q); via = "paga"; }
    // 3) truncou mesmo com o pensamento desligado: tenta uma vez no pago, com mais folga
    if (!r.ok && r.truncado && paidKey !== freeKey) { r = await callGemini(paidModel, paidKey, system, q); via = "paga"; }

    if (!r.ok) return json({ answer: "Não consegui responder agora" + (r.error ? " (" + r.error + ")" : "") + ".", via, truncado: r.truncado });
    return json({ answer: r.text, via });
  } catch (e) {
    return json({ answer: "Erro: " + ((e as Error)?.message || String(e)) });
  }
});
