/* ============================================================
   api.js — Cliente HTTP do OratioAI (frontend React → backend Flask)

   Em desenvolvimento, o Vite faz proxy de /api para http://localhost:5000
   (ver vite.config.js), então basta chamar caminhos relativos.
   Em produção, defina VITE_API_BASE (ex.: "https://api.oratioai.com")
   no arquivo .env do build, caso o backend fique em outro domínio.
   ============================================================ */

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function requisitar(caminho, opcoes = {}) {
  let resp;
  try {
    resp = await fetch(`${API_BASE}${caminho}`, {
      headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) },
      ...opcoes,
    });
  } catch {
    throw new Error(
      "Não foi possível falar com o servidor. Verifique se o backend Flask está rodando em http://localhost:5000."
    );
  }

  let dados = null;
  try {
    dados = await resp.json();
  } catch {
    dados = null;
  }

  if (!resp.ok) {
    throw new Error((dados && dados.erro) || `Erro ${resp.status} ao chamar ${caminho}.`);
  }
  return dados;
}

/** Envia a transcrição (de texto colado ou de fala) para análise de PLN. */
export function analisarOratoria({ texto, contexto, duracaoSegundos = null, origem = "texto" }) {
  return requisitar("/api/analisar", {
    method: "POST",
    body: JSON.stringify({
      texto,
      contexto,
      duracao_segundos: duracaoSegundos,
      origem,
    }),
  });
}

/** Lista as sessões salvas, mais recentes primeiro. */
export function listarSessoes(limite = 50) {
  return requisitar(`/api/sessoes?limite=${limite}`);
}

/** Detalhe de uma sessão específica. */
export function obterSessao(id) {
  return requisitar(`/api/sessoes/${id}`);
}

/** Resumo agregado para o dashboard (médias, vícios mais falados, série semanal). */
export function resumoDashboard() {
  return requisitar("/api/dashboard/resumo");
}
