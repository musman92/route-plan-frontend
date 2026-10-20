import { useState } from "react"
import { RouteMap } from "../features/map/RouteMap"
import { TripForm } from "../features/planner/TripForm"
import { RouteList } from "../features/results/RouteList"
import { planTrip } from "../shared/api/client"
import type { Plan, PlanInput } from "../shared/types"

export default function App() {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(input: PlanInput) {
    setLoading(true)
    setError(null)
    try {
      const next = await planTrip(input)
      setPlan(next)
      const recommended = next.routes.find((route) => route.recommended)
      setSelectedId(recommended?.id ?? next.routes[0]?.id ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not plan that trip.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <aside className="panel">
        <header className="title">
          <h1>Weather-Aware Truck Routing</h1>
          <p>Compare routes by weather risk and travel time.</p>
        </header>
        <TripForm loading={loading} error={error} onSubmit={handleSubmit} />
        {loading && <p className="status">Building routes and sampling weather…</p>}
        {(!loading || plan) && (
          <RouteList plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </aside>
      <RouteMap plan={plan} selectedId={selectedId} onSelect={setSelectedId} />
    </main>
  )
}
