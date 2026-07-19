// Coordenadas (lng, lat) das principais cidades de SP — para plotar pins no sp-map.
export const CITY_COORDS: Record<string, [number, number]> = {
  "São Paulo": [-46.633, -23.55],
  "Guarulhos": [-46.533, -23.454],
  "Osasco": [-46.792, -23.532],
  "Barueri": [-46.876, -23.51],
  "Santo André": [-46.538, -23.663],
  "São Bernardo do Campo": [-46.565, -23.694],
  "São Caetano do Sul": [-46.564, -23.618],
  "Diadema": [-46.62, -23.686],
  "Mauá": [-46.461, -23.667],
  "Campinas": [-47.061, -22.905],
  "Sorocaba": [-47.458, -23.501],
  "Jundiaí": [-46.884, -23.186],
  "Santos": [-46.333, -23.96],
  "São José dos Campos": [-45.887, -23.179],
  "Ribeirão Preto": [-47.81, -21.177],
  "São José do Rio Preto": [-49.379, -20.812],
  "Bauru": [-49.06, -22.314],
  "Piracicaba": [-47.649, -22.725],
  "Presidente Prudente": [-51.388, -22.126],
  "Santana de Parnaíba": [-46.918, -23.444],
  "Cotia": [-46.919, -23.604],
  "Carapicuíba": [-46.836, -23.522],
  "Taboão da Serra": [-46.758, -23.626],
  "Mogi das Cruzes": [-46.188, -23.522],
  "Itaquaquecetuba": [-46.348, -23.486],
};

export interface MapCity {
  nome: string;
  lng: number;
  lat: number;
  status: "coberto" | "parcial" | "priorizar";
  statusLabel: string;
  lideres: number;
  cadastros: number;
  potencial: number;
  label?: boolean;
}

// Constrói o array data-cities do sp-map a partir dos dados reais.
export function buildMapCities(
  cityCount: Record<string, number>,
  leadersPerCity: Record<string, number>,
): MapCity[] {
  const coveredVals = Object.entries(cityCount)
    .filter(([c]) => (leadersPerCity[c] || 0) > 0)
    .map(([, n]) => n)
    .sort((a, b) => a - b);
  const med = coveredVals.length ? coveredVals[Math.floor(coveredVals.length / 2)] : 0;

  return Object.entries(cityCount)
    .filter(([c]) => CITY_COORDS[c])
    .map(([city, cadastros]) => {
      const lideres = leadersPerCity[city] || 0;
      const status: MapCity["status"] = lideres === 0 ? "priorizar" : cadastros >= med ? "coberto" : "parcial";
      const [lng, lat] = CITY_COORDS[city];
      return {
        nome: city,
        lng,
        lat,
        status,
        statusLabel: status === "coberto" ? "coberta" : status === "parcial" ? "cobertura parcial" : "priorizar",
        lideres,
        cadastros,
        potencial: 0,
      };
    })
    .sort((a, b) => b.cadastros - a.cadastros);
}
