"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMe, bootstrapTenant } from "@/lib/politix/rpc";

const ELECTION_DATE = "2026-10-04"; // backend-only, exibido só como referência

export default function OnboardingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const me = await getMe(supabase);
      if (me?.tenant_id) {
        router.replace(me.role === "assessor" ? "/painel" : "/app");
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      await bootstrapTenant(supabase, name.trim(), ELECTION_DATE);
      router.replace("/painel");
      router.refresh();
    } catch {
      setError("Não consegui criar a campanha. Tente novamente.");
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--color-background-100)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
            Primeiro acesso
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>Crie a sua campanha</div>
          <div style={{ fontSize: 13.5, color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Você será o assessor administrador. A rede de lideranças começa aqui.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-muted-foreground)" }}>
            Nome da campanha
          </label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wesley Cezar (Lelinho) — SP 2026"
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "var(--color-background-200)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-foreground)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              outline: "none",
            }}
          />

          <div className="mono tnum" style={{ fontSize: 11.5, color: "var(--color-gray-600)" }}>
            Eleição: {new Date(ELECTION_DATE + "T00:00:00").toLocaleDateString("pt-BR")} · início oficial 15/08/2026
          </div>

          {error && <div style={{ fontSize: 13, color: "var(--color-negative)" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              marginTop: 4,
              padding: "12px 14px",
              background: "var(--color-foreground)",
              color: "var(--color-background)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !name.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "Criando…" : "Criar campanha"}
          </button>
        </form>
      </div>
    </div>
  );
}
