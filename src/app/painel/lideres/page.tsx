import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import type { RankingRow } from "@/lib/politix/types";
import { leaderStatus, pctClamp } from "@/lib/politix/format";

export default async function RankingLideres() {
  const supabase = await createClient();
  let ranking: RankingRow[] = [];
  try {
    ranking = await getTenantRanking(supabase);
  } catch {
    ranking = [];
  }

  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Pódio */}
      {podium.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {podium.map((r, i) => {
            const p = pctClamp(r.pct);
            const st = leaderStatus(r);
            const medal = ["#e5e5e5", "#b0b0b0", "#8a6a45"][i];
            return (
              <div key={r.leader_id} className="px-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: medal }}>{i + 1}º</span>
                  <span className="mono" style={{ fontSize: 10.5, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{(r.cities ?? []).slice(0, 3).join(" · ") || "—"}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <span className="tnum" style={{ fontSize: 26, fontWeight: 800 }}>{p}%</span>
                  <span className="tnum mono" style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{Number(r.realizado)}/{r.meta}</span>
                </div>
                <div style={{ height: 6, background: "var(--color-gray-300)", borderRadius: 999, overflow: "hidden" }}>
                  <div className="px-bar-fill" style={{ width: `${p}%`, height: "100%", background: st.key === "parado" ? "var(--color-highlight)" : "var(--color-foreground)" }} />
                </div>
                <div className="mono tnum" style={{ fontSize: 10.5, color: "var(--color-muted-foreground)" }}>ritmo {(r.rate_7d ?? 0).toFixed(1)}/dia</div>
              </div>
            );
          })}
        </section>
      )}

      {/* Lista */}
      <section className="px-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="mono" style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
          Ranking completo · {ranking.length} líderes
        </div>
        {ranking.length === 0 ? (
          <div style={{ padding: 24, fontSize: 13.5, color: "var(--color-muted-foreground)" }}>Nenhum líder ainda.</div>
        ) : (
          rest.map((r, i) => {
            const p = pctClamp(r.pct);
            const st = leaderStatus(r);
            return (
              <div key={r.leader_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderBottom: "1px solid var(--color-border)" }}>
                <span className="mono tnum" style={{ width: 24, color: "var(--color-muted-foreground)", fontSize: 12 }}>{String(i + 4).padStart(2, "0")}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{(r.cities ?? []).slice(0, 3).join(" · ") || "—"}</div>
                </div>
                <span className="mono" style={{ fontSize: 10.5, color: st.color, width: 62, textAlign: "right" }}>{st.label}</span>
                <span className="mono tnum" style={{ fontSize: 11.5, color: "var(--color-muted-foreground)", width: 70, textAlign: "right" }}>{(r.rate_7d ?? 0).toFixed(1)}/dia</span>
                <div style={{ width: 140, height: 6, background: "var(--color-gray-300)", borderRadius: 999, overflow: "hidden" }}>
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
