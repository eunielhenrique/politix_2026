import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import type { RankingRow } from "@/lib/politix/types";
import { leaderStatus, statusPill, pctClamp, nf, MEDAL, initials } from "@/lib/politix/format";

export default async function RankingLideres() {
  const supabase = await createClient();
  let ranking: RankingRow[] = [];
  try {
    ranking = await getTenantRanking(supabase);
  } catch {
    ranking = [];
  }
  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "4px 0 14px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "1.5px", color: "var(--color-gray-600)" }}>PÓDIO</span>
      </div>

      {/* Pódio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "end", marginBottom: 24 }}>
        {podio.map((r, i) => {
          const st = leaderStatus(r);
          const pill = statusPill(st);
          const p = pctClamp(r.pct);
          const emph = i === 0;
          return (
            <div key={r.leader_id} style={{ border: `1px solid ${emph ? "var(--color-gray-600)" : "var(--color-border)"}`, borderRadius: "var(--radius-sm)", background: emph ? "var(--color-background-200)" : "var(--color-background)", padding: emph ? "22px 18px" : "18px", textAlign: "center", position: "relative" }}>
              <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: MEDAL[i], color: "#000" }}>{i + 1}º</div>
              <div style={{ width: emph ? 54 : 46, height: emph ? 54 : 46, borderRadius: "var(--radius-sm)", margin: "0 auto", background: "var(--color-gray-300)", border: `2.5px solid ${MEDAL[i]}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: emph ? 20 : 17 }}>{initials(r.name)}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 17, letterSpacing: "-.2px", marginTop: 10 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-muted-foreground)", marginTop: 1 }}>{(r.cities ?? []).slice(0, 2).join(" · ") || "—"}</div>
              <span style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: "var(--radius-sm)", fontSize: 10.5, fontWeight: 600, background: pill.bg, color: pill.fg }}>{st.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", marginTop: 12 }}>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px", color: st.color }}>{p}%</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>DA META</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px" }}>{Number(r.realizado)}</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>VOTOS</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px" }}>{(r.rate_7d ?? 0).toFixed(1)}</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>RITMO/DIA</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Ranking completo</span>
          <span style={{ fontSize: 11.5, color: "var(--color-gray-600)" }}>{ranking.length} líderes ativos</span>
        </div>
        {resto.map((r, i) => {
          const st = leaderStatus(r);
          const pill = statusPill(st);
          const p = pctClamp(r.pct);
          return (
            <div key={r.leader_id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ width: 26, height: 26, borderRadius: "var(--radius-sm)", background: "var(--color-background-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--color-muted-foreground)" }}>{i + 4}</span>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--color-gray-300)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{initials(r.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{(r.cities ?? []).slice(0, 3).join(" · ") || "—"}</div>
              </div>
              <span style={{ padding: "3px 12px", borderRadius: "var(--radius-sm)", fontSize: 10.5, fontWeight: 600, background: pill.bg, color: pill.fg, whiteSpace: "nowrap" }}>{st.label}</span>
              <span style={{ width: 52, textAlign: "right", fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: st.color }}>{p}%</span>
              <span style={{ width: 88, textAlign: "center", padding: "6px 0", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{(r.rate_7d ?? 0).toFixed(1)}</span>
                <span style={{ display: "block", fontSize: 8.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>RITMO/DIA</span>
              </span>
            </div>
          );
        })}
        {ranking.length === 0 && <div style={{ padding: 24, fontSize: 13.5, color: "var(--color-muted-foreground)" }}>Nenhum líder ainda.</div>}
      </div>
    </div>
  );
}
