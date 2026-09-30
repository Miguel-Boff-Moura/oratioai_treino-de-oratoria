// ============================================================
// OratioAI — Tela Inicial / Chat
// Suporta dois modos de entrada:
//   1) Texto colado (textarea)
//   2) Fala real via Web Speech API (SpeechRecognition), medindo
//      a duração real da fala para calcular o ritmo (ppm) de verdade.
// Em ambos os casos, o texto final é enviado ao backend Flask
// (/api/analisar), que faz a análise de PLN e devolve o feedback.
// ============================================================

const $ = (id) => document.getElementById(id);

let modoAtual = "texto";
let contextoAtual = "Trabalho Escolar";

// ── Alternância de modo (texto x fala) ──
function definirModo(modo) {
  modoAtual = modo;
  $("btn-mode-texto").classList.toggle("active", modo === "texto");
  $("btn-mode-fala").classList.toggle("active", modo === "fala");
  $("painel-texto").style.display = modo === "texto" ? "block" : "none";
  $("painel-fala").classList.toggle("visible", modo === "fala");
}

document.addEventListener("DOMContentLoaded", () => {
  definirModo("texto");

  const speech = $("speech");
  const count = $("count");
  speech.addEventListener("input", () => (count.textContent = speech.value.length));

  $("chips").addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    document.querySelectorAll("#chips .chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    contextoAtual = btn.dataset.ctx;
  });

  configurarReconhecimentoDeVoz();
});

// ============================================================
// Gravação de fala (Web Speech API)
// ============================================================
let reconhecimento = null;
let gravando = false;
let transcricaoFala = "";
let inicioGravacao = null;
let duracaoFalaSegundos = 0;
let timerInterval = null;

function configurarReconhecimentoDeVoz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("mic-unsupported").style.display = "block";
    $("mic-btn").disabled = true;
    return;
  }

  reconhecimento = new SpeechRecognition();
  reconhecimento.lang = "pt-BR";
  reconhecimento.continuous = true;
  reconhecimento.interimResults = true;

  reconhecimento.onresult = (evento) => {
    let interimText = "";
    for (let i = evento.resultIndex; i < evento.results.length; i++) {
      const trecho = evento.results[i][0].transcript;
      if (evento.results[i].isFinal) {
        transcricaoFala += trecho + " ";
      } else {
        interimText += trecho;
      }
    }
    $("mic-live-transcript").textContent = (transcricaoFala + interimText).trim() || "Ouvindo...";
  };

  reconhecimento.onerror = (evento) => {
    console.error("Erro no reconhecimento de voz:", evento.error);
    if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
      $("mic-status").textContent = "Permissão de microfone negada. Habilite o acesso ao microfone no navegador.";
    }
  };

  reconhecimento.onend = () => {
    // Se o navegador encerrar sozinho (timeout de silêncio) mas o usuário
    // ainda não tiver clicado em parar, reinicia automaticamente.
    if (gravando) {
      try { reconhecimento.start(); } catch (e) { /* já iniciado */ }
    }
  };
}

function alternarGravacao() {
  if (!reconhecimento) return;
  gravando ? pararGravacao() : iniciarGravacao();
}

function iniciarGravacao() {
  transcricaoFala = "";
  duracaoFalaSegundos = 0;
  gravando = true;
  inicioGravacao = Date.now();

  $("mic-btn").classList.add("recording");
  $("mic-status").textContent = "Gravando... toque para parar";
  $("mic-live-transcript").textContent = "Ouvindo...";

  timerInterval = setInterval(atualizarTimer, 250);
  try {
    reconhecimento.start();
  } catch (e) {
    console.error(e);
  }
}

function pararGravacao() {
  gravando = false;
  duracaoFalaSegundos = (Date.now() - inicioGravacao) / 1000;
  clearInterval(timerInterval);

  $("mic-btn").classList.remove("recording");
  $("mic-status").textContent = `Gravação encerrada — ${formatarTempo(duracaoFalaSegundos)} de fala capturada`;

  try { reconhecimento.stop(); } catch (e) { /* ignora */ }
}

function atualizarTimer() {
  const decorrido = (Date.now() - inicioGravacao) / 1000;
  $("mic-timer").textContent = formatarTempo(decorrido);
}

function formatarTempo(segundosTotais) {
  const s = Math.floor(segundosTotais);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ============================================================
// Envio para o backend + renderização do resultado
// ============================================================
async function analisar() {
  let texto = "";
  let origem = modoAtual;
  let duracao = null;

  if (modoAtual === "texto") {
    texto = $("speech").value.trim();
  } else {
    texto = transcricaoFala.trim();
    duracao = duracaoFalaSegundos || null;
  }

  if (!texto) {
    alert(modoAtual === "texto"
      ? "Cole ou escreva sua apresentação primeiro!"
      : "Grave sua fala pelo microfone primeiro!");
    return;
  }
  if (texto.split(/\s+/).filter(Boolean).length < 5) {
    alert("É preciso pelo menos 5 palavras para uma análise válida.");
    return;
  }

  definirCarregando(true);

  try {
    const resp = await fetch("/api/analisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto,
        contexto: contextoAtual,
        duracao_segundos: duracao,
        origem,
      }),
    });

    const dados = await resp.json();
    if (!resp.ok) throw new Error(dados.erro || "Erro ao analisar.");

    renderizarResultado(dados);
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível analisar agora: " + erro.message);
  } finally {
    definirCarregando(false);
  }
}

function definirCarregando(ligado) {
  $("analyze-btn").disabled = ligado;
  $("analyze-btn").innerHTML = ligado ? "⏳ Analisando..." : "🔍 Analisar Oratória";
  $("loading-bar").classList.toggle("active", ligado);
}

function renderizarResultado(d) {
  $("r-nota").textContent = d.nota_geral;
  $("r-clareza").textContent = d.clareza;
  $("r-ritmo").textContent = d.ritmo_wpm ?? "—";
  $("r-vicios").textContent = d.total_vicios;

  $("r-nota").className = "val " + corPorNota(d.nota_geral);

  $("meters").innerHTML = construirMedidores(d);
  $("vicios-chips").innerHTML = construirChipsVicios(d.vicios);
  $("transcript-box").innerHTML = d.transcricao_marcada || escaparHtml(d.transcricao);
  $("tips-list").innerHTML = construirDicas(d.dicas);

  $("result").classList.add("visible");
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}

function corPorNota(nota) {
  if (nota >= 70) return "color-good";
  if (nota >= 50) return "color-med";
  return "color-bad";
}

function construirMedidores(d) {
  const itens = [
    { label: "Nota Geral", val: d.nota_geral, cor: "var(--primary)" },
    { label: "Clareza", val: d.clareza, cor: "var(--cyan)" },
  ];
  return itens
    .map(
      (m) => `
    <div class="meter-row">
      <div class="meter-label"><span>${m.label}</span><span>${m.val}/100</span></div>
      <div class="meter-bar"><div class="meter-fill" style="width:${m.val}%;background:${m.cor}"></div></div>
    </div>`
    )
    .join("");
}

function construirChipsVicios(vicios) {
  const entradas = Object.entries(vicios || {});
  if (!entradas.length) return '<span class="chip chip-good">✓ Nenhum vício detectado</span>';
  return entradas
    .sort((a, b) => b[1] - a[1])
    .map(([palavra, qtd]) => `<span class="chip chip-bad">"${palavra}" × ${qtd}</span>`)
    .join("");
}

function construirDicas(dicas) {
  if (!dicas || !dicas.length) return '<p style="color:var(--text-muted)">Sem dicas disponíveis.</p>';
  return dicas
    .map(
      (t) => `
    <div class="tip">
      <span class="tip-icon">${t.icone}</span>
      <div><strong>${t.titulo}</strong><div class="tip-body">${t.corpo}</div></div>
    </div>`
    )
    .join("");
}

function trocarAba(nome, btn) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  $("aba-" + nome).classList.add("active");
}

function escaparHtml(s) {
  return (s || "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
