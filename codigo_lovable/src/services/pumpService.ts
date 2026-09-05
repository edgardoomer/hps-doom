// TODO(backend): reemplazar el retardo simulado por fetch a la API real.
// Las firmas y los tipos ya son los definitivos.
import { curvaBasePorId, frecuenciasDocumentadas, hidraulicaPorId } from "@/data/curves.data";
import { pumpById, pumps } from "@/data/pumps.data";
import { construirCurva } from "@/lib/pumpPhysics";
import type { CurvaBase, Hidraulica, Pump, PumpCurve } from "@/types/pump";

function delay<T>(value: T): Promise<T> {
  const ms = 220 + Math.random() * 260;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getPumps(): Promise<Pump[]> {
  return delay(pumps);
}

export async function getPumpById(id: string): Promise<Pump | null> {
  return delay(pumpById.get(id) ?? null);
}

export function getCurvaBase(pumpId: string): CurvaBase | null {
  const pump = pumpById.get(pumpId);
  return pump ? (curvaBasePorId.get(pump.curvaId) ?? null) : null;
}

export function getHidraulica(pumpId: string): Hidraulica | null {
  const curva = getCurvaBase(pumpId);
  return curva ? (hidraulicaPorId.get(curva.hidraulica) ?? null) : null;
}

/** Frecuencias dibujadas en el documento de fábrica de la bomba. */
export function getFrecuenciasDocumentadas(pumpId: string): number[] {
  const curva = getCurvaBase(pumpId);
  return curva ? (frecuenciasDocumentadas[curva.id] ?? []) : [];
}

/**
 * Curvas a las frecuencias pedidas. Las que no vienen dibujadas en el documento
 * se generan por afinidad y llegan marcadas con `generada: true`.
 */
export async function getPumpCurves(id: string, frecuencias?: number[]): Promise<PumpCurve[]> {
  const curva = getCurvaBase(id);
  if (!curva) return delay([]);
  const hz = frecuencias ?? getFrecuenciasDocumentadas(id);
  return delay(hz.map((f) => construirCurva(curva, f)));
}

/** Versión síncrona, para recalcular al vuelo mientras el usuario interactúa. */
export function buildPumpCurves(id: string, frecuencias: number[]): PumpCurve[] {
  const curva = getCurvaBase(id);
  if (!curva) return [];
  return frecuencias.map((f) => construirCurva(curva, f));
}
