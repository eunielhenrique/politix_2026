import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, getTenantRanking } from "@/lib/politix/rpc";
import type { RankingRow } from "@/lib/politix/types";

// Painel do assessor — Visão geral. Skeleton ligado ao RPC; telas completas na Fase 3.
export default async function AssessorPanel() {
  const supabase = await createClient();
  const me = await getMe(supabase);
  if (!me || !me.tenant_id) redirect("/onboarding");
  if (me.role !== "assessor") redirect("/app");

  let ranking: RankingRow[] = [];
  try {
    ranking = await getTenantRanking(supabase);
  } catch {
    ranking = [];
  }

  const metaTotal = ranking.reduce((a, r) => a + (r.meta ?? 0), 0);
  const realizado = ranking.reduce((a, r) => a + (r.realizado ?? 0), 0);
  const pct = metaTotal ? Math.round((realizado / metaTotal) * 100) : 0;
  const semRitmo = ranking.filter((r) => (r.rate_7d ?? 0) === 0).length;

  const kpis = [
    { label: "Meta total", value: metaTotal.toLocaleString("pt-BR"), amber: false },
    { label: "Realizado (dedup)", value: realizado.toLocaleString("pt-BR"), amber: false },
    { label: "% da meta", value: `${pct}%`, amber: false },
    { label: "Líderes parados", value: String(semRitmo), amber: semRitmo > 0 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-100)" }}>
      {/* Breadcrumb slim */}
      <header className="px-sticky" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mono" style={{ fontSize: 12.5, color: "var(--color-muted-foreground)" }}>
          <span style={{ color: "var(--color-foreground)", fontWeight: 700, letterSpacing: ".08em" }}>POLITIX</span> › visão geral
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{me.tenant_name ?? "Campanha"} · Assessoria</div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* KPIs */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} className="px-card" style={{ padding: 18 }}>
              <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-muted-foreground)" }}>{k.label}</div>
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, marginTop: 6, letterSpacing: "-.02em", color: k.amber ? "var(--color-highlight)" : "var(--color-foreground)" }}>
                {k.value}
              </div>
            </div>
          ))}
        </section>

        {/* Ranking (prévia) */}
        <section className="px-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="mono" style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
            Ranking de líderes
          </div>
          {ranking.length === 0 ? (
            <div style={{ padding: 24, fontSize: 13.5, color: "var(--color-muted-foreground)" }}>
              Nenhum líder ainda. Convide as primeiras lideranças para a rede começar a crescer.
            </div>
          ) : (
            ranking.slice(0, 12).map((r, i) => {
              const p = Math.max(0, Math.min(100, Math.round(r.pct ?? 0)));
              return (
                <div key={r.leader_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid var(--color-border)" }}>
                  <span className="mono tnum" style={{ width: 22, color: "var(--color-muted-foreground)", fontSize: 12 }}>{String(i + 1).padStart(2, "0")}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{(r.cities ?? []).slice(0, 3).join(" · ") || "—"}</div>
                  </div>
                  <div style={{ width: 120, height: 6, background: "var(--color-gray-300)", borderRadius: 999, overflow: "hidden" }}>
                    <div className="px-bar-fill" style={{ width: `${p}%`, height: "100%", background: (r.rate_7d ?? 0) === 0 ? "var(--color-highlight)" : "var(--color-foreground)" }} />
                  </div>
                  <span className="tnum" style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{p}%</span>
                </div>
              );
            })
          )}
        </section>

        <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)" }}>
          Mapa rede×família, rankings completos, grupos e Politix IA chegam nas próximas etapas.
        </div>
      </main>
    </div>
  );
}
