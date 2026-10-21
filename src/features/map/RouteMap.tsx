import { useEffect, useRef, useState } from "react"
import {
  type GeoJSONSource,
  LngLatBounds,
  Map,
  type MapMouseEvent,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import "maplibre-gl/dist/maplibre-gl.css"

setWorkerUrl(maplibreWorkerUrl)
import { formatEta, formatForecastTick, formatRate } from "../../shared/format"
import { RISK_BY_VALUE, RISK_COLORS, riskLabel, routeColor } from "../../shared/risk"
import type { Plan, RiskName } from "../../shared/types"

const MAP_STYLE = "https://tiles.openfreemap.org/styles/bright"
const RISK_LEVELS: RiskName[] = ["low", "moderate", "high", "severe", "no_travel"]

interface RouteMapProps {
  plan: Plan | null
  selectedId: string | null
  onSelect: (id: string) => void
}

interface FeatureCollection {
  type: "FeatureCollection"
  features: Array<{
    type: "Feature"
    geometry:
      | { type: "LineString"; coordinates: [number, number][] }
      | { type: "Point"; coordinates: [number, number] }
    properties: Record<string, string | number>
  }>
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] }

type LayerEvent = MapMouseEvent & {
  features?: Array<{
    geometry: { type: string; coordinates: number[] }
    properties?: Record<string, unknown> | null
  }>
}

export function RouteMap({ plan, selectedId, onSelect }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const popupRef = useRef<Popup | null>(null)
  const onSelectRef = useRef(onSelect)
  const fittedPlan = useRef<Plan | null>(null)
  const [ready, setReady] = useState(false)
  const [hour, setHour] = useState(0)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    setHour(0)
    fittedPlan.current = null
  }, [plan])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new Map({
      container,
      style: MAP_STYLE,
      center: [-96, 38.5],
      zoom: 3.4,
    })
    map.addControl(new NavigationControl(), "top-right")
    mapRef.current = map
    const observer = new ResizeObserver(() => map.resize())
    observer.observe(container)
    let active = true
    map.on("load", () => {
      if (!active) return
      addLayers(map)
      setReady(true)
    })
    return () => {
      active = false
      observer.disconnect()
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    source(map, "routes").setData(routeCollection(plan, selectedId))
    source(map, "checkpoints").setData(checkpointCollection(plan, selectedId))
    source(map, "places").setData(placeCollection(plan))
    if (!plan || fittedPlan.current === plan) return
    fittedPlan.current = plan
    const bounds = new LngLatBounds()
    for (const route of plan.routes) {
      for (const coordinate of route.geometry.coordinates) bounds.extend(coordinate)
    }
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 56, duration: 500 })
  }, [plan, ready, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    source(map, "corridor").setData(corridorCollection(plan, hour))
  }, [plan, ready, hour])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const onCheckpoint = (event: LayerEvent) => {
      const feature = event.features?.[0]
      if (!feature || feature.geometry.type !== "Point") return
      const coordinates = feature.geometry.coordinates
      popupRef.current?.remove()
      popupRef.current = new Popup({ maxWidth: "280px" })
        .setLngLat([coordinates[0], coordinates[1]])
        .setDOMContent(popupContent((feature.properties as Record<string, unknown> | null) ?? null))
        .addTo(map)
    }
    const onRoute = (event: LayerEvent) => {
      if (map.queryRenderedFeatures(event.point, { layers: ["checkpoints"] }).length) return
      const id = event.features?.[0]?.properties?.id
      if (typeof id === "string") onSelectRef.current(id)
    }
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const onLeave = () => {
      map.getCanvas().style.cursor = ""
    }

    map.on("click", "checkpoints", onCheckpoint)
    map.on("click", "route-hit", onRoute)
    map.on("mouseenter", "checkpoints", onEnter)
    map.on("mouseleave", "checkpoints", onLeave)
    map.on("mouseenter", "route-hit", onEnter)
    map.on("mouseleave", "route-hit", onLeave)
    return () => {
      map.off("click", "checkpoints", onCheckpoint)
      map.off("click", "route-hit", onRoute)
      map.off("mouseenter", "checkpoints", onEnter)
      map.off("mouseleave", "checkpoints", onLeave)
      map.off("mouseenter", "route-hit", onEnter)
      map.off("mouseleave", "route-hit", onLeave)
    }
  }, [ready])

  const hourCount = plan?.heatmap.times.length ?? 0
  const safeHour = hourCount === 0 ? 0 : Math.min(hour, hourCount - 1)

  return (
    <section className="map-pane">
      <div ref={containerRef} className="map" />
      {plan && hourCount > 1 && (
        <div className="heatmap-bar">
          <div className="heatmap-heading">
            <strong>Corridor forecast</strong>
            <span>{formatForecastTick(plan.heatmap.times[safeHour], safeHour)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={hourCount - 1}
            value={safeHour}
            aria-label="Forecast hour"
            onChange={(event) => setHour(Number(event.target.value))}
          />
          <div className="slider-ends">
            <span>0 h</span>
            <span>{hourCount - 1} h</span>
          </div>
          <div className="legend">
            {RISK_LEVELS.map((level) => (
              <span key={level}>
                <i style={{ background: RISK_COLORS[level] }} />
                {riskLabel(level)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function source(map: Map, id: string): GeoJSONSource {
  const found = map.getSource(id)
  if (!found || found.type !== "geojson") throw new Error(`Missing map source ${id}`)
  return found as GeoJSONSource
}

function addLayers(map: Map) {
  map.addSource("corridor", { type: "geojson", data: EMPTY })
  map.addSource("routes", { type: "geojson", data: EMPTY })
  map.addSource("checkpoints", { type: "geojson", data: EMPTY })
  map.addSource("places", { type: "geojson", data: EMPTY })

  for (const level of RISK_LEVELS) {
    const color = RISK_COLORS[level]
    map.addLayer({
      id: `heat-${level}`,
      type: "heatmap",
      source: "corridor",
      filter: ["==", ["get", "risk"], level],
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": 0.85,
        "heatmap-radius": 32,
        "heatmap-opacity": 0.8,
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(0,0,0,0)",
          0.35,
          transparent(color, 0.45),
          1,
          transparent(color, 0.9),
        ],
      },
    })
  }

  map.addLayer({
    id: "route-hit",
    type: "line",
    source: "routes",
    paint: { "line-width": 16, "line-opacity": 0 },
  })
  map.addLayer({
    id: "route-lines",
    type: "line",
    source: "routes",
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["case", ["==", ["get", "selected"], 1], 6, 3.5],
      "line-opacity": ["case", ["==", ["get", "selected"], 1], 1, 0.5],
    },
    layout: { "line-cap": "round", "line-join": "round" },
  })
  map.addLayer({
    id: "checkpoints",
    type: "circle",
    source: "checkpoints",
    paint: {
      "circle-radius": ["case", ["==", ["get", "selected"], 1], 7, 5],
      "circle-color": [
        "match",
        ["get", "risk"],
        "low",
        RISK_COLORS.low,
        "moderate",
        RISK_COLORS.moderate,
        "high",
        RISK_COLORS.high,
        "severe",
        RISK_COLORS.severe,
        "no_travel",
        RISK_COLORS.no_travel,
        "#9ca3af",
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#ffffff",
    },
  })
  map.addLayer({
    id: "places",
    type: "circle",
    source: "places",
    paint: {
      "circle-radius": 6,
      "circle-color": "#111827",
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  })
  map.addLayer({
    id: "place-labels",
    type: "symbol",
    source: "places",
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.15],
      "text-anchor": "top",
    },
    paint: {
      "text-color": "#111827",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.2,
    },
  })
}

function routeCollection(plan: Plan | null, selectedId: string | null): FeatureCollection {
  if (!plan) return EMPTY
  const ordered = [...plan.routes].sort(
    (left, right) => Number(left.id === selectedId) - Number(right.id === selectedId),
  )
  return {
    type: "FeatureCollection",
    features: ordered.map((route) => ({
      type: "Feature",
      geometry: route.geometry,
      properties: {
        id: route.id,
        color: routeColor(route.id),
        selected: route.id === selectedId ? 1 : 0,
      },
    })),
  }
}

function checkpointCollection(plan: Plan | null, selectedId: string | null): FeatureCollection {
  if (!plan) return EMPTY
  return {
    type: "FeatureCollection",
    features: plan.routes.flatMap((route) =>
      route.checkpoints.map((checkpoint) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [checkpoint.lon, checkpoint.lat] as [number, number],
        },
        properties: {
          routeName: route.name,
          mile: Math.round(checkpoint.mile).toString(),
          eta: formatEta(checkpoint.eta),
          risk: checkpoint.risk ?? "",
          wind: formatRate(checkpoint.wind_mph, "mph"),
          rain: formatRate(checkpoint.rain_in_hr, "in/hr"),
          snow: formatRate(checkpoint.snow_in_hr, "in/hr"),
          windRisk: checkpoint.wind_risk ?? "",
          rainRisk: checkpoint.rain_risk ?? "",
          snowRisk: checkpoint.snow_risk ?? "",
          selected: route.id === selectedId ? 1 : 0,
        },
      })),
    ),
  }
}

function placeCollection(plan: Plan | null): FeatureCollection {
  if (!plan) return EMPTY
  return {
    type: "FeatureCollection",
    features: [
      pointFeature(plan.origin.lon, plan.origin.lat, "Origin"),
      pointFeature(plan.destination.lon, plan.destination.lat, "Destination"),
    ],
  }
}

function pointFeature(lon: number, lat: number, label: string): FeatureCollection["features"][number] {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: { label },
  }
}

function corridorCollection(plan: Plan | null, hour: number): FeatureCollection {
  if (!plan) return EMPTY
  const features: FeatureCollection["features"] = []
  for (const point of plan.heatmap.points) {
    const value = point.risks[hour]
    if (value == null) continue
    const risk = RISK_BY_VALUE[value]
    if (!risk) continue
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      properties: { risk },
    })
  }
  return { type: "FeatureCollection", features }
}

function popupContent(properties: Record<string, unknown> | null): HTMLElement {
  const values = properties ?? {}
  const root = document.createElement("div")
  root.className = "popup"
  const title = document.createElement("strong")
  title.textContent = `${text(values.routeName)} · mile ${text(values.mile)}`
  root.append(title)
  addLine(root, `ETA ${text(values.eta)}`)
  addLine(root, `Risk ${riskLabel(text(values.risk))}`)
  addLine(root, `Wind ${text(values.wind)} · ${riskLabel(text(values.windRisk))}`)
  addLine(root, `Rain ${text(values.rain)} · ${riskLabel(text(values.rainRisk))}`)
  addLine(root, `Snow ${text(values.snow)} · ${riskLabel(text(values.snowRisk))}`)
  return root
}

function addLine(root: HTMLElement, value: string) {
  const line = document.createElement("p")
  line.textContent = value
  root.append(line)
}

function text(value: unknown): string {
  return value == null ? "" : String(value)
}

function transparent(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16)
  const green = Number.parseInt(hex.slice(3, 5), 16)
  const blue = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
