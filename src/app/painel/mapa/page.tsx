import Stub from "@/components/painel/Stub";

export default function MapaPage() {
  return (
    <Stub
      icon="map"
      title="Mapa da rede"
      phase="Fase 4 · em construção"
      bullets={[
        "Choropleth municipal de SP (contorno oficial IBGE, zoom d3) reaproveitando sp-map.js / sp-choropleth.js do handoff.",
        "Camadas: Cobertura · Histórico da família (Wesley, Elvis, Cezão) · Rede atual.",
        "Painel ao vivo à direita: prioridade de investimento e raio-x por município (índice 0–100, cobertura/mil, tendência).",
        "Filtro por Região Administrativa e botão Expandir (fullscreen).",
      ]}
    />
  );
}
