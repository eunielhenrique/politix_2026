-- Politix · perfil somente-leitura.
-- 'assessor' = acesso total · 'analista' = vê tudo do tenant, não altera nada.
alter table public.member drop constraint if exists member_role_check;
alter table public.member add constraint member_role_check
  check (role in ('assessor','analista','lider'));
alter table public.member_invite drop constraint if exists member_invite_role_check;
alter table public.member_invite add constraint member_invite_role_check
  check (role in ('assessor','analista'));

-- A trava é por GATILHO, não dentro de cada RPC: update_leader não checava papel e
-- qualquer função nova repetiria o esquecimento. SECURITY DEFINER não troca o
-- auth.uid(), então o gatilho enxerga quem chamou mesmo através das RPCs.
create or replace function public.bloqueia_analista()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role() = 'analista' then
    raise exception 'Seu acesso é somente leitura: peça a um assessor da campanha para fazer esta alteração.'
      using errcode = '42501';
  end if;
  return coalesce(NEW, OLD);
end $$;

do $$
declare t text;
begin
  foreach t in array array['leader','liderado','invite','member','member_invite','tenant',
                           'vote_targets','events','crises','pautas','disparos','wpp_groups','connections']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'tg_ro_' || t, t);
      execute format(
        'create trigger %I before insert or update or delete on public.%I
         for each row execute function public.bloqueia_analista()', 'tg_ro_' || t, t);
    end if;
  end loop;
end $$;

-- team_invite/claim/list/remove passam a carregar o papel escolhido
create or replace function public.team_invite(p_email text, p_name text, p_role text default 'assessor')
returns table(id uuid, email text, status text)
language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid; v_uid uuid; v_role text; v_id uuid; v_status text; v_novo text;
begin
  select tenant_id, role into v_tenant, v_role from public.member where id = auth.uid();
  if v_tenant is null or v_role <> 'assessor' then
    raise exception 'Só um assessor da campanha pode convidar membros.';
  end if;
  if coalesce(trim(p_email),'') = '' or position('@' in p_email) = 0 then
    raise exception 'Informe um e-mail válido.';
  end if;
  v_novo := case when p_role = 'analista' then 'analista' else 'assessor' end;

  insert into public.member_invite (tenant_id, email, name, role, invited_by)
  values (v_tenant, lower(trim(p_email)), coalesce(trim(p_name),''), v_novo, auth.uid())
  on conflict (tenant_id, lower(email)) where status = 'pending'
  do update set name = excluded.name, role = excluded.role, created_at = now()
  returning member_invite.id into v_id;

  select u.id into v_uid from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
  if v_uid is not null then
    insert into public.member (id, tenant_id, role, name)
    values (v_uid, v_tenant, v_novo, coalesce(nullif(trim(p_name),''), split_part(p_email,'@',1)))
    on conflict (id) do update set tenant_id = excluded.tenant_id, role = v_novo;
    update public.member_invite set status = 'accepted', accepted_at = now() where member_invite.id = v_id;
    v_status := 'accepted';
  else
    v_status := 'pending';
  end if;
  return query select v_id, lower(trim(p_email)), v_status;
end $$;
grant execute on function public.team_invite(text, text, text) to authenticated;

create or replace function public.team_claim()
returns table(tenant_id uuid, role text)
language plpgsql volatile security definer set search_path = public as $$
declare v_email text; v_inv record;
begin
  if auth.uid() is null then return; end if;
  if exists (select 1 from public.member where id = auth.uid()) then return; end if;
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
  if v_email is null then return; end if;
  select * into v_inv from public.member_invite
    where lower(email) = v_email and status = 'pending' order by created_at desc limit 1;
  if v_inv.id is null then return; end if;
  insert into public.member (id, tenant_id, role, name)
  values (auth.uid(), v_inv.tenant_id, v_inv.role, coalesce(nullif(v_inv.name,''), split_part(v_email,'@',1)))
  on conflict (id) do nothing;
  update public.member_invite set status = 'accepted', accepted_at = now() where id = v_inv.id;
  return query select v_inv.tenant_id, v_inv.role;
end $$;
grant execute on function public.team_claim() to authenticated;

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

create or replace function public.team_remove(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_tenant uuid; v_role text; v_n int; v_alvo text;
begin
  select tenant_id, role into v_tenant, v_role from public.member where id = auth.uid();
  if v_tenant is null or v_role <> 'assessor' then
    raise exception 'Só um assessor da campanha pode remover membros.';
  end if;
  if p_id = auth.uid() then raise exception 'Você não pode remover a si mesmo.'; end if;
  select role into v_alvo from public.member where id = p_id and tenant_id = v_tenant;
  if v_alvo = 'assessor' then
    select count(*) into v_n from public.member where tenant_id = v_tenant and role = 'assessor';
    if v_n <= 1 then raise exception 'A campanha precisa de pelo menos um assessor.'; end if;
  end if;
  delete from public.member where id = p_id and tenant_id = v_tenant and role in ('assessor','analista');
  return found;
end $$;
grant execute on function public.team_remove(uuid) to authenticated;
