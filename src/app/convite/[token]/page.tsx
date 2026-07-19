"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "@/lib/politix/rpc";

export default function ConvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [state, setState] = useState<"checking" | "ready" | "accepting" | "error">("checking");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(`/convite/${token}`)}`);
        return;
      }
      setState("ready");
    })();
  }, [router, token]);

  async function activate() {
    setState("accepting");
    try {
      const supabase = createClient();
      await acceptInvite(supabase, token);
      router.replace("/app");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  if (state === "checking") return null;

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
      <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--color-muted-foreground)" }}>
            Convite de liderança
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>Entrar na campanha</div>
          <div style={{ fontSize: 13.5, color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
            Ao ativar, você passa a fazer parte da rede de lideranças e começa a cadastrar seus votos.
          </div>
        </div>

        <div className="px-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          {state === "error" && (
            <div style={{ fontSize: 13, color: "var(--color-negative)" }}>
              Não consegui ativar este convite. Ele pode ter expirado — peça um novo link.
            </div>
          )}
          <button
            onClick={activate}
            disabled={state === "accepting"}
            style={{
              padding: "12px 14px",
              background: "var(--color-foreground)",
              color: "var(--color-background)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: state === "accepting" ? "not-allowed" : "pointer",
              opacity: state === "accepting" ? 0.6 : 1,
            }}
          >
            {state === "accepting" ? "Ativando…" : "Ativar minha liderança"}
          </button>
        </div>
      </div>
    </div>
  );
}
