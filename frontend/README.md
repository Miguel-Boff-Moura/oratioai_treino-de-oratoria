# OratioAI — Frontend React (protótipo SPA)

Interface em React + Vite + Tailwind que consome a **API Flask** em `../backend`.
Faz parte do monorepo `oratioai_treino-de-oratoria/` (veja o [README raiz](../README.md)).

## Como rodar (dev)

Abra **dois terminais**, a partir da raiz do repositório:

### 1) Backend (Flask) — porta 5000

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 2) Frontend (Vite) — porta 5173

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**. O Vite faz proxy de todas as chamadas
`/api/*` para o Flask em `:5000` (config em `vite.config.js`), então não há
problema de CORS no desenvolvimento.

> Para reconhecimento de voz por microfone, use **Google Chrome** ou
> **Microsoft Edge** (Web Speech API).

## Integração com o backend

| Arquivo | Papel |
| --- | --- |
| `src/api.js` | Cliente HTTP: `analisarOratoria`, `listarSessoes`, `resumoDashboard` |
| `src/useSpeechRecognition.js` | Hook da Web Speech API (transcrição pt-BR + duração real da fala) |
| `vite.config.js` | Proxy `/api` → `http://localhost:5000` no dev |
| `.env.example` | `VITE_API_BASE` para apontar a API em produção (outro domínio) |

Endpoints consumidos:

- `POST /api/analisar` — analisa texto ou fala e salva a sessão
- `GET /api/sessoes?limite=N` — sessões recentes (dashboard)
- `GET /api/dashboard/resumo` — médias, vícios mais falados, série semanal

## Build de produção

```bash
npm run build     # gera dist/
npm run preview   # serve o dist/ localmente
```

Em produção, se o backend não estiver no mesmo domínio, crie um `.env` com
`VITE_API_BASE=https://seu-backend` antes do `npm run build`. O backend já
envia cabeçalhos CORS para `/api/*` (via `flask-cors`).
