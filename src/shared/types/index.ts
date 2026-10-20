export type RiskName = "low" | "moderate" | "high" | "severe" | "no_travel"

export interface PlanInput {
  origin: string
  destination: string
  departure: string
  load_lbs: number
  sample_miles: 10 | 25 | 50
}

export interface Checkpoint {
  lat: number
  lon: number
  mile: number
  eta: string
  wind_mph: number | null
  rain_in_hr: number | null
  snow_in_hr: number | null
  wind_risk: RiskName | null
  rain_risk: RiskName | null
  snow_risk: RiskName | null
  risk: RiskName | null
}

export interface RouteOption {
  id: string
  name: string
  recommended: boolean
  distance_miles: number
  duration_minutes: number
  no_travel_miles: number
  severe_miles: number
  high_miles: number
  moderate_miles: number
  low_miles: number
  unknown_miles: number
  average_risk: number | null
  geometry: {
    type: "LineString"
    coordinates: [number, number][]
  }
  checkpoints: Checkpoint[]
}

export interface HeatmapPoint {
  lat: number
  lon: number
  risks: Array<number | null>
}

export interface Plan {
  origin: Place
  destination: Place
  departure: string
  load_lbs: number
  sample_miles: number
  routes: RouteOption[]
  heatmap: {
    times: string[]
    points: HeatmapPoint[]
  }
}

export interface Place {
  label: string
  lat: number
  lon: number
}
