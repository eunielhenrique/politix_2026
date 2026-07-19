import ScreenHeader from "@/components/app/ScreenHeader";

export default function Convidar() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Convidar sub-líder" back />
      <p style={{ fontSize: 12.5, color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0 0 16px" }}>
        Quem você convidar entra na árvore abaixo de você — a rede dele soma no seu placar.
      </p>
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: formulário (nome · WhatsApp · cidades · promessa) → gera link copiável
        via <code>invite_leader</code>, para enviar no WhatsApp.
      </div>
    </main>
  );
}
