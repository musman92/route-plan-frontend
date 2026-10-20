import type { CSSProperties } from "react"
import { formatDuration, formatEta, formatLoad, formatMiles } from "../../shared/format"
import { routeColor } from "../../shared/risk"
import type { Plan, RouteOption } from "../../shared/types"

interface RouteListProps {
  plan: Plan | null
  selectedId: string | null
  onSelect: (id: string) => void
}

export function RouteList({ plan, selectedId, onSelect }: RouteListProps) {
  if (!plan) {
    return <p className="empty">Enter a trip to compare routes.</p>
  }

  const routes = [...plan.routes].sort(
    (left, right) => Number(right.recommended) - Number(left.recommended),
  )
  const scored = plan.routes.some((route) => route.recommended)

  return (
    <section className="results">
      <p className="resolved">
        {shortPlace(plan.origin.label)} → {shortPlace(plan.destination.label)}
      </p>
      <p className="meta">
        {formatLoad(plan.load_lbs)} · departs {formatEta(plan.departure)} · every {plan.sample_miles}{" "}
        mi
      </p>
      {!scored && (
        <p className="note">The forecast does not cover this departure, so no route is recommended.</p>
      )}
      <div className="route-list">
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            selected={route.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}

function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: RouteOption
  selected: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={selected ? "route selected" : "route"}
      style={{ "--route": routeColor(route.id) } as CSSProperties}
      aria-pressed={selected}
      onClick={() => onSelect(route.id)}
    >
      <span className="route-heading">
        <strong>{route.name}</strong>
        {route.recommended && <span className="badge">Recommended</span>}
      </span>
      <span className="route-summary">
        {formatMiles(route.distance_miles)} · {formatDuration(route.duration_minutes)} ·{" "}
        {route.checkpoints.length} checkpoints
      </span>
      <span className="risk-grid">
        <RiskStat label="No travel" miles={route.no_travel_miles} />
        <RiskStat label="Severe" miles={route.severe_miles} />
        <RiskStat label="High" miles={route.high_miles} />
        <RiskStat label="Moderate" miles={route.moderate_miles} />
        <RiskStat label="Low" miles={route.low_miles} />
        <span>
          Avg {route.average_risk === null ? "—" : route.average_risk.toFixed(2)}
        </span>
      </span>
      {route.unknown_miles > 0 && (
        <span className="note">Forecast unavailable for {formatMiles(route.unknown_miles, 1)}</span>
      )}
    </button>
  )
}

function RiskStat({ label, miles }: { label: string; miles: number }) {
  return (
    <span>
      {label} {formatMiles(miles, miles > 0 && miles < 10 ? 1 : 0)}
    </span>
  )
}

function shortPlace(label: string): string {
  return label.split(",")[0]
}
