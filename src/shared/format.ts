export function formatMiles(miles: number, digits = 0): string {
  return `${miles.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })} mi`
}

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes)
  const hours = Math.floor(rounded / 60)
  const mins = rounded % 60
  if (hours === 0) return `${mins} min`
  return `${hours} h ${mins} min`
}

export function formatEta(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function formatForecastTick(iso: string, index: number): string {
  const clock = new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
  })
  return index === 0 ? `Now · ${clock}` : `+${index} h · ${clock}`
}

export function formatLoad(pounds: number): string {
  return `${Math.round(pounds).toLocaleString()} lb`
}

export function formatRate(value: number | null, unit: string): string {
  if (value === null) return "—"
  return `${value.toFixed(2)} ${unit}`
}
