# Sincronização Planilha → Politix

Mantém o Politix atualizado a partir da planilha
`planilha_regioes_sp_2026_a4_mapa_contexto_observacao`. Editou uma célula,
acrescentou uma linha, criou uma aba nova — em ~1,5 min o Politix reflete.

A planilha **continua privada**. Quem conversa com o Supabase é o Apps Script,
com a service role key guardada nas Propriedades do Script.

## Como funciona

```
Planilha (privada)
   └─ Apps Script  ── espelha cada linha ──▶  planilha_linha   (staging)
                    ── chama ─────────────▶  sync_planilha()
                                                  ├─▶ leader              (dedup por WhatsApp)
                                                  └─▶ municipio_politico  (eleitorado + votos 2024)
Politix (Next.js) lê leader / municipio_politico como já lia.
```

O espelho é **apagado e regravado** a cada sincronização. É isso que faz uma
linha removida da planilha sumir do Politix sem nunca duplicar as que ficaram.

## Instalação (uma vez)

1. Abra a planilha → **Extensões › Apps Script**.
2. Cole o conteúdo de `Codigo.gs` no arquivo do projeto e salve.
3. **Configurações do projeto › Propriedades do script** → adicione:

   | Propriedade | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://gmurynexmbbisxpdejmz.supabase.co` |
   | `SUPABASE_SERVICE_ROLE` | a *service_role key* (Supabase › Settings › API) |
   | `TENANT_ID` | `88d3b4ac-8d4a-4dab-bcea-24424681511f` |

   > A service role key ignora RLS. Ela só pode viver aqui e no servidor —
   > nunca no front-end, nunca num repositório.

4. Rode a função **`sincronizar`** uma vez (autorize o acesso quando pedir).
   Esse primeiro run já faz a carga inicial.
5. Rode a função **`instalarGatilhos`** uma vez. A partir daí é automático.

## Gatilhos criados

| Gatilho | Quando | Para quê |
|---|---|---|
| `aoEditar` | a cada alteração na planilha | marca que há mudança pendente |
| `verificarPendencia` | a cada 1 min | sincroniza 90 s após a última edição (evita 10 syncs seguidos enquanto alguém digita) |
| `sincronizar` | a cada 6 h | rede de segurança, caso um gatilho falhe |

## Regras de consolidação

- **Uma pessoa = um WhatsApp.** As várias linhas do mesmo telefone viram **um
  líder com várias cidades** (`cities[]`) — é o mesmo cabo atuando em N
  municípios, não N cabos. Foi exatamente o que a carga anterior errou.
- O **DDD é ignorado** na comparação (só os 9 dígitos do assinante), porque na
  planilha ele varia conforme a cidade e não identifica ninguém.
- **Contato sem telefone não vira líder** — o WhatsApp é a chave de dedup da
  campanha. Fica contado em `sem_telefone` no resultado do sync.
- **Nada é apagado** do Politix por ausência na planilha. Líderes cadastrados
  direto no app (convites, sub-líderes) continuam intactos.
- **Município casa por nome já existente**, então linhas de distrito (ex.
  `Mirante do P. - Cuiabá Paulista`) não entram e não duplicam o eleitorado do
  município-mãe.
- `Expectativa de voto` → `leader.promise_votes` (só sobrescreve quando a
  planilha tem valor). `Observação` → `leader.observacao`. `Dobrada` →
  `leader.dobrada`.

## Conferir se rodou

```sql
select executado_em, origem, resultado
  from planilha_sync order by executado_em desc limit 5;
```

`resultado` traz `linhas_planilha`, `pessoas`, `fundidos`, `atualizados`,
`inseridos`, `municipios`, `sem_telefone`, `total_leaders`.
