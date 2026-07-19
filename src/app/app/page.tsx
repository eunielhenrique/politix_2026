import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, getLeaderScoreboard } from "@/lib/politix/rpc";
import type { Scoreboard } from "@/lib/politix/types";

// App do líder — Placar (home). Skeleton ligado ao RPC; telas completas na Fase 2.
export default async function LeaderHome() {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me || !me.tenant_id) redirect("/onboarding");
  if (me.role === "assessor") redirect("/painel");

  let sb: Scoreboard | null = null;
  try {
    sb = await getLeaderScoreboard(supabase);
  } catch {
    sb = null;
  }

  const pct = Math.max(0, Math.min(100, Math.round(sb?.pct ?? 0)));
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  const batendo = (sb?.projected ?? 0) >= (sb?.meta ?? 0);

  return (
    <main style={{ maxWidth: 440, margin: "0 auto", padding: "18px 16px 96px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* App bar */}
      <header className="px-sticky" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "-18px -16px 0", padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <span className="mono" style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".14em" }}>POLITIX</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{me.name ?? "Líder"}</span>
      </header>

      {/* Anel da meta */}
      <section className="px-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
          Progresso da promessa
        </div>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-gray-300)" strokeWidth="10" />
            <circle
              cx="70" cy="70" r={R} fill="none"
              stroke="var(--color-foreground)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`} transform="rotate(-90 70 70)"
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div className="tnum" style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>{pct}%</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--color-muted-foreground)" }}>DA META</div>
          </div>
        </div>
        <div className="tnum" style={{ fontSize: 15 }}>
          <b>{sb?.realizado ?? 0}</b> <span style={{ color: "var(--color-muted-foreground)" }}>de {sb?.meta ?? 0} votos</span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 12, padding: "5px 10px", borderRadius: "var(--radius-full)",
            color: batendo ? "var(--color-positive)" : "var(--color-highlight)",
            background: batendo ? "rgba(61,214,140,.12)" : "var(--color-highlight-dim)",
          }}
        >
          {batendo ? "PROJEÇÃO: BATE A META" : "PROJEÇÃO: FURA A META"} · {sb?.projected ?? 0}
        </div>
      </section>

      {/* Mini-cards */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="px-card" style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: ".08em" }}>Ritmo 7d</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{(sb?.rate_7d ?? 0).toFixed(1)}<span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>/dia</span></div>
        </div>
        <div className="px-card" style={{ padding: 14 }}>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: ".08em" }}>Faltam</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{sb?.days_left ?? "—"}<span style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}> dias</span></div>
        </div>
      </section>

      <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)", textAlign: "center" }}>
        Placar completo, linha do tempo e cadastro chegam na próxima etapa.
      </div>
    </main>
  );
}
