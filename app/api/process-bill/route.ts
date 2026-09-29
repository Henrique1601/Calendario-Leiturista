import { NextRequest, NextResponse } from "next/server";
import { extrairDadosContaSabesp } from "@/lib/gemini-parser";
import { calcularDataEfetivaLeitura } from "@/lib/date-engine";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado. Por favor selecione faturas (PDF ou imagem)." },
        { status: 400 }
      );
    }

    const resultados = [];
    const erros = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");

        // 1. Extração Multimodal com IA
        const dadosExtraidos = await extrairDadosContaSabesp(base64, mimeType);

        // 2. Cálculo da Data Operacional com as Regras de Calendário
        const calculo = calcularDataEfetivaLeitura(dadosExtraidos.dataProximaLeitura);

        resultados.push({
          id: crypto.randomUUID(),
          nomeArquivo: file.name,
          nomeCondominio: dadosExtraidos.nomeCondominio,
          rgi: dadosExtraidos.rgi,
          mesReferencia: dadosExtraidos.mesReferencia || "Atual",
          tipoServico: dadosExtraidos.tipoServico || "AGUA",
          dataSabesp: calculo.dataOriginal,
          diaSemanaOriginal: calculo.diaSemanaOriginal,
          dataEfetiva: calculo.dataAjustada,
          diaSemanaEfetiva: calculo.diaSemanaAjustada,
          houveAjuste: calculo.houveAjuste,
          motivoAjuste: calculo.motivoAjuste,
          descricaoAjuste: calculo.descricao,
          status: "AGENDADO",
          observacao: dadosExtraidos.observacao || "",
        });
      } catch (err: any) {
        console.error(`Erro ao processar arquivo ${file.name}:`, err);
        erros.push({
          arquivo: file.name,
          erro: err?.message || "Falha ao processar arquivo",
        });
      }
    }

    if (resultados.length === 0 && erros.length > 0) {
      return NextResponse.json(
        { error: erros[0].erro, detalhes: erros },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      total: resultados.length,
      data: resultados,
      avisos: erros.length > 0 ? erros : undefined,
    });
  } catch (error: any) {
    console.error("Erro geral na rota process-bill:", error);
    return NextResponse.json(
      { error: "Falha interna ao processar faturas: " + (error?.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
