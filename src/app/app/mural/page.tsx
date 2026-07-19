import ScreenHeader from "@/components/app/ScreenHeader";

export default function Mural() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Mural" />
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: comunicados da assessoria (com tags) e trilhas de treinamento.
      </div>
    </main>
  );
}
