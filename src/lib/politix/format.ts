import type { RankingRow } from "./types";

export type StatusKey = "voando" | "emdia" | "atencao" | "parado";

export interface LeaderStatus {
  key: StatusKey;
  label: string;
  color: string; // var() do design
}

/** Status do líder a partir de ritmo 7d + % da meta (gramática do handoff). */
export function leaderStatus(r: Pick<RankingRow, "rate_7d" | "pct">): LeaderStatus {
  if ((r.rate_7d ?? 0) === 0) return { key: "parado", label: "Parado", color: "var(--color-highlight)" };
  if ((r.pct ?? 0) >= 80) return { key: "voando", label: "Voando", color: "var(--color-positive)" };
  if ((r.pct ?? 0) >= 45) return { key: "emdia", label: "Em dia", color: "var(--color-foreground)" };
  return { key: "atencao", label: "Atenção", color: "var(--color-muted-foreground)" };
}

export function statusPill(st: LeaderStatus): { bg: string; fg: string } {
  const bg =
    st.key === "parado" ? "var(--color-highlight-dim)"
    : st.key === "voando" ? "rgba(61,214,140,.12)"
    : "var(--color-muted)";
  return { bg, fg: st.color };
}

export const MEDAL = ["#e6e6e6", "#c2c2c2", "#a98a5e"]; // 1º/2º/3º greyscale

export function initials(name: string): string {
  const p = (name || "").trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?";
}

export const nf = new Intl.NumberFormat("pt-BR");

export function pctClamp(v: number | null | undefined): number {
  return Math.max(0, Math.min(100, Math.round(v ?? 0)));
}
