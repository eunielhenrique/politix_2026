import { Icon } from "./icons";

// Placeholder on-brand para módulos ainda em construção.
export default function Stub({
  icon,
  title,
  phase,
  bullets,
}: {
  icon: string;
  title: string;
  phase: string;
  bullets: string[];
}) {
  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: 24 }}>
      <div className="px-card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--color-muted)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-foreground)" }}>
            <Icon name={icon} size={20} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>{title}</div>
            <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-highlight)" }}>{phase}</div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
          <div className="mono" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--color-muted-foreground)", marginBottom: 8 }}>O que vem nesta tela</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {bullets.map((b) => (
              <li key={b} style={{ fontSize: 13.5, color: "var(--color-card-foreground)", lineHeight: 1.5 }}>{b}</li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
