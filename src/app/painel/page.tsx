import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import type { RankingRow } from "@/lib/politix/types";
import { leaderStatus, nf, pctClamp } from "@/lib/politix/format";

// Visão geral do assessor (conteúdo; o layout provê sidebar + topbar).
export default async function VisaoGeral() {
  const supabase = await createClient();
  let ranking: RankingRow[] = [];
  try {
    ranking = await getTenantRanking(supabase);
  } catch {
    ranking = [];
  }

  const metaTotal = ranking.reduce((a, r) => a + (r.meta ?? 0), 0);
  const realizado = ranking.reduce((a, r) => a + Number(r.realizado ?? 0), 0);
  const pct = metaTotal ? Math.round((realizado / metaTotal) * 100) : 0;
  const parados = ranking.filter((r) => (r.rate_7d ?? 0) === 0);

  const kpis = [
    { label: "Meta total", value: nf.format(metaTotal), amber: false },
    { label: "Realizado (dedup)", value: nf.format(realizado), amber: false },
    { label: "% da meta", value: `${pct}%`, amber: false },
    { label: "Líderes sem ritmo 7d", value: String(parados.length), amber: parados.length > 0 },
  ];

  const top = [...ranking].slice(0, 6);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* KPIs */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <div key={k.label} className="px-card" style={{ padding: 18 }}>
            <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-muted-foreground)" }}>{k.label}</div>
            <div className="tnum" style={{ fontSize: 30, fontWeight: 800, marginTop: 6, letterSpacing: "-.02em", color: k.amber ? "var(--color-highlight)" : "var(--color-foreground)" }}>{k.value}</div>
          </div>
        ))}
      </section>

      {/* Banner de detecção de talento (hachura) */}
      {top.length > 0 && (
        <section className="px-card px-hatch" style={{ padding: "16px 18px" }}>
          <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-highlight)" }}>Detecção de talento</div>
          <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.5, maxWidth: 720 }}>
            <b>{top[0].name}</b> lidera com {pctClamp(top[0].pct)}% da meta e ritmo de {(top[0].rate_7d ?? 0).toFixed(1)}/dia.
            Acompanhe os ramos que crescem mais rápido que o líder acima — candidatos naturais a promoção.
          </div>
        </section>
      )}

      {/* Ranking (prévia) */}
      <section className="px-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--color-border)" }}>
          <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>Ranking de líderes</span>
          <Link href="/painel/lideres" className="mono" style={{ fontSize: 11, color: "var(--color-accent)" }}>ver tudo →</Link>
        </div>
        {top.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13.5, color: "var(--color-muted-foreground)" }}>
            Nenhum líder ainda. Convide as primeiras lideranças para a rede começar a crescer.
          </div>
        ) : (
          top.map((r, i) => {
            const p = pctClamp(r.pct);
            const st = leaderStatus(r);
            return (
              <div key={r.leader_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderBottom: "1px solid var(--color-border)" }}>
                <span className="mono tnum" style={{ width: 22, color: "var(--color-muted-foreground)", fontSize: 12 }}>{String(i + 1).padStart(2, "0")}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{(r.cities ?? []).slice(0, 3).join(" · ") || "—"}</div>
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: st.color, width: 62, textAlign: "right" }}>{st.label}</span>
                <div style={{ width: 120, height: 6, background: "var(--color-gray-300)", borderRadius: 999, overflow: "hidden" }}>
                  <div className="px-bar-fill" style={{ width: `${p}%`, height: "100%", background: st.key === "parado" ? "var(--color-highlight)" : "var(--color-foreground)" }} />
                </div>
                <span className="tnum" style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{p}%</span>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
