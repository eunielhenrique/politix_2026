// Politix IA — responde perguntas da campanha usando os dados reais (placar/ranking),
// chamando um LLM server-side. A chave fica no secret ANTHROPIC_API_KEY (nunca no front).
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { question, ctx, ctxType } = await req.json();
    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) return json({ answer: "A Politix IA ainda não está configurada (falta a chave de LLM no backend)." });

    const system = [
      "Você é a Politix IA, assistente da campanha eleitoral de Wesley Cezar (Lelinho) a deputado federal por São Paulo (eleição em 04/10/2026).",
      "Fale em português do Brasil, de forma objetiva, prática e motivadora — como um estrategista de campanha.",
      "Use SOMENTE os números do CONTEXTO abaixo; nunca invente dados. Se algo não estiver no contexto, diga que não tem esse dado ainda.",
      `Perfil de quem pergunta: ${ctxType === "assessor" ? "assessor (visão da campanha inteira)" : "líder (a própria rede)"}.`,
      "",
      "CONTEXTO (dados reais):",
      String(ctx || "(sem contexto)"),
    ].join("\n");

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: String(question || "").slice(0, 2000) }],
      }),
    });
    const j = await r.json();
    if (j.error) return json({ answer: "Não consegui responder agora (" + (j.error.message || "erro na IA") + ")." });
    const text = j?.content?.[0]?.text || "Não consegui responder agora.";
    return json({ answer: text });
  } catch (e) {
    return json({ answer: "Erro: " + ((e as Error)?.message || String(e)) });
  }
});
