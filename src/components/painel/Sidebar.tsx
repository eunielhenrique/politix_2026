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
      ? Math.max(0, Math.ceil((+new Date(electionDate + "T00:00:00") - Date.now()) / 86400000))
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
        background: "var(--color-background)",
        borderRight: "1px solid var(--color-border)",
        transition: "width .2s var(--ease-bar)",
        overflow: "hidden",
      }}
    >
      {/* marca */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "18px 16px 14px", height: 58 }}>
        <span style={{ color: "var(--color-foreground)", flexShrink: 0, display: "flex" }}><Icon name="spark" size={17} /></span>
        {!collapsed && (
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 17, fontWeight: 600, letterSpacing: "-.2px", flex: 1 }}>Politix</span>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expandir" : "Recolher"}
          style={{ display: "flex", background: "none", border: "none", color: "var(--color-gray-700)", cursor: "pointer", padding: 2, transform: collapsed ? "rotate(180deg)" : "none", transition: "transform .2s" }}
        >
          <Icon name="chevron" size={17} />
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "6px 18px 4px", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--color-gray-600)" }}>
          Assessoria
        </div>
      )}

      {/* nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 10px", flex: 1 }}>
        {ASSESSOR_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: collapsed ? "10px 0" : "9px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--radius-sm)",
                color: active ? "var(--color-foreground)" : "var(--color-gray-800)",
                background: active ? "var(--color-background-200)" : "transparent",
                fontSize: 13.5,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={item.icon} size={17} style={{ flexShrink: 0, color: active ? "var(--color-foreground)" : "var(--color-gray-700)" }} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* card Eleição */}
      {!collapsed && days != null && (
        <div style={{ margin: "0 14px 10px", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background-100)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--color-gray-600)" }}>Eleição</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
            {new Date(electionDate + "T00:00:00").toLocaleDateString("pt-BR")}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--color-gray-700)", marginTop: 1, fontVariantNumeric: "tabular-nums" }}>faltam {days} dias</div>
        </div>
      )}

      {/* rodapé */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--color-gray-300)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "var(--color-foreground)" }}>
            {(tenantName || "P").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>Assessoria</div>
              <div style={{ fontSize: 10.5, color: "var(--color-gray-600)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{tenantName}</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Link href="/painel/config" title="Configurações" style={{ color: "var(--color-gray-700)", display: "flex" }}>
            <Icon name="gear" size={16} />
          </Link>
        )}
      </div>
    </aside>
  );
}
