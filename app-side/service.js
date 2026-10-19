import { readConfig } from '../shared/config.js'
import { activeTrip, REQUEST_GAP_MS, validateArrival } from '../shared/model.js'
import { withDeadline } from '../shared/deadline.js'

// Two bounded slots preserve cooldowns when the user swaps directions rapidly.
// Each retains only its latest service date/mode, with no background requests.
export function createCommuteService({
  getSetting,
  fetchArrival,
  now = Date.now,
}) {
  const journeys = {}
  return async function getCommute(direction = null) {
    const config = readConfig(getSetting)
    const time = now()
    const trip = activeTrip(config, time, direction)
    if (!trip) return { config, snapshot: null }
    const date = trip.serviceDate
    const key = `${config.demo}|${date}`
    let state = journeys[trip.id]
    if (!state || state.key !== key) {
      state = { key, cached: null, inFlight: null, nextRequestAt: 0 }
      journeys[trip.id] = state
    }
    if (state.inFlight) return { config, snapshot: await state.inFlight }
    if (time < state.nextRequestAt) return { config, snapshot: state.cached }
    state.nextRequestAt = time + REQUEST_GAP_MS
    if (config.demo) {
      state.cached = {
        kind: 'arrival',
        tripId: trip.id,
        date,
        checkedAt: time,
        arrivalAt: trip.dayOffset
          ? Date.parse(`${date}T04:15:00Z`)
          : time + 12 * 60000,
        source: trip.dayOffset ? 'scheduled' : 'live',
        lineLabel: 'Sample bus',
        stopName: 'Sample stop',
        demo: true,
      }
      return { config, snapshot: state.cached }
    }
    state.inFlight = (async () => {
      try {
        const data = await withDeadline(fetchArrival(trip), 9000)
        state.cached = validateArrival(data, trip.id, now(), trip.serviceDate)
      } catch {
        // Retain the original timestamp. The watch still enforces source expiry.
        if (state.cached?.kind !== 'arrival')
          state.cached = {
            kind: 'error',
            tripId: trip.id,
            date,
            message: 'Check phone and internet; retry.',
          }
      }
      return state.cached
    })()
    try {
      return { config, snapshot: await state.inFlight }
    } finally {
      state.inFlight = null
    }
  }
}
