# -*- coding: utf-8 -*-
"""
db.py — Camada de persistência do OratioAI usando SQLite puro
(sem ORM, para manter o protótipo simples e fácil de entender no TCC).
"""
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "oratioai.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS sessoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            criado_em TEXT NOT NULL,
            contexto TEXT,
            origem TEXT,
            transcricao TEXT,
            transcricao_marcada TEXT,
            duracao_segundos REAL,
            quantidade_palavras INTEGER,
            ritmo_wpm INTEGER,
            clareza INTEGER,
            nota_geral INTEGER,
            total_vicios INTEGER,
            vicios_json TEXT,
            dicas_json TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def salvar_sessao(resultado: dict, origem: str = "texto"):
    conn = get_conn()
    cur = conn.execute(
        """
        INSERT INTO sessoes (
            criado_em, contexto, origem, transcricao, transcricao_marcada,
            duracao_segundos, quantidade_palavras, ritmo_wpm, clareza,
            nota_geral, total_vicios, vicios_json, dicas_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            datetime.utcnow().isoformat(),
            resultado.get("contexto"),
            origem,
            resultado.get("transcricao"),
            resultado.get("transcricao_marcada"),
            resultado.get("duracao_segundos"),
            resultado.get("quantidade_palavras"),
            resultado.get("ritmo_wpm"),
            resultado.get("clareza"),
            resultado.get("nota_geral"),
            resultado.get("total_vicios"),
            json.dumps(resultado.get("vicios", {}), ensure_ascii=False),
            json.dumps(resultado.get("dicas", []), ensure_ascii=False),
        ),
    )
    conn.commit()
    novo_id = cur.lastrowid
    conn.close()
    return novo_id


def _row_to_dict(row):
    d = dict(row)
    d["vicios"] = json.loads(d.pop("vicios_json") or "{}")
    d["dicas"] = json.loads(d.pop("dicas_json") or "[]")
    return d


def listar_sessoes(limite: int = 50):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM sessoes ORDER BY criado_em DESC LIMIT ?", (limite,)
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def obter_sessao(sessao_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM sessoes WHERE id = ?", (sessao_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def resumo_dashboard():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM sessoes ORDER BY criado_em DESC").fetchall()
    conn.close()
    sessoes = [_row_to_dict(r) for r in rows]

    if not sessoes:
        return {
            "total_sessoes": 0,
            "ritmo_medio": None,
            "clareza_media": None,
            "total_vicios": 0,
            "vicios_mais_falados": [],
            "serie_semanal": _serie_vazia(),
        }

    ritmos = [s["ritmo_wpm"] for s in sessoes if s["ritmo_wpm"]]
    clarezas = [s["clareza"] for s in sessoes if s["clareza"] is not None]
    total_vicios = sum(s["total_vicios"] or 0 for s in sessoes)

    contagem_vicios = {}
    for s in sessoes:
        for palavra, qtd in (s["vicios"] or {}).items():
            contagem_vicios[palavra] = contagem_vicios.get(palavra, 0) + qtd
    mais_falados = sorted(contagem_vicios.items(), key=lambda kv: kv[1], reverse=True)[:5]

    return {
        "total_sessoes": len(sessoes),
        "ritmo_medio": round(sum(ritmos) / len(ritmos)) if ritmos else None,
        "clareza_media": round(sum(clarezas) / len(clarezas)) if clarezas else None,
        "total_vicios": total_vicios,
        "vicios_mais_falados": [{"palavra": p, "quantidade": q} for p, q in mais_falados],
        "serie_semanal": _serie_semanal(sessoes),
    }


def _serie_vazia():
    dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    return [{"dia": d, "clareza": None, "ritmo_wpm": None} for d in dias]


def _serie_semanal(sessoes):
    """Agrupa as sessões dos últimos 7 dias por dia da semana, calculando
    a média de clareza e ritmo de cada dia (para o gráfico do dashboard)."""
    dias_semana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    hoje = datetime.utcnow().date()
    inicio_semana = hoje - timedelta(days=6)

    buckets = {d: {"clareza": [], "ritmo_wpm": []} for d in dias_semana}
    for s in sessoes:
        try:
            data = datetime.fromisoformat(s["criado_em"]).date()
        except (TypeError, ValueError):
            continue
        if data < inicio_semana:
            continue
        dia_label = dias_semana[data.weekday()]
        if s["clareza"] is not None:
            buckets[dia_label]["clareza"].append(s["clareza"])
        if s["ritmo_wpm"]:
            buckets[dia_label]["ritmo_wpm"].append(s["ritmo_wpm"])

    serie = []
    for d in dias_semana:
        c = buckets[d]["clareza"]
        r = buckets[d]["ritmo_wpm"]
        serie.append({
            "dia": d,
            "clareza": round(sum(c) / len(c)) if c else None,
            "ritmo_wpm": round(sum(r) / len(r)) if r else None,
        })
    return serie
