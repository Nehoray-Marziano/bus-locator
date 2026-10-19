import { FRESH_MS } from '../shared/model.js'
import { parseIsraelTimestamp } from '../shared/time.js'

export const MOT_BASE = 'https://api.bus.gov.il/prod/mot-scheduler-prod/api/en'

export function arrivalUrl(trip) {
  // These route descriptors were checked against the public MOT planner. The #
  // represents all route alternatives and must be encoded as part of the query.
  return `${MOT_BASE}/Calendar/GetRouteCalendarAtStopsByStopCodes?stopCodes=${trip.stopCode}&routeDesc=${encodeURIComponent(trip.routeDesc)}`
}

export function normalizeArrivals(body, trip, receivedAt) {
  if (
    !body ||
    body.success !== true ||
    !body.data ||
    !Object.prototype.hasOwnProperty.call(body.data, trip.stopCode)
  )
    throw new Error('Invalid arrival response')
  const stop = body.data[trip.stopCode]
  // The API returns a literal null for a valid stop with no upcoming service.
  if (stop === null)
    return { kind: 'empty', tripId: trip.id, checkedAt: receivedAt }
  if (
    String(stop.stopCode) !== trip.stopCode ||
    !Array.isArray(stop.stopTimes) ||
    stop.isFutureSearch !== false
  )
    throw new Error('Wrong stop or future search')
  const checkedAt = parseIsraelTimestamp(stop.startTime, receivedAt)
  if (
    !Number.isFinite(checkedAt) ||
    receivedAt - checkedAt > FRESH_MS ||
    checkedAt > receivedAt + 30000
  )
    throw new Error('Expired provider response')
  const candidates = stop.stopTimes
    .flatMap((entry) => {
      if (!entry || entry.isRealTime !== true) return []
      const arrivalAt = parseIsraelTimestamp(entry.arrivalTime, checkedAt)
      if (
        !Number.isFinite(arrivalAt) ||
        arrivalAt < receivedAt - 30000 ||
        arrivalAt > receivedAt + 6 * 3600000
      )
        return []
      return [{ arrivalAt }]
    })
    .sort((a, b) => a.arrivalAt - b.arrivalAt)
  return candidates.length
    ? {
        kind: 'arrival',
        tripId: trip.id,
        checkedAt,
        arrivalAt: candidates[0].arrivalAt,
        lineLabel: '440',
        stopName: trip.stopName,
      }
    : { kind: 'empty', tripId: trip.id, checkedAt }
}

export function createArrivalProvider({ fetchJson, now = Date.now }) {
  return async (trip) =>
    normalizeArrivals(await fetchJson(arrivalUrl(trip)), trip, now())
}
