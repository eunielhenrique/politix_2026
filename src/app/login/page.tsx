"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (authError) {
      setError("Não consegui enviar o link. Confira o e-mail e tente de novo.");
      return;
    }
    setSent(true);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--color-background-100)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="mono"
            style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".14em", color: "var(--color-foreground)" }}
          >
            POLITIX
          </div>
          <div style={{ fontSize: 13.5, color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Inteligência eleitoral da campanha.
          </div>
        </div>

        {sent ? (
          <div className="px-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Link enviado ✓</div>
            <div style={{ fontSize: 13.5, color: "var(--color-muted-foreground)", lineHeight: 1.55 }}>
              Enviamos um link de acesso para <b style={{ color: "var(--color-foreground)" }}>{email}</b>.
              Abra no mesmo dispositivo para entrar.
            </div>
            <button
              onClick={() => setSent(false)}
              className="mono"
              style={{
                marginTop: 6,
                alignSelf: "flex-start",
                background: "none",
                border: "none",
                color: "var(--color-muted-foreground)",
                fontSize: 12,
                cursor: "pointer",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <label
              className="mono"
              style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-muted-foreground)" }}
            >
              Seu e-mail
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@campanha.com"
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
            {error && <div style={{ fontSize: 13, color: "var(--color-negative)" }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
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
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Enviando…" : "Receber link de acesso"}
            </button>
          </form>
        )}

        <div style={{ fontSize: 12, color: "var(--color-gray-600)", lineHeight: 1.5 }}>
          O primeiro acesso cria a campanha. Convidados entram pelo link recebido no WhatsApp.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
