// Explicit integration probe; no watch timer or background polling imports this.
import { mkdirSync, writeFileSync } from 'node:fs'
import { readConfig } from '../shared/config.js'
import { addDays, israelTime, clock } from '../shared/time.js'
import { createArrivalProvider } from '../app-side/provider.js'

const today = israelTime(Date.now()).date
const config = readConfig(() => null)
let requests = 0
const provider = createArrivalProvider({
  fetchJson: async (url) => {
    requests++
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },
})
const results = []
for (const trip of [
  { ...config.trips[0], serviceDate: today },
  { ...config.trips[1], serviceDate: today },
  { ...config.trips[0], serviceDate: addDays(today, 1) },
]) {
  const start = Date.now()
  try {
    const result = await provider(trip)
    results.push({
      tripId: trip.id,
      stopCode: trip.stopCode,
      date: trip.serviceDate,
      status: 'passed',
      kind: result.kind,
      source: result.source,
      arrival: result.arrivalAt ? clock(result.arrivalAt) : null,
      durationMs: Date.now() - start,
    })
  } catch (error) {
    results.push({
      tripId: trip.id,
      stopCode: trip.stopCode,
      date: trip.serviceDate,
      status: 'failed',
      message: error.message,
    })
  }
}
mkdirSync('artifacts', { recursive: true })
writeFileSync(
  'artifacts/provider-probe.json',
  JSON.stringify(
    { checkedAt: new Date().toISOString(), requests, results },
    null,
    2,
  ),
)
console.log(JSON.stringify(results))
if (results.some((result) => result.status === 'failed')) process.exitCode = 1
