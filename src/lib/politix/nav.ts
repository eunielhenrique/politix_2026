// Módulos do painel do assessor (ordem da sidebar). Ícones = chaves em icons.tsx.
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ASSESSOR_NAV: NavItem[] = [
  { label: "Visão geral", href: "/painel", icon: "overview" },
  { label: "Mapa", href: "/painel/mapa", icon: "map" },
  { label: "Ranking de líderes", href: "/painel/lideres", icon: "trophy" },
  { label: "Ranking de cidades", href: "/painel/cidades", icon: "pin" },
  { label: "Grupos", href: "/painel/grupos", icon: "chat" },
  { label: "Configurações", href: "/painel/config", icon: "gear" },
];

export function activeLabel(pathname: string): string {
  // rota mais específica que casa com o pathname
  const match = [...ASSESSOR_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return match?.label ?? "Visão geral";
}
