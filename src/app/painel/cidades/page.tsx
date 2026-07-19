import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import { nf } from "@/lib/politix/format";

interface CityRow {
  city: string;
  liderados: number;
  lideres: number;
}

export default async function RankingCidades() {
  const supabase = await createClient();

  const { data: lids } = await supabase.from("liderado").select("city").limit(5000);
  const cityCount: Record<string, number> = {};
  (lids ?? []).forEach((l: { city: string | null }) => {
    const c = l.city || "Sem cidade";
    cityCount[c] = (cityCount[c] || 0) + 1;
  });

  let leadersPerCity: Record<string, number> = {};
  try {
    const ranking = await getTenantRanking(supabase);
    ranking.forEach((r) => (r.cities ?? []).forEach((c) => (leadersPerCity[c] = (leadersPerCity[c] || 0) + 1)));
  } catch {
    leadersPerCity = {};
  }

  const rows: CityRow[] = Object.entries(cityCount)
    .map(([city, liderados]) => ({ city, liderados, lideres: leadersPerCity[city] || 0 }))
    .sort((a, b) => b.liderados - a.liderados);

  const max = rows[0]?.liderados || 1;
  const podium = rows.slice(0, 3);
  const semLider = rows.filter((r) => r.lideres === 0 && r.city !== "Sem cidade");

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
      {podium.length > 0 && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {podium.map((r, i) => (
            <div key={r.city} className="px-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="mono tnum" style={{ fontSize: 20, fontWeight: 800, color: ["#e5e5e5", "#b0b0b0", "#8a6a45"][i] }}>{i + 1}º</span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{r.city}</div>
              <div className="tnum" style={{ fontSize: 26, fontWeight: 800 }}>{nf.format(r.liderados)}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--color-muted-foreground)" }}>liderados · {r.lideres} {r.lideres === 1 ? "líder" : "líderes"}</div>
            </div>
          ))}
        </section>
      )}

      <section className="px-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="mono" style={{ padding: "12px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
          Cidades · {rows.length}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 70px 160px", gap: 12, padding: "8px 18px", borderBottom: "1px solid var(--color-border)", color: "var(--color-muted-foreground)" }} className="mono">
          <span style={{ fontSize: 10 }}>#</span>
          <span style={{ fontSize: 10 }}>CIDADE</span>
          <span style={{ fontSize: 10, textAlign: "right" }}>LIDERADOS</span>
          <span style={{ fontSize: 10, textAlign: "right" }}>LÍDERES</span>
          <span style={{ fontSize: 10 }}>VOLUME</span>
        </div>
        {rows.map((r, i) => (
          <div key={r.city} style={{ display: "grid", gridTemplateColumns: "28px 1fr 90px 70px 160px", gap: 12, alignItems: "center", padding: "10px 18px", borderBottom: "1px solid var(--color-border)" }}>
            <span className="mono tnum" style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{i + 1}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.city}</span>
            <span className="tnum" style={{ fontSize: 13, textAlign: "right", fontWeight: 700 }}>{nf.format(r.liderados)}</span>
            <span className="tnum" style={{ fontSize: 13, textAlign: "right", color: r.lideres === 0 ? "var(--color-highlight)" : "var(--color-foreground)" }}>{r.lideres}</span>
            <div style={{ height: 6, background: "var(--color-gray-300)", borderRadius: 999, overflow: "hidden" }}>
              <div className="px-bar-fill" style={{ width: `${Math.round((r.liderados / max) * 100)}%`, height: "100%", background: r.lideres === 0 ? "var(--color-highlight)" : "var(--color-foreground)" }} />
            </div>
          </div>
        ))}
      </section>

      {semLider.length > 0 && (
        <section className="px-card px-hatch" style={{ padding: "16px 18px" }}>
          <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-highlight)" }}>Votam e não têm líder</div>
          <div style={{ fontSize: 13.5, marginTop: 6, lineHeight: 1.6 }}>
            {semLider.slice(0, 8).map((r) => `${r.city} (${r.liderados})`).join(" · ")}
          </div>
        </section>
      )}
    </main>
  );
}
