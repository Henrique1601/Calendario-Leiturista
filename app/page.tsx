"use client";

import React, { useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Droplet, 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  PlusCircle,
  Sparkles,
  Info,
  Trash2
} from "lucide-react";
import { formatarDataBr, calcularDataEfetivaLeitura } from "@/lib/date-engine";
import * as XLSX from "xlsx";

export interface ItemLeitura {
  id: string;
  nomeArquivo: string;
  nomeCondominio: string;
  rgi: string;
  mesReferencia: string;
  tipoServico: "AGUA" | "GAS" | "OUTRO";
  dataSabesp: string;
  diaSemanaOriginal: string;
  dataEfetiva: string;
  diaSemanaEfetiva: string;
  houveAjuste: boolean;
  motivoAjuste: string;
  descricaoAjuste: string;
  status: "AGENDADO" | "CONCLUIDO";
}

const EXEMPLOS_DEMO: ItemLeitura[] = [
  {
    id: "demo-1",
    nomeArquivo: "fatura-cond-vista-verde.pdf",
    nomeCondominio: "Condomínio Vista Verde",
    rgi: "1459201-8",
    mesReferencia: "10/2026",
    tipoServico: "AGUA",
    dataSabesp: "2026-10-17", // Sábado
    diaSemanaOriginal: "Sábado",
    dataEfetiva: "2026-10-16", // Sexta
    diaSemanaEfetiva: "Sexta-feira",
    houveAjuste: true,
    motivoAjuste: "SABADO_PARA_SEXTA",
    descricaoAjuste: "Caiu no Sábado: antecipado para Sexta-feira.",
    status: "AGENDADO"
  },
  {
    id: "demo-2",
    nomeArquivo: "fatura-solar-bosque.jpg",
    nomeCondominio: "Edifício Solar do Bosque",
    rgi: "0984512-3",
    mesReferencia: "10/2026",
    tipoServico: "GAS",
    dataSabesp: "2026-10-18", // Domingo
    diaSemanaOriginal: "Domingo",
    dataEfetiva: "2026-10-19", // Segunda
    diaSemanaEfetiva: "Segunda-feira",
    houveAjuste: true,
    motivoAjuste: "DOMINGO_PARA_SEGUNDA",
    descricaoAjuste: "Caiu no Domingo: postergado para Segunda-feira.",
    status: "AGENDADO"
  },
  {
    id: "demo-3",
    nomeArquivo: "fatura-spazio-roma.pdf",
    nomeCondominio: "Spazio Di Roma",
    rgi: "3321456-1",
    mesReferencia: "10/2026",
    tipoServico: "AGUA",
    dataSabesp: "2026-10-12", // Feriado Nossa Senhora Aparecida (Segunda)
    diaSemanaOriginal: "Segunda-feira",
    dataEfetiva: "2026-10-13", // Terça-feira útil
    diaSemanaEfetiva: "Terça-feira",
    houveAjuste: true,
    motivoAjuste: "FERIADO",
    descricaoAjuste: "Data oficial coincidiu com feriado: postergado para o próximo dia útil.",
    status: "AGENDADO"
  },
  {
    id: "demo-4",
    nomeArquivo: "fatura-parque-ibirapuera.pdf",
    nomeCondominio: "Residencial Jardins",
    rgi: "5542109-0",
    mesReferencia: "10/2026",
    tipoServico: "AGUA",
    dataSabesp: "2026-10-21", // Quarta-feira normal
    diaSemanaOriginal: "Quarta-feira",
    dataEfetiva: "2026-10-21",
    diaSemanaEfetiva: "Quarta-feira",
    houveAjuste: false,
    motivoAjuste: "SEM_AJUSTE",
    descricaoAjuste: "Data mantida na previsão original da Sabesp.",
    status: "AGENDADO"
  }
];

export default function DashboardChronoMeter() {
  const [leituras, setLeituras] = useState<ItemLeitura[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 9, 1)); // Outubro 2026 padrão
  const [visualizacao, setVisualizacao] = useState<"calendario" | "tabela">("calendario");

  // Form manual rápido
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualNome, setManualNome] = useState("");
  const [manualRgi, setManualRgi] = useState("");
  const [manualData, setManualData] = useState("");
  const [manualServico, setManualServico] = useState<"AGUA" | "GAS">("AGUA");

  // Upload em Lote
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const response = await fetch("/api/process-bill", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setLeituras((prev) => [...data.data, ...prev]);
      } else {
        setErrorMessage(data.error || "Erro no processamento das faturas.");
      }
    } catch (err: any) {
      setErrorMessage("Falha de comunicação com o servidor: " + (err?.message || "Erro de rede"));
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }

  // Adicionar Leitura Manual com aplicação imediata do motor de regras
  function handleAdicionarManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualNome || !manualData) return;

    const calculo = calcularDataEfetivaLeitura(manualData);
    const novoItem: ItemLeitura = {
      id: crypto.randomUUID(),
      nomeArquivo: "Entrada Manual",
      nomeCondominio: manualNome,
      rgi: manualRgi || "N/A",
      mesReferencia: `${String(new Date(manualData).getMonth() + 1).padStart(2, "0")}/${new Date(manualData).getFullYear()}`,
      tipoServico: manualServico,
      dataSabesp: calculo.dataOriginal,
      diaSemanaOriginal: calculo.diaSemanaOriginal,
      dataEfetiva: calculo.dataAjustada,
      diaSemanaEfetiva: calculo.diaSemanaAjustada,
      houveAjuste: calculo.houveAjuste,
      motivoAjuste: calculo.motivoAjuste,
      descricaoAjuste: calculo.descricao,
      status: "AGENDADO"
    };

    setLeituras((prev) => [novoItem, ...prev]);
    setManualNome("");
    setManualRgi("");
    setManualData("");
    setShowManualModal(false);
  }

  // Exportador de Planilha Excel
  function exportarParaExcel() {
    if (leituras.length === 0) {
      alert("Nenhuma leitura agendada para exportar!");
      return;
    }

    const dadosPlanilha = leituras.map((item) => ({
      "Condomínio / Cliente": item.nomeCondominio,
      "RGI / Fornecimento": item.rgi,
      "Serviço": item.tipoServico,
      "Mês Ref.": item.mesReferencia,
      "Data Sabesp": formatarDataBr(item.dataSabesp),
      "Dia Original": item.diaSemanaOriginal,
      "Data Efetiva da Leitura": formatarDataBr(item.dataEfetiva),
      "Dia Efetivo": item.diaSemanaEfetiva,
      "Houve Ajuste?": item.houveAjuste ? "SIM" : "NÃO",
      "Regra Aplicada": item.descricaoAjuste,
      "Status Operacional": item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calendário de Leituras");
    
    const mesNum = currentMonth.getMonth() + 1;
    const anoNum = currentMonth.getFullYear();
    XLSX.writeFile(workbook, `Cronograma_Leituras_Sabesp_${mesNum}_${anoNum}.xlsx`);
  }

  // Estatísticas Rápidas
  const totalAjustadas = useMemo(() => leituras.filter(l => l.houveAjuste).length, [leituras]);

  // Cálculos do Calendário Mensal
  const { diasCalendario, primeiroDiaSemana } = useMemo(() => {
    const ano = currentMonth.getFullYear();
    const mes = currentMonth.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    return {
      diasCalendario: Array.from({ length: ultimoDia.getDate() }, (_, i) => i + 1),
      primeiroDiaSemana: primeiroDia.getDay(),
    };
  }, [currentMonth]);

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shadow-inner">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  ChronoMeter
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    Sabesp & Gás
                  </span>
                </h1>
                <p className="text-sm text-slate-400">
                  Painel de agendamento automático com regras de finais de semana e feriados de SP.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition"
            >
              <PlusCircle className="w-4 h-4 text-blue-400" />
              Entrada Manual
            </button>

            {leituras.length === 0 && (
              <button
                onClick={() => setLeituras(EXEMPLOS_DEMO)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Carregar Demonstração
              </button>
            )}

            {leituras.length > 0 && (
              <button
                onClick={() => setLeituras([])}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 text-red-300 rounded-lg text-xs font-medium transition"
                title="Limpar todas as leituras"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}

            <button
              onClick={exportarParaExcel}
              disabled={leituras.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-950/50 transition cursor-pointer disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel (.xlsx)
            </button>
          </div>
        </header>

        {/* Mensagem de Erro / Aviso se houver */}
        {errorMessage && (
          <div className="bg-red-950/50 border border-red-700/60 text-red-200 px-4 py-3 rounded-xl flex items-start gap-3 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-red-300">Atenção no processamento:</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Cards de Métricas Operacionais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total de Faturas Ingeridas</span>
            <div className="text-3xl font-extrabold text-white mt-1.5">{leituras.length}</div>
            <p className="text-xs text-slate-500 mt-1">Registros carregados no painel</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Datas Ajustadas pelo Algoritmo</span>
            <div className="text-3xl font-extrabold text-amber-400 mt-1.5 flex items-center gap-2">
              {totalAjustadas}
              <span className="text-xs font-normal text-slate-400">
                ({leituras.length > 0 ? Math.round((totalAjustadas / leituras.length) * 100) : 0}%)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Sábados, Domingos ou Feriados remanejados</p>
          </div>

          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Regras Determinísticas Ativas</span>
            <div className="text-xs text-slate-300 mt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span><b>Sábado</b> ➔ Antecipa para Sexta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span><b>Domingo</b> ➔ Posterga para Segunda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span><b>Feriado</b> ➔ Próximo dia útil</span>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Drop & Upload */}
        <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-900/40 rounded-2xl p-8 text-center transition">
          <input
            type="file"
            id="fileInput"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="hidden"
          />
          <label htmlFor="fileInput" className="cursor-pointer flex flex-col items-center justify-center">
            <div className="p-4 bg-slate-800/80 text-blue-400 border border-slate-700/60 rounded-2xl mb-3 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>
            <span className="text-base font-semibold text-white">
              {isProcessing ? "Processando faturas com Gemini Flash..." : "Arraste faturas da Sabesp (PDF ou Foto) ou clique aqui"}
            </span>
            <span className="text-xs text-slate-400 mt-1 max-w-md">
              Extração inteligente de Condomínio, RGI e Data de Leitura com aplicação automática das regras de remanejamento.
            </span>
          </label>
        </div>

        {/* Alternador de Visualização & Navegação do Mês */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setVisualizacao("calendario")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                visualizacao === "calendario" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Visão Calendário
            </button>
            <button
              onClick={() => setVisualizacao("tabela")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                visualizacao === "tabela" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Visão Tabela Operacional ({leituras.length})
            </button>
          </div>

          {visualizacao === "calendario" && (
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold capitalize text-white min-w-[130px] text-center">
                {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-300 transition"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Visualização 1: Calendário em Grade */}
        {visualizacao === "calendario" ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 pb-3 border-b border-slate-800">
              <span className="text-red-400/80">DOM</span>
              <span>SEG</span>
              <span>TER</span>
              <span>QUA</span>
              <span>QUI</span>
              <span>SEX</span>
              <span className="text-amber-400/80">SÁB</span>
            </div>

            <div className="grid grid-cols-7 gap-2 mt-2">
              {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[100px] bg-slate-950/30 rounded-xl border border-slate-900/30" />
              ))}

              {diasCalendario.map((dia) => {
                const mes = String(currentMonth.getMonth() + 1).padStart(2, "0");
                const diaStr = String(dia).padStart(2, "0");
                const dataIso = `${currentMonth.getFullYear()}-${mes}-${diaStr}`;
                const leiturasDoDia = leituras.filter((l) => l.dataEfetiva === dataIso);

                return (
                  <div
                    key={`dia-${dia}`}
                    className={`min-h-[100px] sm:min-h-[110px] bg-slate-900/80 border rounded-xl p-2 flex flex-col justify-between transition ${
                      leiturasDoDia.length > 0 
                        ? "border-blue-500/40 bg-blue-950/10 shadow-sm" 
                        : "border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">{dia}</span>
                      {leiturasDoDia.length > 0 && (
                        <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold rounded-full">
                          {leiturasDoDia.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-y-auto max-h-[85px]">
                      {leiturasDoDia.map((item) => (
                        <div
                          key={item.id}
                          title={`${item.nomeCondominio} | ${item.descricaoAjuste}`}
                          className={`text-[10px] p-1.5 rounded-lg border truncate flex items-center justify-between ${
                            item.houveAjuste
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                          }`}
                        >
                          <span className="truncate">{item.nomeCondominio}</span>
                          {item.tipoServico === "GAS" ? (
                            <Flame className="w-2.5 h-2.5 text-orange-400 shrink-0 ml-1" />
                          ) : (
                            <Droplet className="w-2.5 h-2.5 text-cyan-400 shrink-0 ml-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Visualização 2: Tabela Operacional */
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Condomínio / Cliente</th>
                    <th className="py-3 px-4">RGI</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Data Sabesp Original</th>
                    <th className="py-3 px-4 text-emerald-400 font-bold">Data Efetiva da Leitura</th>
                    <th className="py-3 px-4">Regra Aplicada</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {leituras.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500">
                        Nenhuma leitura adicionada ainda. Arraste faturas acima ou use a demonstração.
                      </td>
                    </tr>
                  ) : (
                    leituras.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-medium text-white">{item.nomeCondominio}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">{item.rgi}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60">
                            {item.tipoServico === "GAS" ? <Flame className="w-3 h-3 text-orange-400" /> : <Droplet className="w-3 h-3 text-blue-400" />}
                            {item.tipoServico}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {formatarDataBr(item.dataSabesp)} ({item.diaSemanaOriginal})
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {formatarDataBr(item.dataEfetiva)} ({item.diaSemanaEfetiva})
                        </td>
                        <td className="py-3 px-4">
                          {item.houveAjuste ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {item.descricaoAjuste}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Data mantida</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Agendado
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de Entrada Manual */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Adicionar Leitura Manual</h3>
              <p className="text-xs text-slate-400">
                O motor aplicará as regras de sábado, domingo e feriados de SP imediatamente ao salvar.
              </p>

              <form onSubmit={handleAdicionarManual} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium">Nome do Condomínio / Cliente</label>
                  <input
                    type="text"
                    required
                    value={manualNome}
                    onChange={(e) => setManualNome(e.target.value)}
                    placeholder="Ex: Condomínio Solar das Flores"
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium">RGI / Fornecimento</label>
                    <input
                      type="text"
                      value={manualRgi}
                      onChange={(e) => setManualRgi(e.target.value)}
                      placeholder="Ex: 1234567-8"
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium">Tipo</label>
                    <select
                      value={manualServico}
                      onChange={(e) => setManualServico(e.target.value as "AGUA" | "GAS")}
                      className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="AGUA">Água (Sabesp)</option>
                      <option value="GAS">Gás</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium">Data Prevista da Sabesp</label>
                  <input
                    type="date"
                    required
                    value={manualData}
                    onChange={(e) => setManualData(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                  >
                    Salvar e Calcular
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
