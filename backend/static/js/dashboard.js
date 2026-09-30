// ============================================================
// OratioAI — Dashboard
// Consome /api/dashboard/resumo e /api/sessoes (dados reais,
// salvos pelo backend a cada análise) para montar os cards de
// estatística e o gráfico SVG de desempenho semanal.
// ============================================================

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all([carregarResumo(), carregarSessoesRecentes()]);
});

async function carregarResumo() {
  const resp = await fetch("/api/dashboard/resumo");
  const r = await resp.json();

  $("welcome-sub").textContent = r.total_sessoes
    ? `Você já treinou ${r.total_sessoes} ${r.total_sessoes === 1 ? "sessão" : "sessões"}. Continue praticando!`
    : "Você ainda não treinou nenhuma sessão. Que tal começar agora?";

  $("stat-ritmo").innerHTML = `${r.ritmo_medio ?? "—"}<span class="unit">ppm</span>`;
  $("stat-clareza").innerHTML = `${r.clareza_media ?? "—"}<span class="unit">/100</span>`;
  $("stat-vicios").innerHTML = `${r.total_vicios}<span class="unit">total</span>`;
  $("stat-sessoes").innerHTML = `${r.total_sessoes}<span class="unit">sessões</span>`;

  $("stat-vicios-foot").textContent = r.vicios_mais_falados.length
    ? "Mais falado: \"" + r.vicios_mais_falados[0].palavra + "\" (" + r.vicios_mais_falados[0].quantidade + "x)"
    : "Nenhum registro ainda";

  desenharGrafico(r.serie_semanal);
}

async function carregarSessoesRecentes() {
  const resp = await fetch("/api/sessoes?limite=4");
  const sessoes = await resp.json();
  const lista = $("sessions-list");

  if (!sessoes.length) {
    lista.innerHTML = '<div class="empty-state">Nenhuma sessão registrada ainda.<br/>Treine sua primeira apresentação!</div>';
    return;
  }

  lista.innerHTML = sessoes
    .map((s) => {
      const data = new Date(s.criado_em + "Z");
      const dataFormatada = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const titulo = (s.contexto || "Treino") + (s.origem === "fala" ? " 🎙" : " ✍️");
      return `
      <div class="session-item">
        <div class="session-icon">🎤</div>
        <div class="session-info">
          <div class="t">${titulo}</div>
          <div class="m">${dataFormatada} · ${horaFormatada} · ${s.quantidade_palavras} palavras</div>
        </div>
        <div class="session-score">
          <div class="v">${s.nota_geral}</div>
          <div class="l">NOTA</div>
        </div>
      </div>`;
    })
    .join("");
}

function desenharGrafico(serie) {
  const largura = 700;
  const altura = 280;
  const baseY = 240;
  const topoY = 20;
  const passoX = largura / (serie.length - 1);

  const paraY = (valor) => {
    if (valor === null || valor === undefined) return null;
    return baseY - (valor / 100) * (baseY - topoY);
  };

  const pontosClareza = serie.map((s, i) => ({ x: i * passoX, y: paraY(s.clareza) }));
  const pontosRitmo = serie.map((s, i) => ({ x: i * passoX, y: paraY(s.ritmo_wpm ? Math.min(100, (s.ritmo_wpm / 180) * 100) : null) }));

  const caminho = (pontos) => {
    const validos = pontos.filter((p) => p.y !== null);
    if (validos.length < 2) return null;
    let d = `M${validos[0].x},${validos[0].y}`;
    for (let i = 1; i < validos.length; i++) d += ` L${validos[i].x},${validos[i].y}`;
    return d;
  };

  const linhaClareza = caminho(pontosClareza);
  const linhaRitmo = caminho(pontosRitmo);
  const grupo = $("chart-paths");

  if (!linhaClareza && !linhaRitmo) {
    grupo.innerHTML = "";
    $("chart-labels").innerHTML = `<text x="260" y="140" fill="#5a6378" font-size="13">Sem dados suficientes ainda</text>`;
    return;
  }

  let svgHtml = "";
  if (linhaClareza) {
    svgHtml += `<path d="${linhaClareza} L${(serie.length - 1) * passoX},${baseY} L0,${baseY} Z" fill="url(#g1)"/>`;
    svgHtml += `<path d="${linhaClareza}" fill="none" stroke="#22d3ee" stroke-width="2.5"/>`;
  }
  if (linhaRitmo) {
    svgHtml += `<path d="${linhaRitmo} L${(serie.length - 1) * passoX},${baseY} L0,${baseY} Z" fill="url(#g2)"/>`;
    svgHtml += `<path d="${linhaRitmo}" fill="none" stroke="#3b82f6" stroke-width="2.5"/>`;
  }
  grupo.innerHTML = svgHtml;

  $("chart-labels").innerHTML = serie.map((s, i) => `<text x="${i * passoX - 8}" y="275">${s.dia}</text>`).join("");
}
