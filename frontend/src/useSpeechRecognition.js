/* ============================================================
   useSpeechRecognition.js — Transcrição da fala

   Usa a Web Speech API do navegador (SpeechRecognition), que é gratuita e
   não precisa de chave. Ela transcreve a fala em português em tempo real.
   Também mede a duração real da fala, usada para calcular o ritmo.

   Funciona no Google Chrome e no Microsoft Edge. Em navegadores sem suporte
   (Firefox, por exemplo), `supported` volta como false e o site mostra um aviso.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";

function obterClasse() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const MENSAGENS_ERRO = {
  "not-allowed": "Permissão de microfone negada. Libere o microfone no cadeado da barra de endereço.",
  "service-not-allowed": "O navegador bloqueou o reconhecimento de voz nesta página.",
  "audio-capture": "Nenhum microfone foi encontrado. Conecte um microfone e tente de novo.",
  network: "O reconhecimento de voz precisa de internet. Verifique sua conexão.",
  "language-not-supported": "O navegador não reconhece fala em português.",
};

export function useSpeechRecognition() {
  const Classe = obterClasse();
  const supported = Boolean(Classe);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState(""); // trechos finais
  const [interim, setInterim] = useState(""); // trecho ainda sendo reconhecido
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const textoAnteriorRef = useRef(""); // texto de rodadas anteriores (o navegador reinicia sozinho)
  const textoRodadaRef = useRef(""); // texto final da rodada atual
  const parcialRef = useRef(""); // último trecho parcial (ainda não finalizado)
  const inicioRef = useRef(0);
  const duracaoRef = useRef(0);
  const timerRef = useRef(null);
  const gravandoRef = useRef(false);

  useEffect(() => {
    if (!supported) return undefined;

    const rec = new Classe();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (evento) => {
      // Remonta o texto da rodada inteira a cada evento. Isso evita repetir
      // frases quando o navegador reenvia resultados já finalizados.
      let finais = "";
      let parcial = "";
      for (let i = 0; i < evento.results.length; i++) {
        const trecho = evento.results[i][0].transcript.trim();
        if (evento.results[i].isFinal) finais += trecho + " ";
        else parcial += trecho + " ";
      }
      textoRodadaRef.current = finais.trim();
      parcialRef.current = parcial.trim();
      setTranscript(`${textoAnteriorRef.current} ${textoRodadaRef.current}`.trim());
      setInterim(parcial.trim());
    };

    rec.onerror = (evento) => {
      // "no-speech" (silêncio) e "aborted" (paramos de propósito) não são erros para o usuário.
      if (evento.error === "no-speech" || evento.error === "aborted") return;
      setError(MENSAGENS_ERRO[evento.error] || "Não foi possível usar o reconhecimento de voz agora.");
      if (evento.error === "not-allowed" || evento.error === "audio-capture" || evento.error === "service-not-allowed") {
        gravandoRef.current = false;
        setIsRecording(false);
        clearInterval(timerRef.current);
      }
    };

    rec.onend = () => {
      // Guarda o que foi dito nesta rodada antes de começar a próxima.
      textoAnteriorRef.current = `${textoAnteriorRef.current} ${textoRodadaRef.current}`.trim();
      textoRodadaRef.current = "";
      parcialRef.current = "";
      setInterim("");
      // O navegador encerra depois de alguns segundos de silêncio; se o
      // usuário ainda não parou, recomeça para a gravação ser contínua.
      if (gravandoRef.current) {
        try {
          rec.start();
        } catch {
          /* já estava iniciado */
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      gravandoRef.current = false;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignora */
      }
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || gravandoRef.current) return;
    setError(null);
    setTranscript("");
    setInterim("");
    setSeconds(0);
    textoAnteriorRef.current = "";
    textoRodadaRef.current = "";
    parcialRef.current = "";
    duracaoRef.current = 0;
    inicioRef.current = Date.now();
    gravandoRef.current = true;
    setIsRecording(true);

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((Date.now() - inicioRef.current) / 1000);
    }, 250);

    try {
      recognitionRef.current.start();
    } catch {
      /* já estava iniciado */
    }
  }, []);

  /** Para a gravação e devolve o texto completo (finais + parcial) e a duração. */
  const stop = useCallback(() => {
    if (!gravandoRef.current) {
      return { texto: transcriptAtual(), duracao: duracaoRef.current };
    }
    gravandoRef.current = false;
    setIsRecording(false);
    duracaoRef.current = (Date.now() - inicioRef.current) / 1000;
    setSeconds(duracaoRef.current);
    clearInterval(timerRef.current);
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignora */
    }
    return { texto: transcriptAtual(), duracao: duracaoRef.current };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lê direto das refs para não depender de um estado ainda não atualizado.
  function transcriptAtual() {
    return `${textoAnteriorRef.current} ${textoRodadaRef.current} ${parcialRef.current}`
      .replace(/\s+/g, " ")
      .trim();
  }

  const reset = useCallback(() => {
    textoAnteriorRef.current = "";
    textoRodadaRef.current = "";
    parcialRef.current = "";
    duracaoRef.current = 0;
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setError(null);
  }, []);

  return { supported, isRecording, transcript, interim, seconds, error, start, stop, reset };
}
