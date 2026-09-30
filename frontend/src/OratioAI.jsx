import React, { useState, useEffect, useCallback } from "react";
import {
  Mic,
  Search,
  Share2,
  History,
  Home as HomeIcon,
  Check,
  TrendingUp,
  TrendingDown,
  FileText,
  Loader2,
  Crown,
  Save,
  Trash2,
  MessageSquare,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { analisarOratoria, listarSessoes, resumoDashboard } from "./api";
import { useSpeechRecognition } from "./useSpeechRecognition";

/* ============================================================
   OratioAI — Protótipo SPA (React + Tailwind + Lucide)
   TCC · ETE Monteiro Lobato 2026 · Lucas Drescher & Miguel Moura
   ============================================================ */

const CONTEXT_OPTIONS = [
  "Trabalho Escolar",
  "TCC / Projeto",
  "Entrevista de Emprego",
  "Debate",
  "Outro",
];

const SIDEBAR_ITEMS = [
  {
    label: "Apresentação TCC",
    context: "TCC / Projeto",
    example:
      "Bom dia banca examinadora. Hoje vou apresentar, né, o resultado do nosso Trabalho de Conclusão de Curso...",
  },
  {
    label: "Reunião de negócios",
    context: "Entrevista de Emprego",
    example:
      "Bom dia a todos. Então, vamos revisar, tipo, os principais indicadores do trimestre antes de decidirmos os próximos passos...",
  },
  {
    label: "Trabalho Escolar",
    context: "Trabalho Escolar",
    example:
      "Bom dia a todos, né. Hoje vou falar, tipo, sobre a importância da IA na educação. Então, a tecnologia, tipo, mudou muito a forma como aprendemos...",
  },
];

const CHART_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Série semanal vazia (usada enquanto o dashboard carrega ou quando ainda
// não há nenhuma sessão registrada).
const SERIE_VAZIA = CHART_DAYS.map((dia) => ({ dia, clareza: null, ritmo_wpm: null }));

// Normaliza o ritmo (ppm) para a escala 0-100 do gráfico, como faz o backend.
const ritmoNormalizado = (wpm) =>
  wpm == null ? null : Math.min(100, (wpm / 180) * 100);

const ESSENTIAL_ROWS = [
  { label: "Análises de oratória por mês", free: "3", paid: "30" },
  { label: "Histórico de sessões", free: "7 dias", paid: "90 dias" },
  { label: "Detecção de vícios de linguagem", free: true, paid: true },
  { label: "Dashboard de desempenho", free: true, paid: true },
  { label: "Exportar relatório em PDF", free: false, paid: true },
];

const MASTER_EXTRA_FEATURES = [
  "Reconhecimento de voz avançado (ASR de alta precisão)",
  "Sessões e histórico ilimitados",
  "Feedback detalhado gerado por IA em tempo real",
  "Exportação ilimitada de relatórios em PDF",
  "Suporte prioritário e acesso antecipado a novos recursos",
];

function formatTime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// O backend salva criado_em em UTC sem sufixo "Z"; adicionamos para o
// navegador converter corretamente para o fuso local.
function formatSessionDate(criadoEm) {
  if (!criadoEm) return "";
  const d = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(criadoEm) ? criadoEm : criadoEm + "Z");
  if (Number.isNaN(d.getTime())) return criadoEm;
  const data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} · ${hora}`;
}

function corPorNota(nota) {
  if (nota >= 70) return "text-emerald-400";
  if (nota >= 50) return "text-amber-400";
  return "text-red-400";
}

/* ---------------------- Subcomponentes ---------------------- */

function EyebrowPill({ children }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A1B23] border border-[#252836] text-[11px] font-semibold tracking-widest text-cyan-300 mb-8">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00D1FF] shadow-[0_0_8px_#00D1FF]" />
      {children}
    </div>
  );
}

function Sidebar({ activeLabel, onSelect }) {
  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-4 lg:sticky lg:top-24">
        <p className="text-[11px] font-semibold tracking-widest text-gray-500 mb-3 px-2">
          ATALHOS RÁPIDOS
        </p>
        <div className="flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => onSelect(item)}
              className={`text-left text-sm px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                activeLabel === item.label
                  ? "bg-gradient-to-r from-[#2563EB]/20 to-[#00D1FF]/10 text-white border-[#2563EB]/40"
                  : "text-gray-400 border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function MetricCard({ icon: Icon, label, value, unit, trend, positive, subtitle }) {
  return (
    <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-5 hover:border-[#2563EB]/50 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#2563EB]/25 to-[#00D1FF]/10 flex items-center justify-center">
          <Icon size={16} className="text-[#00D1FF]" />
        </div>
        {trend != null && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
              positive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
            }`}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold tracking-widest text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-tight text-white">
        {value}
        <span className="text-sm text-gray-500 font-medium ml-1">{unit}</span>
      </p>
      <p className="text-[11px] text-gray-500 mt-2">{subtitle}</p>
    </div>
  );
}

function PerformanceChart({ serie = SERIE_VAZIA }) {
  const width = 700;
  const height = 260;
  const baseY = 220;
  const topY = 20;
  const dias = serie.length ? serie : SERIE_VAZIA;
  const stepX = width / (dias.length - 1);

  // Cada ponto pode ser nulo (dia sem sessão); pontos nulos viram "buracos"
  // na linha em vez de cair para zero.
  const toPoints = (valores) =>
    valores.map((v, i) => ({
      x: i * stepX,
      y: v == null ? null : baseY - (v / 100) * (baseY - topY),
    }));

  const toPath = (points) => {
    const validos = points.filter((p) => p.y != null);
    if (validos.length < 2) return "";
    return validos.reduce(
      (d, p, i) => d + `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)} `,
      ""
    );
  };

  const clarezaPts = toPoints(dias.map((d) => d.clareza));
  const ritmoPts = toPoints(dias.map((d) => ritmoNormalizado(d.ritmo_wpm)));
  const clarezaLine = toPath(clarezaPts);
  const ritmoLine = toPath(ritmoPts);
  const clarezaValidos = clarezaPts.filter((p) => p.y != null);
  const ritmoValidos = ritmoPts.filter((p) => p.y != null);
  const semDados = !clarezaLine && !ritmoLine;
  const lastX = (dias.length - 1) * stepX;

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 30}`}
      width="100%"
      height={height + 30}
      preserveAspectRatio="none"
      className="block"
    >
      <defs>
        <linearGradient id="gradClareza" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#00D1FF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#00D1FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gradRitmo" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g stroke="rgba(255,255,255,0.06)">
        <line x1="0" y1={baseY * 0.25} x2={width} y2={baseY * 0.25} />
        <line x1="0" y1={baseY * 0.5} x2={width} y2={baseY * 0.5} />
        <line x1="0" y1={baseY * 0.75} x2={width} y2={baseY * 0.75} />
        <line x1="0" y1={baseY} x2={width} y2={baseY} />
      </g>

      {clarezaLine && (
        <>
          <path
            d={`${clarezaLine}L${clarezaValidos[clarezaValidos.length - 1].x},${baseY} L${clarezaValidos[0].x},${baseY} Z`}
            fill="url(#gradClareza)"
          />
          <path
            d={clarezaLine}
            fill="none"
            stroke="#00D1FF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_rgba(0,209,255,0.5)]"
          />
        </>
      )}

      {ritmoLine && (
        <>
          <path
            d={`${ritmoLine}L${ritmoValidos[ritmoValidos.length - 1].x},${baseY} L${ritmoValidos[0].x},${baseY} Z`}
            fill="url(#gradRitmo)"
          />
          <path
            d={ritmoLine}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_6px_rgba(37,99,235,0.5)]"
          />
        </>
      )}

      {clarezaValidos.map((p, i) => (
        <circle key={`c-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#00D1FF" />
      ))}
      {ritmoValidos.map((p, i) => (
        <circle key={`r-${i}`} cx={p.x} cy={p.y} r="3.5" fill="#2563EB" />
      ))}

      {semDados && (
        <text x={width / 2} y={baseY / 2} fill="#5a6378" fontSize="14" textAnchor="middle">
          Sem dados suficientes ainda — treine sua primeira apresentação
        </text>
      )}

      <g fill="#5a6378" fontSize="12" fontFamily="Inter, sans-serif">
        {dias.map((d, i) => (
          <text key={d.dia} x={i * stepX - 8} y={height + 22}>
            {d.dia}
          </text>
        ))}
      </g>
    </svg>
  );
}

/* Painel com o resultado da última análise retornada pelo backend. */
function AnalysisResultPanel({ resultado }) {
  const vicios = Object.entries(resultado.vicios || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Resultado da última análise</h3>
          <p className="text-xs text-gray-500 mt-1">
            Contexto: {resultado.contexto || "Geral"} · {resultado.quantidade_palavras} palavras
            {resultado.origem === "fala" ? " · 🎙 fala" : " · ✍️ texto"}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold tracking-tight ${corPorNota(resultado.nota_geral)}`}>
            {resultado.nota_geral}
          </p>
          <p className="text-[10px] text-gray-600 tracking-widest">NOTA GERAL</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-[#0F1014] border border-[#252836] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{resultado.clareza}</p>
          <p className="text-[10px] text-gray-500 tracking-widest mt-1">CLAREZA / 100</p>
        </div>
        <div className="bg-[#0F1014] border border-[#252836] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{resultado.ritmo_wpm ?? "—"}</p>
          <p className="text-[10px] text-gray-500 tracking-widest mt-1">RITMO PPM</p>
        </div>
        <div className="bg-[#0F1014] border border-[#252836] rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-white">{resultado.total_vicios}</p>
          <p className="text-[10px] text-gray-500 tracking-widest mt-1">VÍCIOS</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {vicios.length === 0 ? (
          <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
            ✓ Nenhum vício de linguagem detectado
          </span>
        ) : (
          vicios.map(([palavra, qtd]) => (
            <span
              key={palavra}
              className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-300 font-semibold"
            >
              "{palavra}" × {qtd}
            </span>
          ))
        )}
      </div>

      {resultado.transcricao_marcada && (
        <div
          className="oratio-transcript text-sm text-gray-300 leading-relaxed bg-[#0F1014] border border-[#252836] rounded-xl p-4 mb-5 max-h-48 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: resultado.transcricao_marcada }}
        />
      )}

      <div className="flex flex-col gap-3">
        {(resultado.dicas || []).map((dica, i) => (
          <div key={i} className="flex items-start gap-3 bg-[#0F1014] border border-[#252836] rounded-xl p-4">
            <span className="text-lg leading-none mt-0.5">{dica.icone}</span>
            <div>
              <p className="text-sm font-semibold text-white">{dica.titulo}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{dica.corpo}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Componente principal
   ============================================================ */

export default function OratioAI() {
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);

  // Entrada de texto
  const [texto, setTexto] = useState("");
  const [contexto, setContexto] = useState("Trabalho Escolar");
  const [sidebarLabel, setSidebarLabel] = useState(null);

  // Gravação de voz (Web Speech API — ver useSpeechRecognition.js)
  const speech = useSpeechRecognition();
  const isRecording = speech.isRecording;
  const recordSeconds = speech.seconds;

  // Análise (chamada real ao backend Flask)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resultado, setResultado] = useState(null); // última análise retornada pela API

  // Dashboard (dados reais de /api/dashboard/resumo e /api/sessoes)
  const [dashboard, setDashboard] = useState(null);
  const [sessoes, setSessoes] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  // Histórico de chats
  const [chats, setChats] = useState([
    {
      id: 1,
      title: "Preparação para apresentação",
      body:
        "Anotações sobre o discurso de abertura do TCC: reforçar a introdução do problema e reduzir o uso de \"né\" e \"tipo\".",
      date: "28/08/2026 09:14",
    },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);

  const go = (target) => {
    setScreen(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleShare = () => showToast("Link copiado para a área de transferência!");

  const handleSidebarSelect = (item) => {
    setSidebarLabel(item.label);
    setContexto(item.context);
    setTexto(item.example);
  };

  const toggleRecording = () => {
    if (!speech.supported) {
      showToast("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge, ou a análise por texto.");
      return;
    }
    if (speech.isRecording) speech.stop();
    else speech.start();
  };

  useEffect(() => {
    if (speech.error) showToast(speech.error);
  }, [speech.error]);

  // Carrega os dados do dashboard sempre que a tela do dashboard é aberta.
  const carregarDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const [resumo, listaSessoes] = await Promise.all([
        resumoDashboard(),
        listarSessoes(5),
      ]);
      setDashboard(resumo);
      setSessoes(listaSessoes);
    } catch (err) {
      setDashboardError(err.message);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (screen === "dashboard") carregarDashboard();
  }, [screen, carregarDashboard]);

  // Envia a transcrição (texto ou fala) para o backend e guarda o resultado.
  const executarAnalise = async ({ conteudo, origem, duracaoSegundos }) => {
    const limpo = (conteudo || "").trim();
    if (!limpo) {
      showToast(
        origem === "fala"
          ? "Grave sua fala pelo microfone primeiro!"
          : "Cole ou escreva sua apresentação primeiro!"
      );
      return;
    }
    if (limpo.split(/\s+/).filter(Boolean).length < 5) {
      showToast("É preciso pelo menos 5 palavras para uma análise válida.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const dados = await analisarOratoria({
        texto: limpo,
        contexto,
        duracaoSegundos: duracaoSegundos ?? null,
        origem,
      });
      setResultado(dados);
      go("dashboard");
      showToast("Análise concluída!");
    } catch (err) {
      showToast(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeTexto = () =>
    executarAnalise({ conteudo: texto, origem: "texto", duracaoSegundos: null });

  const handleAnalyzeVoz = () => {
    if (speech.isRecording) speech.stop();
    executarAnalise({
      conteudo: speech.transcript,
      origem: "fala",
      duracaoSegundos: speech.seconds || null,
    });
  };

  const saveChat = () => {
    if (!newTitle.trim() || !newBody.trim()) {
      showToast("Preencha título e conteúdo do chat.");
      return;
    }
    const chat = {
      id: Date.now(),
      title: newTitle.trim(),
      body: newBody.trim(),
      date: new Date().toLocaleString("pt-BR"),
    };
    setChats((prev) => [chat, ...prev]);
    setNewTitle("");
    setNewBody("");
    showToast("Chat salvo com sucesso!");
  };

  const clearAllChats = () => {
    setChats([]);
    setSelectedChatId(null);
    showToast("Histórico apagado.");
  };

  /* ---------------------- Telas ---------------------- */

  const renderHome = () => (
    <section className="max-w-3xl mx-auto px-6 pt-28 pb-20 text-center">
      <EyebrowPill>TREINO DE ORATÓRIA COM IA</EyebrowPill>
      <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-6 text-white">
        Fale melhor treinando com{" "}
        <span className="bg-gradient-to-r from-[#2563EB] to-[#00D1FF] bg-clip-text text-transparent">
          Inteligência Artificial
        </span>
      </h1>
      <p className="text-gray-400 text-base leading-relaxed max-w-xl mx-auto mb-12">
        Cole o texto da sua apresentação, escolha o tipo e receba uma análise completa com
        feedback, pontuação e dicas personalizadas — em segundos.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => go("voz")}
          className="group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#00D1FF] font-semibold text-sm tracking-wide text-white shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
        >
          <Mic size={18} className="group-hover:scale-110 transition-transform duration-200" />
          Analisar Oratória
        </button>
        <button
          onClick={() => go("texto")}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#1A1B23] border border-[#252836] font-semibold text-sm tracking-wide text-white hover:border-[#2563EB] hover:bg-[#20222c] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
        >
          <FileText size={18} />
          Analisar Apresentação
        </button>
      </div>
    </section>
  );

  const renderTexto = () => (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 flex flex-col lg:flex-row gap-6">
      <Sidebar activeLabel={sidebarLabel} onSelect={handleSidebarSelect} />
      <div className="flex-1">
        <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-gray-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" /> SUA APRESENTAÇÃO
          </div>

          <div className="relative">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, 2000))}
              placeholder={
                "Cole ou escreva aqui o texto da sua apresentação...\n\nEx: Bom dia a todos, né. Hoje vou falar, tipo, sobre a importância da IA na educação..."
              }
              className="w-full h-56 resize-none bg-[#0F1014] border border-[#252836] rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50 transition-colors duration-200"
            />
            <span className="absolute bottom-3 right-4 text-[11px] font-mono text-gray-500">
              {texto.length} / 2000
            </span>
          </div>

          <p className="text-[11px] font-semibold tracking-widest text-gray-500 mt-6 mb-3">
            CONTEXTO DA APRESENTAÇÃO
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setContexto(opt)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  contexto === opt
                    ? "bg-gradient-to-r from-[#2563EB] to-[#00D1FF] text-white border-transparent shadow-md shadow-blue-900/30"
                    : "bg-[#0F1014] text-gray-400 border-[#252836] hover:border-[#2563EB] hover:text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnalyzeTexto}
            disabled={isAnalyzing || texto.trim().length === 0}
            className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#00D1FF] font-semibold text-sm tracking-wide text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Analisando...
              </>
            ) : (
              <>
                <Search size={18} /> Analisar Apresentação
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );

  const renderVoz = () => (
    <section className="max-w-5xl mx-auto px-6 pt-10 pb-20 flex flex-col lg:flex-row gap-6">
      <Sidebar activeLabel={sidebarLabel} onSelect={handleSidebarSelect} />
      <div className="flex-1">
        <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-10 flex flex-col items-center justify-center min-h-[440px] text-center">
          <div className="relative flex items-center justify-center mb-8 w-40 h-40">
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-[#00D1FF]/20 animate-ping" />
                <span className="absolute inset-3 rounded-full bg-[#2563EB]/20 animate-ping" />
              </>
            )}
            <button
              onClick={toggleRecording}
              className={`relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                isRecording
                  ? "bg-gradient-to-br from-red-500 to-orange-500 shadow-red-900/40"
                  : "bg-gradient-to-br from-[#2563EB] to-[#00D1FF] shadow-cyan-900/40"
              }`}
            >
              <Mic size={40} className="text-white" />
            </button>
          </div>

          <p className="text-xs font-semibold tracking-widest text-gray-400">
            {!speech.supported
              ? "SEU NAVEGADOR NÃO SUPORTA RECONHECIMENTO DE VOZ"
              : isRecording
              ? "GRAVANDO... CLIQUE PARA PARAR"
              : "CLIQUE PARA INICIAR A TRANSCRIÇÃO DA ORATÓRIA"}
          </p>
          {(isRecording || recordSeconds > 0) && (
            <p className="mt-3 font-mono text-2xl text-white">{formatTime(recordSeconds)}</p>
          )}

          {!speech.supported && (
            <p className="mt-4 max-w-sm text-xs text-amber-300/80 flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              A transcrição por microfone usa a Web Speech API, disponível no Google Chrome e no
              Microsoft Edge. Você ainda pode usar a análise por texto.
            </p>
          )}

          {(speech.transcript || speech.interim) && (
            <div className="mt-6 w-full max-w-lg text-left bg-[#0F1014] border border-[#252836] rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-40 overflow-y-auto">
              {speech.transcript}{" "}
              <span className="text-gray-500">{speech.interim}</span>
            </div>
          )}

          <button
            onClick={handleAnalyzeVoz}
            disabled={isAnalyzing || (!speech.transcript.trim() && !isRecording)}
            className="mt-10 w-full max-w-sm flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#00D1FF] font-semibold text-sm tracking-wide text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Analisando...
              </>
            ) : (
              <>
                <Search size={18} /> {isRecording ? "Parar e Analisar" : "Analisar Oratória"}
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );

  const renderDashboard = () => {
    const resumo = dashboard;
    const viciosTop = resumo?.vicios_mais_falados || [];

    return (
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20">
        <EyebrowPill>ANÁLISE DE IA ATIVA</EyebrowPill>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard de Desempenho</h1>
            <p className="text-gray-400 text-sm mt-1">
              {resumo?.total_sessoes
                ? `Você já treinou ${resumo.total_sessoes} ${
                    resumo.total_sessoes === 1 ? "sessão" : "sessões"
                  }. Continue praticando!`
                : "Sua evolução na comunicação oral, com dados reais das suas sessões."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={carregarDashboard}
              disabled={dashboardLoading}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1A1B23] border border-[#252836] text-sm font-semibold text-gray-300 hover:text-white hover:border-[#2563EB] disabled:opacity-40 transition-all duration-200"
            >
              <RefreshCw size={15} className={dashboardLoading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => go("voz")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#00D1FF] text-sm font-semibold text-white hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              <Sparkles size={16} /> Novo Treino
            </button>
          </div>
        </div>

        {dashboardError && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-2xl p-4 mb-6 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Não foi possível carregar o dashboard.</p>
              <p className="text-red-300/80 mt-1">{dashboardError}</p>
            </div>
          </div>
        )}

        {resultado && <AnalysisResultPanel resultado={resultado} />}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <MetricCard
            icon={TrendingUp}
            label="RITMO MÉDIO"
            value={resumo?.ritmo_medio ?? "—"}
            unit="ppm"
            subtitle="Ritmo ideal: 120-150 ppm"
          />
          <MetricCard
            icon={Sparkles}
            label="CLAREZA MÉDIA"
            value={resumo?.clareza_media ?? "—"}
            unit="/ 100"
            subtitle={
              resumo?.total_sessoes
                ? `Média de ${resumo.total_sessoes} ${
                    resumo.total_sessoes === 1 ? "sessão" : "sessões"
                  }`
                : "Ainda sem sessões"
            }
          />
          <MetricCard
            icon={MessageSquare}
            label="VÍCIOS DE LINGUAGEM"
            value={resumo?.total_vicios ?? 0}
            unit="total"
            subtitle={
              viciosTop.length
                ? `Mais falado: "${viciosTop[0].palavra}" (${viciosTop[0].quantidade}x)`
                : "Nenhum registro ainda"
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Visão Geral do Desempenho</h3>
                <p className="text-xs text-gray-500 mt-1">Métricas dos últimos 7 dias</p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-[#0F1014] border border-[#252836] text-gray-400">
                Últimos 7 dias
              </span>
            </div>
            <PerformanceChart serie={resumo?.serie_semanal} />
            <div className="flex items-center gap-6 mt-2 pt-4 border-t border-[#252836] text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D1FF]" /> Clareza
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Ritmo (PPM)
              </span>
            </div>
          </div>

          <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Sessões Recentes</h3>
            </div>
            {dashboardLoading && !sessoes.length ? (
              <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                <Loader2 size={16} className="animate-spin mr-2" /> Carregando...
              </div>
            ) : sessoes.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                Nenhuma sessão registrada ainda.
                <br />
                Treine sua primeira apresentação!
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#252836]">
                {sessoes.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0F1014] border border-[#252836] flex items-center justify-center shrink-0">
                      <Mic size={15} className="text-[#00D1FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">
                        {(s.contexto || "Treino") + (s.origem === "fala" ? " 🎙" : " ✍️")}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {formatSessionDate(s.criado_em)} · {s.quantidade_palavras} palavras
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono font-bold ${corPorNota(s.nota_geral)}`}>{s.nota_geral}</p>
                      <p className="text-[10px] text-gray-600 tracking-wide">NOTA</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => go("voz")}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#252836] text-sm font-semibold text-gray-300 hover:border-[#2563EB] hover:text-white transition-all duration-200"
            >
              🎙️ Modo de Prática Rápida
            </button>
          </div>
        </div>
      </section>
    );
  };

  const renderPlanos = () => (
    <section className="max-w-5xl mx-auto px-6 pt-16 pb-20">
      <div className="text-center mb-12">
        <EyebrowPill>PLANOS OratioAI</EyebrowPill>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
          Escolha o plano ideal para o seu treino
        </h1>
        <p className="text-gray-400 text-sm max-w-lg mx-auto">
          Evolua da prática gratuita para uma análise de oratória mais profunda e precisa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Essential */}
        <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-7">
          <p className="text-[11px] font-semibold tracking-widest text-gray-500 mb-2">
            PLANO ESSENTIAL
          </p>
          <p className="text-3xl font-bold text-white mb-1">
            R$ 9,90 <span className="text-sm text-gray-500 font-medium">/ mês</span>
          </p>
          <p className="text-xs text-gray-500 mb-6">Ideal para quem quer treinar com mais frequência.</p>

          <div className="flex flex-col divide-y divide-[#252836]">
            <div className="grid grid-cols-3 pb-2 text-[11px] font-semibold tracking-widest text-gray-500">
              <span className="col-span-1">Recurso</span>
              <span className="text-center">Free</span>
              <span className="text-center text-cyan-300">Essential</span>
            </div>
            {ESSENTIAL_ROWS.map((row) => (
              <div key={row.label} className="grid grid-cols-3 py-3 text-sm items-center">
                <span className="col-span-1 text-gray-300 pr-2">{row.label}</span>
                <span className="text-center text-gray-500">
                  {typeof row.free === "boolean" ? (
                    row.free ? (
                      <Check size={16} className="inline text-gray-500" />
                    ) : (
                      "—"
                    )
                  ) : (
                    row.free
                  )}
                </span>
                <span className="text-center font-semibold text-white">
                  {typeof row.paid === "boolean" ? (
                    row.paid ? (
                      <Check size={16} className="inline text-[#2563EB]" />
                    ) : (
                      "—"
                    )
                  ) : (
                    row.paid
                  )}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => showToast("Plano Essential selecionado!")}
            className="mt-7 w-full py-3.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1d4ed8] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Assinar Plano
          </button>
        </div>

        {/* Master */}
        <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#2563EB] via-[#00D1FF] to-[#2563EB] shadow-xl shadow-cyan-900/20">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#00D1FF] text-[10px] font-bold tracking-widest text-white shadow-lg">
            <Crown size={12} /> RECOMENDADO
          </div>
          <div className="bg-[#15161d] rounded-2xl p-7 h-full">
            <p className="text-[11px] font-semibold tracking-widest text-cyan-300 mb-2">
              PLANO MASTER
            </p>
            <p className="text-3xl font-bold text-white mb-1">
              R$ 34,90 <span className="text-sm text-gray-500 font-medium">/ mês</span>
            </p>
            <p className="text-xs text-gray-500 mb-6">
              Para quem quer o máximo de precisão e recursos ilimitados.
            </p>

            <p className="text-[11px] font-semibold tracking-widest text-gray-500 mb-3">
              TUDO DO ESSENTIAL, MAIS:
            </p>
            <div className="flex flex-col gap-3">
              {MASTER_EXTRA_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2.5 text-sm text-gray-200">
                  <Check size={16} className="text-[#00D1FF] mt-0.5 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => showToast("Plano Master selecionado!")}
              className="mt-7 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#00D1FF] text-white text-sm font-semibold shadow-lg shadow-cyan-900/30 hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Assinar Plano
            </button>
          </div>
        </div>
      </div>
    </section>
  );

  const selectedChat = chats.find((c) => c.id === selectedChatId) || null;

  const renderHistorico = () => (
    <section className="max-w-3xl mx-auto px-6 pt-16 pb-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          Organize seu histórico de chats com segurança
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Salve anotações e transcrições das suas sessões de treino para consultar depois.
        </p>
      </div>

      <div className="bg-[#1A1B23] border border-[#252836] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-gray-400 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" /> NOVO CHAT
        </div>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Título do chat (Ex: Preparação para apresentação)"
          className="w-full bg-[#0F1014] border border-[#252836] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50 mb-3 transition-colors duration-200"
        />
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Conteúdo do chat..."
          className="w-full h-28 resize-none bg-[#0F1014] border border-[#252836] rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50 transition-colors duration-200"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={saveChat}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1d4ed8] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Save size={15} /> Salvar chat
          </button>
          <button
            onClick={clearAllChats}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F1014] border border-[#252836] text-gray-300 text-sm font-semibold hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
          >
            <Trash2 size={15} /> Limpar tudo
          </button>
        </div>
      </div>

      <p className="text-[11px] font-semibold tracking-widest text-gray-500 mb-3 px-1">
        CHATS SALVOS
      </p>
      {chats.length === 0 ? (
        <div className="text-center py-14 text-gray-500 text-sm bg-[#1A1B23] border border-[#252836] rounded-2xl">
          Nenhum chat salvo ainda. Crie um novo chat para aparecer aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChatId(c.id === selectedChatId ? null : c.id)}
              className={`text-left bg-[#1A1B23] border rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 ${
                selectedChatId === c.id ? "border-[#2563EB]" : "border-[#252836] hover:border-[#2563EB]/50"
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F1014] border border-[#252836] flex items-center justify-center shrink-0">
                <MessageSquare size={15} className="text-[#00D1FF]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{c.date}</p>
              </div>
              <ChevronRight
                size={16}
                className={`text-gray-600 transition-transform duration-200 ${
                  selectedChatId === c.id ? "rotate-90" : ""
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {selectedChat && (
        <div className="mt-4 bg-[#1A1B23] border border-[#252836] rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-1">{selectedChat.title}</h3>
          <p className="text-[11px] font-mono text-gray-500 mb-4">{selectedChat.date}</p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {selectedChat.body}
          </p>
        </div>
      )}
    </section>
  );

  const renderScreen = () => {
    switch (screen) {
      case "texto":
        return renderTexto();
      case "voz":
        return renderVoz();
      case "dashboard":
        return renderDashboard();
      case "planos":
        return renderPlanos();
      case "historico":
        return renderHistorico();
      case "home":
      default:
        return renderHome();
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1014] text-white font-sans antialiased">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[#0F1014]/80 border-b border-[#252836]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => go("home")} className="flex items-center gap-3 group">
            <span className="text-xl font-bold tracking-wide text-white">OratioAI</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                go("planos");
              }}
              className="text-[11px] font-bold tracking-wide px-3 py-1 rounded-full bg-gradient-to-r from-[#2563EB] to-[#00D1FF] text-white shadow-[0_0_12px_rgba(0,209,255,0.35)] group-hover:shadow-[0_0_20px_rgba(0,209,255,0.55)] transition-all duration-200"
            >
              Upgrade
            </span>
          </button>

          <nav className="hidden sm:flex items-center gap-7 text-[11px] font-semibold tracking-widest text-gray-400">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 hover:text-white transition-colors duration-200"
            >
              <Share2 size={14} /> COMPARTILHAR
            </button>
            <button
              onClick={() => go("historico")}
              className={`flex items-center gap-1.5 hover:text-white transition-colors duration-200 ${
                screen === "historico" ? "text-white" : ""
              }`}
            >
              <History size={14} /> HISTÓRICO DE CHATS
            </button>
            <button
              onClick={() => go("home")}
              className={`flex items-center gap-1.5 hover:text-white transition-colors duration-200 ${
                screen === "home" ? "text-white" : ""
              }`}
            >
              <HomeIcon size={14} /> HOME
            </button>
          </nav>
        </div>
      </header>

      <main className="pt-16">{renderScreen()}</main>

      <footer className="text-center text-[11px] text-gray-500 py-8 tracking-wide border-t border-[#252836]">
        OratioAI · Lucas Drescher &amp; Miguel Moura · ETE Monteiro Lobato 2026
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1A1B23] border border-[#252836] text-sm text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
          <Check size={16} className="text-[#00D1FF]" /> {toast}
        </div>
      )}
    </div>
  );
}
