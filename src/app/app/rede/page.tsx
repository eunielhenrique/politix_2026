import ScreenHeader from "@/components/app/ScreenHeader";

export default function Rede() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Minha rede" />
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: sub-líderes (rollup da subárvore, com barra de progresso e detecção de talento ★)
        e a lista de liderados diretos. O realizado soma toda a subárvore.
      </div>
    </main>
  );
}
