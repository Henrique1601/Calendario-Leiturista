# ChronoMeter · Painel Inteligente de Agendamento de Leituras (Sabesp & Gás)

Sistema operacional web moderno para automação da ingestão de faturas (PDF e fotos) de concessionárias (Sabesp e distribuidoras de gás), com aplicação determinística de regras de remanejamento de datas operacionais e exportação direta para planilhas Excel (.xlsx).

---

## 🎯 Objetivo

Eliminar o preenchimento manual de planilhas mensais de controle de faturas, identificando automaticamente a previsão da Sabesp e convertendo-a na data de leitura real de acordo com as regras de operação dos leituristas.

---

## ⚙️ Regras de Negócio e Algoritmo de Datas

O motor de cálculo (`lib/date-engine.ts`) aplica a seguinte precedência determinística:

1. **Sábado** ➔ Antecipa para a **Sexta-feira** imediatamente anterior.
   * Se a sexta-feira coincidir com feriado, recua sucessivamente para o dia útil anterior (Quinta-feira).
2. **Domingo** ➔ Posterga para a **Segunda-feira** imediatamente posterior.
   * Se a segunda-feira coincidir com feriado, avança para o próximo dia útil (Terça-feira).
3. **Feriados em Dias Úteis (Segunda a Sexta)** ➔ Posterga para o **próximo dia útil**.
   * Contempla feriados nacionais, estaduais e municipais de São Paulo, além de feriados móveis calculados dinamicamente via algoritmo astronômico da Páscoa (Carnaval, Sexta-Feira Santa e Corpus Christi).

---

## 🛠️ Stack Tecnológica

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) com design system escuro refinado
- **Visão Computacional & IA**: [Google Gemini Flash (`@google/genai`)](https://github.com/google-gemini/dep-genai-js) com JSON Schema estruturado
- **Planilhas**: [SheetJS (xlsx)](https://docs.sheetjs.com/) para geração instantânea de arquivos Excel
- **Ícones**: [Lucide React](https://lucide.dev/)

---

## 🚀 Como Executar

### 1. Clonar e Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local` e insira sua chave da API do Google Gemini:
```bash
cp .env.example .env.local
```
Edite o arquivo `.env.local`:
```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio_aqui
GEMINI_MODEL=gemini-2.5-flash
```

> **Dica**: Você pode obter uma chave gratuita no [Google AI Studio](https://aistudio.google.com/).

### 3. Rodar em Modo Desenvolvimento
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### 4. Rodar os Testes Unitários do Motor de Regras
```bash
npm test
```

---

## 📂 Estrutura do Projeto

```text
splendid-volta/
├── app/
│   ├── api/
│   │   └── process-bill/
│   │       └── route.ts         # Endpoint de upload e OCR com Gemini
│   ├── globals.css              # Estilos globais Tailwind
│   ├── layout.tsx               # Layout raiz
│   └── page.tsx                 # Painel interativo: Upload + Calendário + Tabela + Excel
├── lib/
│   ├── date-engine.ts           # Motor determinístico de cálculo de feriados e datas
│   └── gemini-parser.ts         # Extrator multimodal com SDK oficial @google/genai
├── tests/
│   └── date-engine.test.mjs     # Testes automatizados das regras de sábado/domingo/feriado
├── .env.example                 # Modelo de variáveis de ambiente
├── .geminirules                 # Regras ativas do Skills Orchestrator
├── package.json
├── tailwind.config.js
└── tsconfig.json
```
