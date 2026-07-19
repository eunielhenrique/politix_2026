"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ASSESSOR_NAV } from "@/lib/politix/nav";
import { Icon } from "./icons";

export default function Sidebar({
  tenantName,
  electionDate,
}: {
  tenantName: string;
  electionDate: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("px-sidebar") === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const n = !c;
      localStorage.setItem("px-sidebar", n ? "1" : "0");
      return n;
    });
  }

  const w = collapsed ? 64 : 232;
  const days =
    electionDate != null
      ? Math.max(0, Math.ceil((+new Date(electionDate) - Date.now()) / 86400000))
      : null;

  return (
    <aside
      style={{
        width: w,
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--color-background-200)",
        borderRight: "1px solid var(--color-border)",
        transition: "width .2s var(--ease-bar)",
        overflow: "hidden",
      }}
    >
      {/* topo: marca + recolher */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", height: 58 }}>
        <div style={{ color: "var(--color-foreground)", flexShrink: 0 }}>
          <Icon name="panel" size={20} />
        </div>
        {!collapsed && (
          <span className="mono" style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".14em", flex: 1 }}>
            POLITIX
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expandir" : "Recolher"}
          style={{
            display: "flex",
            background: "none",
            border: "none",
            color: "var(--color-muted-foreground)",
            cursor: "pointer",
            padding: 2,
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          <Icon name="chevron" size={18} />
        </button>
      </div>

      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "6px 8px", flex: 1 }}>
        {ASSESSOR_NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: collapsed ? "9px 0" : "9px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-md)",
                color: active ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                background: active ? "var(--color-muted)" : "transparent",
                border: active ? "1px solid var(--color-border)" : "1px solid transparent",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={item.icon} size={18} style={{ flexShrink: 0 }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* card Eleição (somente leitura) */}
      {!collapsed && days != null && (
        <div style={{ margin: "0 12px 10px", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-background-100)" }}>
          <div className="mono" style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
            Eleição
          </div>
          <div className="tnum" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
            {new Date(electionDate + "T00:00:00").toLocaleDateString("pt-BR")}
          </div>
          <div className="mono tnum" style={{ fontSize: 10.5, color: "var(--color-highlight)", marginTop: 1 }}>
            faltam {days} dias
          </div>
        </div>
      )}

      {/* rodapé: avatar + engrenagem */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: "var(--radius-full)", background: "var(--color-muted)", border: "1px solid var(--color-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--color-muted-foreground)" }}>
            {(tenantName || "P").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{tenantName}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--color-muted-foreground)" }}>Assessoria</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Link href="/painel/config" title="Configurações" style={{ color: "var(--color-muted-foreground)", display: "flex" }}>
            <Icon name="gear" size={16} />
          </Link>
        )}
      </div>
    </aside>
  );
}
