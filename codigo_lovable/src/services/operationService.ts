// TODO(backend): reemplazar el retardo simulado por fetch a la API real.
import { pumpById } from "@/data/pumps.data";
import {
  curvaBasePorId,
  derivarDatos,
  eficienciaEnCurva,
  frecuenciaQuePasaPor,
  headEnCurva,
  hidraulicaPorId,
  HZ_BASE,
  potenciaEje,
  potenciaHidraulica,
} from "@/lib/pumpPhysics";
import type {
  EstadoOperacion,
  LocationInput,
  OperatingEvaluation,
  OperatingInput,
  StartupSummary,
} from "@/types/operation";

function delay<T>(value: T): Promise<T> {
  const ms = 220 + Math.random() * 260;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const SIN_DATOS: OperatingEvaluation = {
  estado: "sin-datos",
  etiqueta: "SIN DATOS",
  headCalculado: null,
  headCurva: null,
  desviacion: null,
  eficiencia: null,
  potencia: null,
  qBep: null,
  mcsf: null,
  qMax: null,
  porcentajeBep: null,
  frecuenciaEquivalente: null,
  observaciones: [],
};

/** Tolerancias de la evaluación, en % de desviación de head sobre la curva. */
const TOL_DENTRO = 4;
const TOL_LIMITE = 8;
/** Margen de aviso junto a los extremos de caudal, en fracción del rango. */
const MARGEN_CAUDAL = 0.08;

const redondear = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export async function evaluateOperatingPoint(
  pumpId: string,
  input: OperatingInput,
): Promise<OperatingEvaluation> {
  const pump = pumpById.get(pumpId);
  const curva = pump ? curvaBasePorId.get(pump.curvaId) : undefined;
  const hidraulica = curva ? hidraulicaPorId.get(curva.hidraulica) : undefined;

  if (
    !pump ||
    !curva ||
    !hidraulica ||
    input.caudal === null ||
    input.frecuencia === null ||
    input.presionSuccion === null ||
    input.presionDescarga === null
  ) {
    return delay(SIN_DATOS);
  }

  const { caudal, frecuencia } = input;
  const headMedido = input.presionDescarga - input.presionSuccion;
  const headCurva = headEnCurva(curva, caudal, frecuencia);
  const qMax = curva.qMax * (frecuencia / curva.hzBase);
  // BEP, MCSF y eficiencia sólo existen si vienen en la ficha de la bomba: sin
  // ellos la evaluación se limita a lo que sí se puede comprobar (head y caudal).
  const qBep = hidraulica.qBep60 === null ? null : (hidraulica.qBep60 * frecuencia) / HZ_BASE;
  const mcsf = hidraulica.mcsf60 === null ? null : (hidraulica.mcsf60 * frecuencia) / HZ_BASE;

  const eficiencia = eficienciaEnCurva(hidraulica.qBep60, hidraulica.etaBep, caudal, frecuencia);
  const sg = pump.puntoDiseno?.densidad.maxima ?? curva.sgBase;
  const potencia =
    eficiencia === null
      ? null
      : potenciaEje(potenciaHidraulica(caudal, Math.max(headMedido, 0), sg), eficiencia);

  const observaciones: string[] = [];
  let estado: EstadoOperacion = "dentro";
  const marcar = (nivel: EstadoOperacion) => {
    if (nivel === "fuera") estado = "fuera";
    else if (nivel === "limite" && estado !== "fuera") estado = "limite";
  };

  // 1. Caudal dentro del rango físico de la curva a esa frecuencia.
  if (caudal > qMax) {
    marcar("fuera");
    observaciones.push(
      `El caudal supera el máximo de la curva a ${frecuencia} Hz (${Math.round(qMax).toLocaleString("en-US")} USbl/día).`,
    );
  } else if (mcsf !== null && caudal < mcsf) {
    marcar("fuera");
    observaciones.push(
      `El caudal está por debajo del mínimo continuo estable (MCSF ${Math.round(mcsf).toLocaleString("en-US")} USbl/día): riesgo de recirculación y vibración.`,
    );
  } else if (caudal > qMax * (1 - MARGEN_CAUDAL)) {
    marcar("limite");
    observaciones.push("El caudal está cerca del extremo derecho de la curva (runout).");
  } else if (mcsf !== null && caudal < mcsf * (1 + MARGEN_CAUDAL * 2)) {
    marcar("limite");
    observaciones.push("El caudal está justo por encima del MCSF.");
  }

  // 2. Head medido frente al que predice la curva.
  const desviacion = headCurva > 0 ? ((headMedido - headCurva) / headCurva) * 100 : 0;
  const absDesv = Math.abs(desviacion);
  if (absDesv > TOL_LIMITE) {
    marcar("fuera");
    observaciones.push(
      desviacion < 0
        ? `El head medido está ${absDesv.toFixed(1)} % por debajo de la curva: revisar desgaste, recirculación interna o error de instrumentación.`
        : `El head medido está ${absDesv.toFixed(1)} % por encima de la curva: revisar la lectura de presión o la frecuencia real.`,
    );
  } else if (absDesv > TOL_DENTRO) {
    marcar("limite");
    observaciones.push(`Desviación de ${desviacion.toFixed(1)} % respecto a la curva de fábrica.`);
  }

  // 3. Distancia al BEP (sólo si la ficha lo trae).
  const porcentajeBep = qBep !== null && qBep > 0 ? (caudal / qBep) * 100 : null;
  if (porcentajeBep !== null && (porcentajeBep < 70 || porcentajeBep > 120)) {
    marcar("limite");
    observaciones.push(
      `Operando al ${porcentajeBep.toFixed(0)} % del BEP; fuera de la ventana recomendada de 70–120 %.`,
    );
  }

  const frecuenciaEquivalente = frecuenciaQuePasaPor(curva, caudal, headMedido);
  if (frecuenciaEquivalente !== null && Math.abs(frecuenciaEquivalente - frecuencia) > 0.5) {
    observaciones.push(
      `El punto medido cae sobre la curva de ${frecuenciaEquivalente.toFixed(1)} Hz, no sobre la de ${frecuencia} Hz.`,
    );
  }

  if (estado === "dentro" && observaciones.length === 0) {
    observaciones.push(
      "El punto de operación coincide con la curva de fábrica dentro de tolerancia.",
    );
  }

  if (qBep === null) {
    observaciones.push(
      "El documento de esta bomba no trae BEP, MCSF ni curva de eficiencia: la evaluación se limita al contraste de head y caudal contra la curva.",
    );
  }

  const etiqueta =
    estado === "dentro"
      ? "DENTRO DE CURVA"
      : estado === "limite"
        ? "EN EL LÍMITE"
        : "FUERA DE CURVA";

  return delay<OperatingEvaluation>({
    estado,
    etiqueta,
    headCalculado: redondear(headMedido),
    headCurva: redondear(headCurva),
    desviacion: redondear(desviacion),
    eficiencia: eficiencia === null ? null : redondear(eficiencia),
    potencia: potencia === null ? null : Math.round(potencia),
    qBep: qBep === null ? null : Math.round(qBep),
    mcsf: mcsf === null ? null : Math.round(mcsf),
    qMax: Math.round(qMax),
    porcentajeBep: porcentajeBep === null ? null : redondear(porcentajeBep),
    frecuenciaEquivalente,
    observaciones,
  });
}

export async function generateStartupSummary(
  pumpId: string,
  input: LocationInput,
): Promise<StartupSummary> {
  const pump = pumpById.get(pumpId);
  const curva = pump ? curvaBasePorId.get(pump.curvaId) : undefined;
  const derivados = pump ? derivarDatos(pump) : null;

  if (!pump || !curva || !derivados) {
    return delay<StartupSummary>({
      margenPresionARomper: 0,
      margenEstado: "sin-datos",
      margenEtiqueta: "SIN DATOS",
      caudalVsNominal: 0,
      caudalEstado: "sin-datos",
      caudalEtiqueta: "SIN DATOS",
      motorMinimo: { hp: 0, kw: 0 },
      frecuenciaArranqueSugerida: 0,
    });
  }

  const presionSuccion = input.presionSuccion ?? pump.puntoDiseno?.presionSuccion.nominal ?? 0;
  const presionARomper = input.presionARomper ?? 0;
  const caudalEsperado = input.caudalEsperado ?? pump.puntoDiseno?.caudal ?? derivados.qBep ?? 0;

  // Presión máxima que puede entregar la unidad a 60 Hz con la succión dada,
  // menos la presión que hay que romper en el cabezal.
  const presionMaximaDisponible = derivados.headMaximo + presionSuccion;
  const margen = presionMaximaDisponible - presionARomper;

  const caudalReferencia = pump.puntoDiseno?.caudal ?? derivados.qBep ?? 0;
  const porcentaje = caudalReferencia > 0 ? (caudalEsperado / caudalReferencia) * 100 : 0;

  // Frecuencia mínima capaz de romper la presión del cabezal al caudal esperado.
  const headNecesario = presionARomper - presionSuccion;
  const frecuenciaArranque =
    frecuenciaQuePasaPor(curva, Math.max(caudalEsperado, 1), Math.max(headNecesario, 1)) ?? 60;

  const motorMinimo =
    pump.motorMinimoRecomendado ??
    (() => {
      const hp = Math.ceil(((derivados.potenciaEje ?? 0) * 1.15) / 50) * 50;
      return { hp, kw: Math.round(hp * 0.7457) };
    })();

  return delay<StartupSummary>({
    margenPresionARomper: redondear(margen),
    margenEstado: margen > 300 ? "dentro" : margen > 100 ? "limite" : "fuera",
    margenEtiqueta: margen > 300 ? "SUFICIENTE" : margen > 100 ? "AJUSTADO" : "INSUFICIENTE",
    caudalVsNominal: redondear(porcentaje),
    caudalEstado: porcentaje > 115 ? "fuera" : porcentaje > 100 ? "limite" : "dentro",
    caudalEtiqueta:
      porcentaje > 115 ? "SOBRE NOMINAL" : porcentaje > 100 ? "AL LÍMITE" : "EN RANGO",
    motorMinimo,
    frecuenciaArranqueSugerida: Math.min(65, Math.ceil(frecuenciaArranque * 2) / 2),
  });
}
