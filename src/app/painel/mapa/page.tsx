import { createClient } from "@/lib/supabase/server";
import { getTenantRanking } from "@/lib/politix/rpc";
import { buildMapCities } from "@/lib/politix/geo";
import SPMap from "@/components/painel/SPMap";

export default async function MapaPage() {
  const supabase = await createClient();
  const { data: lids } = await supabase.from("liderado").select("city").limit(20000);
  const cityCount: Record<string, number> = {};
  (lids ?? []).forEach((l: { city: string | null }) => { const c = l.city || "—"; cityCount[c] = (cityCount[c] || 0) + 1; });
  const leadersPerCity: Record<string, number> = {};
  try {
    const ranking = await getTenantRanking(supabase);
    ranking.forEach((r) => (r.cities ?? []).forEach((c) => (leadersPerCity[c] = (leadersPerCity[c] || 0) + 1)));
  } catch {}
  const mapCities = buildMapCities(cityCount, leadersPerCity);

  const layers = ["Cobertura", "Histórico da família", "Rede atual"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
        <div style={{ display: "flex", gap: 6, border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: 3, background: "var(--color-background)" }}>
          {layers.map((l, i) => (
            <span key={l} style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 500, background: i === 0 ? "var(--color-muted)" : "transparent", color: i === 0 ? "var(--color-foreground)" : "var(--color-gray-700)" }}>{l}</span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--color-muted-foreground)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-gray-1000)" }} />coberto</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-gray-700)" }} />parcial</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: "var(--radius-sm)", background: "var(--color-highlight)" }} />priorizar</span>
        </div>
      </div>

      <div style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", background: "var(--color-background)", overflow: "hidden", height: "calc(100vh - 200px)", minHeight: 460 }}>
        <SPMap cities={mapCities} height="100%" />
      </div>

      <div style={{ fontSize: 11, color: "var(--color-gray-600)" }}>
        Contorno oficial IBGE. Próxima etapa: choropleth municipal com zoom (sp-choropleth), camada de histórico da família (índice TSE 0–100, nunca somado) e painel ao vivo por município.
      </div>
    </div>
  );
}
