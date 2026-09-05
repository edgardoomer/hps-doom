export function num(value: number, decimals = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function int(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function unidad(value: number, unit: string, decimals = 1): string {
  return `${num(value, decimals)} ${unit}`;
}