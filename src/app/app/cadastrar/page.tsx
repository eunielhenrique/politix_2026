import ScreenHeader from "@/components/app/ScreenHeader";

export default function Cadastrar() {
  return (
    <main style={{ padding: "8px 18px 24px" }}>
      <ScreenHeader title="Cadastrar liderado" />
      <p style={{ fontSize: 12.5, color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0 0 16px" }}>
        Cada pessoa é um voto provável. Um mesmo WhatsApp nunca conta duas vezes na campanha.
      </p>
      <div className="px-card" style={{ padding: 18, fontSize: 13.5, lineHeight: 1.55, color: "var(--color-card-foreground)" }}>
        Em seguida: alternador <b>Um por vez / Vários de uma vez</b>, com colagem direta do WhatsApp
        (um contato por linha), prévia com contagens (prontos · já na campanha · incompletos) e dedup honesto.
      </div>
    </main>
  );
}
