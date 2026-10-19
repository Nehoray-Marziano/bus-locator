import { readConfig } from '../shared/config.js'
import { activeTrip, REQUEST_GAP_MS, validateArrival } from '../shared/model.js'
import { withDeadline } from '../shared/deadline.js'

// Request only on opening or tapping. No intervals, alarms, or scheduled jobs.
export function createCommuteService({
  getSetting,
  fetchArrival,
  now = Date.now,
}) {
  let currentKey = ''
  let cached = null
  let inFlight = null
  let nextRequestAt = 0

  return async function getCommute() {
    const config = readConfig(getSetting)
    const time = now()
    const trip = activeTrip(config, time)
    if (!trip) return { config, snapshot: null }
    const date = trip.serviceDate
    const key = `${config.demo}|${trip.id}|${date}`
    if (key !== currentKey) {
      currentKey = key
      cached = null
      inFlight = null
      nextRequestAt = 0
    }
    if (inFlight) return inFlight
    if (time < nextRequestAt) return { config, snapshot: cached }
    nextRequestAt = time + REQUEST_GAP_MS
    if (config.demo) {
      cached = {
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
      return { config, snapshot: cached }
    }
    inFlight = (async () => {
      try {
        const data = await withDeadline(fetchArrival(trip), 9000)
        const snapshot = validateArrival(data, trip.id, now(), trip.serviceDate)
        if (currentKey === key) cached = snapshot
        return { config, snapshot }
      } catch {
        // Retain a still-valid prediction without resetting its source timestamp.
        const snapshot =
          cached?.kind === 'arrival'
            ? cached
            : {
                kind: 'error',
                tripId: trip.id,
                date,
                message: 'Check phone and internet; retry.',
              }
        if (currentKey === key) cached = snapshot
        return { config, snapshot }
      } finally {
        if (currentKey === key) inFlight = null
      }
    })()
    return inFlight
  }
}
