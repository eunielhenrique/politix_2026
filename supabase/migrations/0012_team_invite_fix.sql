-- Politix · dois defeitos em team_invite:
--
-- 1) "column reference id is ambiguous". RETURNS TABLE(id, email, status) cria variáveis
--    de saída com esses nomes no escopo da função, e QUALQUER referência não qualificada
--    a uma coluna homônima fica ambígua — inclusive dentro do ON CONFLICT, onde não dá
--    para qualificar. A diretiva #variable_conflict use_column resolve na raiz: em caso
--    de empate, PL/pgSQL escolhe a coluna. Só qualificar linha a linha não bastava.
-- 2) o papel escolhido na tela era ignorado: o insert gravava 'assessor' fixo, então
--    convidar alguém como "Somente leitura" criava um assessor com acesso total.
--
-- Junto: convidar/revogar/remover passa a exigir super_admin. Esconder Configurações do
-- assessor comum é UI, não permissão — sem isto ele ainda podia chamar a RPC direto.
create or replace function public.team_invite(p_email text, p_name text, p_role text default 'assessor')
returns table(id uuid, email text, status text)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare v_tenant uuid; v_uid uuid; v_super boolean; v_id uuid; v_status text; v_role text;
begin
  select m.tenant_id, m.super_admin into v_tenant, v_super
    from public.member m where m.id = auth.uid();
  if v_tenant is null or not coalesce(v_super, false) then
    raise exception 'Só o dono da campanha pode convidar membros.';
  end if;
  if coalesce(trim(p_email),'') = '' or position('@' in p_email) = 0 then
    raise exception 'Informe um e-mail válido.';
  end if;
  v_role := case when lower(coalesce(p_role,'')) = 'analista' then 'analista' else 'assessor' end;

  insert into public.member_invite as mi (tenant_id, email, name, role, invited_by)
  values (v_tenant, lower(trim(p_email)), coalesce(trim(p_name),''), v_role, auth.uid())
  on conflict (tenant_id, lower(email)) where status = 'pending'
  do update set name = excluded.name, role = excluded.role, created_at = now()
  returning mi.id into v_id;

  select u.id into v_uid from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_uid is not null then
    insert into public.member as m (id, tenant_id, role, name, super_admin)
    values (v_uid, v_tenant, v_role, coalesce(nullif(trim(p_name),''), split_part(p_email,'@',1)), false)
    on conflict (id) do update set tenant_id = excluded.tenant_id, role = excluded.role;
    update public.member_invite as mi set status = 'accepted', accepted_at = now() where mi.id = v_id;
    v_status := 'accepted';
  else
    v_status := 'pending';
  end if;

  return query select v_id, lower(trim(p_email)), v_status;
end $$;
grant execute on function public.team_invite(text, text, text) to authenticated;

-- o convidado entra com o papel do CONVITE, não sempre como assessor
create or replace function public.team_claim()
returns table(tenant_id uuid, role text)
language plpgsql volatile security definer set search_path = public as $$
#variable_conflict use_column
declare v_email text; v_inv record;
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.member m where m.id = auth.uid()) then return; end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
  if v_email is null then return; end if;
  select * into v_inv from public.member_invite mi
    where lower(mi.email) = v_email and mi.status = 'pending' order by mi.created_at desc limit 1;
  if v_inv.id is null then return; end if;
  insert into public.member as m (id, tenant_id, role, name, super_admin)
  values (auth.uid(), v_inv.tenant_id, v_inv.role, coalesce(nullif(v_inv.name,''), split_part(v_email,'@',1)), false)
  on conflict (id) do nothing;
  update public.member_invite as mi set status = 'accepted', accepted_at = now() where mi.id = v_inv.id;
  return query select v_inv.tenant_id, v_inv.role;
end $$;
grant execute on function public.team_claim() to authenticated;

-- a lista da tela precisa mostrar analista também, senão convidado some
create or replace function public.team_list()
returns table(kind text, id uuid, name text, email text, role text, since timestamptz)
language sql stable security definer set search_path = public as $$
  select 'membro', m.id, coalesce(nullif(m.name,''), split_part(u.email,'@',1)), u.email, m.role, m.created_at
    from public.member m left join auth.users u on u.id = m.id
   where m.tenant_id = auth_tenant() and m.role in ('assessor','analista')
  union all
  select 'convite', i.id, coalesce(nullif(i.name,''), split_part(i.email,'@',1)), i.email, i.role, i.created_at
    from public.member_invite i
   where i.tenant_id = auth_tenant() and i.status = 'pending'
  order by 6 desc;
$$;
grant execute on function public.team_list() to authenticated;

create or replace function public.team_revoke(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid; v_super boolean;
begin
  select m.tenant_id, m.super_admin into v_tenant, v_super from public.member m where m.id = auth.uid();
  if v_tenant is null or not coalesce(v_super, false) then
    raise exception 'Só o dono da campanha pode cancelar convites.';
  end if;
  update public.member_invite as mi set status = 'revoked'
   where mi.id = p_id and mi.tenant_id = v_tenant and mi.status = 'pending';
  return found;
end $$;
grant execute on function public.team_revoke(uuid) to authenticated;

-- nunca a si mesmo, nunca o último com acesso total
create or replace function public.team_remove(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid; v_super boolean; v_n int;
begin
  select m.tenant_id, m.super_admin into v_tenant, v_super from public.member m where m.id = auth.uid();
  if v_tenant is null or not coalesce(v_super, false) then
    raise exception 'Só o dono da campanha pode remover membros.';
  end if;
  if p_id = auth.uid() then raise exception 'Você não pode remover a si mesmo.'; end if;
  select count(*) into v_n from public.member m where m.tenant_id = v_tenant and m.role = 'assessor';
  if v_n <= 1 then raise exception 'A campanha precisa de pelo menos um assessor.'; end if;
  delete from public.member m where m.id = p_id and m.tenant_id = v_tenant and m.role in ('assessor','analista');
  return found;
end $$;
grant execute on function public.team_remove(uuid) to authenticated;
