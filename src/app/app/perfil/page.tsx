import ScreenHeader from "@/components/app/ScreenHeader";

export default function Perfil() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Meu perfil" back />
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: foto (upload/remover), dados pessoais que salvam direto, e cidades/promessa
        que exigem <b>aprovação de assessor admin</b> (cartão âmbar “Aguardando aprovação”).
      </div>
    </main>
  );
}
