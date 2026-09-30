# -*- coding: utf-8 -*-
"""
app.py — Aplicação Flask principal do OratioAI.

Serve tanto as páginas (Tela Inicial, Dashboard, Histórico) quanto a API
JSON usada pelo JavaScript do frontend. Rodar com:

    python app.py

e acessar http://localhost:5000 no navegador (Chrome/Edge recomendados,
por causa da Web Speech API usada na captura de fala).
"""
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS

import analysis
import db

app = Flask(__name__)
# Libera o consumo da API pelo frontend React (que roda em outra porta/origem,
# ex.: http://localhost:5173 no dev do Vite). As páginas Jinja continuam
# funcionando normalmente servidas pelo próprio Flask.
CORS(app, resources={r"/api/*": {"origins": "*"}})
db.init_db()


# ───────────────────────── Páginas ─────────────────────────

@app.route("/")
def pagina_inicial():
    return render_template("index.html")


@app.route("/dashboard")
def pagina_dashboard():
    return render_template("dashboard.html")


@app.route("/historico")
def pagina_historico():
    return render_template("historico.html")


# ───────────────────────── API ─────────────────────────

@app.route("/api/analisar", methods=["POST"])
def api_analisar():
    dados = request.get_json(silent=True) or {}
    texto = (dados.get("texto") or "").strip()
    contexto = dados.get("contexto") or "Geral"
    duracao_segundos = dados.get("duracao_segundos")
    origem = dados.get("origem", "texto")  # "texto" ou "fala"

    if not texto:
        return jsonify({"erro": "Envie o campo 'texto' com a transcrição."}), 400
    if len(texto.split()) < 5:
        return jsonify({"erro": "Escreva ou fale pelo menos 5 palavras para uma análise válida."}), 400

    resultado = analysis.analisar_transcricao(texto, duracao_segundos, contexto)
    sessao_id = db.salvar_sessao(resultado, origem=origem)
    resultado["id"] = sessao_id
    return jsonify(resultado)


@app.route("/api/sessoes", methods=["GET"])
def api_listar_sessoes():
    limite = request.args.get("limite", default=50, type=int)
    return jsonify(db.listar_sessoes(limite=limite))


@app.route("/api/sessoes/<int:sessao_id>", methods=["GET"])
def api_obter_sessao(sessao_id):
    sessao = db.obter_sessao(sessao_id)
    if not sessao:
        return jsonify({"erro": "Sessão não encontrada."}), 404
    return jsonify(sessao)


@app.route("/api/dashboard/resumo", methods=["GET"])
def api_dashboard_resumo():
    return jsonify(db.resumo_dashboard())


if __name__ == "__main__":
    app.run(debug=True, port=5000)
