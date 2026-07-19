// Navegação do painel do assessor (fiel ao protótipo Politix.dc.html).
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ASSESSOR_NAV: NavItem[] = [
  { label: "Visão geral", href: "/painel", icon: "overview" },
  { label: "Mapa Rede", href: "/painel/mapa", icon: "map" },
  { label: "Ranking de líderes", href: "/painel/lideres", icon: "trophy" },
  { label: "Ranking de cidades", href: "/painel/cidades", icon: "pin" },
  { label: "Grupos", href: "/painel/grupos", icon: "chat" },
];

export interface PageMeta {
  title: string; // breadcrumb: /Politix › {title}
  sub: string; // linha mono uppercase abaixo do topo
}

const META: Record<string, PageMeta> = {
  "/painel": { title: "Cockpit da campanha", sub: "META, RITMO E RANKING DA REDE DE LIDERANÇAS" },
  "/painel/mapa": { title: "Mapa da rede", sub: "COBERTURA, HISTÓRICO DA FAMÍLIA E REDE ATUAL" },
  "/painel/lideres": { title: "Ranking de líderes", sub: "QUEM ESTÁ ENTREGANDO VOTOS" },
  "/painel/cidades": { title: "Ranking de cidades", sub: "ONDE ESTÁ O VOTO E QUEM CUIDA DELE" },
  "/painel/grupos": { title: "Grupos", sub: "COMUNICAÇÃO COM A REDE DE LIDERANÇAS" },
  "/painel/config": { title: "Configurações", sub: "CAMPANHA, EQUIPE E SEGURANÇA" },
};

export function pageMeta(pathname: string): PageMeta {
  const key = Object.keys(META)
    .sort((a, b) => b.length - a.length)
    .find((k) => pathname === k || pathname.startsWith(k + "/"));
  return META[key ?? "/painel"];
}
