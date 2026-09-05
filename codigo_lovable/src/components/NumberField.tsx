import { useEffect, useId, useRef, useState } from "react";

interface Props {
  label: string;
  suffix: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Valor máximo admitido; por encima el campo se marca en rojo. */
  max?: number;
}

/** Sólo dígitos, un signo menos inicial y un único separador decimal (coma o punto). */
const FORMATO = /^-?\d*[.,]?\d*$/;
/** Textos que aún no son un número: el usuario está a medio escribir. */
const INCOMPLETO = new Set(["", "-", ".", ",", "-.", "-,"]);

const aTexto = (v: number | null) => (v === null ? "" : String(v));

function parsear(texto: string): number | null {
  if (INCOMPLETO.has(texto)) return null;
  const n = Number(texto.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function NumberField({ label, suffix, value, onChange, max }: Props) {
  const id = useId();
  // El texto se guarda tal cual lo escribe el usuario. Si sólo guardáramos el
  // número, formas intermedias como "57," o "0." se borrarían al teclearlas y
  // no habría manera de escribir un decimal.
  const [texto, setTexto] = useState(() => aTexto(value));
  const emitido = useRef<number | null>(value);

  // Refresca la caja cuando el valor cambia desde fuera (LIMPIAR, cambio de
  // bomba), sin pisar lo que el usuario está escribiendo.
  useEffect(() => {
    if (value !== emitido.current) {
      emitido.current = value;
      setTexto(aTexto(value));
    }
  }, [value]);

  const invalid = value !== null && (value < 0 || (max !== undefined && value > max));

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="panel-title">
        {label}
      </label>
      <div
        className="flex items-center gap-1 rounded-[6px] border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring"
        style={{ borderColor: invalid ? "var(--estado-critico)" : "var(--input)" }}
      >
        <input
          id={id}
          inputMode="decimal"
          aria-invalid={invalid}
          {...(max !== undefined ? { "aria-valuemax": max } : {})}
          title={
            invalid && max !== undefined && (value ?? 0) > max
              ? `El máximo es ${max} ${suffix}.`
              : undefined
          }
          className="num w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none"
          value={texto}
          onChange={(e) => {
            const raw = e.target.value;
            if (!FORMATO.test(raw)) return;
            setTexto(raw);
            const parsed = parsear(raw);
            emitido.current = parsed;
            onChange(parsed);
          }}
          onBlur={() => {
            // Al salir del campo se normaliza: "57," → "57", "" se queda vacío.
            const parsed = parsear(texto);
            if (aTexto(parsed) !== texto) setTexto(aTexto(parsed));
          }}
        />
        {invalid && (
          <span className="text-[12px] font-bold" style={{ color: "var(--estado-critico)" }}>
            !
          </span>
        )}
        <span className="shrink-0 text-[11px] text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}
