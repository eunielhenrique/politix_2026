import type { NextConfig } from "next";

// Home serve o front original (protótipo compilado, self-contained).
// O app Next/Supabase segue disponível em /painel, /app, /login para a fase de integração.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/Politix.dc.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
  // O protótipo é um HTML estático servido na home e ainda muda várias vezes por dia.
  // Com o cache padrão o navegador (e o PWA no iOS) continuava mostrando a versão
  // antiga depois do deploy — alguém revisava uma tela que já não existia mais.
  // Enquanto o front estiver nessa cadência, ele não fica em cache.
  async headers() {
    const semCache = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
      { key: "Pragma", value: "no-cache" },
    ];
    return [
      { source: "/", headers: semCache },
      { source: "/Politix.dc.html", headers: semCache },
      { source: "/px-destaque.js", headers: semCache },
      { source: "/sp-map.js", headers: semCache },
      { source: "/sp-choropleth.js", headers: semCache },
      { source: "/support.js", headers: semCache },
    ];
  },
};

export default nextConfig;
