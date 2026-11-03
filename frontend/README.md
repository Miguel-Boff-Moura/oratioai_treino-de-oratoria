# OratioAI · Frontend

Interface em React + Vite + Tailwind. É o site inteiro: não existe backend nem banco de dados nesta versão. Veja o [README principal](../README.md) para o checklist dos critérios.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera a pasta dist/
npm run preview  # testa o dist/ localmente
```

| Arquivo | O que faz |
| --- | --- |
| `src/OratioAI.jsx` | Telas, navegação por `#/rota` e formulários (todos com `preventDefault()`) |
| `src/simulador.js` | Análise simulada: tokenização, vícios, ritmo, clareza, nota e dicas |
| `src/armazenamento.js` | Leitura e gravação no `localStorage` |
| `src/useSpeechRecognition.js` | Transcrição da fala com a Web Speech API (Chrome e Edge) |
| `src/dados.js` | Constantes e montagem dos números do dashboard |
| `src/components/` | Gráfico, animação da "IA analisando" e painel de resultado |
