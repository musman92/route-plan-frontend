import type { RiskName } from "./types"

export const RISK_COLORS: Record<RiskName, string> = {
  low: "#2f9e44",
  moderate: "#e6b325",
  high: "#f08c00",
  severe: "#e03131",
  no_travel: "#6741d9",
}

export const RISK_BY_VALUE: Record<number, RiskName> = {
  1: "low",
  2: "moderate",
  3: "high",
  4: "severe",
  5: "no_travel",
}

export const ROUTE_COLORS = ["#1d4ed8", "#0f766e", "#7c3aed"]

export function routeColor(id: string): string {
  const index = Number(id.replace("route-", "")) - 1
  return ROUTE_COLORS[index] ?? ROUTE_COLORS[0]
}

export function riskLabel(risk: string | null | undefined): string {
  if (!risk) return "Unavailable"
  if (risk === "no_travel") return "No travel"
  return risk.charAt(0).toUpperCase() + risk.slice(1)
}
