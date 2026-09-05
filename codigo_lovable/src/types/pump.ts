/**
 * Modelo de datos de bombas horizontales de superficie (HPS).
 *
 * Las curvas de fábrica se almacenan como una única curva base a 60 Hz por
 * hidráulica + número de etapas. El resto de frecuencias se derivan con las
 * leyes de afinidad (ver `@/lib/pumpPhysics`), que reproducen las curvas
 * multi-velocidad de fábrica con un error < 4 psi.
 */

/**
 * Hidráulica (familia de impulsor). Independiente del número de etapas.
 *
 * Los campos son `null` cuando el documento de origen no los trae: sin BEP ni
 * eficiencia no hay forma honesta de dibujar curvas de eficiencia o potencia,
 * y la app oculta esas magnitudes en lugar de estimarlas.
 */
export interface Hidraulica {
  id: string;
  /** Serie comercial del fabricante. */
  serie: string;
  /** Caudal del punto de mejor eficiencia a 60 Hz, USbl/día. */
  qBep60: number | null;
  /** Eficiencia en el BEP, %. */
  etaBep: number | null;
  /** Caudal mínimo continuo estable a 60 Hz, USbl/día. */
  mcsf60: number | null;
  /** Velocidad específica (US units), si está documentada. */
  ns: number | null;
  /** Diámetro de impulsor nominal, pulgadas. */
  diametroImpulsor: number;
}

/** Curva base de fábrica a `hzBase` para una hidráulica con `etapas` etapas. */
export interface CurvaBase {
  id: string;
  hidraulica: string;
  etapas: number;
  hzBase: number;
  rpmBase: number;
  /** Caudal máximo documentado de la curva a `hzBase`, USbl/día. */
  qMax: number;
  /** Densidad relativa del fluido para la que está trazada la curva. */
  sgBase: number;
  /** Puntos [caudal USbl/día, head psi] digitalizados de la curva de fábrica. */
  puntos: Array<[number, number]>;
  /** Documento del que procede la curva. */
  fuente: string;
  /** Salvedades de la digitalización, si las hay. */
  nota?: string;
}

/** Punto de diseño documentado en la ficha de la unidad. */
export interface PuntoDiseno {
  caudal: number;
  headRequerido: number | null;
  headReal: number;
  presionSuccion: { nominal: number; maxima: number };
  rpm: number;
  eficiencia: number;
  npshr: number | null;
  potenciaEje: number;
  densidad: { nominal: number; maxima: number };
  temperaturaMax: number | null;
  viscosidad: number;
}

/** Unidad HPS instalada en campo. */
export interface Pump {
  id: string;
  nombre: string;
  /** Curva base asociada (`CurvaBase.id`). */
  curvaId: string;
  modeloBomba: string;
  etapas: number;
  servicio: string;

  /** `null` cuando el documento de la unidad no trae condición de operación. */
  puntoDiseno: PuntoDiseno | null;

  /** Potencia máxima a diámetro nominal (de ficha), hp. */
  potenciaMaximaDiametroNominal: number | null;
  motorMinimoRecomendado: { hp: number; kw: number } | null;
  motorInstalado: string | null;
  controlador: string | null;
  camaraEmpuje: string | null;

  /** Presiones de ficha; si faltan se calculan (ver `pumpPhysics`). */
  presionMaximaTrabajoFicha: number | null;
  presionPruebaHidrostaticaFicha: number | null;

  fuente: string;
  nota?: string;
}

/** Un punto de una curva evaluada a una frecuencia concreta. */
export interface CurvePoint {
  caudal: number;
  head: number;
  /** `null` si el documento de la bomba no trae curva de eficiencia. */
  eficiencia: number | null;
  /** `null` si no se puede derivar sin eficiencia. */
  potencia: number | null;
}

/** Magnitudes que la bomba tiene realmente documentadas. */
export interface MagnitudesDisponibles {
  head: boolean;
  eficiencia: boolean;
  potencia: boolean;
  bep: boolean;
  mcsf: boolean;
}

export interface PumpCurve {
  frecuenciaHz: number;
  puntos: CurvePoint[];
  /** `false` cuando la frecuencia viene dibujada en el documento de fábrica. */
  generada: boolean;
  /** Caudal mínimo continuo estable a esta frecuencia. `null` si no consta. */
  mcsf: number | null;
  /** Caudal del BEP a esta frecuencia. `null` si no consta. */
  qBep: number | null;
  qMax: number;
}

/** Valores derivados del modelo físico para la unidad seleccionada. */
export interface PumpDerived {
  headMaximo: number;
  /** `null` si no hay ficha ni presión de succión documentada. */
  presionMaximaTrabajo: number | null;
  presionPruebaHidrostatica: number | null;
  presionDescargaReal: number | null;
  potenciaHidraulica: number | null;
  potenciaEje: number | null;
  qBep: number | null;
  mcsf: number | null;
  frecuenciaNominal: number;
  /** `true` si presión máx. de trabajo / hidrostática se calcularon aquí. */
  presionesCalculadas: boolean;
}
