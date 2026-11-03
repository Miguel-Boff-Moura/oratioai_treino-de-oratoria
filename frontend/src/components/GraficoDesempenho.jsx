import React, { useEffect, useMemo, useRef, useState } from "react";

/* Gráfico de áreas com curvas suaves (como no protótipo do Figma).
   Desenhado em SVG puro, sem biblioteca. O SVG é escondido do leitor de tela
   e os mesmos dados ficam numa tabela invisível logo abaixo. */

const ALTURA = 240;
const MARGEM_TOPO = 16;
const MARGEM_BASE = 12;
const RITMO_MAX = 180; // ppm que corresponde ao topo do gráfico

// Converte uma lista de pontos em uma curva suave (Catmull-Rom → Bézier).
function caminhoSuave(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function useLargura() {
  const ref = useRef(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setLargura(Math.round(el.getBoundingClientRect().width));
    medir();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", medir);
      return () => window.removeEventListener("resize", medir);
    }
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, largura];
}

export default function GraficoDesempenho({ serie }) {
  const [ref, largura] = useLargura();
  const [ativo, setAtivo] = useState(null);
  const pontos = serie.pontos;
  const n = pontos.length;
  const pronto = largura > 0;
  const passo = largura / (n - 1);
  const yDe = (v) => MARGEM_TOPO + (1 - v / 100) * (ALTURA - MARGEM_TOPO - MARGEM_BASE);

  const { clarezaPts, ritmoPts } = useMemo(
    () => ({
      clarezaPts: pontos.map((p, i) => ({ x: i * passo, y: yDe(p.clareza.valor) })),
      ritmoPts: pontos.map((p, i) => ({ x: i * passo, y: yDe(Math.min(100, (p.ritmo.valor / RITMO_MAX) * 100)) })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pontos, passo]
  );

  const linhaClareza = caminhoSuave(clarezaPts);
  const linhaRitmo = caminhoSuave(ritmoPts);
  const fechar = (linha) => `${linha} L${largura},${ALTURA} L0,${ALTURA} Z`;
  // A chave muda quando os dados mudam, para a animação de desenho rodar de novo.
  const chave = pontos.map((p) => `${p.clareza.valor}-${p.ritmo.valor}`).join("|");

  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setAtivo(Math.max(0, Math.min(n - 1, i)));
  };

  const pAtivo = ativo != null ? pontos[ativo] : null;

  return (
    <div>
      <div ref={ref} className="relative w-full" style={{ height: ALTURA }}>
        {pronto && (
        <svg
          key={chave}
          width={largura}
          height={ALTURA}
          viewBox={`0 0 ${largura} ${ALTURA}`}
          className="absolute inset-0 block overflow-visible"
          aria-hidden="true"
          focusable="false"
          onMouseMove={aoMover}
          onMouseLeave={() => setAtivo(null)}
        >
          <defs>
            <linearGradient id="gradClareza" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#14B8A6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradRitmo" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <g stroke="rgba(255,255,255,0.07)" strokeDasharray="4 6">
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={largura} y1={ALTURA * f} y2={ALTURA * f} />
            ))}
          </g>

          <path d={fechar(linhaClareza)} fill="url(#gradClareza)" className="grafico-area" />
          <path d={fechar(linhaRitmo)} fill="url(#gradRitmo)" className="grafico-area" />
          <path
            d={linhaClareza}
            fill="none"
            stroke="#22E3F0"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            className="grafico-linha"
          />
          <path
            d={linhaRitmo}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            className="grafico-linha grafico-linha--atraso"
          />

          {pAtivo && (
            <g>
              <line
                x1={ativo * passo}
                x2={ativo * passo}
                y1={MARGEM_TOPO / 2}
                y2={ALTURA}
                stroke="rgba(255,255,255,0.2)"
              />
              <circle cx={clarezaPts[ativo].x} cy={clarezaPts[ativo].y} r="5" fill="#22E3F0" stroke="#0B0D12" strokeWidth="2" />
              <circle cx={ritmoPts[ativo].x} cy={ritmoPts[ativo].y} r="5" fill="#3B82F6" stroke="#0B0D12" strokeWidth="2" />
            </g>
          )}
        </svg>
        )}

        {pronto && pAtivo && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-xl border border-borda bg-[#0F1117]/95 px-3 py-2 text-xs shadow-xl"
            style={{
              left: Math.min(Math.max(ativo * passo - 80, 0), largura - 170),
              width: 170,
            }}
          >
            <p className="font-semibold text-white">
              {pAtivo.dia} · {pAtivo.data}
            </p>
            <p className="mt-1 text-cyan-300">
              Clareza: {pAtivo.clareza.valor}/100{pAtivo.clareza.estimado ? " (estimado)" : ""}
            </p>
            <p className="text-blue-300">
              Ritmo: {pAtivo.ritmo.valor} ppm{pAtivo.ritmo.estimado ? " (estimado)" : ""}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-between text-xs text-gray-400" aria-hidden="true">
        {pontos.map((p) => (
          <span key={p.data} className="w-10 text-center first:text-left last:text-right">
            {p.dia}
          </span>
        ))}
      </div>

      {/* A div sr-only envolve a tabela: tabela com sr-only direto ainda ocupa largura. */}
      <div className="sr-only">
      <table>
        <caption>Desempenho dos últimos 7 dias</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Clareza (0 a 100)</th>
            <th scope="col">Ritmo (palavras por minuto)</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((p) => (
            <tr key={p.data}>
              <th scope="row">
                {p.dia} ({p.data})
              </th>
              <td>
                {p.clareza.valor}
                {p.clareza.estimado ? " estimado" : ""}
              </td>
              <td>
                {p.ritmo.valor}
                {p.ritmo.estimado ? " estimado" : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
