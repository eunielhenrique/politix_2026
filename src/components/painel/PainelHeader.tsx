"use client";

import { usePathname } from "next/navigation";
import { pageMeta } from "@/lib/politix/nav";
import { Icon } from "./icons";
import ThemeToggle from "./ThemeToggle";

// Breadcrumb /Politix › {title} + sino + tema + Assessoria + AS, e a linha de subtítulo.
export default function PainelHeader() {
  const pathname = usePathname();
  const meta = pageMeta(pathname);

  return (
    <>
      <div className="px-sticky" style={{ display: "flex", alignItems: "center", gap: 12, height: 56, padding: "0 28px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontFamily: "var(--font-mono)", fontSize: 14, minWidth: 0 }}>
          <span style={{ color: "var(--color-gray-700)" }}>/Politix</span>
          <span style={{ color: "var(--color-gray-600)" }}>›</span>
          <h1 style={{ fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 14, color: "var(--color-foreground)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.title}</h1>
        </div>
        <div style={{ flex: 1 }} />
        <button title="Notificações" style={{ position: "relative", width: 34, height: 34, border: "none", background: "none", color: "var(--color-gray-900)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="bell" size={17} />
          <span style={{ position: "absolute", top: 6, right: 7, width: 5, height: 5, borderRadius: "var(--radius-full)", background: "var(--color-accent)" }} />
        </button>
        <ThemeToggle />
        <span style={{ fontSize: 13, color: "var(--color-gray-900)" }}>Assessoria</span>
        <div style={{ width: 30, height: 30, borderRadius: "var(--radius-full)", background: "var(--color-gray-300)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, color: "var(--color-foreground)" }}>AS</div>
      </div>
      <div style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: 12, letterSpacing: ".06em", color: "var(--color-gray-700)", padding: "16px 28px 0" }}>{meta.sub}</div>
    </>
  );
}
