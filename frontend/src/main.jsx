import React from "react";
import ReactDOM from "react-dom/client";
// Fontes do protótipo do Figma, embutidas no projeto (só o alfabeto latino,
// que já tem os acentos do português).
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/krona-one/latin-400.css";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import OratioAI from "./OratioAI.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <OratioAI />
  </React.StrictMode>
);
