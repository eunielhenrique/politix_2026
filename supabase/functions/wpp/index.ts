// Politix WhatsApp — ponte com o Evolution API. O assessor conecta o próprio número
// por QR (dentro do app). Uma instância por campanha. Credenciais do Evolution ficam
// em secrets (EVO_BASE, EVO_KEY) — nunca no front.
// Ações (body.action): connect | status | groups | send
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const EVO_BASE = Deno.env.get("EVO_BASE");
    const EVO_KEY = Deno.env.get("EVO_KEY");
    if (!EVO_BASE || !EVO_KEY) return json({ error: "WhatsApp não configurado (falta EVO_BASE/EVO_KEY)." }, 500);

    // identifica o usuário (precisa ser assessor)
    const authHeader = req.headers.get("Authorization") || "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: meData } = await supa.rpc("me");
    const me = Array.isArray(meData) ? meData[0] : meData;
    if (!me || me.role !== "assessor" || !me.tenant_id) return json({ error: "Apenas o assessor pode gerenciar o WhatsApp." }, 403);

    const inst = "politix_" + String(me.tenant_id).replace(/-/g, "").slice(0, 20);
    const evo = (path: string, opts: RequestInit = {}) =>
      fetch(EVO_BASE + path, { ...opts, headers: { apikey: EVO_KEY, "content-type": "application/json", ...(opts.headers || {}) } });

    const { action, text, to } = await req.json();

    if (action === "connect") {
      // cria a instância (idempotente: se já existe, seguimos pro connect)
      const cr = await evo("/instance/create", {
        method: "POST",
        body: JSON.stringify({ instanceName: inst, integration: "WHATSAPP-BAILEYS", qrcode: true }),
      });
      const cj = await cr.json().catch(() => ({}));
      let qr = cj?.qrcode?.base64 || cj?.base64 || null;
      let pairing = cj?.qrcode?.pairingCode || cj?.pairingCode || null;
      if (!qr) {
        const c2 = await evo("/instance/connect/" + inst);
        const j2 = await c2.json().catch(() => ({}));
        qr = j2?.base64 || null;
        pairing = j2?.pairingCode || pairing;
      }
      return json({ instance: inst, qr, pairing });
    }

    if (action === "status") {
      const r = await evo("/instance/connectionState/" + inst);
      const j = await r.json().catch(() => ({}));
      const state = j?.instance?.state || j?.state || "close";
      return json({ instance: inst, state, connected: state === "open" });
    }

    if (action === "groups") {
      const r = await evo("/group/fetchAllGroups/" + inst + "?getParticipants=false");
      const j = await r.json().catch(() => ([]));
      const arr = Array.isArray(j) ? j : (j?.groups || []);
      const groups = arr.map((g: Record<string, unknown>) => ({
        jid: g.id, nome: g.subject || "(sem nome)", membros: g.size ?? (Array.isArray(g.participants) ? g.participants.length : 0),
      }));
      // cacheia em wpp_groups (best-effort, via service role)
      try {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("wpp_groups").upsert(groups.map((g) => ({ tenant_id: me.tenant_id, jid: g.jid, nome: g.nome, membros: g.membros })), { onConflict: "tenant_id,jid" });
      } catch (_e) { /* ignore */ }
      return json({ groups });
    }

    if (action === "send") {
      if (!to || !text) return json({ error: "faltou destino (to) ou texto." }, 400);
      const r = await evo("/message/sendText/" + inst, { method: "POST", body: JSON.stringify({ number: to, text }) });
      const j = await r.json().catch(() => ({}));
      return json({ ok: r.ok, result: j });
    }

    return json({ error: "ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message || String(e) }, 500);
  }
});
