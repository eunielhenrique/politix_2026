"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/painel/icons";
import ThemeToggle from "@/components/painel/ThemeToggle";

const NAV_ESQ = [
  { label: "Início", href: "/app", icon: "home" },
  { label: "Cadastrar", href: "/app/cadastrar", icon: "userplus" },
];
const NAV_DIR = [
  { label: "Rede", href: "/app/rede", icon: "network" },
  { label: "Mural", href: "/app/mural", icon: "megaphone" },
];
const DRAWER = [
  { label: "Convidar sub-líder", href: "/app/convidar", icon: "userplus" },
  { label: "Meu perfil", href: "/app/perfil", icon: "user" },
  { label: "Notificações", href: "/app/notificacoes", icon: "bell", badge: "4 novas" },
  { label: "Minha rede", href: "/app/rede", icon: "network" },
  { label: "Cadastrar", href: "/app/cadastrar", icon: "home" },
  { label: "Mural", href: "/app/mural", icon: "megaphone" },
];

function initialsOf(name: string) {
  const p = (name || "").trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "L";
}

export default function LeaderShell({
  leaderName,
  isPreview,
  children,
}: {
  leaderName: string;
  isPreview: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [ai, setAi] = useState(false);

  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));

  return (
    <div style={{ minHeight: "100dvh", background: "var(--color-background-100)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 440, height: "100dvh", background: "var(--color-background)", borderLeft: "1px solid var(--color-border)", borderRight: "1px solid var(--color-border)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {isPreview && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", background: "var(--color-highlight-dim)", borderBottom: "1px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-highlight)" }}>
            <span>PRÉVIA DO APP DO LÍDER · {leaderName}</span>
            <span style={{ flex: 1 }} />
            <Link href="/painel" style={{ color: "var(--color-highlight)" }}>voltar ao painel</Link>
          </div>
        )}

        {/* app bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "14px 18px 12px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, letterSpacing: ".08em" }}>POLITIX</span>
          <div style={{ flex: 1 }} />
          <Link href="/app/notificacoes" title="Notificações" style={{ position: "relative", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-foreground)" }}>
            <Icon name="bell" size={18} />
            <span style={{ position: "absolute", top: 6, right: 6, minWidth: 14, height: 14, borderRadius: "var(--radius-full)", background: "var(--color-accent)", color: "#000", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>4</span>
          </Link>
        </div>

        {/* conteúdo */}
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>{children}</div>

        {/* FAB Politix IA */}
        <button onClick={() => setAi(true)} title="Politix IA" style={{ position: "absolute", right: 14, bottom: 104, zIndex: 50, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "var(--radius-full)", background: "var(--color-foreground)", color: "var(--color-background)", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
          <Icon name="spark" size={21} />
        </button>

        {/* bottom nav */}
        <div style={{ display: "flex", alignItems: "center", borderTop: "1px solid var(--color-border)", background: "var(--color-background)", padding: "8px 10px 20px", gap: 4, flexShrink: 0 }}>
          {NAV_ESQ.map((n) => {
            const a = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", color: a ? "var(--color-accent)" : "var(--color-gray-700)" }}>
                <Icon name={n.icon} size={21} style={{ strokeWidth: a ? 2 : 1.7 } as React.CSSProperties} />
                <span style={{ fontSize: 10, fontWeight: a ? 600 : 500 }}>{n.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setDrawer(true)} title="Menu" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 54, height: 54, margin: "-43px 6px 0", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)", background: "var(--color-background-100)", color: "var(--color-foreground)", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
            <Icon name="menu" size={20} />
          </button>
          {NAV_DIR.map((n) => {
            const a = isActive(n.href);
            return (
              <Link key={n.href} href={n.href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0", color: a ? "var(--color-accent)" : "var(--color-gray-700)" }}>
                <Icon name={n.icon} size={21} />
                <span style={{ fontSize: 10, fontWeight: a ? 600 : 500 }}>{n.label}</span>
              </Link>
            );
          })}
        </div>

        {/* menu bottom-sheet */}
        {drawer && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60 }}>
            <div onClick={() => setDrawer(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", animation: "pxFadeIn .2s ease-out both" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "86%", background: "var(--color-background-100)", borderTop: "1px solid var(--color-border)", borderRadius: "12px 12px 0 0", display: "flex", flexDirection: "column", overflow: "auto", animation: "pxSlideUp .3s cubic-bezier(0,0,.2,1) both" }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}><span style={{ width: 38, height: 4, borderRadius: "var(--radius-full)", background: "var(--color-gray-400)" }} /></div>
              <Link href="/app/perfil" onClick={() => setDrawer(false)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "10px 18px 14px", borderBottom: "1px solid var(--color-border)" }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--radius-full)", background: "var(--color-gray-300)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 500, color: "var(--color-foreground)" }}>{initialsOf(leaderName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{leaderName}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: ".06em" }}>Líder</div>
                </div>
                <Icon name="arrow" size={14} style={{ color: "var(--color-gray-600)" }} />
              </Link>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, padding: "14px 14px 8px" }}>
                {DRAWER.map((d) => {
                  const a = isActive(d.href);
                  return (
                    <Link key={d.label} href={d.href} onClick={() => setDrawer(false)} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14, minHeight: 96, padding: "14px 12px", border: `1px solid ${a ? "var(--color-border)" : "transparent"}`, borderRadius: 8, background: a ? "var(--color-muted)" : "var(--color-background)", color: "var(--color-foreground)" }}>
                      <Icon name={d.icon} size={21} />
                      <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{d.label}</span>
                      {d.badge && <span style={{ position: "absolute", top: 10, right: 10, fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--color-accent)" }}>{d.badge}</span>}
                    </Link>
                  );
                })}
              </div>
              <div style={{ padding: "8px 8px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, minHeight: 48, padding: "0 6px" }}>
                  <ThemeToggle />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-gray-900)" }}>Tema claro / escuro</span>
                </div>
              </div>
              <div style={{ padding: "14px 18px 30px", borderTop: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "var(--radius-full)", background: "var(--color-gray-1000)", animation: "pxPulse 1.6s ease-in-out infinite" }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-muted-foreground)" }}>sincronizado agora</span>
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--color-gray-600)" }}>Politix · PWA</div>
              </div>
            </div>
          </div>
        )}

        {/* Politix IA */}
        {ai && (
          <div style={{ position: "absolute", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", background: "var(--color-background)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px", borderBottom: "1px solid var(--color-border)", background: "var(--color-background-100)" }}>
              <span style={{ color: "var(--color-accent)", display: "flex" }}><Icon name="spark" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Politix IA</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-muted-foreground)" }}><span style={{ width: 6, height: 6, borderRadius: "var(--radius-full)", background: "var(--color-gray-1000)", animation: "pxPulse 1.6s ease-in-out infinite" }} />acompanhando seu placar</div>
              </div>
              <button onClick={() => setAi(false)} style={{ width: 36, height: 36, border: "none", borderRadius: "var(--radius-sm)", background: "transparent", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: 17 }}>×</button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
              <div style={{ maxWidth: "85%", padding: "10px 13px", borderRadius: "var(--radius-sm)", background: "var(--color-muted)", fontSize: 13, lineHeight: 1.55 }}>Oi! Em breve eu leio seu placar e te ajudo a bater a meta. 🎯</div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 16px 24px", borderTop: "1px solid var(--color-border)" }}>
              <input disabled placeholder="Pergunte sobre a sua meta… (em breve)" style={{ flex: 1, height: 44, padding: "0 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background-200)", color: "var(--color-muted-foreground)", fontSize: 14, outline: "none" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
