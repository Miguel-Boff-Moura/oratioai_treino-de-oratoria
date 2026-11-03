/* ============================================================
   simulador.js — Análise de oratória SIMULADA, feita no navegador

   Este protótipo não chama nenhuma IA nem banco de dados. As regras abaixo
   imitam o que o modelo de IA do OratioAI faria depois de pronto:
     1. tokenização (separar o texto em palavras);
     2. contagem de frequência para achar vícios de linguagem;
     3. cálculo do ritmo (palavras por minuto) quando há duração real da fala;
     4. nota de clareza e nota geral;
     5. geração de um "feedback da IA" montado a partir das métricas.
   ============================================================ */

// Vícios de linguagem comuns na fala informal no Brasil.
// "é", "ah" e "ok" ficaram de fora de propósito: são palavras normais do
// português (verbo ser, interjeição, confirmação) e dariam muito falso positivo.
export const VICIOS_DE_LINGUAGEM = [
  "tipo assim", "meio que", "na verdade", "veja bem",
  "né", "tipo", "então", "assim", "ahn", "hm", "hum", "ãh", "éh",
  "sabe", "certo", "enfim", "digamos", "beleza", "daí",
];

export const RITMO_IDEAL_MIN = 120;
export const RITMO_IDEAL_MAX = 150;

// Palavras muito comuns que não contam como "repetição" de conteúdo.
const STOPWORDS = new Set(
  ("a o e é de do da dos das em no na nos nas um uma uns umas para pra por com " +
    "que se não sim eu tu ele ela nós vós eles elas me te lhe nos vos meu minha " +
    "seu sua isso isto aquilo esse essa este esta mais muito também já foi ser " +
    "são ao aos à às como mas ou quando onde vai vou ter tem está estão era há " +
    "hoje bom dia todos todas sobre nosso nossa").split(" ")
);

const LETRA = "a-zA-ZÀ-ÖØ-öø-ÿ";
const REGEX_PALAVRA = new RegExp(`[${LETRA}]+(?:['-][${LETRA}]+)*`, "g");

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function regexDoVicio(vicio, flags = "gi") {
  // \b não funciona com acentos em JS, então usamos lookarounds com letras.
  return new RegExp(`(?<![${LETRA}])${escaparRegex(vicio)}(?![${LETRA}])`, flags);
}

/** Divide o texto em tokens (palavras). */
export function tokenizar(texto) {
  return (texto || "").match(REGEX_PALAVRA) || [];
}

/** Conta as frases do texto (pontuação final ou quebra de linha). */
export function contarFrases(texto) {
  const partes = (texto || "")
    .split(/[.!?…]+|\n+/)
    .map((p) => p.trim())
    .filter((p) => tokenizar(p).length > 0);
  return Math.max(1, partes.length);
}

/**
 * Procura os vícios de linguagem. Os vícios compostos ("tipo assim") são
 * contados primeiro e "apagados" da cópia do texto, para "tipo" não ser
 * contado duas vezes.
 */
export function detectarVicios(texto) {
  let copia = (texto || "").toLowerCase();
  const encontrados = {};
  for (const vicio of VICIOS_DE_LINGUAGEM) {
    const re = regexDoVicio(vicio);
    const ocorrencias = copia.match(re);
    if (ocorrencias) {
      encontrados[vicio] = ocorrencias.length;
      copia = copia.replace(re, (m) => " ".repeat(m.length));
    }
  }
  return encontrados;
}

/** Palavras de conteúdo repetidas demais (ex.: "importante" 5 vezes). */
export function palavrasRepetidas(tokens) {
  const contagem = {};
  for (const t of tokens) {
    const p = t.toLowerCase();
    if (p.length < 4 || STOPWORDS.has(p)) continue;
    contagem[p] = (contagem[p] || 0) + 1;
  }
  return Object.entries(contagem)
    .filter(([, qtd]) => qtd >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export function calcularRitmo(qtdPalavras, duracaoSegundos) {
  if (!duracaoSegundos || duracaoSegundos < 3) return null;
  return Math.round(qtdPalavras / (duracaoSegundos / 60));
}

/** Clareza (0-100): frases de tamanho equilibrado (~16 palavras) e poucos vícios. */
export function calcularClareza(qtdPalavras, totalVicios, frases) {
  if (qtdPalavras === 0) return 0;
  const tamanhoMedio = qtdPalavras / Math.max(1, frases);
  const penalidadeTamanho = Math.min(35, Math.abs(tamanhoMedio - 16) * 2);
  const densidadeVicios = (totalVicios / qtdPalavras) * 100;
  const penalidadeVicios = Math.min(35, densidadeVicios * 6);
  return Math.max(0, Math.round(100 - penalidadeTamanho - penalidadeVicios));
}

export function calcularNotaGeral(clareza, ritmo) {
  let nota = clareza;
  if (ritmo != null) {
    if (ritmo < RITMO_IDEAL_MIN) nota -= Math.min(15, (RITMO_IDEAL_MIN - ritmo) * 0.5);
    else if (ritmo > RITMO_IDEAL_MAX) nota -= Math.min(15, (ritmo - RITMO_IDEAL_MAX) * 0.5);
  }
  return Math.max(0, Math.min(100, Math.round(nota)));
}

const DICA_POR_CONTEXTO = {
  "Trabalho Escolar": {
    titulo: "Dica para trabalho escolar",
    corpo:
      "Comece dizendo o tema e os tópicos que vai apresentar. Assim a turma e o professor sabem o caminho que você vai seguir.",
  },
  "TCC / Projeto": {
    titulo: "Dica para banca de TCC",
    corpo:
      "Deixe claro o problema, o objetivo e o resultado logo no começo. A banca presta mais atenção quando entende a pergunta da pesquisa.",
  },
  "Entrevista de Emprego": {
    titulo: "Dica para entrevista",
    corpo:
      "Responda com exemplos curtos do que você já fez (situação, ação e resultado) em vez de frases genéricas.",
  },
  Debate: {
    titulo: "Dica para debate",
    corpo:
      "Apresente um argumento por vez e feche cada um com uma frase de conclusão. Isso evita parecer que você está fugindo do assunto.",
  },
  Outro: {
    titulo: "Dica geral",
    corpo: "Ensaie em voz alta pelo menos duas vezes antes da apresentação e cronometre o tempo.",
  },
};

export function gerarDicas({ clareza, ritmo, vicios, repetidas, frasesLongas, tamanhoMedio = 16, contexto }) {
  const dicas = [];
  const totalVicios = Object.values(vicios).reduce((s, n) => s + n, 0);

  if (totalVicios > 0) {
    const [maisUsado, qtd] = Object.entries(vicios).sort((a, b) => b[1] - a[1])[0];
    dicas.push({
      tipo: "alerta",
      titulo: "Reduza os vícios de linguagem",
      corpo: `Você usou "${maisUsado}" ${qtd}x e ${totalVicios} vício(s) no total. Troque por uma pausa curta e em silêncio: ela passa mais confiança do que a palavra de preenchimento.`,
    });
  } else {
    dicas.push({
      tipo: "ok",
      titulo: "Nenhum vício de linguagem encontrado",
      corpo: "Ótimo controle! Continue treinando para manter esse padrão em apresentações mais longas.",
    });
  }

  if (ritmo != null) {
    if (ritmo > RITMO_IDEAL_MAX) {
      dicas.push({
        tipo: "alerta",
        titulo: "Fale um pouco mais devagar",
        corpo: `Sua fala ficou em ${ritmo} palavras por minuto, acima da faixa ideal (${RITMO_IDEAL_MIN}-${RITMO_IDEAL_MAX} ppm). Respire nas pausas naturais do texto.`,
      });
    } else if (ritmo < RITMO_IDEAL_MIN) {
      dicas.push({
        tipo: "alerta",
        titulo: "Ganhe um pouco mais de ritmo",
        corpo: `Sua fala ficou em ${ritmo} palavras por minuto, abaixo da faixa ideal (${RITMO_IDEAL_MIN}-${RITMO_IDEAL_MAX} ppm). Isso pode indicar hesitação: treine lendo o texto em voz alta.`,
      });
    } else {
      dicas.push({
        tipo: "ok",
        titulo: "Ritmo dentro da faixa ideal",
        corpo: `Seus ${ritmo} ppm estão dentro da faixa recomendada. Continue assim!`,
      });
    }
  }

  if (repetidas.length > 0) {
    const lista = repetidas.map(([p, q]) => `"${p}" (${q}x)`).join(", ");
    dicas.push({
      tipo: "info",
      titulo: "Varie o vocabulário",
      corpo: `Algumas palavras apareceram muitas vezes: ${lista}. Tente usar sinônimos para o texto não ficar repetitivo.`,
    });
  }

  if (frasesLongas > 0 || (clareza < 60 && tamanhoMedio > 20)) {
    dicas.push({
      tipo: "info",
      titulo: "Deixe as frases mais curtas",
      corpo:
        frasesLongas > 0
          ? `Encontramos ${frasesLongas} frase(s) com mais de 30 palavras. Divida em frases menores, com uma ideia principal por frase.`
          : "Tente montar frases mais curtas e diretas, com uma ideia principal por frase.",
    });
  } else if (clareza < 60 && tamanhoMedio < 10) {
    dicas.push({
      tipo: "info",
      titulo: "Conecte melhor as ideias",
      corpo:
        "Suas frases estão muito picotadas. Junte ideias relacionadas usando conectivos como \"além disso\", \"por isso\" e \"por exemplo\".",
    });
  }

  const dicaContexto = DICA_POR_CONTEXTO[contexto] || DICA_POR_CONTEXTO.Outro;
  dicas.push({ tipo: "contexto", ...dicaContexto });

  return dicas;
}

/** Um parágrafo de resumo, imitando o texto que a IA escreveria. */
export function gerarResumo({ notaGeral, totalVicios, ritmo, origem, qtdPalavras }) {
  let abertura;
  if (notaGeral >= 85) abertura = "Muito bom! Sua apresentação está clara e bem organizada.";
  else if (notaGeral >= 70) abertura = "Boa apresentação, com alguns pontos para ajustar.";
  else if (notaGeral >= 50) abertura = "Sua apresentação passa a ideia, mas ainda dá para melhorar bastante.";
  else abertura = "Vale treinar mais um pouco antes de apresentar.";

  const partes = [abertura];
  if (totalVicios === 0) partes.push("Não apareceram vícios de linguagem.");
  else if (totalVicios <= 3) partes.push("Apareceram poucos vícios de linguagem.");
  else partes.push(`Os ${totalVicios} vícios de linguagem são o principal ponto de atenção.`);

  if (origem === "fala" && ritmo != null) {
    partes.push(`O ritmo medido foi de ${ritmo} palavras por minuto.`);
  } else if (origem === "texto") {
    const minutos = Math.max(1, Math.round(qtdPalavras / 130));
    partes.push(`Lido em voz alta, esse texto deve levar cerca de ${minutos} min.`);
  }
  return partes.join(" ");
}

/**
 * Separa a transcrição em pedaços normais e pedaços com vício, para destacar
 * na tela sem usar HTML (evita injeção de código vinda do texto colado).
 */
export function marcarTranscricao(texto, vicios) {
  const chaves = Object.keys(vicios).sort((a, b) => b.length - a.length);
  if (!texto) return [];
  if (chaves.length === 0) return [{ texto, vicio: false }];
  const re = new RegExp(
    `(?<![${LETRA}])(${chaves.map(escaparRegex).join("|")})(?![${LETRA}])`,
    "gi"
  );
  const partes = [];
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    if (m.index > ultimo) partes.push({ texto: texto.slice(ultimo, m.index), vicio: false });
    partes.push({ texto: m[0], vicio: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo), vicio: false });
  return partes;
}

/** Função principal: devolve o resultado completo da análise simulada. */
export function analisarTranscricao({ texto, duracaoSegundos = null, contexto = "Outro", origem = "texto" }) {
  const limpo = (texto || "").trim();
  const tokens = tokenizar(limpo);
  const qtdPalavras = tokens.length;
  const frases = contarFrases(limpo);
  const frasesLongas = limpo
    .split(/[.!?…]+|\n+/)
    .filter((f) => tokenizar(f).length > 30).length;

  const vicios = detectarVicios(limpo);
  const totalVicios = Object.values(vicios).reduce((s, n) => s + n, 0);
  const repetidas = palavrasRepetidas(tokens);
  const ritmo = origem === "fala" ? calcularRitmo(qtdPalavras, duracaoSegundos) : null;
  const clareza = calcularClareza(qtdPalavras, totalVicios, frases);
  const notaGeral = calcularNotaGeral(clareza, ritmo);

  return {
    contexto,
    origem,
    transcricao: limpo,
    duracaoSegundos: duracaoSegundos ? Math.round(duracaoSegundos) : null,
    qtdPalavras,
    ritmo,
    clareza,
    notaGeral,
    vicios,
    totalVicios,
    dicas: gerarDicas({
      clareza, ritmo, vicios, repetidas, frasesLongas, contexto,
      tamanhoMedio: qtdPalavras / frases,
    }),
    resumo: gerarResumo({ notaGeral, totalVicios, ritmo, origem, qtdPalavras }),
  };
}

/** Etapas mostradas na animação de "IA analisando". */
export const ETAPAS_ANALISE = {
  fala: [
    "Recebendo a transcrição da fala",
    "Tokenizando o discurso",
    "Procurando vícios de linguagem",
    "Medindo o ritmo (palavras por minuto)",
    "Gerando o feedback",
  ],
  texto: [
    "Lendo o texto da apresentação",
    "Tokenizando o discurso",
    "Procurando vícios de linguagem",
    "Avaliando a clareza das frases",
    "Gerando o feedback",
  ],
};
