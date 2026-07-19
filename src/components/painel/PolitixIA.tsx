"use client";

import { useState } from "react";
import { Icon } from "./icons";

// FAB "Politix IA" → painel de chat. Stub visual (resposta real com LLM vem depois).
export default function PolitixIA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 16px",
          borderRadius: "var(--radius-full)",
          background: "var(--color-foreground)",
          color: "var(--color-background)",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <Icon name="spark" size={16} />
        Politix IA
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 22,
            bottom: 78,
            zIndex: 40,
            width: 340,
            maxWidth: "calc(100vw - 44px)",
            height: 440,
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            animation: "pxSlideUp .28s var(--ease-out)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--color-border)" }}>
            <Icon name="spark" size={15} />
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>Politix IA</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
            <div style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "10px 12px", background: "var(--color-muted)", borderRadius: "var(--radius-md)", fontSize: 13, lineHeight: 1.5 }}>
              Oi! Sou a Politix IA. Em breve vou ler o placar, o ranking e o mapa e responder o que você precisar sobre a campanha.
            </div>
          </div>
          <div style={{ padding: 12, borderTop: "1px solid var(--color-border)" }}>
            <input
              disabled
              placeholder="Pergunte algo… (em breve)"
              style={{ width: "100%", padding: "10px 12px", background: "var(--color-background-200)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", color: "var(--color-muted-foreground)", fontFamily: "var(--font-sans)", fontSize: 13, outline: "none" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
