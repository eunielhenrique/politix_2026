import type { NextConfig } from "next";

// Home serve o front original (protótipo compilado, self-contained).
// O app Next/Supabase segue disponível em /painel, /app, /login para a fase de integração.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/politix-standalone.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
