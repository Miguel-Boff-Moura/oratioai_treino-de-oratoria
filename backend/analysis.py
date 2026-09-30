# -*- coding: utf-8 -*-
"""
analysis.py — Núcleo de PLN/NLP do OratioAI.

Responsável por:
  - Tokenizar a transcrição (via NLTK, com fallback em regex se o NLTK
    ou os dados 'punkt' não estiverem disponíveis no ambiente).
  - Detectar vícios de linguagem por frequência.
  - Calcular métricas quantitativas (ritmo em palavras por minuto,
    nota de clareza) e qualitativas (dicas automáticas de melhoria).

Este módulo é intencionalmente independente do Flask para poder ser
testado isoladamente (ver testes em test_analysis.py).
"""
import re
from collections import Counter

# ── Tentativa de usar NLTK (citado no referencial teórico do TCC) ──
_NLTK_OK = False
try:
    import nltk
    from nltk.tokenize import word_tokenize

    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        try:
            nltk.download("punkt_tab", quiet=True)
        except Exception:
            pass
    _NLTK_OK = True
except Exception:
    _NLTK_OK = False


# Lista de vícios de linguagem comuns em fala informal no Brasil.
# Combinação dos termos usados nos protótipos anteriores (vClaude + vLovable)
# mais alguns adicionais frequentes em contexto escolar/acadêmico.
VICIOS_DE_LINGUAGEM = [
    "né", "tipo", "então", "assim", "ahn", "hm", "ãh", "sabe", "certo",
    "meio que", "éh", "hum", "tipo assim", "na verdade",
    "enfim", "digamos", "veja bem", "beleza", "daí",
]
# Observação: propositalmente NÃO incluímos "é", "ah" e "ok" isolados na
# lista — são palavras/verbos legítimos de altíssima frequência no
# português (verbo "ser", interjeição comum, confirmação), e marcá-los
# como vício geraria muitos falsos positivos.

# Faixa de ritmo considerada ideal para apresentações orais (palavras por minuto).
RITMO_IDEAL_MIN = 120
RITMO_IDEAL_MAX = 150

_WORD_RE = re.compile(r"[a-zA-ZÀ-ÖØ-öø-ÿ]+(?:'[a-zA-ZÀ-ÖØ-öø-ÿ]+)?")


def tokenizar(texto: str):
    """Divide o texto em tokens (palavras), preferindo o NLTK."""
    if _NLTK_OK:
        try:
            return [t for t in word_tokenize(texto, language="portuguese") if _WORD_RE.fullmatch(t)]
        except Exception:
            pass
    # Fallback: tokenização simples via regex, mantém o protótipo funcional
    # mesmo sem conexão à internet para baixar os dados do NLTK.
    return _WORD_RE.findall(texto)


def detectar_vicios(texto: str):
    """Retorna um dicionário {vício: contagem} com base em correspondência
    de expressões (inclusive vícios compostos por mais de uma palavra)."""
    texto_lower = f" {texto.lower()} "
    encontrados = {}
    for vicio in VICIOS_DE_LINGUAGEM:
        padrao = r"(?<![a-zà-öø-ÿ])" + re.escape(vicio) + r"(?![a-zà-öø-ÿ])"
        ocorrencias = re.findall(padrao, texto_lower)
        if ocorrencias:
            encontrados[vicio] = len(ocorrencias)
    return encontrados


def calcular_ritmo_wpm(quantidade_palavras: int, duracao_segundos: float):
    """Calcula o ritmo em palavras por minuto (wpm) a partir da duração real
    da fala (capturada no frontend durante a gravação)."""
    if not duracao_segundos or duracao_segundos <= 0:
        return None
    return round(quantidade_palavras / (duracao_segundos / 60))


def calcular_clareza(quantidade_palavras: int, total_vicios: int, sentencas: int):
    """Nota de clareza (0-100) baseada em tamanho médio de frase e
    densidade de vícios de linguagem — quanto mais próximo de uma frase
    de comprimento equilibrado (~16 palavras) e menos vícios, maior a nota."""
    if quantidade_palavras == 0:
        return 0
    tamanho_medio = quantidade_palavras / max(1, sentencas)
    penalidade_tamanho = min(35, abs(tamanho_medio - 16) * 2)
    densidade_vicios = (total_vicios / quantidade_palavras) * 100
    penalidade_vicios = min(35, densidade_vicios * 6)
    nota = 100 - penalidade_tamanho - penalidade_vicios
    return max(0, round(nota))


def calcular_nota_geral(clareza: int, ritmo_wpm, total_vicios: int, quantidade_palavras: int):
    """Combina clareza + adequação do ritmo + densidade de vícios em uma
    nota geral única (0-100), usada como resumo rápido no dashboard."""
    nota = clareza
    if ritmo_wpm is not None:
        if ritmo_wpm < RITMO_IDEAL_MIN:
            nota -= min(15, (RITMO_IDEAL_MIN - ritmo_wpm) * 0.5)
        elif ritmo_wpm > RITMO_IDEAL_MAX:
            nota -= min(15, (ritmo_wpm - RITMO_IDEAL_MAX) * 0.5)
    return max(0, min(100, round(nota)))


def gerar_dicas(clareza: int, ritmo_wpm, vicios: dict, quantidade_palavras: int):
    """Gera dicas textuais automáticas (regras simples, sem chamada a LLM
    externo) — mantém o protótipo funcionando 100% offline além do
    reconhecimento de voz."""
    dicas = []
    total_vicios = sum(vicios.values())

    if total_vicios > 0:
        mais_usado = max(vicios.items(), key=lambda kv: kv[1])
        dicas.append({
            "icone": "🗣",
            "titulo": "Reduza os vícios de linguagem",
            "corpo": (
                f'Você usou "{mais_usado[0]}" {mais_usado[1]}x e outros vícios '
                f"{total_vicios} vezes no total. Troque por uma pausa curta e "
                "silenciosa — ela transmite mais confiança do que a palavra de preenchimento."
            ),
        })
    else:
        dicas.append({
            "icone": "✅",
            "titulo": "Sem vícios de linguagem detectados",
            "corpo": "Ótimo controle! Continue treinando para manter esse padrão em apresentações mais longas.",
        })

    if ritmo_wpm is not None:
        if ritmo_wpm > RITMO_IDEAL_MAX:
            dicas.append({
                "icone": "🐢",
                "titulo": "Desacelere o ritmo",
                "corpo": (
                    f"Sua fala está em {ritmo_wpm} palavras por minuto, acima da faixa ideal "
                    f"({RITMO_IDEAL_MIN}-{RITMO_IDEAL_MAX} ppm). Respire nos pontos de pausa naturais do texto."
                ),
            })
        elif ritmo_wpm < RITMO_IDEAL_MIN:
            dicas.append({
                "icone": "🐇",
                "titulo": "Aumente um pouco a energia",
                "corpo": (
                    f"Sua fala está em {ritmo_wpm} palavras por minuto, abaixo da faixa ideal "
                    f"({RITMO_IDEAL_MIN}-{RITMO_IDEAL_MAX} ppm). Isso pode indicar hesitação — treine a fluência lendo em voz alta."
                ),
            })
        else:
            dicas.append({
                "icone": "🎯",
                "titulo": "Ritmo dentro da faixa ideal",
                "corpo": f"Seus {ritmo_wpm} ppm estão dentro da faixa recomendada. Continue assim!",
            })

    if clareza < 60:
        dicas.append({
            "icone": "📚",
            "titulo": "Trabalhe a clareza das frases",
            "corpo": "Tente estruturar frases mais curtas e diretas, com uma ideia principal por frase.",
        })

    return dicas


def analisar_transcricao(texto: str, duracao_segundos: float = None, contexto: str = "Geral"):
    """Função principal: recebe a transcrição (do texto colado OU da fala
    reconhecida pelo microfone) e retorna o resultado completo da análise."""
    texto = (texto or "").strip()
    tokens = tokenizar(texto)
    quantidade_palavras = len(tokens)
    sentencas = max(1, len(re.split(r"[.!?]+", texto)) - (0 if texto.endswith((".", "!", "?")) else 1))

    vicios = detectar_vicios(texto)
    total_vicios = sum(vicios.values())

    ritmo_wpm = calcular_ritmo_wpm(quantidade_palavras, duracao_segundos)
    clareza = calcular_clareza(quantidade_palavras, total_vicios, sentencas)
    nota_geral = calcular_nota_geral(clareza, ritmo_wpm, total_vicios, quantidade_palavras)
    dicas = gerar_dicas(clareza, ritmo_wpm, vicios, quantidade_palavras)
    transcricao_marcada = marcar_transcricao(texto, vicios)

    return {
        "contexto": contexto,
        "quantidade_palavras": quantidade_palavras,
        "duracao_segundos": duracao_segundos,
        "ritmo_wpm": ritmo_wpm,
        "clareza": clareza,
        "nota_geral": nota_geral,
        "vicios": vicios,
        "total_vicios": total_vicios,
        "dicas": dicas,
        "transcricao": texto,
        "transcricao_marcada": transcricao_marcada,
    }


def marcar_transcricao(texto: str, vicios: dict):
    """Envolve os vícios de linguagem encontrados em <mark> para destaque
    visual na aba de transcrição do frontend."""
    if not texto:
        return ""
    vicio_keys = sorted(vicios.keys(), key=len, reverse=True)
    if not vicio_keys:
        return texto

    padrao = r"(?<![a-zà-öø-ÿ])(" + "|".join(re.escape(v) for v in vicio_keys) + r")(?![a-zà-öø-ÿ])"

    def _sub(m):
        return f'<mark class="vicio">{m.group(0)}</mark>'

    return re.sub(padrao, _sub, texto, flags=re.IGNORECASE)
