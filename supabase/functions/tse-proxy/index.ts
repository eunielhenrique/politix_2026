// POLITIX — TSE Proxy (CORS-safe) para a API pública do TSE.
// Portado do mesmo proxy já em produção na Legio: o navegador não consegue chamar
// divulgacandcontas.tse.jus.br direto (CORS), então o painel chama via
//   supabase.functions.invoke('tse-proxy', { body: { path: '/candidatura/...' } })
// Assim a votação de 2024 sai da fonte oficial sob demanda, sem importar nada.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TSE_BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let path = "";
  try { path = String((await req.json())?.path ?? ""); }
  catch {
    return new Response(JSON.stringify({ error: "missing path" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  // anti path-traversal / SSRF: só caminhos relativos dentro da base do TSE
  if (!path.startsWith("/") || path.includes("..") || path.includes("://")) {
    return new Response(JSON.stringify({ error: "invalid path" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const r = await fetch(`${TSE_BASE}${path}`, {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 (compatible; Politix/1.0)",
        "Referer": "https://divulgacandcontas.tse.jus.br/",
      },
      signal: AbortSignal.timeout(20000),
    });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
