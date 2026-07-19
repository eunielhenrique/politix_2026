// Contratos de dados do Politix — espelham as RPCs do Supabase.
// Fonte: handoff README + schema (projeto gmurynexmbbisxpdejmz).

export type Papel = "assessor" | "lider";

/** RPC me() → identidade + papel do usuário logado */
export interface Me {
  member_id: string;
  tenant_id: string | null;
  role: Papel;
  name: string | null;
  leader_id: string | null;
  tenant_name: string | null;
  election_date: string | null; // ISO date (backend-only)
}

/** RPC leader_scoreboard(target) → placar de um líder (rollup da subárvore) */
export interface Scoreboard {
  meta: number;
  realizado: number; // soma dedupada de toda a subárvore
  election_date: string;
  days_left: number;
  rate_7d: number; // cadastros/dia (média 7d)
  projected: number; // projeção até a eleição
  pct: number; // 0–100
}

/** RPC leader_daily_series(target, days) → série diária p/ a linha do tempo */
export interface DailyPoint {
  day: string; // ISO date
  adds: number;
  cumulative: number;
}

/** RPC tenant_ranking() → ranking de líderes da campanha */
export interface RankingRow {
  leader_id: string;
  name: string;
  cities: string[];
  meta: number;
  realizado: number;
  pct: number;
  rate_7d: number;
}

/** RPC invite_leader(...) → link de convite gerado */
export interface InviteResult {
  leader_id: string;
  token: string;
}

export interface InviteLeaderParams {
  name: string;
  whatsapp: string;
  cities: string[];
  promise: number;
  parent?: string | null;
}
