import { GoogleGenAI, Type } from "@google/genai";

export interface DadosFaturaExtraidos {
  nomeCondominio: string;
  rgi: string;
  mesReferencia: string;
  dataProximaLeitura: string; // YYYY-MM-DD
  tipoServico: "AGUA" | "GAS" | "OUTRO";
  observacao?: string;
}

export async function extrairDadosContaSabesp(
  base64Data: string,
  mimeType: string
): Promise<DadosFaturaExtraidos> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "sua_chave_do_google_ai_studio_aqui") {
    throw new Error(
      "GEMINI_API_KEY não configurada no arquivo .env.local. Obtenha sua chave gratuita em https://aistudio.google.com/ e configure-a."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  const prompt = `
Você é um auditor especialista em faturas de concessionárias de saneamento e gás (especialmente SABESP e Comgás).
Analise a fatura em anexo (imagem ou documento PDF) e extraia com precisão absoluta:
1. Nome do Condomínio, Cliente ou Razão Social (geralmente no topo ou cabeçalho da fatura).
2. RGI ou Código do Fornecimento / Instalação / Matrícula.
3. Mês e Ano de Referência da fatura (ex: "10/2026").
4. Campo "Previsão da próxima leitura" ou "Próxima leitura". Converta a data encontrada estritamente para o formato YYYY-MM-DD.
5. Tipo de Serviço (AGUA ou GAS).
`;

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
      prompt,
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          nomeCondominio: {
            type: Type.STRING,
            description: "Nome do condomínio, cliente ou razão social impresso na conta",
          },
          rgi: {
            type: Type.STRING,
            description: "Número do RGI ou código de fornecimento da conta",
          },
          mesReferencia: {
            type: Type.STRING,
            description: "Mês/Ano de referência (ex: '10/2026')",
          },
          dataProximaLeitura: {
            type: Type.STRING,
            description: "Data da previsão da próxima leitura no formato YYYY-MM-DD",
          },
          tipoServico: {
            type: Type.STRING,
            description: "Tipo de medição: 'AGUA' ou 'GAS'",
          },
          observacao: {
            type: Type.STRING,
            description: "Anotação sobre nitidez ou observação relevante da fatura",
          },
        },
        required: ["nomeCondominio", "rgi", "dataProximaLeitura"],
      },
      temperature: 0.1,
    },
  });

  const rawJson = response.text || "{}";
  return JSON.parse(rawJson) as DadosFaturaExtraidos;
}
