export interface OperatingInput {
  presionSuccion: number | null;
  presionDescarga: number | null;
  caudal: number | null;
  frecuencia: number | null;
}

export type EstadoOperacion = "dentro" | "limite" | "fuera" | "sin-datos";

export interface OperatingEvaluation {
  estado: EstadoOperacion;
  etiqueta: string;
  /** Head diferencial medido en campo (descarga − succión), psi. */
  headCalculado: number | null;
  /** Head que predice la curva de fábrica a ese caudal y frecuencia, psi. */
  headCurva: number | null;
  /** Desviación del head medido respecto a la curva, %. */
  desviacion: number | null;
  /** Eficiencia estimada en el punto de operación, %. */
  eficiencia: number | null;
  /** Potencia al eje estimada en el punto de operación, hp. */
  potencia: number | null;
  /** Caudal del BEP a la frecuencia de operación, USbl/día. */
  qBep: number | null;
  /** Caudal mínimo continuo estable a esa frecuencia, USbl/día. */
  mcsf: number | null;
  /** Caudal máximo de la curva a esa frecuencia, USbl/día. */
  qMax: number | null;
  /** Caudal de operación como % del BEP. */
  porcentajeBep: number | null;
  /**
   * Frecuencia cuya curva pasa exactamente por el punto medido. Si difiere de
   * la frecuencia introducida, la bomba no está sobre la curva declarada.
   */
  frecuenciaEquivalente: number | null;
  /** Motivos concretos del estado, para mostrar al operador. */
  observaciones: string[];
}

export interface LocationInput {
  presionSuccion: number | null;
  presionARomper: number | null;
  caudalEsperado: number | null;
}

export interface StartupSummary {
  margenPresionARomper: number;
  margenEstado: EstadoOperacion;
  margenEtiqueta: string;
  caudalVsNominal: number;
  caudalEstado: EstadoOperacion;
  caudalEtiqueta: string;
  motorMinimo: { hp: number; kw: number };
  frecuenciaArranqueSugerida: number;
}
