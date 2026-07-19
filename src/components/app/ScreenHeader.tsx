import Link from "next/link";
import { Icon } from "@/components/painel/icons";

// Cabeçalho de tela do app do líder. `back` mostra a seta que volta ao Placar.
export default function ScreenHeader({ title, back = false }: { title: string; back?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      {back && (
        <Link href="/app" style={{ width: 32, height: 32, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", color: "var(--color-foreground)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="back" size={15} />
        </Link>
      )}
      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 24, letterSpacing: "-.3px" }}>{title}</span>
    </div>
  );
}
