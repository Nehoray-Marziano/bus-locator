// Explicit integration check; never imported by the watch. No continuous polling.
import { mkdirSync, writeFileSync } from 'node:fs'
import { readConfig } from '../shared/config.js'
import { arrivalUrl, normalizeArrivals } from '../app-side/provider.js'

const results = []
for (const trip of readConfig(() => null).trips) {
  try {
    const start = Date.now()
    const response = await fetch(arrivalUrl(trip), {
      signal: AbortSignal.timeout(8000),
    })
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
    const body = await response.json()
    const result = normalizeArrivals(body, trip, Date.now())
    results.push({
      tripId: trip.id,
      stopCode: trip.stopCode,
      status: 'passed',
      kind: result.kind,
      bytes: JSON.stringify(body).length,
      durationMs: Date.now() - start,
    })
  } catch (error) {
    results.push({
      tripId: trip.id,
      stopCode: trip.stopCode,
      status: 'failed',
      message: error.message,
    })
  }
}
mkdirSync('artifacts', { recursive: true })
writeFileSync(
  'artifacts/provider-probe.json',
  JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2),
)
console.log(JSON.stringify(results))
if (results.some((result) => result.status === 'failed')) process.exitCode = 1
