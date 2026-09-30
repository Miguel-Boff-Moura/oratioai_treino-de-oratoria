/* ============================================================
   useSpeechRecognition.js — Hook de reconhecimento de fala

   Usa a Web Speech API do navegador (SpeechRecognition), gratuita e
   sem chave de API, para transcrever a fala em pt-BR em tempo real.
   Mede também a duração real da fala, usada pelo backend para calcular
   o ritmo (palavras por minuto).

   Suporte: Chrome e Edge (desktop). Em navegadores sem suporte,
   `supported` volta como false.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition() {
  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const supported = Boolean(SpeechRecognition);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");   // trechos finais acumulados
  const [interim, setInterim] = useState("");         // trecho parcial em andamento
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const startTimeRef = useRef(null);
  const durationRef = useRef(0);
  const timerRef = useRef(null);
  const recordingRef = useRef(false);

  // Inicializa o objeto SpeechRecognition uma única vez.
  useEffect(() => {
    if (!supported) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (evento) => {
      let parcial = "";
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const trecho = evento.results[i][0].transcript;
        if (evento.results[i].isFinal) {
          finalTranscriptRef.current += trecho + " ";
        } else {
          parcial += trecho;
        }
      }
      setTranscript(finalTranscriptRef.current.trim());
      setInterim(parcial.trim());
    };

    recognition.onerror = (evento) => {
      if (evento.error === "not-allowed" || evento.error === "service-not-allowed") {
        setError("Permissão de microfone negada. Habilite o acesso ao microfone no navegador.");
      } else if (evento.error === "no-speech") {
        // silêncio — ignorado, o onend reinicia se ainda estiver gravando
      } else {
        setError("Erro no reconhecimento de voz: " + evento.error);
      }
    };

    recognition.onend = () => {
      // O navegador encerra sozinho após um tempo de silêncio; se o usuário
      // ainda não parou, reinicia para manter a captura contínua.
      if (recordingRef.current) {
        try {
          recognition.start();
        } catch {
          /* já iniciado */
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recordingRef.current = false;
      try {
        recognition.stop();
      } catch {
        /* ignora */
      }
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || recordingRef.current) return;
    setError(null);
    setTranscript("");
    setInterim("");
    setSeconds(0);
    finalTranscriptRef.current = "";
    durationRef.current = 0;
    startTimeRef.current = Date.now();
    recordingRef.current = true;
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setSeconds((Date.now() - startTimeRef.current) / 1000);
    }, 250);

    try {
      recognitionRef.current.start();
    } catch {
      /* já iniciado */
    }
  }, []);

  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);
    durationRef.current = (Date.now() - startTimeRef.current) / 1000;
    setSeconds(durationRef.current);
    clearInterval(timerRef.current);
    try {
      recognitionRef.current.stop();
    } catch {
      /* ignora */
    }
  }, []);

  const reset = useCallback(() => {
    finalTranscriptRef.current = "";
    durationRef.current = 0;
    setTranscript("");
    setInterim("");
    setSeconds(0);
    setError(null);
  }, []);

  return {
    supported,
    isRecording,
    transcript,
    interim,
    seconds,
    // duração "congelada" ao parar; enquanto grava, usa o cronômetro corrente
    durationSeconds: () => durationRef.current || (Date.now() - (startTimeRef.current || Date.now())) / 1000,
    error,
    start,
    stop,
    reset,
  };
}
