/* ============================================================
   armazenamento.js — Persistência com localStorage

   Substitui o antigo banco SQLite. Tudo fica salvo só no navegador do
   usuário, então os dados continuam na tela depois de apertar F5.
   Toda leitura/escrita fica dentro de try/catch: em aba anônima ou com o
   armazenamento bloqueado, o site continua funcionando (só não salva).
   ============================================================ */

const CHAVE_SESSOES = "oratioai:sessoes";
const CHAVE_CHATS = "oratioai:chats";
const CHAVE_PREFERENCIAS = "oratioai:preferencias";
const LIMITE_SESSOES = 60;

function ler(chave, padrao) {
  try {
    const bruto = window.localStorage.getItem(chave);
    if (bruto == null) return padrao;
    const valor = JSON.parse(bruto);
    return valor ?? padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

function novoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------------- Sessões de treino ---------------- */

export function carregarSessoes() {
  const lista = ler(CHAVE_SESSOES, []);
  return Array.isArray(lista) ? lista : [];
}

export function salvarSessoes(lista) {
  return gravar(CHAVE_SESSOES, lista.slice(0, LIMITE_SESSOES));
}

export function criarSessao(resultado) {
  return { id: novoId(), criadoEm: new Date().toISOString(), ...resultado };
}

/* ---------------- Histórico de chats ---------------- */

const CHAT_EXEMPLO = {
  id: "exemplo",
  titulo: "Preparação para apresentação",
  conteudo:
    'Anotações sobre a abertura do TCC: reforçar a introdução do problema e diminuir o uso de "né" e "tipo".',
  criadoEm: "2026-08-28T12:14:00.000Z",
  editadoEm: null,
};

export function carregarChats() {
  const lista = ler(CHAVE_CHATS, null);
  if (lista === null) return [CHAT_EXEMPLO]; // primeira visita
  return Array.isArray(lista) ? lista : [];
}

export function salvarChats(lista) {
  return gravar(CHAVE_CHATS, lista);
}

export function criarChat(titulo, conteudo) {
  return { id: novoId(), titulo, conteudo, criadoEm: new Date().toISOString(), editadoEm: null };
}

/* ---------------- Preferências ---------------- */

export function carregarPreferencias() {
  const p = ler(CHAVE_PREFERENCIAS, {});
  return p && typeof p === "object" ? p : {};
}

export function salvarPreferencias(p) {
  return gravar(CHAVE_PREFERENCIAS, p);
}

/** Rascunho do texto colado (para não perder ao recarregar a página). */
export function carregarRascunho() {
  return ler("oratioai:rascunho", "") || "";
}

export function salvarRascunho(texto) {
  return gravar("oratioai:rascunho", texto);
}
