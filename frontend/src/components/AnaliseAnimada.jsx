import React, { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { ETAPAS_ANALISE } from "../simulador";

export function prefereMenosMovimento() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/* Tela de "IA analisando": passa pelas etapas uma a uma e depois chama
   aoTerminar(). É só uma animação — o cálculo de verdade é instantâneo. */
export default function AnaliseAnimada({ origem, aoTerminar }) {
  const etapas = ETAPAS_ANALISE[origem] || ETAPAS_ANALISE.texto;
  const [atual, setAtual] = useState(0);
  const terminarRef = useRef(aoTerminar);
  terminarRef.current = aoTerminar;
  const tituloRef = useRef(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  useEffect(() => {
    const tempo = prefereMenosMovimento() ? 120 : 620;
    if (atual >= etapas.length) {
      const t = setTimeout(() => terminarRef.current(), tempo / 2);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setAtual((a) => a + 1), tempo);
    return () => clearTimeout(t);
  }, [atual, etapas.length]);

  const progresso = Math.round((Math.min(atual, etapas.length) / etapas.length) * 100);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6" aria-labelledby="titulo-analise">
      <div className="orbe-ia mb-10" aria-hidden="true">
        <span className="orbe-ia__anel" />
        <span className="orbe-ia__nucleo" />
      </div>

      <h1 id="titulo-analise" ref={tituloRef} tabIndex={-1} className="font-display text-xl text-white outline-none sm:text-2xl">
        A IA está analisando sua {origem === "fala" ? "fala" : "apresentação"}
      </h1>
      <p className="mt-2 text-sm text-gray-400">Isso leva só alguns segundos.</p>

      <div
        className="mt-8 h-2 w-full overflow-hidden rounded-full bg-[#1B1E28]"
        role="progressbar"
        aria-label="Progresso da análise"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progresso}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-azul to-verde transition-[width] duration-500 ease-out"
          style={{ width: `${progresso}%` }}
        />
      </div>

      <ol className="mt-8 w-full space-y-3 text-left">
        {etapas.map((etapa, i) => {
          const feito = i < atual;
          const rodando = i === atual;
          return (
            <li
              key={etapa}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-300 ${
                feito
                  ? "border-verde/30 bg-verde/5 text-gray-200"
                  : rodando
                  ? "border-azul/50 bg-azul/10 text-white"
                  : "border-borda bg-card text-gray-500"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
                {feito ? (
                  <Check size={16} className="text-verde" />
                ) : rodando ? (
                  <Loader2 size={16} className="animate-spin text-ciano" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-gray-600" />
                )}
              </span>
              <span>
                {etapa}
                <span className="sr-only">{feito ? " (concluído)" : rodando ? " (em andamento)" : " (aguardando)"}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="sr-only" aria-live="polite">
        {atual < etapas.length ? etapas[atual] : "Análise concluída"}
      </p>
    </section>
  );
}
