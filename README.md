# OratioAI: Treino de Oratória com IA

Protótipo front-end de uma ferramenta que ajuda estudantes a treinar oratória. A pessoa fala no microfone (ou cola o texto da apresentação) e recebe nota, métricas de clareza e ritmo, os vícios de linguagem destacados e dicas para melhorar.

Projeto de pesquisa do Curso Técnico em Informática da ETE Monteiro Lobato (CIMOL), Taquara/RS, 2026.

**Autores:** Lucas Martins Drescher e Miguel Alessandro Boff de Moura
**Orientador:** Prof. Diego Cândido de Souza

- **Site no ar:** _[colar aqui o link do Vercel]_
- **Repositório:** https://github.com/Miguel-Boff-Moura/oratioai_treino-de-oratoria

## Checklist dos critérios de avaliação

| # | Critério | Atende? | Por quê |
|---|----------|:------:|---------|
| 1 | **Deploy e funcionamento** | ✅ | O site é estático (Vite + React) e é publicado no Vercel a partir da pasta `frontend/`. Não depende de servidor nem banco de dados, então não tem tela em branco por falta de backend. As fontes ficam dentro do projeto (pacotes `@fontsource`), sem CDN externa. |
| 2 | **Interatividade sem recarregamento** | ✅ | Todos os formulários (analisar texto, analisar fala, criar e editar chat) usam `onSubmit` com `event.preventDefault()`. Criar, editar e apagar chats e apagar sessões acontece na hora, sem recarregar a página. Também tem o botão "Desfazer" depois de apagar. |
| 3 | **Persistência de dados** | ✅ | Sessões de treino, chats, contexto escolhido e o rascunho do texto ficam no `localStorage` (arquivo `src/armazenamento.js`). Depois de apertar F5 tudo continua na tela, inclusive a tela aberta (a navegação usa `#/rota` na URL). |
| 4 | **Estabilidade do console** | ✅ | Testado com o DevTools aberto passando por todas as telas: nenhum erro em vermelho. As leituras do `localStorage` e as chamadas do microfone ficam dentro de `try/catch`, e os erros do reconhecimento de voz viram avisos na tela. |
| 5 | **Responsividade e acessibilidade** | ✅ | Layout com Tailwind adaptado para celular (menu hambúrguer, cartões em uma coluna, sem rolagem horizontal em 375 px). Usa tags semânticas (`header`, `nav`, `main`, `footer`, `article`, `fieldset`), `label` em todos os campos, `aria-label` nos botões só com ícone, `aria-live` nos avisos, link "Pular para o conteúdo", tabela escondida com os dados do gráfico para leitores de tela e respeito ao "reduzir movimento" do sistema. |

## Como funciona

1. **Transcrição da fala:** usa a Web Speech API do navegador (`SpeechRecognition`), em português, em tempo real. Funciona no Google Chrome e no Microsoft Edge (`src/useSpeechRecognition.js`).
2. **Análise simulada da IA:** nesta versão, nenhuma IA nem banco de dados está ligado ao projeto. O arquivo `src/simulador.js` imita o que o modelo faria: tokeniza o texto, conta vícios de linguagem ("né", "tipo", "então"...), calcula o ritmo em palavras por minuto (só na fala, com a duração real), dá uma nota de clareza e monta as dicas. Uma animação mostra as etapas da "IA" enquanto isso.
3. **Dashboard:** cartões com ritmo médio, clareza e vícios, gráfico dos últimos 7 dias (dias sem treino aparecem como estimativa; sem nenhuma sessão, aparece um gráfico de exemplo igual ao do protótipo no Figma) e lista de sessões recentes.
4. **Histórico de chats:** anotações com criar, editar e apagar.

## Estrutura

```
oratioai_treino-de-oratoria/
├── README.md
├── vercel.json          # o Vercel instala e compila a pasta frontend/
├── package.json         # atalhos: npm run dev / npm run build
├── index.html, assets/  # cópia do site compilado (GitHub Pages / Live Server)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── public/favicon.svg
    └── src/
        ├── main.jsx
        ├── OratioAI.jsx               # telas e navegação
        ├── simulador.js               # análise simulada (o que a IA faria)
        ├── armazenamento.js           # localStorage
        ├── dados.js                   # constantes e dados do dashboard
        ├── useSpeechRecognition.js    # transcrição da fala
        ├── index.css                  # estilos e animações
        └── components/
            ├── AnaliseAnimada.jsx     # animação "IA analisando"
            ├── GraficoDesempenho.jsx  # gráfico em SVG
            └── PainelResultado.jsx    # resultado da análise
```

## Como rodar

Pré-requisito: **Node.js 18 ou mais novo**.

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:5173** no Chrome ou no Edge (para o microfone funcionar).

Para gerar a versão de produção: `npm run build` (dentro de `frontend/`). O resultado vai para `frontend/dist`.

## Próximos passos

1. Fazer os testes com pelo menos 5 usuários reais e montar a Matriz de Feedback.
2. Trocar a análise simulada por um modelo de IA de verdade (por exemplo, o Whisper para transcrição e bibliotecas de PLN como NLTK ou spaCy no servidor).
3. Guardar as sessões em um banco de dados com login, para o histórico funcionar em qualquer aparelho.
