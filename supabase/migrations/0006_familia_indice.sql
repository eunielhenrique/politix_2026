-- Politix · Índice de força da família POR MEMBRO (combinável)
-- Guarda votos granulares (membro × ano × município) e calcula o índice 0-100
-- na hora, para a combinação escolhida (candidato / irmão / pai, em qualquer mix).
--
-- REGRA: índice NÃO soma · VOTO soma. O índice é derivado da soma dos votos
-- dos membros selecionados, normalizada entre os municípios.
create table if not exists public.municipio_votos_familia (
  ibge   text not null,
  membro text not null check (membro in ('candidato','irmao','pai')),
  cargo  text not null default '',
  ano    integer not null,
  votos  integer not null default 0,
  primary key (ibge, membro, ano, cargo)
);
create index if not exists mvf_ibge_idx   on public.municipio_votos_familia(ibge);
create index if not exists mvf_membro_idx on public.municipio_votos_familia(membro);

alter table public.municipio_votos_familia enable row level security;
drop policy if exists mvf_sel on public.municipio_votos_familia;
create policy mvf_sel on public.municipio_votos_familia for select using (true);
grant select on public.municipio_votos_familia to authenticated, anon;

create or replace function public.familia_indice(
  p_membros text[] default array['candidato','irmao','pai'],
  p_anos    integer[] default null
)
returns table(
  ibge text, nome text, votos bigint, eleitorado integer,
  penetracao numeric, indice integer, nivel text
)
language sql stable security definer set search_path = public as $$
  with sel as (
    select v.ibge, sum(v.votos)::bigint as votos
    from public.municipio_votos_familia v
    where v.membro = any(p_membros)
      and (p_anos is null or v.ano = any(p_anos))
    group by v.ibge
  ),
  base as (
    select s.ibge, coalesce(m.nome, s.ibge) as nome, s.votos, m.eleitorado,
           case when coalesce(m.eleitorado,0) > 0 then s.votos::numeric / m.eleitorado else null end as pen
    from sel s left join public.municipio_politico m on m.ibge = s.ibge
  ),
  mx as (select nullif(max(pen),0) as max_pen, nullif(max(votos),0) as max_votos from base)
  select b.ibge, b.nome, b.votos, b.eleitorado,
         round(coalesce(b.pen,0) * 100, 3) as penetracao,
         (case when mx.max_pen is not null and b.pen is not null then round(100 * b.pen / mx.max_pen)
               when mx.max_votos is not null then round(100 * b.votos::numeric / mx.max_votos)
               else 0 end)::int as indice,
         case when (case when mx.max_pen is not null and b.pen is not null then 100 * b.pen / mx.max_pen
                         else 100 * b.votos::numeric / coalesce(mx.max_votos,1) end) >= 60 then 'alto'
              when (case when mx.max_pen is not null and b.pen is not null then 100 * b.pen / mx.max_pen
                         else 100 * b.votos::numeric / coalesce(mx.max_votos,1) end) >= 25 then 'médio'
              else 'baixo' end as nivel
  from base b cross join mx
  order by indice desc;
$$;
grant execute on function public.familia_indice(text[], integer[]) to authenticated, anon;

create or replace function public.familia_indice_municipio(p_ibge text)
returns table(membro text, cargo text, ano integer, votos integer, pct_eleitorado numeric)
language sql stable security definer set search_path = public as $$
  select v.membro, v.cargo, v.ano, v.votos,
         case when coalesce(m.eleitorado,0) > 0 then round(100.0 * v.votos / m.eleitorado, 2) end
  from public.municipio_votos_familia v
  left join public.municipio_politico m on m.ibge = v.ibge
  where v.ibge = p_ibge
  order by v.ano desc, v.membro;
$$;
grant execute on function public.familia_indice_municipio(text) to authenticated, anon;
