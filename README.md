# OratioAI — Treino de Oratória com IA

Ferramenta de Inteligência Artificial voltada ao treinamento de oratória, capaz de analisar a fala (ou o texto) do usuário e fornecer feedback automático para ajudar a melhorar sua comunicação oral. Trabalho de Conclusão de Curso do Curso Técnico em Informática da ETE Monteiro Lobato (CIMOL), Taquara/RS, 2026.

**Autores:** Lucas Martins Drescher e Miguel Alessandro Boff de Moura
**Orientador:** Prof. Diego Cândido de Souza

## O que este protótipo faz

- **Duas formas de entrada:** colar o texto de uma apresentação, ou falar diretamente no microfone (a fala é transcrita em tempo real no navegador via **Web Speech API**, sem custo e sem chave de API).
- **Análise de PLN/NLP** (backend Flask): tokenização do texto (via **NLTK**, com fallback automático em regex caso os dados do NLTK não estejam disponíveis), detecção de vícios de linguagem por frequência, cálculo de ritmo (palavras por minuto, a partir da duração real da fala) e de uma nota de clareza.
- **Feedback automático:** dicas geradas por regras a partir das métricas calculadas (nenhuma dependência de serviço pago nesta primeira versão).
- **Persistência:** cada sessão analisada é salva em SQLite, alimentando o **Dashboard** (ritmo médio, clareza média, vícios mais falados, gráfico de desempenho dos últimos 7 dias) e o **Histórico** completo de sessões.

## Arquitetura

Monorepo com duas partes independentes: a **API Flask** (`backend/`) e a
**interface React + Vite** (`frontend/`), que consome essa API.

```
oratioai_treino-de-oratoria/
├── README.md
├── .gitignore
├── backend/                    # API Flask + PLN
│   ├── app.py                  # rotas Flask (API JSON + páginas Jinja legadas)
│   ├── analysis.py             # núcleo de PLN: tokenização, vícios, métricas, dicas
│   ├── db.py                   # persistência em SQLite (sem ORM)
│   ├── requirements.txt
│   ├── templates/              # páginas HTML antigas (Jinja2) — ainda servidas em /
│   └── static/css|js/          # assets das páginas antigas
└── frontend/                   # SPA React (interface atual)
    ├── index.html
    ├── package.json
    ├── vite.config.js          # proxy /api → http://localhost:5000 no dev
    ├── .env.example            # VITE_API_BASE para produção
    └── src/
        ├── OratioAI.jsx        # componente principal (todas as telas)
        ├── api.js              # cliente HTTP da API Flask
        ├── useSpeechRecognition.js  # hook da Web Speech API (transcrição + duração)
        ├── main.jsx
        └── index.css
```

O backend expõe a API em `/api/analisar`, `/api/sessoes` e
`/api/dashboard/resumo` (com CORS liberado via `flask-cors`) e continua
servindo as páginas Jinja antigas em `/`, `/dashboard` e `/historico`.
A interface atual do TCC é a SPA em `frontend/`.

### Sobre o motor de reconhecimento de voz (ASR)

Esta versão usa a **Web Speech API** do navegador (gratuita, sem chave de API, funciona no Chrome e no Edge) para transcrever a fala em tempo real no frontend. A arquitetura foi organizada para permitir a troca futura pelo **Whisper da OpenAI** (mais preciso e citado no referencial teórico do TCC): bastaria substituir o envio da transcrição pronta por um envio de áudio gravado para um novo endpoint no backend (ex.: `/api/transcrever`) que chamasse a API do Whisper antes de seguir para `/api/analisar`. Nenhuma mudança seria necessária no frontend além de trocar a fonte da transcrição.

## Como rodar

Pré-requisitos: **Python 3.9+** e **Node.js 18+**. Abra **dois terminais**.

### 1) Backend (Flask) — porta 5000

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Na primeira execução, o backend tenta baixar os dados de tokenização do NLTK (`punkt_tab`). Se não houver internet disponível no momento (por exemplo, durante uma apresentação offline na escola), o sistema usa automaticamente um tokenizador via regex, sem travar o funcionamento.

O banco de dados SQLite (`backend/oratioai.db`) é criado automaticamente na primeira execução e não é versionado no Git (veja `.gitignore`).

### 2) Frontend (React + Vite) — porta 5173

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173** (recomendado: Google Chrome ou Microsoft Edge, para o modo de gravação por microfone funcionar). O Vite faz proxy de `/api/*` para o Flask em `:5000`, então não há problema de CORS no desenvolvimento. Detalhes em [`frontend/README.md`](frontend/README.md).

## Próximos passos (roadmap do TCC)

1. Testes de usabilidade com alunos voluntários da ETE Monteiro Lobato (questionário estruturado de 10 perguntas).
2. Avaliar a troca do motor de ASR para o Whisper (OpenAI) — precisão vs. custo por minuto de áudio.
3. Explorar o SpaCy para análise sintática mais avançada (além da tokenização básica atual via NLTK).
4. Refinar a interatividade do gráfico de desempenho e adicionar mais destaques visuais na transcrição.
