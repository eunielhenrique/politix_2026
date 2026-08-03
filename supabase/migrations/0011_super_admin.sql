-- Politix · dois níveis dentro do papel 'assessor'.
-- super_admin (o dono da conta) vê o console inteiro; os demais assessores veem só
-- Visão geral, Mapa Rede, Cadastrar líder e Grupos.
--
-- É COLUNA e não papel novo de propósito: 'assessor' é checado em RLS, gatilhos e em
-- todas as RPCs de escrita (team_invite/revoke/remove, bloqueia_analista). Um papel
-- 'owner' obrigaria a revisar cada um desses pontos para não tirar permissão de quem
-- já tem. A coluna é aditiva e não muda nenhuma permissão existente.
alter table public.member add column if not exists super_admin boolean not null default false;

-- o primeiro assessor da campanha é o dono
update public.member m set super_admin = true
 where m.role = 'assessor'
   and m.created_at = (select min(m2.created_at) from public.member m2
                        where m2.tenant_id = m.tenant_id and m2.role = 'assessor')
   and not exists (select 1 from public.member m3
                    where m3.tenant_id = m.tenant_id and m3.super_admin);

create or replace function public.me()
returns table(member_id uuid, tenant_id uuid, role text, name text, leader_id uuid,
              tenant_name text, election_date date, super_admin boolean)
language sql stable security definer set search_path = public as $$
  select m.id, m.tenant_id, m.role, m.name,
         (select l.id from public.leader l where l.member_id = m.id),
         t.name, t.election_date, m.super_admin
  from public.member m join public.tenant t on t.id = m.tenant_id
  where m.id = auth.uid();
$$;
grant execute on function public.me() to authenticated;
