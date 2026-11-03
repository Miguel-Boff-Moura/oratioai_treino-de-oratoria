import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O site é 100% estático: não há backend nem banco de dados.
// `npm run build` gera a pasta frontend/dist, que é o que o Vercel publica.
// base "./" faz os caminhos funcionarem também no GitHub Pages e no Live Server.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
