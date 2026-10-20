import type { Plan, PlanInput } from "../types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

export async function planTrip(input: PlanInput): Promise<Plan> {
  const response = await fetch(`${API_URL}/api/plan/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error("The server returned an unreadable response.")
  }
  if (!response.ok) {
    throw new Error(errorMessage(body))
  }
  return body as Plan
}

function errorMessage(body: unknown): string {
  if (isRecord(body) && typeof body.error === "string") {
    return body.error
  }
  if (isRecord(body)) {
    const parts = Object.entries(body).flatMap(([key, value]) =>
      Array.isArray(value) ? [`${fieldLabel(key)}: ${value.join(" ")}`] : [],
    )
    if (parts.length) return parts.join(" ")
  }
  return "Could not plan that trip."
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function fieldLabel(key: string): string {
  if (key === "sample_miles") return "Sample interval"
  if (key === "load_lbs") return "Load weight"
  return key.charAt(0).toUpperCase() + key.slice(1)
}
