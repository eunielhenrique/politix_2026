import { createClient } from "@/lib/supabase/server";
import { leaderTarget, getLeaderScoreboard, getLeaderDailySeries } from "@/lib/politix/rpc";
import { leaderTimeline } from "@/lib/politix/charts";
import type { Scoreboard, DailyPoint } from "@/lib/politix/types";
import { initials } from "@/lib/politix/format";
import { Icon } from "@/components/painel/icons";

const RC = 2 * Math.PI * 52; // anel r=52

export default async function Placar() {
  const supabase = await createClient();
  const t = await leaderTarget(supabase);
  const leaderId = t.leaderId ?? undefined;

  const [row, sb, series] = await Promise.all([
    leaderId ? supabase.from("leader").select("name, cities").eq("id", leaderId).single() : Promise.resolve({ data: null }),
    getLeaderScoreboard(supabase, leaderId).catch(() => null) as Promise<Scoreboard | null>,
    getLeaderDailySeries(supabase, leaderId, 90).catch(() => [] as DailyPoint[]),
  ]);

  const leaderRow = (row.data ?? null) as { name: string; cities: string[] } | null;
  const nome = leaderRow?.name ?? t.name;
  const local = (leaderRow?.cities ?? []).join(" · ") || "São Paulo";

  const pct = Math.max(0, Math.min(100, Math.round(sb?.pct ?? 0)));
  const meta = sb?.meta ?? 0;
  const realizado = sb?.realizado ?? 0;
  const projected = sb?.projected ?? 0;
  const days = sb?.days_left ?? 0;
  const rate = sb?.rate_7d ?? 0;
  const batendo = projected >= meta && meta > 0;

  // streak: dias consecutivos com cadastro terminando hoje
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) { if ((series[i].adds ?? 0) > 0) streak++; else break; }

  const cumulative = series.map((s) => Number(s.cumulative));
  const tl = leaderTimeline({ cumulative: cumulative.length ? cumulative : [0, realizado], meta, daysLeft: days, rate });

  const projBg = batendo ? "rgba(61,214,140,.14)" : "var(--color-highlight-dim)";
  const projFg = batendo ? "var(--color-positive)" : "var(--color-highlight)";

  const selos = [
    { nome: "Recrutador", desc: "sub-líderes ativos", icon: "network", on: streak >= 0 },
    { nome: `Streak ${streak} dias`, desc: "cadastrou todo dia", icon: "flame", on: streak > 0 },
    { nome: "Meta em vista", desc: batendo ? "no ritmo certo" : "acelere o ritmo", icon: "target", on: batendo },
  ];

  return (
    <main style={{ padding: "4px 18px 24px" }}>
      {/* boas-vindas */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "12px 0 16px" }}>
        <div style={{ width: 42, height: 42, borderRadius: "var(--radius-sm)", background: "var(--color-gray-300)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 19 }}>{initials(nome)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 23, letterSpacing: "-.3px", lineHeight: 1.1 }}>Boas-vindas, {nome.split(" ")[0]}</div>
          <div style={{ fontSize: 12, color: "var(--color-muted-foreground)" }}>{local}</div>
        </div>
      </div>

      {/* placar */}
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 20, background: "var(--color-background-200)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", width: 128, height: 128, flexShrink: 0 }}>
            <svg width="128" height="128" viewBox="0 0 128 128" style={{ display: "block" }}>
              <circle cx="64" cy="64" r="52" fill="none" style={{ stroke: "var(--color-gray-300)" }} strokeWidth="11" />
              <circle cx="64" cy="64" r="52" fill="none" style={{ stroke: "var(--color-foreground)" }} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(pct / 100) * RC} ${RC}`} transform="rotate(-90 64 64)" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 30, lineHeight: 1 }}>{pct}%</span>
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: ".8px", color: "var(--color-muted-foreground)" }}>DA META</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-.5px" }}>{realizado} <span style={{ fontSize: 15, fontWeight: 400, color: "var(--color-muted-foreground)" }}>de {meta} votos</span></div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "6px 10px", borderRadius: "var(--radius-sm)", fontSize: 11.5, fontWeight: 500, background: projBg, color: projFg }}>
              <Icon name="trend" size={13} />
              <span>Projeção: {projected} até a eleição · faltam {days} dias</span>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12, color: "var(--color-muted-foreground)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="trend" size={13} /><span style={{ fontVariantNumeric: "tabular-nums" }}>{rate.toFixed(1)}/dia (7d)</span></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="flame" size={13} style={{ color: "var(--color-gray-700)" }} /><span style={{ fontVariantNumeric: "tabular-nums" }}>{streak} dias seguidos</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* linha do tempo */}
      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 18, background: "var(--color-background)", marginTop: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase" }}>Linha do tempo</span>
          <span style={{ fontSize: 11.5, color: "var(--color-gray-600)" }}>eleição em 4 de out.</span>
        </div>
        <div style={{ position: "relative" }}>
          <svg viewBox="0 0 320 150" style={{ width: "100%", display: "block" }}>
            <line x1="12" x2="308" y1={tl.metaY} y2={tl.metaY} style={{ stroke: "var(--color-gray-600)" }} strokeWidth="1" strokeDasharray="1 3" />
            <path d={tl.area} fill="rgba(237,237,237,.06)" />
            <path d={tl.line} fill="none" style={{ stroke: "var(--color-foreground)" }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={tl.proj} fill="none" stroke="#666666" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round" />
            <line x1={tl.hojeX} x2={tl.hojeX} y1="18" y2="132" style={{ stroke: "var(--color-border)" }} strokeWidth="1" />
            <text x={tl.hojeX} y="12" textAnchor="middle" style={{ fill: "var(--color-gray-600)" }} fontSize="9">hoje</text>
            <circle cx={tl.hojeX} cy={tl.hojeY} r="3.5" style={{ fill: "var(--color-foreground)", stroke: "var(--color-background)" }} strokeWidth="1.5" />
            <circle cx={tl.projX} cy={tl.projY} r="3" fill="none" stroke="#666666" strokeWidth="1.5" />
          </svg>
          <span style={{ position: "absolute", right: "3.5%", top: tl.metaTopPct, fontSize: 9.5, fontWeight: 500, color: "var(--color-muted-foreground)" }}>Meta {meta}</span>
          <span style={{ position: "absolute", right: "1%", top: tl.projTopPct, fontSize: 10, fontWeight: 600, color: projFg }}>{tl.projected}</span>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: "var(--color-muted-foreground)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2, background: "var(--color-foreground)" }} />cadastros</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, borderTop: "2px dashed #666666" }} />projeção</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, borderTop: "2px dotted var(--color-gray-600)" }} />meta</span>
        </div>
      </div>

      {/* selos */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Seus selos</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {selos.map((s) => (
            <div key={s.nome} style={{ flexShrink: 0, width: 104, padding: "12px 10px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", textAlign: "center", opacity: s.on ? 1 : 0.45 }}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-100)", color: "var(--color-accent)" }}><Icon name={s.icon} size={16} /></div>
              <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2 }}>{s.nome}</div>
              <div style={{ fontSize: 10, color: "var(--color-gray-600)", marginTop: 3, lineHeight: 1.3 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
