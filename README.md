# Politix

Inteligência eleitoral por dentro, endomarketing por fora — campanha **Wesley Cezar (Lelinho)**, deputado federal / SP 2026.

Mapeia a rede de lideranças (assessor → líderes → sub-líderes → liderados), mede **promessa × entrega de votos** por líder (rollup da subárvore, dedup por WhatsApp) e projeta se cada líder bate a meta até a eleição (**04/10/2026**).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + design system próprio (dark editorial, fontes **Geist**/**Geist Mono**)
- **Supabase** (`@supabase/ssr`) — auth por magic link, RLS multi-tenant, RPCs de placar/ranking

## Superfícies

- **App do líder** (mobile/PWA): placar, cadastro em massa, rede, convites.
- **Painel do assessor** (desktop + PWA): visão geral, mapa rede×família, rankings, grupos, Politix IA.

## Rodando local

```bash
cp .env.example .env.local   # preencha a NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key)
npm install
npm run dev
```

## Ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave **publishable** (`sb_publishable_…`). Nunca use a `service_role` no front. |

Deploy contínuo pela Vercel a cada push no `main`.
