import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import { nf, MEDAL } from "@/lib/politix/format";

interface CityRow { city: string; liderados: number; lideres: number; }

export default async function RankingCidades() {
  const supabase = await createClient();
  const { data: lids } = await supabase.from("liderado").select("city").limit(20000);
  const cityCount: Record<string, number> = {};
  (lids ?? []).forEach((l: { city: string | null }) => { const c = l.city || "Sem cidade"; cityCount[c] = (cityCount[c] || 0) + 1; });

  let leadersPerCity: Record<string, number> = {};
  try {
    const ranking = await getTenantRanking(supabase);
    ranking.forEach((r) => (r.cities ?? []).forEach((c) => (leadersPerCity[c] = (leadersPerCity[c] || 0) + 1)));
  } catch { leadersPerCity = {}; }

  const rows: CityRow[] = Object.entries(cityCount)
    .filter(([c]) => c !== "Sem cidade")
    .map(([city, liderados]) => ({ city, liderados, lideres: leadersPerCity[city] || 0 }))
    .sort((a, b) => b.liderados - a.liderados);
  const max = rows[0]?.liderados || 1;
  const podio = rows.slice(0, 3);

  const cityStatus = (r: CityRow) => r.lideres > 0
    ? { label: "Coberta", bg: "var(--color-muted)", fg: "var(--color-foreground)" }
    : { label: "Priorizar", bg: "var(--color-highlight-dim)", fg: "var(--color-highlight)" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "4px 0 14px" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "1.5px", color: "var(--color-gray-600)" }}>PÓDIO DAS CIDADES</span>
      </div>

      {/* Pódio */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, alignItems: "end", marginBottom: 24 }}>
        {podio.map((r, i) => {
          const st = cityStatus(r);
          return (
            <div key={r.city} style={{ border: `1px solid ${i === 0 ? "var(--color-gray-600)" : "var(--color-border)"}`, borderRadius: "var(--radius-sm)", background: i === 0 ? "var(--color-background-200)" : "var(--color-background)", padding: 18, textAlign: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: MEDAL[i], color: "#000" }}>{i + 1}º</div>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 19, letterSpacing: "-.2px" }}>{r.city}</div>
              <div style={{ fontSize: 11.5, color: "var(--color-muted-foreground)", marginTop: 1 }}>{r.lideres} {r.lideres === 1 ? "líder" : "líderes"}</div>
              <span style={{ display: "inline-block", marginTop: 8, padding: "3px 12px", borderRadius: "var(--radius-sm)", fontSize: 10.5, fontWeight: 600, background: st.bg, color: st.fg }}>{st.label}</span>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 16px", marginTop: 12 }}>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px", color: "var(--color-gray-600)" }}>—</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>POTENCIAL</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px" }}>{nf.format(r.liderados)}</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>LIDERADOS</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.4px", color: "var(--color-gray-600)" }}>—</div><div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>CONV./MIL</div></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela */}
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Ranking completo</span>
          <span style={{ fontSize: 11.5, color: "var(--color-gray-600)" }}>{rows.length} cidades mapeadas · ref. TSE nunca soma com cadastros</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", borderBottom: "1px solid var(--color-border)", fontSize: 9.5, fontWeight: 600, letterSpacing: "1px", color: "var(--color-gray-600)" }}>
              <span style={{ width: 26, flexShrink: 0 }}>#</span>
              <span style={{ flex: 1, minWidth: 110 }}>CIDADE</span>
              <span style={{ width: 130, minWidth: 90 }}>POTENCIAL (0–100)</span>
              <span style={{ width: 64, textAlign: "right", flexShrink: 0 }}>LIDERADOS</span>
              <span style={{ width: 48, textAlign: "right", flexShrink: 0 }}>LÍDERES</span>
              <span style={{ width: 110, minWidth: 80 }}>CONVERSÃO /MIL</span>
              <span style={{ width: 118, textAlign: "center", flexShrink: 0 }}>STATUS</span>
            </div>
            {rows.map((r, i) => {
              const st = cityStatus(r);
              return (
                <div key={r.city} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: "var(--radius-sm)", background: "var(--color-background-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--color-muted-foreground)" }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 110, fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.city}</span>
                  <span style={{ width: 130, minWidth: 90 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--color-gray-600)" }}>—</span>
                    <span style={{ display: "block", height: 4, borderRadius: "var(--radius-sm)", background: "var(--color-gray-300)", marginTop: 4 }} />
                  </span>
                  <span style={{ width: 64, textAlign: "right", flexShrink: 0, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{nf.format(r.liderados)}</span>
                  <span style={{ width: 48, textAlign: "right", flexShrink: 0, fontSize: 12.5, fontVariantNumeric: "tabular-nums", color: r.lideres === 0 ? "var(--color-highlight)" : "var(--color-foreground)" }}>{r.lideres}</span>
                  <span style={{ width: 110, minWidth: 80 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--color-gray-600)" }}>—</span>
                    <span style={{ display: "block", height: 4, borderRadius: "var(--radius-sm)", background: "var(--color-gray-300)", marginTop: 4 }} />
                  </span>
                  <span style={{ width: 118, flexShrink: 0, textAlign: "center", fontSize: 10.5, fontWeight: 600, padding: "4px 0", borderRadius: "var(--radius-sm)", background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "12px 20px", fontSize: 11, color: "var(--color-gray-600)" }}>Potencial (histórico TSE da família) e conversão /mil entram com a consolidação por município — Fase 4. Ref. TSE nunca soma com cadastros.</div>
      </div>
    </div>
  );
}
