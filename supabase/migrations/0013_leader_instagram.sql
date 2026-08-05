-- Campo de @ do Instagram no líder.
--
-- Guardado SEM o '@' e em minúsculo: o usuário digita com arroba, sem arroba ou colando
-- a URL do perfil, e os três são o mesmo handle. Normalizar na escrita evita ter
-- '@joao', 'joao' e 'Joao' como valores distintos na base.
alter table public.leader add column if not exists instagram text;

-- update_leader tinha DOIS overloads (7 e 8 argumentos), e todos os parâmetros já são
-- opcionais. Só acrescentar mais um com default deixaria chamadas ambíguas entre eles —
-- o Postgres recusa em tempo de execução. O de 7 não é chamado por nada no front, então
-- os dois saem e fica uma função única.
-- O corpo abaixo é o da versão de 8 argumentos que estava em produção, preservado como
-- estava (inclusive o can_see_leader, que permite ao líder editar a própria subárvore, e
-- o RETURNS leader); a única adição é o p_instagram.
drop function if exists public.update_leader(uuid, text, text, text[], integer, text, text);
drop function if exists public.update_leader(uuid, text, text, text[], integer, text, text, text);

create function public.update_leader(
  p_id uuid,
  p_name text default null,
  p_whatsapp text default null,
  p_cities text[] default null,
  p_promise integer default null,
  p_dobrada text default null,
  p_status text default null,
  p_observacao text default null,
  p_instagram text default null
) returns leader
language plpgsql security definer set search_path to 'public' as $function$
declare v public.leader;
begin
  if not public.can_see_leader(p_id) then raise exception 'sem permissao para editar este lider'; end if;
  update public.leader set
    name = coalesce(nullif(p_name,''), name),
    whatsapp = coalesce(nullif(p_whatsapp,''), whatsapp),
    cities = coalesce(p_cities, cities),
    promise_votes = greatest(coalesce(p_promise, promise_votes), 0),
    dobrada = coalesce(p_dobrada, dobrada),
    status = coalesce(nullif(p_status,''), status),
    observacao = coalesce(p_observacao, observacao),
    -- null = campo não veio no formulário, mantém. String vazia = o usuário limpou de
    -- propósito, vira null. Qualquer outra coisa é normalizada para o handle puro.
    instagram = case
                  when p_instagram is null then instagram
                  when btrim(p_instagram) = '' then null
                  else nullif(lower(regexp_replace(
                         regexp_replace(btrim(p_instagram), '^(https?://)?(www\.)?instagram\.com/', ''),
                         '[^a-z0-9._]', '', 'gi')), '')
                end
  where id = p_id and tenant_id = public.auth_tenant()
  returning * into v;
  return v;
end; $function$;

grant execute on function public.update_leader(uuid, text, text, text[], integer, text, text, text, text) to authenticated;
