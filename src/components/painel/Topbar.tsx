"use client";

import { usePathname } from "next/navigation";
import { activeLabel } from "@/lib/politix/nav";
import { Icon } from "./icons";

export default function Topbar({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();
  const label = activeLabel(pathname);

  return (
    <header
      className="px-sticky"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 52,
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mono" style={{ fontSize: 12.5, color: "var(--color-muted-foreground)" }}>
        <span style={{ color: "var(--color-foreground)", fontWeight: 700, letterSpacing: ".08em" }}>POLITIX</span>
        <span style={{ margin: "0 8px", opacity: 0.5 }}>›</span>
        <span style={{ color: "var(--color-foreground)" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", display: "flex", position: "relative" }} aria-label="Notificações">
          <Icon name="bell" size={18} />
          <span style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: "50%", background: "var(--color-highlight)" }} />
        </button>
        <span className="mono" style={{ fontSize: 12, color: "var(--color-muted-foreground)", whiteSpace: "nowrap" }}>{tenantName}</span>
        <div style={{ width: 26, height: 26, borderRadius: "var(--radius-full)", background: "var(--color-muted)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, color: "var(--color-muted-foreground)" }}>
          {(tenantName || "P").slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
