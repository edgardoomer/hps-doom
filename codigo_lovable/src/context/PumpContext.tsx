import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { derivarDatos, HZ_MAX } from "@/lib/pumpPhysics";
import {
  buildPumpCurves,
  getCurvaBase,
  getFrecuenciasDocumentadas,
  getHidraulica,
  getPumps,
} from "@/services/pumpService";
import type { CurvaBase, Hidraulica, Pump, PumpCurve, PumpDerived } from "@/types/pump";

interface PumpContextValue {
  pumps: Pump[];
  selectedPump: Pump | null;
  selectedPumpId: string | null;
  curvaBase: CurvaBase | null;
  hidraulica: Hidraulica | null;
  derivados: PumpDerived | null;
  /** Frecuencias dibujadas en el documento de fábrica. */
  frecuenciasDocumentadas: number[];
  /** Frecuencias visibles en el gráfico (documentadas + generadas). */
  frecuencias: number[];
  curves: PumpCurve[];
  loadingPumps: boolean;
  loadingCurves: boolean;
  error: string | null;
  selectPump: (id: string) => void;
  toggleFrecuencia: (hz: number) => void;
  addFrecuencia: (hz: number) => void;
  resetFrecuencias: () => void;
  reload: () => void;
}

const PumpCtx = createContext<PumpContextValue | null>(null);

// Punto único de control del techo de 60 Hz: nada por encima llega al gráfico.
const ordenar = (list: number[]) =>
  [...new Set(list.filter((hz) => hz > 0 && hz <= HZ_MAX))].sort((a, b) => a - b);

export function PumpProvider({ children }: { children: ReactNode }) {
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [selectedPumpId, setSelectedPumpId] = useState<string | null>(null);
  const [frecuencias, setFrecuencias] = useState<number[]>([]);
  const [loadingPumps, setLoadingPumps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingPumps(true);
    setError(null);
    getPumps()
      .then((data) => {
        if (!active) return;
        setPumps(data);
        // Arranca en la primera unidad con condición de operación documentada.
        const inicial = data.find((u) => u.puntoDiseno) ?? data[0];
        setSelectedPumpId((prev) => prev ?? inicial?.id ?? null);
      })
      .catch(() => active && setError("No se pudieron cargar las bombas."))
      .finally(() => active && setLoadingPumps(false));
    return () => {
      active = false;
    };
  }, [nonce]);

  const documentadas = useMemo(
    () => (selectedPumpId ? getFrecuenciasDocumentadas(selectedPumpId) : []),
    [selectedPumpId],
  );

  // Al cambiar de bomba se vuelve al juego de frecuencias de fábrica.
  useEffect(() => setFrecuencias(documentadas), [documentadas]);

  const curvaBase = useMemo(
    () => (selectedPumpId ? getCurvaBase(selectedPumpId) : null),
    [selectedPumpId],
  );
  const hidraulica = useMemo(
    () => (selectedPumpId ? getHidraulica(selectedPumpId) : null),
    [selectedPumpId],
  );
  const selectedPump = useMemo(
    () => pumps.find((p) => p.id === selectedPumpId) ?? null,
    [pumps, selectedPumpId],
  );
  const derivados = useMemo(
    () => (selectedPump ? derivarDatos(selectedPump) : null),
    [selectedPump],
  );

  // Las curvas son cálculo puro: se recalculan al vuelo, sin ir al servicio.
  const curves = useMemo(
    () => (selectedPumpId ? buildPumpCurves(selectedPumpId, frecuencias) : []),
    [selectedPumpId, frecuencias],
  );

  const selectPump = useCallback((id: string) => setSelectedPumpId(id), []);
  const toggleFrecuencia = useCallback(
    (hz: number) =>
      setFrecuencias((prev) =>
        prev.includes(hz) ? prev.filter((f) => f !== hz) : ordenar([...prev, hz]),
      ),
    [],
  );
  const addFrecuencia = useCallback(
    (hz: number) => setFrecuencias((prev) => ordenar([...prev, hz])),
    [],
  );
  const resetFrecuencias = useCallback(() => setFrecuencias(documentadas), [documentadas]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<PumpContextValue>(
    () => ({
      pumps,
      selectedPump,
      selectedPumpId,
      curvaBase,
      hidraulica,
      derivados,
      frecuenciasDocumentadas: documentadas,
      frecuencias,
      curves,
      loadingPumps,
      loadingCurves: loadingPumps,
      error,
      selectPump,
      toggleFrecuencia,
      addFrecuencia,
      resetFrecuencias,
      reload,
    }),
    [
      pumps,
      selectedPump,
      selectedPumpId,
      curvaBase,
      hidraulica,
      derivados,
      documentadas,
      frecuencias,
      curves,
      loadingPumps,
      error,
      selectPump,
      toggleFrecuencia,
      addFrecuencia,
      resetFrecuencias,
      reload,
    ],
  );

  return <PumpCtx.Provider value={value}>{children}</PumpCtx.Provider>;
}

export function usePumps(): PumpContextValue {
  const ctx = useContext(PumpCtx);
  if (!ctx) throw new Error("usePumps debe usarse dentro de PumpProvider");
  return ctx;
}
