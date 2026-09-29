export interface ResultadoCalculoLeitura {
  dataOriginal: string;      // YYYY-MM-DD
  dataAjustada: string;      // YYYY-MM-DD
  diaSemanaOriginal: string;
  diaSemanaAjustada: string;
  houveAjuste: boolean;
  motivoAjuste: 'SABADO_PARA_SEXTA' | 'DOMINGO_PARA_SEGUNDA' | 'FERIADO' | 'SEM_AJUSTE';
  descricao: string;
}

/**
 * Calcula a data da Páscoa (algoritmo anônimo de Meeus/Jones/Butcher)
 */
export function calcularPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

export function formatarIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatarDataBr(isoStr: string): string {
  if (!isoStr || !isoStr.includes('-')) return isoStr;
  const [ano, mes, dia] = isoStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Retorna um Set de datas (YYYY-MM-DD) com feriados nacionais e de SP (fixos e móveis)
 */
export function obterFeriadosSP(ano: number): Set<string> {
  const feriados = new Set<string>();
  const add = (d: Date) => {
    feriados.add(formatarIso(d));
  };

  // 1. Feriados Fixos Nacionais e São Paulo (Capital e Estadual)
  add(new Date(ano, 0, 1));   // Confraternização Universal (01/01)
  add(new Date(ano, 0, 25));  // Aniversário de São Paulo (25/01)
  add(new Date(ano, 3, 21));  // Tiradentes (21/04)
  add(new Date(ano, 4, 1));   // Dia do Trabalho (01/05)
  add(new Date(ano, 6, 9));   // Revolução Constitucionalista (09/07)
  add(new Date(ano, 8, 7));   // Independência do Brasil (07/09)
  add(new Date(ano, 9, 12));  // Nossa Senhora Aparecida (12/10)
  add(new Date(ano, 10, 2));  // Finados (02/11)
  add(new Date(ano, 10, 15)); // Proclamação da República (15/11)
  add(new Date(ano, 10, 20)); // Dia da Consciência Negra (20/11)
  add(new Date(ano, 11, 25)); // Natal (25/12)

  // 2. Feriados Móveis (derivados da Páscoa)
  const pascoa = calcularPascoa(ano);

  // Segunda e Terça de Carnaval
  const segCarnaval = new Date(pascoa);
  segCarnaval.setDate(pascoa.getDate() - 48);
  add(segCarnaval);

  const tercaCarnaval = new Date(pascoa);
  tercaCarnaval.setDate(pascoa.getDate() - 47);
  add(tercaCarnaval);

  // Sexta-feira Santa (Paixão de Cristo)
  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  add(sextaSanta);

  // Corpus Christi (60 dias após a Páscoa)
  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);
  add(corpusChristi);

  return feriados;
}

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/**
 * Função Central: Aplica as regras de negócio:
 * 1. Sábado -> Antecipa para Sexta (se sexta for feriado, volta para dia útil anterior)
 * 2. Domingo -> Posterga para Segunda (se segunda for feriado, avança para próximo dia útil)
 * 3. Feriado em dia de semana -> Posterga para o próximo dia útil
 */
export function calcularDataEfetivaLeitura(dataSabespStr: string): ResultadoCalculoLeitura {
  const [ano, mes, dia] = dataSabespStr.split('-').map(Number);
  const feriados = obterFeriadosSP(ano);

  let data = new Date(ano, mes - 1, dia);
  const diaSemanaOriginalNum = data.getDay();
  const diaSemanaOriginal = DIAS_SEMANA[diaSemanaOriginalNum];

  let motivo: ResultadoCalculoLeitura['motivoAjuste'] = 'SEM_AJUSTE';
  let descricao = 'Data mantida na previsão original da Sabesp.';

  // Regra 1: Sábado -> Antecipa para Sexta
  if (diaSemanaOriginalNum === 6) {
    data.setDate(data.getDate() - 1);
    motivo = 'SABADO_PARA_SEXTA';
    descricao = 'Caiu no Sábado: antecipado para Sexta-feira.';

    // Se a sexta for feriado ou cair no fim de semana, retrocede para o dia útil anterior
    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() - 1);
      descricao = 'Caiu no Sábado e Sexta era feriado: antecipado para o dia útil anterior.';
    }
  } 
  // Regra 2: Domingo -> Posterga para Segunda
  else if (diaSemanaOriginalNum === 0) {
    data.setDate(data.getDate() + 1);
    motivo = 'DOMINGO_PARA_SEGUNDA';
    descricao = 'Caiu no Domingo: postergado para Segunda-feira.';

    // Se a segunda for feriado ou cair no fim de semana, avança para o próximo dia útil
    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() + 1);
      descricao = 'Caiu no Domingo e Segunda era feriado: postergado para o próximo dia útil.';
    }
  } 
  // Regra 3: Dia útil que coincide com Feriado -> Próximo dia útil
  else if (feriados.has(dataSabespStr)) {
    motivo = 'FERIADO';
    descricao = 'Data oficial coincidiu com feriado: postergado para o próximo dia útil.';
    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() + 1);
    }
  }

  const dataAjustadaIso = formatarIso(data);
  const diaSemanaAjustada = DIAS_SEMANA[data.getDay()];

  return {
    dataOriginal: dataSabespStr,
    dataAjustada: dataAjustadaIso,
    diaSemanaOriginal,
    diaSemanaAjustada,
    houveAjuste: dataSabespStr !== dataAjustadaIso,
    motivoAjuste: motivo,
    descricao
  };
}
