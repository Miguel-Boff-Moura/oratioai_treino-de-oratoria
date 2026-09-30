// ============================================================
// OratioAI — Histórico
// Lista todas as sessões salvas no backend (/api/sessoes) e
// mostra o detalhe completo (transcrição, dicas, vícios) ao
// clicar em uma delas.
// ============================================================

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", carregarHistorico);

async function carregarHistorico() {
  const resp = await fetch("/api/sessoes?limite=100");
  const sessoes = await resp.json();
  const lista = $("history-list");

  if (!sessoes.length) {
    lista.innerHTML = '<div class="empty-state">Nenhuma sessão registrada ainda. <a href="/" style="color:var(--primary-2)">Treine agora</a>.</div>';
    return;
  }

  lista.innerHTML = sessoes
    .map((s) => {
      const cor = s.nota_geral >= 70 ? "color-good" : s.nota_geral >= 50 ? "color-med" : "color-bad";
      const data = new Date(s.criado_em + "Z");
      const dataFormatada = data.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
      const icone = s.origem === "fala" ? "🎙️" : "✍️";
      return `
      <div class="history-item" onclick="mostrarDetalhe(${s.id})">
        <div class="history-score ${cor}">${s.nota_geral}</div>
        <div class="history-meta">
          <strong>${icone} ${s.contexto || "Treino"}</strong>
          <span>${dataFormatada} · ${s.quantidade_palavras} palavras · ${s.total_vicios} vícios</span>
        </div>
      </div>`;
    })
    .join("");
}

async function mostrarDetalhe(id) {
  const resp = await fetch(`/api/sessoes/${id}`);
  const s = await resp.json();
  const box = $("history-detail");

  const dicasHtml = (s.dicas || [])
    .map((t) => `<div class="tip"><span class="tip-icon">${t.icone}</span><div><strong>${t.titulo}</strong><div class="tip-body">${t.corpo}</div></div></div>`)
    .join("");

  box.innerHTML = `
    <div class="score-row" style="margin-bottom: 18px;">
      <div class="score-card"><div class="val color-blue">${s.nota_geral}</div><div class="lbl">Nota Geral</div></div>
      <div class="score-card"><div class="val color-good">${s.clareza}</div><div class="lbl">Clareza</div></div>
      <div class="score-card"><div class="val color-med">${s.ritmo_wpm ?? "—"}</div><div class="lbl">Ritmo (ppm)</div></div>
      <div class="score-card"><div class="val color-bad">${s.total_vicios}</div><div class="lbl">Vícios</div></div>
    </div>
    <span class="field-label">Transcrição:</span>
    <div class="transcript" style="margin-bottom: 18px;">${s.transcricao_marcada || s.transcricao}</div>
    <span class="field-label">Dicas:</span>
    ${dicasHtml}
  `;
  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}
