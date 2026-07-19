// Wrappers tipados das RPCs do Politix. Recebem um SupabaseClient
// (server ou browser) para funcionar tanto em RSC quanto em client components.
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Me,
  Scoreboard,
  DailyPoint,
  RankingRow,
  InviteResult,
  InviteLeaderParams,
} from "./types";

// Postgres pode devolver `returns table` (array) ou objeto único; normalizamos.
function single<T>(data: unknown): T | null {
  if (data == null) return null;
  return (Array.isArray(data) ? data[0] : data) as T;
}

/** Identidade + papel do usuário logado. null se ainda não tem membro/campanha. */
export async function getMe(supabase: SupabaseClient): Promise<Me | null> {
  const { data, error } = await supabase.rpc("me");
  if (error) return null;
  return single<Me>(data);
}

/** Placar do líder. `target` opcional (default = líder do usuário logado). */
export async function getLeaderScoreboard(
  supabase: SupabaseClient,
  target?: string,
): Promise<Scoreboard | null> {
  const { data, error } = await supabase.rpc("leader_scoreboard", { target: target ?? null });
  if (error) throw error;
  return single<Scoreboard>(data);
}

/** Série diária (linha do tempo). */
export async function getLeaderDailySeries(
  supabase: SupabaseClient,
  target?: string,
  days = 90,
): Promise<DailyPoint[]> {
  const { data, error } = await supabase.rpc("leader_daily_series", {
    target: target ?? null,
    days,
  });
  if (error) throw error;
  return (data ?? []) as DailyPoint[];
}

/** Ranking de líderes da campanha. */
export async function getTenantRanking(supabase: SupabaseClient): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc("tenant_ranking");
  if (error) throw error;
  return (data ?? []) as RankingRow[];
}

/** Convida um líder (ou sub-líder, se `parent`). Retorna token do link. */
export async function inviteLeader(
  supabase: SupabaseClient,
  p: InviteLeaderParams,
): Promise<InviteResult> {
  const { data, error } = await supabase.rpc("invite_leader", {
    p_name: p.name,
    p_whatsapp: p.whatsapp,
    p_cities: p.cities,
    p_promise: p.promise,
    p_parent: p.parent ?? null,
  });
  if (error) throw error;
  const row = single<InviteResult>(data);
  if (!row) throw new Error("invite_leader não retornou token");
  return row;
}

/** Aceita um convite de liderança (quem convidou vira pai na árvore). */
export async function acceptInvite(supabase: SupabaseClient, token: string): Promise<void> {
  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) throw error;
}

/** Cria a campanha; o 1º usuário vira assessor. */
export async function bootstrapTenant(
  supabase: SupabaseClient,
  name: string,
  electionDate = "2026-10-04",
): Promise<void> {
  const { error } = await supabase.rpc("bootstrap_tenant", {
    p_name: name,
    p_election_date: electionDate,
  });
  if (error) throw error;
}
