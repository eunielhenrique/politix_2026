import ScreenHeader from "@/components/app/ScreenHeader";

export default function Notificacoes() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Notificações" back />
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: alertas com tom positivo (novos liderados, marcos de meta, selos conquistados,
        comunicados da assessoria). A cobrança dura fica só no painel do assessor.
      </div>
    </main>
  );
}
