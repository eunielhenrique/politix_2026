// Politix WhatsApp — modelo: o LÍDER registra seu grupo por link de convite (app do líder);
// o ASSESSOR vê todos os grupos registrados e pode "solicitar entrar" (o número da campanha
// entra via o link). Envio "como Assessoria" só depois de entrar.
// Uma instância Evolution por campanha = o número que o assessor conecta por QR.
// Ações: connect | status | register | list | join | send
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });
const extractCode = (s: string) => {
  const m = String(s || "").match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : String(s || "").trim();
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const EVO_BASE = Deno.env.get("EVO_BASE");
    const EVO_KEY = Deno.env.get("EVO_KEY");
    if (!EVO_BASE || !EVO_KEY) return json({ error: "WhatsApp não configurado." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: meData } = await supa.rpc("me");
    const me = Array.isArray(meData) ? meData[0] : meData;
    if (!me || !me.tenant_id) return json({ error: "Sessão inválida." }, 403);
    const tenant = me.tenant_id as string;
    const inst = "politix_" + tenant.replace(/-/g, "").slice(0, 20);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const evo = (path: string, opts: RequestInit = {}) =>
      fetch(EVO_BASE + path, { ...opts, headers: { apikey: EVO_KEY, "content-type": "application/json", ...(opts.headers || {}) } });
    const inviteInfo = async (code: string) => {
      try { const r = await evo("/group/inviteInfo/" + inst + "?inviteCode=" + code); const j = await r.json(); return r.ok ? { nome: j.subject || null, jid: j.id || null, membros: j.size || 0 } : {}; } catch { return {}; }
    };

    const { action, inviteLink, code, to, text } = await req.json();

    // ---- assessor conecta o número da campanha ----
    if (action === "connect") {
      if (me.role !== "assessor") return json({ error: "Apenas o assessor conecta o WhatsApp." }, 403);
      const cr = await evo("/instance/create", { method: "POST", body: JSON.stringify({ instanceName: inst, integration: "WHATSAPP-BAILEYS", qrcode: true }) });
      const cj = await cr.json().catch(() => ({}));
      let qr = cj?.qrcode?.base64 || cj?.base64 || null;
      if (!qr) { const c2 = await evo("/instance/connect/" + inst); const j2 = await c2.json().catch(() => ({})); qr = j2?.base64 || null; }
      return json({ instance: inst, qr });
    }
    if (action === "status") {
      const r = await evo("/instance/connectionState/" + inst);
      const j = await r.json().catch(() => ({}));
      const state = j?.instance?.state || j?.state || "close";
      return json({ state, connected: state === "open" });
    }

    // ---- líder registra seu grupo por link ----
    if (action === "register") {
      if (me.role !== "lider" || !me.leader_id) return json({ error: "Apenas o líder registra grupos." }, 403);
      const c = extractCode(inviteLink);
      if (!c) return json({ error: "Link de convite inválido." }, 400);
      const info = await inviteInfo(c);
      const { error } = await admin.from("wpp_groups").upsert(
        { tenant_id: tenant, leader_id: me.leader_id, invite_code: c, nome: info.nome || "Grupo do WhatsApp", jid: info.jid || null, membros: info.membros || 0 },
        { onConflict: "tenant_id,invite_code" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, nome: info.nome || null });
    }

    // ---- listar (assessor: todos; líder: os seus) ----
    if (action === "list") {
      let q = admin.from("wpp_groups").select("id, nome, invite_code, jid, membros, joined, leader_id, leader:leader_id(name)").eq("tenant_id", tenant);
      if (me.role === "lider") q = q.eq("leader_id", me.leader_id);
      const { data } = await q;
      const groups = (data || []).map((g: Record<string, unknown>) => ({
        id: g.id, nome: g.nome, code: g.invite_code, jid: g.jid, membros: g.membros, joined: !!g.joined,
        leaderId: g.leader_id, leaderNome: (g.leader as { name?: string })?.name || "",
      }));
      return json({ groups });
    }

    // ---- assessor solicita entrar ----
    if (action === "join") {
      if (me.role !== "assessor") return json({ error: "Apenas o assessor entra nos grupos." }, 403);
      if (!code) return json({ error: "faltou o code." }, 400);
      const r = await evo("/group/acceptInviteCode/" + inst + "?inviteCode=" + code);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return json({ error: j?.message || j?.error || "Não consegui entrar no grupo." }, 400);
      const jid = j?.groupJid || j?.id || null;
      const info = await inviteInfo(code);
      await admin.from("wpp_groups").update({ joined: true, jid: jid || info.jid || null, ...(info.nome ? { nome: info.nome } : {}), ...(info.membros ? { membros: info.membros } : {}) }).eq("tenant_id", tenant).eq("invite_code", code);
      return json({ ok: true, jid: jid || info.jid || null });
    }

    // ---- assessor envia como Assessoria ----
    if (action === "send") {
      if (me.role !== "assessor") return json({ error: "Apenas o assessor envia." }, 403);
      if (!to || !text) return json({ error: "faltou destino/texto." }, 400);
      const r = await evo("/message/sendText/" + inst, { method: "POST", body: JSON.stringify({ number: to, text }) });
      const j = await r.json().catch(() => ({}));
      return json({ ok: r.ok, result: j });
    }

    return json({ error: "ação inválida" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message || String(e) }, 500);
  }
});
