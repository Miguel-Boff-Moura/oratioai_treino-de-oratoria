/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "#0B0D12",
        card: "#14161E",
        borda: "#252836",
        azul: "#3B82F6",
        ciano: "#22D3EE",
        verde: "#2DD4BF",
        roxo: "#A78BFA",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ['"Krona One"', "Inter", "system-ui", "sans-serif"],
        mono: ['"Space Mono"', "ui-monospace", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
