-- Politix · escala do índice por município: linear -> raiz quadrada.
-- A normalização linear pela penetração máxima achatava tudo (Santana de Parnaíba tem
-- 69% e esmagava o resto: 641 de 644 municípios abaixo de 18). A raiz abre a cauda sem
-- mudar a ORDEM (é monotônica) e é a mesma curva do índice original.
-- Depois: 4 acima de 40, 19 entre 18 e 39. Barueri 13 -> 36, Osasco 3 -> 17, SP 1 -> 11.
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
  mx as (select nullif(max(pen),0) as max_pen, nullif(max(votos),0) as max_votos from base),
  calc as (
    select b.*,
           case when mx.max_pen is not null and b.pen is not null then 100 * sqrt(b.pen / mx.max_pen)
                when mx.max_votos is not null then 100 * sqrt(b.votos::numeric / mx.max_votos)
                else 0 end as bruto
    from base b cross join mx
  )
  select c.ibge, c.nome, c.votos, c.eleitorado,
         round(coalesce(c.pen,0) * 100, 3) as penetracao,
         round(c.bruto)::int as indice,
         case when c.bruto >= 60 then 'alto' when c.bruto >= 25 then 'médio' else 'baixo' end as nivel
  from calc c order by indice desc;
$$;
grant execute on function public.familia_indice(text[], integer[]) to authenticated, anon;
