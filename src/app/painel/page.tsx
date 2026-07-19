import { createClient } from "@/lib/supabase/server";
import { getMe, getTenantRanking } from "@/lib/politix/rpc";
import { campaignCurve, dailyBuckets } from "@/lib/politix/charts";
import { nf } from "@/lib/politix/format";

const C = 2 * Math.PI * 50; // circunferência do donut (r=50)

export default async function VisaoGeral() {
  const supabase = await createClient();
  const [me, ranking, lidRes] = await Promise.all([
    getMe(supabase),
    getTenantRanking(supabase).catch(() => []),
    supabase.from("liderado").select("city, created_at").limit(20000),
  ]);
  const lids = (lidRes.data ?? []) as { city: string | null; created_at: string }[];
  const now = Date.now();
  const DAY = 86400000;

  const dates = lids.map((l) => new Date(l.created_at));
  const total = lids.length;
  const last24h = dates.filter((d) => now - d.getTime() <= DAY).length;
  const metaTotal = ranking.reduce((a, r) => a + (r.meta ?? 0), 0);
  const pct = metaTotal ? Math.round((total / metaTotal) * 100) : 0;
  const parados = ranking.filter((r) => (r.rate_7d ?? 0) === 0);
  const comPromessa = ranking.filter((r) => (r.meta ?? 0) > 0).length;
  const days = me?.election_date ? Math.max(0, Math.ceil((+new Date(me.election_date + "T00:00:00") - now) / DAY)) : 0;

  // ritmo 7d + curva
  const b7 = dailyBuckets(dates, 7, now);
  const rate7 = b7.reduce((a, b) => a + b, 0) / 7;
  const b45 = dailyBuckets(dates, 45, now);
  const base45 = total - b45.reduce((a, b) => a + b, 0);
  let run = base45;
  const cumulative = b45.map((c) => (run += c));
  const curve = campaignCurve({ cumulative, meta: metaTotal, daysLeft: days, rate: rate7 });

  // cadastros por dia (30)
  const b30 = dailyBuckets(dates, 30, now);
  const max30 = Math.max(1, ...b30);
  const media30 = Math.round(b30.reduce((a, b) => a + b, 0) / 30);

  // % da meta por líder (top 8)
  const top8 = ranking.slice(0, 8);

  // donut cobertura das praças-chave (proxy por cidade — TSE real na Fase 4)
  const cityCount: Record<string, number> = {};
  lids.forEach((l) => { const c = l.city || "—"; cityCount[c] = (cityCount[c] || 0) + 1; });
  const covered = new Set<string>();
  ranking.forEach((r) => (r.cities ?? []).forEach((c) => covered.add(c)));
  const cities = Object.keys(cityCount).filter((c) => c !== "—");
  const coveredCities = cities.filter((c) => covered.has(c));
  const semLider = cities.filter((c) => !covered.has(c)).sort((a, b) => cityCount[b] - cityCount[a]);
  const covVals = coveredCities.map((c) => cityCount[c]).sort((a, b) => a - b);
  const med = covVals.length ? covVals[Math.floor(covVals.length / 2)] : 0;
  const cobertas = coveredCities.filter((c) => cityCount[c] >= med).length;
  const abaixo = coveredCities.length - cobertas;
  const priorizar = semLider.length;
  const donutTotal = cobertas + abaixo + priorizar || 1;
  const donutPct = Math.round((cobertas / donutTotal) * 100);
  const donutSegs = [
    { cor: "var(--color-gray-1000)", n: cobertas },
    { cor: "var(--color-gray-700)", n: abaixo },
    { cor: "var(--color-accent)", n: priorizar },
  ];
  let acc = 0;
  const donutArcs = donutSegs.map((s) => { const dash = (s.n / donutTotal) * C; const off = -acc; acc += dash; return { cor: s.cor, dash: `${dash} ${C - dash}`, off }; });
  const donutLeg = [
    { cor: "var(--color-gray-1000)", label: "Cobertas", n: cobertas },
    { cor: "var(--color-gray-700)", label: "Abaixo do potencial", n: abaixo },
    { cor: "var(--color-accent)", label: "Priorizar (sem rede)", n: priorizar },
  ];

  const kpis = [
    { label: "Meta total", valor: nf.format(metaTotal), sub: `${comPromessa} líderes com promessa`, cor: "var(--color-muted-foreground)" },
    { label: "Realizado (dedup por WhatsApp)", valor: nf.format(total), sub: `+${last24h} nas últimas 24h`, cor: "var(--color-muted-foreground)" },
    { label: "% da meta", valor: `${pct}%`, sub: `faltam ${days} dias`, cor: "var(--color-muted-foreground)" },
    { label: "Líderes sem ritmo", valor: String(parados.length), sub: "parados há 7+ dias", cor: parados.length ? "var(--color-highlight)" : "var(--color-muted-foreground)" },
  ];

  const mono11 = { fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" as const, color: "var(--color-foreground)", whiteSpace: "nowrap" as const };
  const cardHead = { display: "flex", flexWrap: "wrap" as const, gap: "2px 12px", alignItems: "baseline", justifyContent: "space-between" };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "18px 20px", background: "var(--color-background)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-muted-foreground)", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.5px", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{k.valor}</div>
            <div style={{ fontSize: 11.5, marginTop: 6, fontWeight: 500, color: k.cor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Banner detecção de talento */}
      {top8.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", border: "1px solid var(--color-border)", borderLeft: "3px solid var(--color-accent)", padding: "16px 20px", background: "var(--color-background-100) repeating-linear-gradient(-45deg,var(--color-hairline) 0 1px,transparent 1px 6px)", color: "var(--color-foreground)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: "min(100%,320px)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 3 }}><path d="M12 14.5a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm-3.2 1.6L7.5 21.5l4.5-2.6 4.5 2.6-1.3-5.4" /></svg>
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 18, letterSpacing: "-.2px", lineHeight: 1.25 }}>Detecção de talento: promova {top8[0].name}</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, lineHeight: 1.45 }}>Lidera com {Math.round(top8[0].pct ?? 0)}% da meta e ritmo de {(top8[0].rate_7d ?? 0).toFixed(1)}/dia. Considere dar cidades próprias a quem cresce mais rápido que o time.</div>
            </div>
          </div>
          <button style={{ height: 38, padding: "0 16px", border: "none", borderRadius: "var(--radius-sm)", background: "var(--color-foreground)", color: "var(--color-background)", fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}>Ver o ramo</button>
        </div>
      )}

      {/* Curva + Cobertura */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 16, alignItems: "stretch", marginBottom: 16 }}>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", padding: "16px 20px 12px" }}>
          <div style={{ ...cardHead, marginBottom: 10 }}>
            <span style={mono11}>Curva da campanha</span>
            <span style={{ fontSize: 11.5, color: "var(--color-gray-600)" }}>cadastros acumulados (dedup) · projeção até 04/10</span>
          </div>
          <div style={{ position: "relative" }}>
            <svg viewBox="0 0 640 250" style={{ width: "100%", display: "block" }}>
              <line x1="16" x2="624" y1={curve.metaY} y2={curve.metaY} style={{ stroke: "var(--color-gray-600)" }} strokeWidth="1" strokeDasharray="1 3" />
              <path d={curve.area} fill="rgba(237,237,237,.06)" />
              <path d={curve.line} fill="none" style={{ stroke: "var(--color-foreground)" }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <path d={curve.proj} fill="none" stroke="#666666" strokeWidth="1.8" strokeDasharray="5 5" strokeLinecap="round" />
              <line x1={curve.hojeX} x2={curve.hojeX} y1="20" y2="228" style={{ stroke: "var(--color-border)" }} strokeWidth="1" />
              <text x={curve.hojeX} y="13" textAnchor="middle" style={{ fill: "var(--color-gray-600)" }} fontSize="10">hoje</text>
              <circle cx={curve.hojeX} cy={curve.hojeY} r="4" style={{ fill: "var(--color-foreground)", stroke: "var(--color-background)" }} strokeWidth="1.5" />
              <circle cx={curve.projX} cy={curve.projY} r="3.5" fill="none" stroke="#666666" strokeWidth="1.6" />
            </svg>
            <span style={{ position: "absolute", right: "3%", top: curve.metaTopPct, fontSize: 10.5, fontWeight: 500, color: "var(--color-muted-foreground)" }}>Meta {nf.format(metaTotal)}</span>
            <span style={{ position: "absolute", right: "1%", top: curve.projTopPct, fontSize: 11, fontWeight: 600, color: "var(--color-foreground)" }}>{nf.format(curve.projected)}</span>
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, color: "var(--color-muted-foreground)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2, background: "var(--color-foreground)" }} />realizado</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, borderTop: "2px dashed #666666" }} />projeção</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, borderTop: "2px dotted var(--color-gray-600)" }} />meta</span>
          </div>
        </div>

        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ ...cardHead, padding: "16px 20px 8px" }}>
            <span style={mono11}>Cobertura — São Paulo</span>
            <span style={{ fontSize: 11, color: "var(--color-gray-600)" }}>contorno oficial IBGE</span>
          </div>
          <div style={{ flex: "1 1 auto", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "repeating-linear-gradient(-45deg,var(--color-hairline) 0 1px,transparent 1px 7px)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", color: "var(--color-gray-600)" }}>MAPA IBGE · FASE 4</span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "8px 20px 12px", fontSize: 11, color: "var(--color-muted-foreground)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-gray-1000)" }} />coberto</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-gray-700)" }} />parcial</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-highlight)" }} />priorizar</span>
          </div>
        </div>
      </div>

      {/* Cadastros/dia + %meta + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", padding: "16px 20px" }}>
          <div style={{ ...cardHead, marginBottom: 14 }}>
            <span style={mono11}>Cadastros por dia</span>
            <span style={{ fontSize: 11, color: "var(--color-gray-600)" }}>últimos 30 dias</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2.5, height: 130 }}>
            {b30.map((c, i) => (
              <div key={i} title={`${c} cadastros`} style={{ flex: 1, borderRadius: "var(--radius-sm)", background: i === b30.length - 1 ? "var(--color-accent)" : "var(--color-gray-800)", height: `${Math.max(3, (c / max30) * 120)}px` }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-gray-600)", marginTop: 6 }}><span>-30d</span><span>média {media30}/dia</span><span>hoje</span></div>
        </div>

        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", padding: "16px 20px" }}>
          <div style={{ ...cardHead, marginBottom: 14 }}>
            <span style={mono11}>% da meta por líder</span>
            <span style={{ fontSize: 11, color: "var(--color-gray-600)" }}>top 8 · clique abre o raio-x</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {top8.map((vl) => {
              const p = Math.max(0, Math.min(100, Math.round(vl.pct ?? 0)));
              return (
                <div key={vl.leader_id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 92, flexShrink: 0, fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right", color: "var(--color-foreground)" }}>{vl.name}</span>
                  <div style={{ flex: 1, height: 14, background: "var(--color-gray-300)", overflow: "hidden" }}><div className="px-bar-fill" style={{ height: "100%", width: `${p}%`, background: "var(--color-foreground)" }} /></div>
                  <span style={{ width: 36, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "var(--color-foreground)" }}>{p}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", padding: "16px 20px" }}>
          <div style={{ ...cardHead, marginBottom: 14 }}>
            <span style={mono11}>Cobertura das praças-chave</span>
            <span style={{ fontSize: 11, color: "var(--color-gray-600)" }}>{donutTotal} cidades com teto relevante</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ position: "relative", width: 130, height: 130, flexShrink: 0 }}>
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ display: "block" }}>
                {donutArcs.map((a, i) => (
                  <circle key={i} cx="65" cy="65" r="50" fill="none" stroke={a.cor} strokeWidth="16" strokeDasharray={a.dash} strokeDashoffset={a.off} transform="rotate(-90 65 65)" />
                ))}
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{donutPct}%</span>
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".8px", color: "var(--color-gray-600)", marginTop: 2 }}>COBERTAS</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {donutLeg.map((vg) => (
                <div key={vg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", flexShrink: 0, background: vg.cor }} />
                  <span style={{ flex: 1, color: "var(--color-foreground)" }}>{vg.label}</span>
                  <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{vg.n}</span>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: "var(--color-gray-600)", lineHeight: 1.45, marginTop: 2 }}>maior gap: {semLider[0] ?? "—"} — cidade sem líder</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
