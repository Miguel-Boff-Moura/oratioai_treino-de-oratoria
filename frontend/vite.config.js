import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Durante o desenvolvimento, o Vite serve o frontend em http://localhost:5173
// e faz proxy de tudo que começa com /api para o backend Flask em :5000.
// Assim o código do frontend só precisa chamar "/api/..." — sem CORS, sem
// URL absoluta fixa no código.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
