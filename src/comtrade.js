/**
 * Gerador de Oscilografia COMTRADE — IEEE C37.111-1999
 *
 * LÓGICA DO ALGORITMO:
 * ====================
 * 1. Gera-se a senóide completa:
 *      - Pré-falta: duração = tempoPreFalta
 *      - Falta: duração até paradaCronometroMaleta
 *      - Total da senóide = tempoPreFalta + paradaCronometroMaleta
 *
 * 2. Dentro da senóide existem dois marcos após o início da falta:
 *      - TRIP DO RELÉ: ocorre em tempoOperacaoProtecao após a falta.
 *        É o ponto de ancoragem do pré-trigger na oscilografia.
 *        A senóide NÃO para aqui — a maleta continua injetando.
 *      - PARADA DO CRONÔMETRO DA MALETA: ocorre em paradaCronometroMaleta
 *        após a falta. Aqui sim o sinal zera (maleta parou de injetar).
 *        paradaCronometroMaleta >= tempoOperacaoProtecao sempre.
 *
 * 3. Na oscilografia (1 segundo):
 *      - O TRIP fica na posição PRE_TRIGGER_OSCILOGRAFIA.
 *      - Antes do TRIP: pré-trigger com senóide (pré-falta e/ou falta).
 *      - Entre TRIP e PARADA MALETA: senóide de falta continua.
 *      - Após PARADA MALETA: ZEROS.
 */

const DURACAO_OSCILOGRAFIA = 1.0;
const PRE_TRIGGER_OSCILOGRAFIA = 0.5;
const FREQUENCIA_NOMINAL = 60;
const AMOSTRAS_POR_CICLO = 16;
const TAXA_AMOSTRAGEM = AMOSTRAS_POR_CICLO * FREQUENCIA_NOMINAL; // 960

const NOME_ESTACAO = "local";
const NOME_EQUIPAMENTO = "VPR-700";
const ANO_NORMA = 1999;

function fmtDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const us = String(d.getMilliseconds() * 1000).padStart(6, '0');
  return { data: `${dd}/${mm}/${yyyy}`, hora: `${hh}:${mi}:${ss}.${us}` };
}

/**
 * Gera os 3 arquivos COMTRADE a partir de um registro de trip.
 *
 * @param {Object} record - Registro do tripHistory com todos os dados
 *   record.prefault.enabled, .duration, .relayCurrents, .relayVoltages
 *   record.fault.relayCurrents, .relayVoltages
 *   record.tripTime (tempo de operação da proteção em s — primeiro trip do relé)
 *   record.maletaStopTime (tempo de parada do cronômetro da maleta em s)
 *   record.system.rtc, .rtp
 *   record.timestamp
 * @returns {{cfg: string, dat: string, hdr: string}}
 */
export function generateComtrade(record) {
  const omega = 2.0 * Math.PI * FREQUENCIA_NOMINAL;
  const dt = 1.0 / TAXA_AMOSTRAGEM;
  const totalAmostras = Math.round(DURACAO_OSCILOGRAFIA * TAXA_AMOSTRAGEM);
  const deltaUs = 1000000.0 / TAXA_AMOSTRAGEM;

  const { rtc, rtp } = record.system;

  // Tempos
  const isSnapshotIdle = record.tripPhase === "snapshot";
  const isSnapshotInj = record.tripPhase === "snapshot_inj";
  const tempoPreFalta = (record.prefault.enabled && record.prefault.duration > 0) ? record.prefault.duration : 0;

  // Tempo de operação da proteção (primeiro trip do relé)
  const tempoOperacaoProtecao = record.tripTime !== null ? record.tripTime : 0.05;

  // Tempo de parada do cronômetro da maleta (>= tempoOperacaoProtecao)
  // Se não disponível, usa o mesmo tempo do trip
  const paradaCronometroMaleta = record.maletaStopTime != null
    ? record.maletaStopTime
    : tempoOperacaoProtecao;

  let tTripOsc, tParadaOsc, tFaltaSenoide, offset;

  if (isSnapshotIdle) {
    // Snapshot idle: senóide inteira (zerada), sem trip, sem parada
    tFaltaSenoide = tempoPreFalta;
    tTripOsc = DURACAO_OSCILOGRAFIA; // trip "fora" do registro
    tParadaOsc = DURACAO_OSCILOGRAFIA;
    offset = 0;
  } else if (isSnapshotInj) {
    // Snapshot durante injeção: trip ancora no pré-trigger
    tFaltaSenoide = tempoPreFalta;
    const tTripSenoide = tempoPreFalta + tempoOperacaoProtecao;
    tTripOsc = PRE_TRIGGER_OSCILOGRAFIA;
    offset = tTripSenoide - PRE_TRIGGER_OSCILOGRAFIA;
    tParadaOsc = tTripOsc + (paradaCronometroMaleta - tempoOperacaoProtecao);
  } else {
    // Trip normal: dois marcos distintos
    // Na senóide:
    //   t_falta = tempoPreFalta
    //   t_trip  = tempoPreFalta + tempoOperacaoProtecao
    //   t_parada = tempoPreFalta + paradaCronometroMaleta
    tFaltaSenoide = tempoPreFalta;
    const tTripSenoide = tempoPreFalta + tempoOperacaoProtecao;

    // O TRIP ancora no PRE_TRIGGER da oscilografia
    tTripOsc = PRE_TRIGGER_OSCILOGRAFIA;
    offset = tTripSenoide - PRE_TRIGGER_OSCILOGRAFIA;

    // Parada da maleta na oscilografia
    tParadaOsc = tTripOsc + (paradaCronometroMaleta - tempoOperacaoProtecao);
  }

  // Se a parada da maleta excede o registro, limitar ao fim
  if (tParadaOsc > DURACAO_OSCILOGRAFIA) {
    tParadaOsc = DURACAO_OSCILOGRAFIA;
  }

  // Montar canais com leituras reais do relé
  const zeroI = { Ia: { mag: 0, ang: 0 }, Ib: { mag: 0, ang: 0 }, Ic: { mag: 0, ang: 0 } };
  const zeroV = { Va: { mag: 0, ang: 0 }, Vb: { mag: 0, ang: 0 }, Vc: { mag: 0, ang: 0 } };
  const pfI = record.prefault.relayCurrents || record.prefault.currents || zeroI;
  const pfV = record.prefault.relayVoltages || record.prefault.voltages || zeroV;
  const fI = record.fault.relayCurrents || record.fault.currents;
  const fV = record.fault.relayVoltages || record.fault.voltages;

  // Calcular 3I0 (pré-falta e falta)
  const calc3I0 = (currents) => {
    const toRect = (m, a) => ({ re: m * Math.cos(a * Math.PI / 180), im: m * Math.sin(a * Math.PI / 180) });
    const ia = toRect(currents.Ia.mag, currents.Ia.ang);
    const ib = toRect(currents.Ib.mag, currents.Ib.ang);
    const ic = toRect(currents.Ic.mag, currents.Ic.ang);
    const re = ia.re + ib.re + ic.re, im = ia.im + ib.im + ic.im;
    return { mag: Math.sqrt(re * re + im * im), ang: Math.atan2(im, re) * 180 / Math.PI };
  };
  const i0pf = calc3I0(pfI);
  const i0f = calc3I0(fI);

  const canais = [
    { nome: "IA", unid: "A", rmsPre: pfI.Ia.mag * rtc, angPre: pfI.Ia.ang, rmsFalta: fI.Ia.mag * rtc, angFalta: fI.Ia.ang, rp: 1, rs: rtc },
    { nome: "IB", unid: "A", rmsPre: pfI.Ib.mag * rtc, angPre: pfI.Ib.ang, rmsFalta: fI.Ib.mag * rtc, angFalta: fI.Ib.ang, rp: 1, rs: rtc },
    { nome: "IC", unid: "A", rmsPre: pfI.Ic.mag * rtc, angPre: pfI.Ic.ang, rmsFalta: fI.Ic.mag * rtc, angFalta: fI.Ic.ang, rp: 1, rs: rtc },
    { nome: "IGS", unid: "A", rmsPre: i0pf.mag * rtc, angPre: i0pf.ang, rmsFalta: i0f.mag * rtc, angFalta: i0f.ang, rp: 1, rs: rtc },
    { nome: "VA", unid: "V", rmsPre: pfV.Va.mag * rtp, angPre: pfV.Va.ang, rmsFalta: fV.Va.mag * rtp, angFalta: fV.Va.ang, rp: 1, rs: rtp },
    { nome: "VB", unid: "V", rmsPre: pfV.Vb.mag * rtp, angPre: pfV.Vb.ang, rmsFalta: fV.Vb.mag * rtp, angFalta: fV.Vb.ang, rp: 1, rs: rtp },
    { nome: "VC", unid: "V", rmsPre: pfV.Vc.mag * rtp, angPre: pfV.Vc.ang, rmsFalta: fV.Vc.mag * rtp, angFalta: fV.Vc.ang, rp: 1, rs: rtp },
    { nome: "VN", unid: "V", rmsPre: 0, angPre: 0, rmsFalta: 0, angFalta: 0, rp: 1, rs: rtp },
  ];

  // Preparar info dos canais
  const canaisInfo = canais.map((ch, idx) => {
    const picoPre = ch.rmsPre * Math.SQRT2;
    const picoFalta = ch.rmsFalta * Math.SQRT2;
    const picoMax = Math.max(picoPre, picoFalta);
    const a = picoMax > 0 ? (picoMax * 1.1) / 32767.0 : 0.0000001;
    return {
      idx: idx + 1,
      nome: ch.nome,
      fase: "",
      ccbm: "",
      unid: ch.unid,
      a,
      b: 0,
      skew: 0,
      minVal: -32768,
      maxVal: 32767,
      rp: ch.rp,
      rs: ch.rs,
      ps: "S",
      picoPre,
      picoFalta,
      angPreRad: ch.angPre * Math.PI / 180,
      angFaltaRad: ch.angFalta * Math.PI / 180,
    };
  });

  // ------------------------------------------------------------------
  // GERAR AMOSTRAS
  // ------------------------------------------------------------------
  // Para cada amostra n na oscilografia (tOsc = n * dt):
  //   tSen = offset + tOsc  (tempo na senóide)
  //
  //   Se tOsc >= tParadaOsc:      → ZEROS (maleta parou de injetar)
  //   Senão se tSen < 0:          → ZEROS (antes do início da senóide)
  //   Senão se tSen < tFaltaSenoide: → pré-falta
  //   Senão:                      → falta (continua mesmo após trip)
  // ------------------------------------------------------------------
  const linhasDat = [];

  for (let n = 0; n < totalAmostras; n++) {
    const tOsc = n * dt;
    const tsUs = Math.round(n * deltaUs);
    const tSen = offset + tOsc;
    const valores = [];

    if (tOsc >= tParadaOsc || tSen < 0) {
      // Após parada da maleta OU antes do início da senóide: ZEROS
      for (const ch of canaisInfo) valores.push(0);
    } else {
      // Dentro da senóide
      for (const ch of canaisInfo) {
        if (ch.picoPre === 0 && ch.picoFalta === 0) { valores.push(0); continue; }

        let v;
        if (tSen < tFaltaSenoide) {
          // Pré-falta
          v = ch.picoPre * Math.sin(omega * tSen + ch.angPreRad);
        } else {
          // Falta (continua mesmo após trip, até parada da maleta)
          v = ch.picoFalta * Math.sin(omega * tSen + ch.angFaltaRad);
        }
        let intVal = Math.round((v - ch.b) / ch.a);
        intVal = Math.max(-32768, Math.min(32767, intVal));
        valores.push(intVal);
      }
    }

    linhasDat.push(`${n + 1},${tsUs},${valores.join(",")}`);
  }

  // Gerar CFG
  const nAnalog = canais.length;
  const nDigital = 0;
  const dtInicio = new Date();
  const dtTrigger = new Date(dtInicio.getTime() + tTripOsc * 1000);
  const d1 = fmtDate(dtInicio);
  const d2 = fmtDate(dtTrigger);

  const cfgLines = [];
  cfgLines.push(`${NOME_ESTACAO},${NOME_EQUIPAMENTO},${ANO_NORMA}`);
  cfgLines.push(`${nAnalog},${nAnalog}A,${nDigital}D`);
  for (const ch of canaisInfo) {
    cfgLines.push(
      `${ch.idx},${ch.nome},${ch.fase},${ch.ccbm},${ch.unid},${ch.a.toFixed(7)},${ch.b},${ch.skew},${ch.minVal},${ch.maxVal},${ch.rp},${ch.rs},${ch.ps}`
    );
  }
  cfgLines.push(`${FREQUENCIA_NOMINAL}`);
  cfgLines.push("1");
  cfgLines.push(`${TAXA_AMOSTRAGEM.toFixed(3)},${totalAmostras}`);
  cfgLines.push(`${d1.data},${d1.hora}`);
  cfgLines.push(`${d2.data},${d2.hora}`);
  cfgLines.push("ASCII");
  cfgLines.push("1");

  // Gerar HDR
  const hdrLines = [];
  hdrLines.push(`${"VPR-700 - OSCILOGRAFIA".padStart(60)}`);
  hdrLines.push("");
  hdrLines.push("Fabricante: RELAY TESTER PRO");
  hdrLines.push("Unidade: VPR-700");
  hdrLines.push(`Total de registros: ${totalAmostras}`);
  hdrLines.push(`Stages: ${record.stages.join(", ")}`);
  hdrLines.push(`Trip time: ${isSnapshotIdle ? "SNAPSHOT (idle)" : (record.tripTime !== null ? record.tripTime.toFixed(3) + "s" : "N/A")}`);
  hdrLines.push(`Maleta stop: ${paradaCronometroMaleta.toFixed(3)}s`);
  hdrLines.push(`Pre-fault: ${tempoPreFalta > 0 ? tempoPreFalta.toFixed(3) + "s" : "disabled"}`);
  hdrLines.push("");

  return {
    cfg: cfgLines.join("\r\n") + "\r\n",
    dat: linhasDat.join("\r\n") + "\r\n",
    hdr: hdrLines.join("\r\n") + "\r\n",
  };
}
