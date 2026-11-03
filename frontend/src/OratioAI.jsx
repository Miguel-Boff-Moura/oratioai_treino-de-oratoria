import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronRight,
  Crown,
  FileText,
  History,
  Home as HomeIcon,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Mic,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Share2,
  Sparkles,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { analisarTranscricao } from "./simulador";
import {
  carregarChats,
  carregarPreferencias,
  carregarRascunho,
  carregarSessoes,
  criarChat,
  criarSessao,
  salvarChats,
  salvarPreferencias,
  salvarRascunho,
  salvarSessoes,
} from "./armazenamento";
import {
  ATALHOS,
  CONTEXTOS,
  LINHAS_ESSENTIAL,
  RECURSOS_MASTER,
  formatarData,
  formatarDuracao,
  montarSerieSemanal,
  resumirSessoes,
} from "./dados";
import GraficoDesempenho from "./components/GraficoDesempenho";
import AnaliseAnimada from "./components/AnaliseAnimada";
import PainelResultado, { useContagem } from "./components/PainelResultado";

/* ============================================================
   OratioAI — Protótipo (React + Tailwind)
   TCC · ETE Monteiro Lobato 2026 · Lucas Drescher & Miguel Moura

   Tudo roda no navegador: a fala é transcrita pela Web Speech API e a
   análise da "IA" é simulada em simulador.js. Os dados ficam no
   localStorage (armazenamento.js), sem banco de dados.
   ============================================================ */

const TELAS = ["inicio", "texto", "voz", "desempenho", "planos", "historico"];
const LIMITE_TEXTO = 2000;
const MINIMO_PALAVRAS = 5;

function telaDoHash() {
  const nome = (window.location.hash || "").replace(/^#\/?/, "");
  return TELAS.includes(nome) ? nome : "inicio";
}

/* ---------------------- Pequenos componentes ---------------------- */

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
      <rect x="12.5" y="6.5" width="7" height="12" rx="3.5" fill="#fff" />
      <path d="M9.5 15.5a6.5 6.5 0 0 0 13 0" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 22v3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Etiqueta({ children }) {
  return (
    <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-azul/40 bg-azul/5 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-blue-300">
      {children}
    </p>
  );
}

function Atalhos({ ativo, aoEscolher }) {
  return (
    <aside className="w-full shrink-0 lg:w-56" aria-label="Atalhos rápidos">
      <div className="rounded-2xl border border-borda bg-card p-3 lg:sticky lg:top-24">
        <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-widest text-gray-500">Atalhos rápidos</p>
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {ATALHOS.map((item) => (
            <li key={item.rotulo} className="shrink-0">
              <button
                type="button"
                onClick={() => aoEscolher(item)}
                aria-pressed={ativo === item.rotulo}
                className={`w-full whitespace-nowrap rounded-xl px-3 py-2.5 text-left font-mono text-xs transition-colors duration-200 ${
                  ativo === item.rotulo ? "bg-[#1E2230] text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.rotulo}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function SeletorContexto({ valor, aoMudar }) {
  return (
    <fieldset className="mt-5">
      <legend className="mb-3 font-mono text-xs text-gray-400">Contexto da apresentação:</legend>
      <div className="flex flex-wrap gap-2">
        {CONTEXTOS.map((opcao) => (
          <label key={opcao} className="cursor-pointer">
            <input
              type="radio"
              name="contexto"
              value={opcao}
              checked={valor === opcao}
              onChange={() => aoMudar(opcao)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-borda px-4 py-2 font-mono text-xs text-gray-400 transition-all duration-200 hover:border-azul hover:text-white peer-checked:border-transparent peer-checked:bg-azul peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-ciano">
              {opcao}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function BotaoAnalisar({ desativado, ocupado, children }) {
  return (
    <button
      type="submit"
      disabled={desativado}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-azul to-[#2563EB] px-6 py-4 text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {ocupado ? <Square size={16} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}

function CartaoMetrica({ Icone, cor, rotulo, valor, unidade, tendencia, positiva, legenda, atraso }) {
  const animado = useContagem(typeof valor === "number" ? valor : null);
  return (
    <div
      className="aparecer rounded-2xl border border-borda bg-card p-5 transition-colors duration-200 hover:border-azul/50"
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-borda bg-fundo">
          <Icone size={18} className={cor} aria-hidden="true" />
        </span>
        {tendencia && (
          <span
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
              positiva ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
            }`}
          >
            {tendencia.startsWith("-") ? (
              <TrendingDown size={12} aria-hidden="true" />
            ) : (
              <TrendingUp size={12} aria-hidden="true" />
            )}
            <span className="sr-only">Variação: </span>
            {tendencia}
          </span>
        )}
      </div>
      <h3 className="text-sm text-gray-400">{rotulo}</h3>
      <p className="mt-1 text-3xl font-bold tracking-tight text-white">
        {typeof valor === "number" ? animado : "—"}
        <span className="ml-1 text-sm font-medium text-gray-500">{unidade}</span>
      </p>
      <p className="mt-2 text-xs text-gray-500">{legenda}</p>
    </div>
  );
}

/* ============================================================
   Componente principal
   ============================================================ */

export default function OratioAI() {
  const [tela, setTela] = useState(telaDoHash);
  const [menuAberto, setMenuAberto] = useState(false);
  const [aviso, setAviso] = useState(null); // { mensagem, acao?, rotuloAcao? }
  const avisoTimer = useRef(null);
  const principalRef = useRef(null);
  const primeiraRenderizacao = useRef(true);

  // Dados persistidos no localStorage
  const [sessoes, setSessoes] = useState(carregarSessoes);
  const [chats, setChats] = useState(carregarChats);
  const prefsIniciais = useMemo(carregarPreferencias, []);
  const [contexto, setContexto] = useState(
    CONTEXTOS.includes(prefsIniciais.contexto) ? prefsIniciais.contexto : "Trabalho Escolar"
  );
  const [sessaoAbertaId, setSessaoAbertaId] = useState(prefsIniciais.sessaoAberta || null);

  // Entrada de texto
  const [texto, setTexto] = useState(carregarRascunho);
  const [atalhoAtivo, setAtalhoAtivo] = useState(null);
  const [roteiro, setRoteiro] = useState(null); // texto sugerido para ler em voz alta

  // Voz
  const fala = useSpeechRecognition();

  // Análise em andamento: { origem, resultado }
  const [analise, setAnalise] = useState(null);

  // Histórico de chats
  const [tituloChat, setTituloChat] = useState("");
  const [conteudoChat, setConteudoChat] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [chatAbertoId, setChatAbertoId] = useState(null);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  /* ---------- Persistência ---------- */
  useEffect(() => {
    salvarSessoes(sessoes);
  }, [sessoes]);
  useEffect(() => {
    salvarChats(chats);
  }, [chats]);
  useEffect(() => {
    salvarPreferencias({ contexto, sessaoAberta: sessaoAbertaId });
  }, [contexto, sessaoAbertaId]);
  useEffect(() => {
    const t = setTimeout(() => salvarRascunho(texto), 300);
    return () => clearTimeout(t);
  }, [texto]);

  /* ---------- Navegação pelo hash (#/desempenho etc.) ---------- */
  useEffect(() => {
    const aoMudarHash = () => {
      setTela(telaDoHash());
      setMenuAberto(false);
    };
    window.addEventListener("hashchange", aoMudarHash);
    return () => window.removeEventListener("hashchange", aoMudarHash);
  }, []);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    // Leva o foco para o título da nova tela (ajuda quem usa leitor de tela).
    const titulo = principalRef.current?.querySelector("h1");
    if (titulo) {
      titulo.setAttribute("tabindex", "-1");
      titulo.focus({ preventScroll: true });
    }
  }, [tela, analise]);

  const ir = (destino) => {
    setMenuAberto(false);
    const hash = destino === "inicio" ? "#/" : `#/${destino}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    else setTela(destino);
  };

  /* ---------- Avisos (toast) ---------- */
  const mostrarAviso = useCallback((mensagem, acao, rotuloAcao) => {
    clearTimeout(avisoTimer.current);
    setAviso({ mensagem, acao, rotuloAcao });
    avisoTimer.current = setTimeout(() => setAviso(null), acao ? 6000 : 3000);
  }, []);
  useEffect(() => () => clearTimeout(avisoTimer.current), []);

  useEffect(() => {
    if (fala.error) mostrarAviso(fala.error);
  }, [fala.error, mostrarAviso]);

  // Para a gravação se o usuário sair da tela de voz.
  useEffect(() => {
    if (tela !== "voz" && fala.isRecording) fala.stop();
  }, [tela, fala]);

  /* ---------- Compartilhar ---------- */
  const compartilhar = async () => {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: "OratioAI", text: "Treine sua oratória com o OratioAI", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      mostrarAviso("Link copiado para a área de transferência!");
    } catch (erro) {
      if (erro && erro.name === "AbortError") return; // usuário fechou o menu de compartilhar
      mostrarAviso(`Copie o link: ${url}`);
    }
  };

  /* ---------- Análise ---------- */
  const iniciarAnalise = ({ conteudo, origem, duracaoSegundos }) => {
    const limpo = (conteudo || "").trim();
    if (!limpo) {
      mostrarAviso(origem === "fala" ? "Grave sua fala pelo microfone primeiro!" : "Cole ou escreva sua apresentação primeiro!");
      return;
    }
    if (limpo.split(/\s+/).filter(Boolean).length < MINIMO_PALAVRAS) {
      mostrarAviso(`Use pelo menos ${MINIMO_PALAVRAS} palavras para uma análise válida.`);
      return;
    }
    const resultado = analisarTranscricao({ texto: limpo, contexto, origem, duracaoSegundos });
    setAnalise({ origem, resultado });
  };

  // Guarda a análise atual numa ref para salvar a sessão uma única vez.
  const analiseRef = useRef(null);
  analiseRef.current = analise;

  const concluirAnalise = useCallback(() => {
    const atual = analiseRef.current;
    if (!atual) return;
    analiseRef.current = null; // evita salvar duas vezes
    const nova = criarSessao(atual.resultado);
    setSessoes((lista) => [nova, ...lista.filter((s) => s.id !== nova.id)]);
    setSessaoAbertaId(nova.id);
    setAnalise(null);
    if (window.location.hash !== "#/desempenho") window.location.hash = "#/desempenho";
    else setTela("desempenho");
    mostrarAviso("Análise concluída!");
  }, [mostrarAviso]);

  const enviarTexto = (e) => {
    e.preventDefault();
    iniciarAnalise({ conteudo: texto, origem: "texto", duracaoSegundos: null });
  };

  const enviarFala = (e) => {
    e.preventDefault();
    const { texto: falado, duracao } = fala.stop();
    iniciarAnalise({ conteudo: falado, origem: "fala", duracaoSegundos: duracao || fala.seconds });
  };

  const alternarGravacao = () => {
    if (!fala.supported) {
      mostrarAviso("Seu navegador não tem reconhecimento de voz. Use o Chrome ou o Edge, ou a análise por texto.");
      return;
    }
    if (fala.isRecording) fala.stop();
    else fala.start();
  };

  const escolherAtalho = (item) => {
    setAtalhoAtivo(item.rotulo);
    setContexto(item.contexto);
    if (tela === "voz") setRoteiro(item.exemplo);
    else setTexto(item.exemplo);
  };

  /* ---------- Sessões ---------- */
  const removerSessao = (id) => {
    const indice = sessoes.findIndex((s) => s.id === id);
    if (indice < 0) return;
    const removida = sessoes[indice];
    setSessoes((lista) => lista.filter((s) => s.id !== id));
    mostrarAviso("Sessão removida.", () => {
      setSessoes((lista) => {
        const copia = [...lista];
        copia.splice(Math.min(indice, copia.length), 0, removida);
        return copia;
      });
      setAviso(null);
    }, "Desfazer");
  };

  /* ---------- Chats ---------- */
  const salvarChat = (e) => {
    e.preventDefault();
    const titulo = tituloChat.trim();
    const conteudo = conteudoChat.trim();
    if (!titulo || !conteudo) {
      mostrarAviso("Preencha o título e o conteúdo do chat.");
      return;
    }
    if (editandoId) {
      setChats((lista) =>
        lista.map((c) => (c.id === editandoId ? { ...c, titulo, conteudo, editadoEm: new Date().toISOString() } : c))
      );
      setChatAbertoId(editandoId);
      mostrarAviso("Chat atualizado!");
    } else {
      const novo = criarChat(titulo, conteudo);
      setChats((lista) => [novo, ...lista]);
      mostrarAviso("Chat salvo com sucesso!");
    }
    setTituloChat("");
    setConteudoChat("");
    setEditandoId(null);
  };

  const editarChat = (chat) => {
    setEditandoId(chat.id);
    setTituloChat(chat.titulo);
    setConteudoChat(chat.conteudo);
    document.getElementById("titulo-chat")?.focus();
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setTituloChat("");
    setConteudoChat("");
  };

  const removerChat = (id) => {
    const indice = chats.findIndex((c) => c.id === id);
    if (indice < 0) return;
    const removido = chats[indice];
    setChats((lista) => lista.filter((c) => c.id !== id));
    if (chatAbertoId === id) setChatAbertoId(null);
    if (editandoId === id) cancelarEdicao();
    mostrarAviso("Chat apagado.", () => {
      setChats((lista) => {
        const copia = [...lista];
        copia.splice(Math.min(indice, copia.length), 0, removido);
        return copia;
      });
      setAviso(null);
    }, "Desfazer");
  };

  const limparChats = () => {
    if (chats.length === 0) return;
    const anteriores = chats;
    setChats([]);
    setChatAbertoId(null);
    cancelarEdicao();
    mostrarAviso("Histórico apagado.", () => {
      setChats(anteriores);
      setAviso(null);
    }, "Desfazer");
  };

  /* ============================================================
     Telas
     ============================================================ */

  const telaInicio = () => (
    <section className="relative mx-auto max-w-3xl px-4 pb-24 pt-20 text-center sm:px-6 sm:pt-28">
      <div className="brilho-fundo" aria-hidden="true" />
      <div className="aparecer">
        <Etiqueta>Treino de oratória com IA</Etiqueta>
      </div>
      <h1 className="aparecer font-display text-[2rem] leading-[1.15] text-white sm:text-5xl" style={{ animationDelay: "80ms" }}>
        Fale melhor treinando com{" "}
        <span className="texto-gradiente">Inteligência Artificial</span>
      </h1>
      <p className="aparecer mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-400" style={{ animationDelay: "160ms" }}>
        Cole o texto da sua apresentação ou fale no microfone, escolha o tipo e receba uma análise com feedback, pontuação
        e dicas personalizadas em segundos.
      </p>
      <div className="aparecer mt-12 flex flex-col justify-center gap-4 sm:flex-row" style={{ animationDelay: "240ms" }}>
        <button
          type="button"
          onClick={() => ir("voz")}
          className="group flex items-center justify-center gap-2 rounded-2xl bg-azul px-8 py-4 font-display text-sm text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4F8DFD] hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
        >
          <Mic size={18} className="transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
          Analisar Oratória
        </button>
        <button
          type="button"
          onClick={() => ir("texto")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-azul px-8 py-4 font-display text-sm text-white shadow-lg shadow-blue-900/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#4F8DFD] hover:shadow-xl hover:shadow-blue-500/30 active:translate-y-0"
        >
          <FileText size={18} aria-hidden="true" />
          Analisar Apresentação
        </button>
      </div>
    </section>
  );

  const telaTexto = () => (
    <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-20 pt-8 sm:px-6 lg:flex-row">
      <Atalhos ativo={atalhoAtivo} aoEscolher={escolherAtalho} />
      <form onSubmit={enviarTexto} className="aparecer min-w-0 flex-1 rounded-2xl border border-borda bg-card p-5 sm:p-6" noValidate>
        <h1 className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-verde" aria-hidden="true" /> Sua apresentação
        </h1>
        <label htmlFor="texto-apresentacao" className="sr-only">
          Texto da apresentação
        </label>
        <div className="relative">
          <textarea
            id="texto-apresentacao"
            value={texto}
            maxLength={LIMITE_TEXTO}
            onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_TEXTO))}
            placeholder={"Cole ou escreva aqui o texto da sua apresentação...\n\nEx.: Bom dia a todos, né. Hoje vou falar, tipo, sobre a importância da IA na educação..."}
            aria-describedby="contador-texto"
            className="h-72 w-full resize-none rounded-xl border border-borda bg-[#1B1E28] p-4 pb-9 text-sm text-gray-200 placeholder-gray-500 transition-colors duration-200 focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul/50"
          />
          <span id="contador-texto" className="absolute bottom-3 right-4 font-mono text-[11px] text-gray-500">
            {texto.length} / {LIMITE_TEXTO}
          </span>
        </div>
        <SeletorContexto valor={contexto} aoMudar={setContexto} />
        <BotaoAnalisar desativado={texto.trim().length === 0}>Analisar Apresentação</BotaoAnalisar>
        {texto && (
          <button
            type="button"
            onClick={() => {
              setTexto("");
              setAtalhoAtivo(null);
            }}
            className="mt-3 w-full rounded-xl py-2 text-xs text-gray-500 transition-colors hover:text-white"
          >
            Limpar texto
          </button>
        )}
      </form>
    </section>
  );

  const telaVoz = () => {
    const temTexto = Boolean(fala.transcript || fala.interim);
    return (
      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-20 pt-8 sm:px-6 lg:flex-row">
        <Atalhos ativo={atalhoAtivo} aoEscolher={escolherAtalho} />
        <form onSubmit={enviarFala} className="aparecer min-w-0 flex-1 rounded-2xl border border-borda bg-card p-5 sm:p-6" noValidate>
          <h1 className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-verde" aria-hidden="true" /> Sua apresentação
          </h1>

          <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-xl border border-borda bg-[#1B1E28] px-4 py-8 text-center">
            {roteiro && !fala.isRecording && !temTexto && (
              <div className="mb-6 max-w-lg rounded-xl border border-borda bg-fundo p-4 text-left">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ciano">Roteiro para ler em voz alta</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{roteiro}</p>
              </div>
            )}

            <div className="relative flex h-32 w-32 items-center justify-center">
              {fala.isRecording && (
                <>
                  <span className="onda-gravacao" aria-hidden="true" />
                  <span className="onda-gravacao onda-gravacao--2" aria-hidden="true" />
                </>
              )}
              <button
                type="button"
                onClick={alternarGravacao}
                aria-pressed={fala.isRecording}
                aria-label={fala.isRecording ? "Parar gravação" : "Começar a gravar a fala"}
                className={`relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                  fala.isRecording
                    ? "bg-gradient-to-br from-red-500 to-orange-500 shadow-red-900/40"
                    : "bg-gradient-to-br from-[#0EA5E9] to-[#0D9488] shadow-cyan-900/40"
                }`}
              >
                {fala.isRecording ? <Square size={28} className="text-white" aria-hidden="true" /> : <Mic size={36} className="text-white" aria-hidden="true" />}
              </button>
            </div>

            {fala.isRecording && (
              <div className="barras-audio mt-2" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${i * 90}ms` }} />
                ))}
              </div>
            )}

            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-gray-400" aria-live="polite">
              {!fala.supported
                ? "Seu navegador não suporta reconhecimento de voz"
                : fala.isRecording
                ? "Gravando... clique para parar"
                : temTexto
                ? "Gravação pronta para análise"
                : "Clique para iniciar a transcrição da oratória"}
            </p>
            {(fala.isRecording || fala.seconds > 0) && (
              <p className="mt-2 font-mono text-2xl text-white" aria-label={`Tempo de gravação ${formatarDuracao(fala.seconds)}`}>
                {formatarDuracao(fala.seconds)}
              </p>
            )}

            {!fala.supported && (
              <p className="mt-4 flex max-w-sm items-start gap-2 text-left text-xs text-amber-300/90">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                A transcrição usa a Web Speech API, disponível no Google Chrome e no Microsoft Edge. Você ainda pode usar a
                análise por texto.
              </p>
            )}

            {temTexto && (
              <div className="mt-6 w-full max-w-lg text-left">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-gray-500">Transcrição</p>
                <p className="max-h-40 overflow-y-auto rounded-xl border border-borda bg-fundo p-4 text-sm leading-relaxed text-gray-300" aria-live="off">
                  {fala.transcript} <span className="text-gray-500">{fala.interim}</span>
                </p>
                {!fala.isRecording && (
                  <button
                    type="button"
                    onClick={fala.reset}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-white"
                  >
                    <RotateCcw size={12} aria-hidden="true" /> Gravar de novo
                  </button>
                )}
              </div>
            )}
          </div>

          <SeletorContexto valor={contexto} aoMudar={setContexto} />
          <BotaoAnalisar desativado={!temTexto && !fala.isRecording} ocupado={fala.isRecording}>
            {fala.isRecording ? "Parar e Analisar Oratória" : "Analisar Oratória"}
          </BotaoAnalisar>
        </form>
      </section>
    );
  };

  const telaDesempenho = () => {
    const resumo = resumirSessoes(sessoes);
    const serie = montarSerieSemanal(sessoes);
    const sessaoAberta = sessoes.find((s) => s.id === sessaoAbertaId) || sessoes[0] || null;
    const lista = mostrarTodas ? sessoes : sessoes.slice(0, 4);
    const positivo = (t, invertido = false) => (t ? (t.startsWith("-") ? invertido : !invertido) : true);

    return (
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-xl text-white sm:text-2xl">Dashboard de Desempenho</h1>
            <p className="mt-2 text-sm text-gray-400">
              {resumo.exemplo
                ? "Estes são dados de exemplo. Faça sua primeira análise para ver os seus."
                : `Você já treinou ${sessoes.length} ${sessoes.length === 1 ? "vez" : "vezes"}. Continue praticando!`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ir("voz")}
            className="flex items-center gap-2 rounded-xl bg-azul px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4F8DFD] active:scale-[0.98]"
          >
            <Sparkles size={16} aria-hidden="true" /> Novo treino
          </button>
        </div>

        {sessaoAberta && <PainelResultado sessao={sessaoAberta} />}

        <h2 className="sr-only">Resumo das métricas</h2>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CartaoMetrica
            Icone={Activity}
            cor="text-ciano"
            rotulo="Ritmo médio"
            valor={resumo.ritmoMedio}
            unidade="ppm"
            tendencia={resumo.tendencias.ritmo}
            positiva={positivo(resumo.tendencias.ritmo)}
            legenda="Ritmo ideal: 120-150 ppm"
            atraso={0}
          />
          <CartaoMetrica
            Icone={Zap}
            cor="text-azul"
            rotulo="Clareza"
            valor={resumo.clarezaMedia}
            unidade="/100"
            tendencia={resumo.tendencias.clareza}
            positiva={positivo(resumo.tendencias.clareza)}
            legenda={resumo.clarezaMedia >= 85 ? "Excelente dicção detectada" : "Média de todas as sessões"}
            atraso={80}
          />
          <CartaoMetrica
            Icone={MessageSquare}
            cor="text-roxo"
            rotulo="Vícios de linguagem"
            valor={resumo.totalVicios}
            unidade="total"
            tendencia={resumo.tendencias.vicios}
            positiva={positivo(resumo.tendencias.vicios, true)}
            legenda={
              resumo.viciosTop.length
                ? `Principalmente ${resumo.viciosTop.slice(0, 2).map((v) => `"${v.palavra}"`).join(" e ")}`
                : "Nenhum vício até agora"
            }
            atraso={160}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0 rounded-2xl border border-borda bg-card p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">Visão Geral do Desempenho</h2>
                <p className="mt-1 text-xs text-gray-500">Suas métricas dos últimos 7 dias</p>
              </div>
              <span className="rounded-lg border border-borda bg-fundo px-3 py-1.5 text-xs text-gray-300">
                {serie.exemplo ? "Exemplo" : "Últimos 7 dias"}
              </span>
            </div>
            <GraficoDesempenho serie={serie} />
            <div className="mt-5 flex items-center justify-center gap-6 text-xs text-gray-400" aria-hidden="true">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22E3F0]" /> Clareza
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-azul" /> Ritmo (PPM)
              </span>
            </div>
            {!serie.exemplo && (
              <p className="mt-3 text-center text-[11px] text-gray-600">Dias sem treino aparecem como estimativa.</p>
            )}
          </div>

          <div className="rounded-2xl border border-borda bg-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Sessões recentes</h2>
              {sessoes.length > 4 && (
                <button
                  type="button"
                  onClick={() => setMostrarTodas((v) => !v)}
                  className="text-sm text-ciano hover:underline"
                  aria-expanded={mostrarTodas}
                >
                  {mostrarTodas ? "Ver menos" : "Ver tudo"}
                </button>
              )}
            </div>
            {sessoes.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">
                Nenhuma sessão registrada ainda.
                <br />
                Treine sua primeira apresentação!
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {lista.map((s) => {
                  const aberta = sessaoAberta && sessaoAberta.id === s.id;
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center gap-2 rounded-xl border bg-fundo p-2 transition-colors ${
                        aberta ? "border-azul/60" : "border-borda hover:border-azul/40"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSessaoAbertaId(s.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        aria-current={aberta ? "true" : undefined}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-borda bg-card">
                          {s.origem === "fala" ? (
                            <Mic size={15} className="text-gray-300" aria-hidden="true" />
                          ) : (
                            <FileText size={15} className="text-gray-300" aria-hidden="true" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-white">{s.contexto}</span>
                          <span className="block text-[11px] text-gray-500">
                            {formatarData(s.criadoEm)} · {s.duracaoSegundos ? formatarDuracao(s.duracaoSegundos) : `${s.qtdPalavras} palavras`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-bold text-white">{s.notaGeral}</span>
                          <span className="block font-mono text-[9px] tracking-widest text-gray-500">SCORE</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removerSessao(s.id)}
                        aria-label={`Remover sessão ${s.contexto} de ${formatarData(s.criadoEm)}`}
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => ir("voz")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-borda px-4 py-3 text-sm text-gray-300 transition-all duration-200 hover:border-azul hover:text-white"
            >
              <Mic size={15} aria-hidden="true" /> Modo de Prática Rápida
            </button>
          </div>
        </div>
      </section>
    );
  };

  const telaPlanos = () => (
    <section className="mx-auto max-w-5xl px-4 pb-20 pt-14 sm:px-6">
      <div className="mb-12 text-center">
        <Etiqueta>Planos OratioAI</Etiqueta>
        <h1 className="font-display text-2xl text-white sm:text-3xl">Escolha o plano ideal para o seu treino</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-gray-400">
          Evolua da prática gratuita para uma análise de oratória mais profunda e precisa.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <article className="aparecer rounded-2xl border border-borda bg-card p-6 sm:p-7" aria-labelledby="plano-essential">
          <h2 id="plano-essential" className="mb-2 font-mono text-[11px] uppercase tracking-widest text-gray-400">
            Plano Essential
          </h2>
          <p className="mb-1 text-3xl font-bold text-white">
            R$ 9,90 <span className="text-sm font-medium text-gray-500">/ mês</span>
          </p>
          <p className="mb-6 text-xs text-gray-500">Ideal para quem quer treinar com mais frequência.</p>
          <table className="w-full text-sm">
            <caption className="sr-only">Comparação entre o plano grátis e o Essential</caption>
            <thead>
              <tr className="font-mono text-[11px] uppercase tracking-widest text-gray-500">
                <th scope="col" className="pb-2 text-left font-normal">Recurso</th>
                <th scope="col" className="pb-2 text-center font-normal">Grátis</th>
                <th scope="col" className="pb-2 text-center font-normal text-ciano">Essential</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {LINHAS_ESSENTIAL.map((linha) => (
                <tr key={linha.rotulo}>
                  <th scope="row" className="py-3 pr-2 text-left font-normal text-gray-300">{linha.rotulo}</th>
                  {[linha.gratis, linha.pago].map((v, i) => (
                    <td key={i} className={`py-3 text-center ${i ? "font-semibold text-white" : "text-gray-500"}`}>
                      {typeof v === "boolean" ? (
                        v ? (
                          <>
                            <Check size={16} className={`inline ${i ? "text-azul" : ""}`} aria-hidden="true" />
                            <span className="sr-only">Incluído</span>
                          </>
                        ) : (
                          <>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Não incluído</span>
                          </>
                        )
                      ) : (
                        v
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => mostrarAviso("Pagamentos ainda não estão disponíveis neste protótipo.")}
            className="mt-7 w-full rounded-xl bg-azul py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4F8DFD] active:scale-[0.98]"
          >
            Assinar plano
          </button>
        </article>

        <article
          className="aparecer relative rounded-2xl bg-gradient-to-br from-azul via-ciano to-azul p-[1.5px] shadow-xl shadow-cyan-900/20"
          style={{ animationDelay: "100ms" }}
          aria-labelledby="plano-master"
        >
          <p className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-azul to-verde px-3 py-1 text-[10px] font-bold tracking-widest text-white shadow-lg">
            <Crown size={12} aria-hidden="true" /> RECOMENDADO
          </p>
          <div className="h-full rounded-2xl bg-[#13151D] p-6 sm:p-7">
            <h2 id="plano-master" className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ciano">
              Plano Master
            </h2>
            <p className="mb-1 text-3xl font-bold text-white">
              R$ 34,90 <span className="text-sm font-medium text-gray-500">/ mês</span>
            </p>
            <p className="mb-6 text-xs text-gray-500">Para quem quer o máximo de precisão e recursos ilimitados.</p>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-gray-500">Tudo do Essential, mais:</h3>
            <ul className="flex flex-col gap-3">
              {RECURSOS_MASTER.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-gray-200">
                  <Check size={16} className="mt-0.5 shrink-0 text-ciano" aria-hidden="true" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => mostrarAviso("Pagamentos ainda não estão disponíveis neste protótipo.")}
              className="mt-7 w-full rounded-xl bg-gradient-to-r from-azul to-verde py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30 active:scale-[0.98]"
            >
              Assinar plano
            </button>
          </div>
        </article>
      </div>
    </section>
  );

  const telaHistorico = () => {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-14 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="font-display text-2xl text-white sm:text-3xl">Organize seu histórico de chats</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-gray-400">
            Salve anotações e transcrições das suas sessões de treino para consultar depois. Fica tudo salvo neste
            navegador.
          </p>
        </div>

        <form onSubmit={salvarChat} className="aparecer mb-8 rounded-2xl border border-borda bg-card p-5 sm:p-6" noValidate>
          <h2 className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-azul" aria-hidden="true" />
            {editandoId ? "Editando chat" : "Novo chat"}
          </h2>
          <label htmlFor="titulo-chat" className="mb-1 block text-xs text-gray-400">
            Título
          </label>
          <input
            id="titulo-chat"
            value={tituloChat}
            maxLength={80}
            onChange={(e) => setTituloChat(e.target.value)}
            placeholder="Ex.: Preparação para apresentação"
            className="mb-3 w-full rounded-xl border border-borda bg-fundo px-4 py-3 text-sm text-gray-200 placeholder-gray-500 transition-colors duration-200 focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul/50"
          />
          <label htmlFor="conteudo-chat" className="mb-1 block text-xs text-gray-400">
            Conteúdo
          </label>
          <textarea
            id="conteudo-chat"
            value={conteudoChat}
            maxLength={2000}
            onChange={(e) => setConteudoChat(e.target.value)}
            placeholder="Escreva suas anotações..."
            className="h-28 w-full resize-none rounded-xl border border-borda bg-fundo px-4 py-3 text-sm text-gray-200 placeholder-gray-500 transition-colors duration-200 focus:border-azul focus:outline-none focus:ring-1 focus:ring-azul/50"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-azul px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#4F8DFD] active:scale-[0.98]"
            >
              <Save size={15} aria-hidden="true" /> {editandoId ? "Salvar alterações" : "Salvar chat"}
            </button>
            {editandoId ? (
              <button
                type="button"
                onClick={cancelarEdicao}
                className="flex items-center gap-2 rounded-xl border border-borda bg-fundo px-5 py-2.5 text-sm font-semibold text-gray-300 transition-all duration-200 hover:text-white"
              >
                <X size={15} aria-hidden="true" /> Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={limparChats}
                disabled={chats.length === 0}
                className="flex items-center gap-2 rounded-xl border border-borda bg-fundo px-5 py-2.5 text-sm font-semibold text-gray-300 transition-all duration-200 hover:border-red-500/50 hover:text-red-400 disabled:opacity-40"
              >
                <Trash2 size={15} aria-hidden="true" /> Limpar tudo
              </button>
            )}
          </div>
        </form>

        <h2 className="mb-3 px-1 font-mono text-[11px] uppercase tracking-widest text-gray-500">Chats salvos ({chats.length})</h2>
        {chats.length === 0 ? (
          <p className="rounded-2xl border border-borda bg-card py-14 text-center text-sm text-gray-500">
            Nenhum chat salvo ainda. Crie um novo chat para ele aparecer aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {chats.map((c) => {
              const aberto = chatAbertoId === c.id;
              return (
                <li key={c.id} className={`aparecer rounded-2xl border bg-card transition-colors ${aberto ? "border-azul" : "border-borda"}`}>
                  <div className="flex items-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => setChatAbertoId(aberto ? null : c.id)}
                      aria-expanded={aberto}
                      aria-controls={`chat-${c.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-borda bg-fundo">
                        <MessageSquare size={15} className="text-ciano" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">{c.titulo}</span>
                        <span className="block text-[11px] text-gray-500">
                          {formatarData(c.criadoEm)}
                          {c.editadoEm ? " · editado" : ""}
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        className={`shrink-0 text-gray-600 transition-transform duration-200 ${aberto ? "rotate-90" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => editarChat(c)}
                      aria-label={`Editar chat ${c.titulo}`}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removerChat(c.id)}
                      aria-label={`Apagar chat ${c.titulo}`}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                  {aberto && (
                    <div id={`chat-${c.id}`} className="border-t border-borda px-5 py-4">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-300">{c.conteudo}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  const conteudo = () => {
    if (analise) return <AnaliseAnimada origem={analise.origem} aoTerminar={concluirAnalise} />;
    switch (tela) {
      case "texto":
        return telaTexto();
      case "voz":
        return telaVoz();
      case "desempenho":
        return telaDesempenho();
      case "planos":
        return telaPlanos();
      case "historico":
        return telaHistorico();
      default:
        return telaInicio();
    }
  };

  const itensMenu = [
    { id: "compartilhar", rotulo: "Compartilhar", Icone: Share2, acao: compartilhar },
    { id: "desempenho", rotulo: "Desempenho", Icone: LayoutDashboard, acao: () => ir("desempenho") },
    { id: "historico", rotulo: "Histórico de chats", Icone: History, acao: () => ir("historico") },
    { id: "inicio", rotulo: "Home", Icone: HomeIcon, acao: () => ir("inicio") },
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-fundo font-sans text-white antialiased">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-azul focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-borda bg-fundo/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <a href="#/" onClick={() => setMenuAberto(false)} className="flex items-center gap-2.5" aria-label="OratioAI, página inicial">
              <Logo />
              <span className="font-display text-base text-white sm:text-lg">OratioAI</span>
            </a>
            <button
              type="button"
              onClick={() => ir("planos")}
              className="rounded-full bg-gradient-to-r from-azul to-verde px-3 py-1 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(45,212,191,0.35)] transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(45,212,191,0.55)]"
            >
              Upgrade
            </button>
          </div>

          <nav aria-label="Menu principal" className="hidden md:block">
            <ul className="flex items-center gap-7 font-mono text-[11px] uppercase tracking-[0.18em]">
              {itensMenu.map(({ id, rotulo, acao }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={acao}
                    aria-current={tela === id && !analise ? "page" : undefined}
                    className={`transition-colors duration-200 hover:text-white ${
                      tela === id && !analise ? "text-white" : "text-blue-400"
                    }`}
                  >
                    {rotulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white md:hidden"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            onClick={() => setMenuAberto((v) => !v)}
          >
            {menuAberto ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>

        {menuAberto && (
          <nav id="menu-celular" aria-label="Menu principal" className="menu-celular border-t border-borda bg-fundo md:hidden">
            <ul className="flex flex-col p-2">
              {itensMenu.map(({ id, rotulo, Icone, acao }) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={acao}
                    aria-current={tela === id && !analise ? "page" : undefined}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-mono text-xs uppercase tracking-widest text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    <Icone size={16} aria-hidden="true" /> {rotulo}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="conteudo" ref={principalRef} className="flex-1 pt-16" tabIndex={-1}>
        <div key={analise ? "analise" : tela} className="trocar-tela">
          {conteudo()}
        </div>
      </main>

      <footer className="border-t border-borda py-8 text-center font-mono text-[11px] tracking-wide text-gray-500">
        <p>OratioAI · Lucas Drescher &amp; Miguel Moura · ETE Monteiro Lobato 2026</p>
        <p className="mt-1 text-gray-600">Protótipo: a análise de IA é simulada no navegador.</p>
      </footer>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4" role="status" aria-live="polite">
        {aviso && (
          <div className="aviso pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border border-borda bg-card px-5 py-3 text-sm text-white shadow-2xl">
            <Check size={16} className="shrink-0 text-ciano" aria-hidden="true" />
            <span className="break-words">{aviso.mensagem}</span>
            {aviso.acao && (
              <button type="button" onClick={aviso.acao} className="ml-1 shrink-0 font-semibold text-ciano hover:underline">
                {aviso.rotuloAcao}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
