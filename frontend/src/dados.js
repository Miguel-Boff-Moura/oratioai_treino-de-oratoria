/* Constantes da interface e montagem dos dados do dashboard. */

export const CONTEXTOS = ["Trabalho Escolar", "TCC / Projeto", "Entrevista de Emprego", "Debate", "Outro"];

export const ATALHOS = [
  {
    rotulo: "Apresentação TCC",
    contexto: "TCC / Projeto",
    exemplo:
      "Bom dia, banca. Hoje vou apresentar, né, o resultado do nosso Trabalho de Conclusão de Curso. Então, o problema que a gente estudou foi, tipo, a dificuldade dos alunos em falar em público.",
  },
  {
    rotulo: "Reunião de negócios",
    contexto: "Entrevista de Emprego",
    exemplo:
      "Bom dia a todos. Então, vamos revisar, tipo, os principais indicadores do trimestre antes de decidir os próximos passos. Assim, a meta de vendas foi atingida, né, mas o custo subiu.",
  },
  {
    rotulo: "Trabalho Escolar",
    contexto: "Trabalho Escolar",
    exemplo:
      "Bom dia a todos, né. Hoje vou falar, tipo, sobre a importância da IA na educação. Então, a tecnologia, tipo, mudou muito a forma como a gente aprende.",
  },
];

export const LINHAS_ESSENTIAL = [
  { rotulo: "Análises de oratória por mês", gratis: "3", pago: "30" },
  { rotulo: "Histórico de sessões", gratis: "7 dias", pago: "90 dias" },
  { rotulo: "Detecção de vícios de linguagem", gratis: true, pago: true },
  { rotulo: "Dashboard de desempenho", gratis: true, pago: true },
  { rotulo: "Exportar relatório em PDF", gratis: false, pago: true },
];

export const RECURSOS_MASTER = [
  "Reconhecimento de voz avançado (ASR de alta precisão)",
  "Sessões e histórico ilimitados",
  "Feedback detalhado gerado por IA em tempo real",
  "Exportação ilimitada de relatórios em PDF",
  "Suporte prioritário e acesso antecipado a novos recursos",
];

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Curva de exemplo (parecida com a do protótipo no Figma), usada enquanto o
// usuário ainda não tem sessões e para estimar os dias sem treino.
const EXEMPLO_CLAREZA = [58, 64, 72, 69, 78, 87, 85];
const EXEMPLO_RITMO = [104, 117, 128, 123, 135, 142, 140];

function chaveDia(data) {
  return `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;
}

function media(lista) {
  return lista.length ? Math.round(lista.reduce((s, n) => s + n, 0) / lista.length) : null;
}

/**
 * Preenche os dias sem dado. Entre dois dias reais, liga os pontos em linha
 * reta; antes do primeiro e depois do último, segue o formato da curva de
 * exemplo. Os valores preenchidos são marcados como "estimado".
 */
function completarSerie(reais, exemplo, min, max) {
  const idx = reais.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  if (idx.length === 0) return exemplo.map((v) => ({ valor: v, estimado: true }));
  const primeiro = idx[0];
  const ultimo = idx[idx.length - 1];
  return reais.map((v, i) => {
    if (v != null) return { valor: v, estimado: false };
    let valor;
    if (i < primeiro) valor = exemplo[i] - exemplo[primeiro] + reais[primeiro];
    else if (i > ultimo) valor = exemplo[i] - exemplo[ultimo] + reais[ultimo];
    else {
      const antes = idx.filter((k) => k < i).pop();
      const depois = idx.find((k) => k > i);
      const t = (i - antes) / (depois - antes);
      valor = reais[antes] + (reais[depois] - reais[antes]) * t;
    }
    return { valor: Math.round(Math.min(max, Math.max(min, valor))), estimado: true };
  });
}

/** Série dos últimos 7 dias (o último ponto é hoje) para o gráfico. */
export function montarSerieSemanal(sessoes, hoje = new Date()) {
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoje);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dias.push(d);
  }
  const porDia = new Map(dias.map((d) => [chaveDia(d), { clareza: [], ritmo: [] }]));
  for (const s of sessoes) {
    const balde = porDia.get(chaveDia(new Date(s.criadoEm)));
    if (!balde) continue;
    if (s.clareza != null) balde.clareza.push(s.clareza);
    if (s.ritmo != null) balde.ritmo.push(s.ritmo);
  }
  const clarezaReal = dias.map((d) => media(porDia.get(chaveDia(d)).clareza));
  const ritmoReal = dias.map((d) => media(porDia.get(chaveDia(d)).ritmo));
  const clareza = completarSerie(clarezaReal, EXEMPLO_CLAREZA, 0, 100);
  const ritmo = completarSerie(ritmoReal, EXEMPLO_RITMO, 60, 200);

  return {
    exemplo: clarezaReal.every((v) => v == null) && ritmoReal.every((v) => v == null),
    pontos: dias.map((d, i) => ({
      dia: i === 6 ? "Hoje" : DIAS[d.getDay()],
      data: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      clareza: clareza[i],
      ritmo: ritmo[i],
    })),
  };
}

/** Números dos cartões do dashboard. */
export function resumirSessoes(sessoes) {
  if (sessoes.length === 0) {
    return {
      exemplo: true,
      ritmoMedio: 130,
      clarezaMedia: 96,
      totalVicios: 12,
      tendencias: { ritmo: "+12%", clareza: "+4,2%", vicios: "-3" },
      viciosTop: [{ palavra: "hum", qtd: 5 }, { palavra: "tipo", qtd: 4 }],
    };
  }
  const ritmos = sessoes.map((s) => s.ritmo).filter((v) => v != null);
  const clarezas = sessoes.map((s) => s.clareza);
  const contagem = {};
  for (const s of sessoes) {
    for (const [p, q] of Object.entries(s.vicios || {})) contagem[p] = (contagem[p] || 0) + q;
  }
  const viciosTop = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([palavra, qtd]) => ({ palavra, qtd }));

  // Tendência: última sessão comparada com a média das anteriores.
  const [ultima, ...anteriores] = sessoes;
  const tendencias = {};
  if (anteriores.length) {
    const mClareza = media(anteriores.map((s) => s.clareza));
    tendencias.clareza = formatarDiferenca(ultima.clareza - mClareza);
    const mVicios = media(anteriores.map((s) => s.totalVicios));
    tendencias.vicios = formatarDiferenca(ultima.totalVicios - mVicios);
    const rAnt = anteriores.map((s) => s.ritmo).filter((v) => v != null);
    if (ultima.ritmo != null && rAnt.length) tendencias.ritmo = formatarDiferenca(ultima.ritmo - media(rAnt));
  }

  return {
    exemplo: false,
    ritmoMedio: media(ritmos),
    clarezaMedia: media(clarezas),
    totalVicios: sessoes.reduce((s, x) => s + (x.totalVicios || 0), 0),
    tendencias,
    viciosTop,
  };
}

function formatarDiferenca(n) {
  if (n == null || Number.isNaN(n)) return undefined;
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatarData(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}, ${hora}`;
}

export function formatarDuracao(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
