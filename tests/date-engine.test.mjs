import test from "node:test";
import assert from "node:assert/strict";

// Implementação espelho para teste isolado em ES Module rápido
function formatarIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcularPascoa(ano) {
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

function obterFeriadosSP(ano) {
  const feriados = new Set();
  const add = (d) => feriados.add(formatarIso(d));

  add(new Date(ano, 0, 1));
  add(new Date(ano, 0, 25));
  add(new Date(ano, 3, 21));
  add(new Date(ano, 4, 1));
  add(new Date(ano, 6, 9));
  add(new Date(ano, 8, 7));
  add(new Date(ano, 9, 12));
  add(new Date(ano, 10, 2));
  add(new Date(ano, 10, 15));
  add(new Date(ano, 10, 20));
  add(new Date(ano, 11, 25));

  const pascoa = calcularPascoa(ano);
  const segCarnaval = new Date(pascoa);
  segCarnaval.setDate(pascoa.getDate() - 48);
  add(segCarnaval);

  const tercaCarnaval = new Date(pascoa);
  tercaCarnaval.setDate(pascoa.getDate() - 47);
  add(tercaCarnaval);

  const sextaSanta = new Date(pascoa);
  sextaSanta.setDate(pascoa.getDate() - 2);
  add(sextaSanta);

  const corpusChristi = new Date(pascoa);
  corpusChristi.setDate(pascoa.getDate() + 60);
  add(corpusChristi);

  return feriados;
}

function calcularDataEfetivaLeitura(dataSabespStr) {
  const [ano, mes, dia] = dataSabespStr.split('-').map(Number);
  const feriados = obterFeriadosSP(ano);

  let data = new Date(ano, mes - 1, dia);
  const diaSemanaOriginalNum = data.getDay();

  let motivo = 'SEM_AJUSTE';
  let descricao = 'Data mantida na previsão original da Sabesp.';

  if (diaSemanaOriginalNum === 6) {
    data.setDate(data.getDate() - 1);
    motivo = 'SABADO_PARA_SEXTA';
    descricao = 'Caiu no Sábado: antecipado para Sexta-feira.';

    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() - 1);
      descricao = 'Caiu no Sábado e Sexta era feriado: antecipado para o dia útil anterior.';
    }
  } else if (diaSemanaOriginalNum === 0) {
    data.setDate(data.getDate() + 1);
    motivo = 'DOMINGO_PARA_SEGUNDA';
    descricao = 'Caiu no Domingo: postergado para Segunda-feira.';

    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() + 1);
      descricao = 'Caiu no Domingo e Segunda era feriado: postergado para o próximo dia útil.';
    }
  } else if (feriados.has(dataSabespStr)) {
    motivo = 'FERIADO';
    descricao = 'Data oficial coincidiu com feriado: postergado para o próximo dia útil.';
    while (feriados.has(formatarIso(data)) || data.getDay() === 0 || data.getDay() === 6) {
      data.setDate(data.getDate() + 1);
    }
  }

  const dataAjustadaIso = formatarIso(data);

  return {
    dataOriginal: dataSabespStr,
    dataAjustada: dataAjustadaIso,
    houveAjuste: dataSabespStr !== dataAjustadaIso,
    motivoAjuste: motivo,
    descricao
  };
}

test("Regra 1: Sábado deve antecipar para Sexta-feira", () => {
  // 17/10/2026 é Sábado
  const res = calcularDataEfetivaLeitura("2026-10-17");
  assert.equal(res.houveAjuste, true);
  assert.equal(res.dataAjustada, "2026-10-16");
  assert.equal(res.motivoAjuste, "SABADO_PARA_SEXTA");
});

test("Regra 2: Domingo deve postergar para Segunda-feira", () => {
  // 18/10/2026 é Domingo
  const res = calcularDataEfetivaLeitura("2026-10-18");
  assert.equal(res.houveAjuste, true);
  assert.equal(res.dataAjustada, "2026-10-19");
  assert.equal(res.motivoAjuste, "DOMINGO_PARA_SEGUNDA");
});

test("Regra 3: Feriado nacional na Segunda deve avançar para Terça-feira", () => {
  // 12/10/2026 é Nossa Senhora Aparecida (Segunda-feira)
  const res = calcularDataEfetivaLeitura("2026-10-12");
  assert.equal(res.houveAjuste, true);
  assert.equal(res.dataAjustada, "2026-10-13");
  assert.equal(res.motivoAjuste, "FERIADO");
});

test("Regra 4: Dia útil normal sem feriado deve manter data original", () => {
  // 21/10/2026 é Quarta-feira comum
  const res = calcularDataEfetivaLeitura("2026-10-21");
  assert.equal(res.houveAjuste, false);
  assert.equal(res.dataAjustada, "2026-10-21");
  assert.equal(res.motivoAjuste, "SEM_AJUSTE");
});
