import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Mic, PenLine, Sparkles } from "lucide-react";
import { marcarTranscricao } from "../simulador";
import { formatarData, formatarDuracao } from "../dados";
import { prefereMenosMovimento } from "./AnaliseAnimada";

/** Anima um número de 0 até o valor final. */
export function useContagem(alvo, duracao = 900) {
  const [valor, setValor] = useState(alvo == null ? null : 0);
  useEffect(() => {
    if (alvo == null) {
      setValor(null);
      return undefined;
    }
    if (prefereMenosMovimento()) {
      setValor(alvo);
      return undefined;
    }
    let quadro;
    const inicio = performance.now();
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(alvo * suave));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);
  return valor;
}

function corDaNota(nota) {
  if (nota >= 70) return "#2DD4BF";
  if (nota >= 50) return "#FBBF24";
  return "#F87171";
}

function AnelNota({ nota }) {
  const animada = useContagem(nota) ?? 0;
  const raio = 44;
  const circ = 2 * Math.PI * raio;
  return (
    <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Nota geral ${nota} de 100`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={raio} fill="none" stroke="#1F2330" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={raio}
          fill="none"
          stroke={corDaNota(nota)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - animada / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="font-display text-2xl text-white">{animada}</span>
        <span className="font-mono text-[9px] tracking-widest text-gray-500">NOTA</span>
      </div>
    </div>
  );
}

function Metrica({ valor, rotulo }) {
  const animado = useContagem(typeof valor === "number" ? valor : null);
  return (
    <div className="rounded-xl border border-borda bg-fundo p-3 text-center">
      <p className="text-xl font-bold text-white">{typeof valor === "number" ? animado : valor}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-gray-500">{rotulo}</p>
    </div>
  );
}

const ICONE_DICA = {
  alerta: { Icone: AlertTriangle, cor: "text-amber-300" },
  ok: { Icone: CheckCircle2, cor: "text-verde" },
  info: { Icone: Info, cor: "text-ciano" },
  contexto: { Icone: Lightbulb, cor: "text-roxo" },
};

export default function PainelResultado({ sessao }) {
  const vicios = Object.entries(sessao.vicios || {}).sort((a, b) => b[1] - a[1]);
  const partes = useMemo(() => marcarTranscricao(sessao.transcricao, sessao.vicios || {}), [sessao]);

  return (
    <article
      key={sessao.id}
      className="aparecer mb-6 rounded-2xl border border-borda bg-card p-5 sm:p-6"
      aria-labelledby={`resultado-${sessao.id}`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <AnelNota nota={sessao.notaGeral} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-ciano">
            <Sparkles size={13} aria-hidden="true" /> Feedback da IA (simulado)
          </p>
          <h2 id={`resultado-${sessao.id}`} className="mt-1 text-lg font-semibold text-white">
            {sessao.contexto}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              {sessao.origem === "fala" ? <Mic size={12} aria-hidden="true" /> : <PenLine size={12} aria-hidden="true" />}
              {sessao.origem === "fala" ? "Fala transcrita" : "Texto colado"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatarData(sessao.criadoEm)}</span>
            {sessao.duracaoSegundos ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{formatarDuracao(sessao.duracaoSegundos)} de fala</span>
              </>
            ) : null}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-300">{sessao.resumo}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica valor={sessao.clareza} rotulo="Clareza /100" />
        <Metrica valor={sessao.ritmo ?? "—"} rotulo="Ritmo ppm" />
        <Metrica valor={sessao.totalVicios} rotulo="Vícios" />
        <Metrica valor={sessao.qtdPalavras} rotulo="Palavras" />
      </div>

      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-widest text-gray-500">Vícios encontrados</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {vicios.length === 0 ? (
          <li className="rounded-full bg-verde/10 px-3 py-1.5 text-xs font-semibold text-verde">Nenhum vício encontrado</li>
        ) : (
          vicios.map(([palavra, qtd]) => (
            <li key={palavra} className="rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300">
              "{palavra}" × {qtd}
            </li>
          ))
        )}
      </ul>

      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-widest text-gray-500">Transcrição</h3>
      <p className="mt-2 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl border border-borda bg-fundo p-4 text-sm leading-relaxed text-gray-300">
        {partes.map((p, i) =>
          p.vicio ? (
            <mark key={i} className="rounded bg-red-500/20 px-0.5 text-red-200">
              {p.texto}
            </mark>
          ) : (
            <React.Fragment key={i}>{p.texto}</React.Fragment>
          )
        )}
      </p>

      <h3 className="mt-6 font-mono text-[11px] uppercase tracking-widest text-gray-500">Dicas</h3>
      <ul className="mt-2 grid gap-3 md:grid-cols-2">
        {(sessao.dicas || []).map((dica, i) => {
          const { Icone, cor } = ICONE_DICA[dica.tipo] || ICONE_DICA.info;
          return (
            <li
              key={dica.titulo}
              className="aparecer flex items-start gap-3 rounded-xl border border-borda bg-fundo p-4"
              style={{ animationDelay: `${150 + i * 90}ms` }}
            >
              <Icone size={18} className={`mt-0.5 shrink-0 ${cor}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-white">{dica.titulo}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{dica.corpo}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
