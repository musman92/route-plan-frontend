import { useState, type FormEvent } from "react"
import type { PlanInput } from "../../shared/types"

interface TripFormProps {
  loading: boolean
  error: string | null
  onSubmit: (input: PlanInput) => void
}

export function TripForm({ loading, error, onSubmit }: TripFormProps) {
  const [origin, setOrigin] = useState("Chicago, IL")
  const [destination, setDestination] = useState("New York, NY")
  const [departure, setDeparture] = useState(tomorrowMorning)
  const [load, setLoad] = useState("40000")
  const [sampleMiles, setSampleMiles] = useState<10 | 25 | 50>(25)
  const [localError, setLocalError] = useState<string | null>(null)
  const message = localError ?? error

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const weight = Number(load)
    if (!origin.trim() || !destination.trim()) {
      setLocalError("Enter an origin and a destination.")
      return
    }
    if (!departure || Number.isNaN(new Date(departure).getTime())) {
      setLocalError("Enter a departure date and time.")
      return
    }
    if (!Number.isFinite(weight) || weight < 0) {
      setLocalError("Enter a load weight in pounds.")
      return
    }
    setLocalError(null)
    onSubmit({
      origin: origin.trim(),
      destination: destination.trim(),
      departure: new Date(departure).toISOString(),
      load_lbs: weight,
      sample_miles: sampleMiles,
    })
  }

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      <label>
        Origin
        <input value={origin} onChange={(event) => setOrigin(event.target.value)} required />
      </label>
      <label>
        Destination
        <input
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          required
        />
      </label>
      <label>
        Departure
        <input
          type="datetime-local"
          value={departure}
          onChange={(event) => setDeparture(event.target.value)}
          required
        />
      </label>
      <label>
        Load weight (lb)
        <input
          type="number"
          min={0}
          step={100}
          value={load}
          onChange={(event) => setLoad(event.target.value)}
          required
        />
      </label>
      <label>
        Sample every
        <select
          value={sampleMiles}
          onChange={(event) => setSampleMiles(Number(event.target.value) as 10 | 25 | 50)}
        >
          <option value={10}>10 miles</option>
          <option value={25}>25 miles</option>
          <option value={50}>50 miles</option>
        </select>
      </label>
      {message && <p className="error">{message}</p>}
      <button className="primary" type="submit" disabled={loading}>
        {loading ? "Finding routes…" : "Find routes"}
      </button>
    </form>
  )
}

function tomorrowMorning(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(8, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
