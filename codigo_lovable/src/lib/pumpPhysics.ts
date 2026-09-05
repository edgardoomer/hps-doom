/**
 * Modelo físico de las bombas HPS.
 *
 * Todo el comportamiento fuera de la curva base de 60 Hz se deriva aquí. El
 * modelo se contrastó punto por punto contra las fichas de fábrica:
 *
 *   | magnitud                | error frente a la ficha |
 *   |-------------------------|-------------------------|
 *   | head en el punto rated  | < 1,3 psi   (0,05 %)    |
 *   | eficiencia en rated     | < 0,02 puntos           |
 *   | potencia hidráulica     | < 0,5 hp                |
 *   | potencia al eje         | < 0,4 hp                |
 *   | presión máx. de trabajo | exacta                  |
 *
 * Leyes de afinidad (velocidad N, diámetro constante):
 *   Q ∝ N        H ∝ N²        P ∝ N³        η ≈ constante a Q/N igual
 */
import {
  curvaBasePorId,
  frecuenciasDocumentadas,
  hidraulicaPorId,
  HZ_BASE,
  RPM_BASE,
} from "@/data/curves.data";
import type { CurvaBase, MagnitudesDisponibles, Pump, PumpCurve, PumpDerived } from "@/types/pump";

/**
 * Q [USbl/día] · ΔP [psi] / C = potencia hidráulica [hp].
 * C = 550 ft·lbf/s por hp ÷ (5,6146 ft³/bbl · 144 lbf/ft² por psi / 86.400 s).
 */
export const C_POTENCIA = 58764;

/**
 * Forma de la curva de eficiencia: η/η_bep = 1 − K·(1 − Q/Q_bep)².
 * K se ajustó por mínimos cuadrados sobre las 8 condiciones documentadas de la
 * TJ12000 64 stg (rms 0,004 puntos, máximo en Q/Q_bep = 1,000).
 */
export const K_EFICIENCIA = 0.84873;

/** Techo operativo: ninguna unidad trabaja por encima de esta frecuencia. */
export const HZ_MAX = 60;

/** Fracción de η_bep por debajo de la cual se considera que la curva termina. */
const ETA_MINIMA = 0.05;

export function frecuenciaARpm(hz: number): number {
  return (RPM_BASE * hz) / HZ_BASE;
}

export function rpmAFrecuencia(rpm: number): number {
  return (HZ_BASE * rpm) / RPM_BASE;
}

/** Interpolación lineal sobre los puntos de la curva base. */
function interpolar(puntos: Array<[number, number]>, q: number): number {
  const n = puntos.length;
  const primero = puntos[0];
  const ultimo = puntos[n - 1];
  if (!primero || !ultimo) return 0;
  if (q <= primero[0]) return primero[1];
  if (q >= ultimo[0]) return ultimo[1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((puntos[mid] as [number, number])[0] <= q) lo = mid;
    else hi = mid;
  }
  const [q0, h0] = puntos[lo] as [number, number];
  const [q1, h1] = puntos[hi] as [number, number];
  return h0 + ((h1 - h0) * (q - q0)) / (q1 - q0);
}

/** Head [psi] de la curva a la frecuencia `hz` para el caudal `q`. */
export function headEnCurva(curva: CurvaBase, q: number, hz: number): number {
  const r = hz / curva.hzBase;
  if (r <= 0) return 0;
  return interpolar(curva.puntos, q / r) * r * r;
}

/**
 * Eficiencia [%] a caudal `q` y frecuencia `hz`.
 * Devuelve `null` si la hidráulica no tiene BEP ni eficiencia documentados.
 */
export function eficienciaEnCurva(
  qBep60: number | null,
  etaBep: number | null,
  q: number,
  hz: number,
): number | null {
  if (qBep60 === null || etaBep === null) return null;
  const qBep = (qBep60 * hz) / HZ_BASE;
  if (qBep <= 0) return null;
  const rel = q / qBep;
  return Math.max(0, etaBep * (1 - K_EFICIENCIA * (1 - rel) ** 2));
}

/** Magnitudes que la bomba tiene realmente documentadas. */
export function magnitudesDe(curva: CurvaBase | null): MagnitudesDisponibles {
  const h = curva ? hidraulicaPorId.get(curva.hidraulica) : undefined;
  const conEficiencia = !!h && h.qBep60 !== null && h.etaBep !== null;
  return {
    head: !!curva,
    eficiencia: conEficiencia,
    potencia: conEficiencia,
    bep: !!h && h.qBep60 !== null,
    mcsf: !!h && h.mcsf60 !== null,
  };
}

/** Potencia hidráulica [hp]. `sg` es la densidad relativa del fluido. */
export function potenciaHidraulica(q: number, deltaP: number, sg = 1): number {
  return (q * deltaP * sg) / C_POTENCIA;
}

/** Potencia al eje [hp] a partir de la hidráulica y la eficiencia en %. */
export function potenciaEje(pHidraulica: number, eficiencia: number): number {
  if (eficiencia <= 0) return 0;
  return pHidraulica / (eficiencia / 100);
}

const redondear = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/**
 * Construye la curva completa (head, eficiencia y potencia) a una frecuencia
 * cualquiera. Si la frecuencia no está dibujada en el documento de fábrica la
 * curva se genera por afinidad y se marca con `generada: true`.
 */
export function construirCurva(curva: CurvaBase, hz: number, puntos = 41, sg?: number): PumpCurve {
  const hidraulica = hidraulicaPorId.get(curva.hidraulica);
  const r = hz / curva.hzBase;
  const qMax = curva.qMax * r;
  const qBep60 = hidraulica?.qBep60 ?? null;
  const etaBep = hidraulica?.etaBep ?? null;
  const mcsf60 = hidraulica?.mcsf60 ?? null;
  const densidad = sg ?? curva.sgBase;

  const lista = Array.from({ length: puntos }, (_, i) => {
    const q = (qMax * i) / (puntos - 1);
    const head = headEnCurva(curva, q, hz);
    const eficiencia = eficienciaEnCurva(qBep60, etaBep, q, hz);
    // Fuera del tramo útil de la curva de eficiencia la potencia no significa nada.
    const util = eficiencia !== null && etaBep !== null && eficiencia > etaBep * ETA_MINIMA;
    return {
      caudal: Math.round(q),
      head: redondear(head),
      eficiencia: eficiencia === null ? null : redondear(eficiencia),
      potencia:
        util && eficiencia !== null
          ? redondear(potenciaEje(potenciaHidraulica(q, head, densidad), eficiencia))
          : null,
    };
  });

  return {
    frecuenciaHz: hz,
    puntos: lista,
    generada: !(frecuenciasDocumentadas[curva.id] ?? []).includes(hz),
    mcsf: mcsf60 === null ? null : Math.round((mcsf60 * hz) / HZ_BASE),
    qBep: qBep60 === null ? null : Math.round((qBep60 * hz) / HZ_BASE),
    qMax: Math.round(qMax),
  };
}

/** Valores de placa derivados del modelo para una unidad. */
export function derivarDatos(pump: Pump): PumpDerived | null {
  const curva = curvaBasePorId.get(pump.curvaId);
  const hidraulica = curva ? hidraulicaPorId.get(curva.hidraulica) : undefined;
  if (!curva || !hidraulica) return null;

  const punto = pump.puntoDiseno;
  const rpm = punto?.rpm ?? curva.rpmBase;
  const hz = rpmAFrecuencia(rpm);
  const sgNominal = punto?.densidad.nominal ?? curva.sgBase;
  const sgMaxima = punto?.densidad.maxima ?? sgNominal;
  const factorDensidad = sgNominal > 0 ? sgMaxima / sgNominal : 1;

  // El head máximo de la curva (normalmente en caudal cero, salvo hidráulicas
  // con joroba) escalado a la velocidad de la unidad.
  const escala = (rpm / curva.rpmBase) ** 2;
  const headMaximo = Math.max(...curva.puntos.map(([, h]) => h)) * escala;

  // Sin presión de succión documentada no se puede cerrar la presión máxima de
  // trabajo, así que se deja vacía en lugar de inventarla.
  const presionMaximaTrabajo =
    pump.presionMaximaTrabajoFicha ??
    (punto ? headMaximo * sgMaxima + punto.presionSuccion.maxima : null);
  const presionPruebaHidrostatica =
    pump.presionPruebaHidrostaticaFicha ??
    (presionMaximaTrabajo === null ? null : presionMaximaTrabajo * 1.5);

  const pHid = punto ? potenciaHidraulica(punto.caudal, punto.headReal, factorDensidad) : null;
  const eficiencia = punto?.eficiencia ?? hidraulica.etaBep;
  const potenciaCalculada =
    pHid !== null && eficiencia !== null ? Math.round(potenciaEje(pHid, eficiencia)) : null;

  return {
    headMaximo: redondear(headMaximo),
    presionMaximaTrabajo: presionMaximaTrabajo === null ? null : redondear(presionMaximaTrabajo),
    presionPruebaHidrostatica:
      presionPruebaHidrostatica === null ? null : redondear(presionPruebaHidrostatica),
    presionDescargaReal: punto ? redondear(punto.headReal + punto.presionSuccion.nominal) : null,
    potenciaHidraulica: pHid === null ? null : Math.round(pHid),
    potenciaEje: punto?.potenciaEje ?? potenciaCalculada,
    qBep: hidraulica.qBep60 === null ? null : Math.round((hidraulica.qBep60 * hz) / HZ_BASE),
    mcsf: hidraulica.mcsf60 === null ? null : Math.round((hidraulica.mcsf60 * hz) / HZ_BASE),
    frecuenciaNominal: redondear(hz, 2),
    presionesCalculadas: pump.presionMaximaTrabajoFicha === null,
  };
}

/**
 * Frecuencia cuya curva pasa por (q, head). Resuelve H(q, hz) = head con
 * bisección sobre `hz`, ya que H crece monótonamente con la frecuencia.
 */
export function frecuenciaQuePasaPor(
  curva: CurvaBase,
  q: number,
  head: number,
  hzMin = 20,
  hzMax = HZ_MAX,
): number | null {
  if (q <= 0 || head <= 0) return null;
  const f = (hz: number) => headEnCurva(curva, q, hz) - head;
  let lo = hzMin;
  let hi = hzMax;
  if (f(lo) > 0 || f(hi) < 0) return null;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return redondear((lo + hi) / 2, 2);
}

export { curvaBasePorId, hidraulicaPorId, frecuenciasDocumentadas, HZ_BASE, RPM_BASE };
