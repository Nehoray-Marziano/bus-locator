import { FRESH_MS, SCHEDULE_LOOKAHEAD_DAYS } from '../shared/model.js'
import { addDays, israelTime, parseIsraelTimestamp } from '../shared/time.js'
import { withDeadline } from '../shared/deadline.js'

export const MOT_BASE = 'https://api.bus.gov.il/prod/mot-scheduler-prod/api/en'
const SCHEDULE_CACHE_MS = 30 * 60000

export function arrivalUrl(trip) {
  return `${MOT_BASE}/Calendar/GetRouteCalendarAtStopsByStopCodes?stopCodes=${trip.stopCode}&routeDesc=${encodeURIComponent(trip.routeDesc)}`
}

export function scheduleUrl(trip, date) {
  return `${MOT_BASE}/Calendar/GetRouteDailyCalendar?routeId=${trip.routeId}&startStopId=${trip.stopId}&endStopId=${trip.endStopId}&day=${encodeURIComponent(`${date}T00:00:00Z`)}`
}

function arrival(trip, checkedAt, arrivalAt, source, scheduledAt) {
  return {
    kind: 'arrival',
    tripId: trip.id,
    checkedAt,
    arrivalAt,
    source,
    scheduledAt,
    lineLabel: '440',
    stopName: trip.stopName,
  }
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
  const date = trip.serviceDate || israelTime(receivedAt).date
  const valid = (value) =>
    Number.isFinite(value) &&
    value >= receivedAt - 30000 &&
    value <= receivedAt + 6 * 3600000 &&
    israelTime(value).date === date
  const candidates = stop.stopTimes
    .flatMap((entry) => {
      if (
        !entry ||
        entry.isCanceled === true ||
        ![true, false].includes(entry.isRealTime)
      )
        return []
      const arrivalAt = parseIsraelTimestamp(entry.arrivalTime, checkedAt)
      if (!valid(arrivalAt)) return []
      const scheduledAt = parseIsraelTimestamp(
        entry.staticArrivalTime,
        checkedAt,
      )
      return [
        {
          arrivalAt,
          source: entry.isRealTime === true ? 'live' : 'scheduled',
          scheduledAt: valid(scheduledAt) ? scheduledAt : undefined,
        },
      ]
    })
    .sort((a, b) => a.arrivalAt - b.arrivalAt)
  const chosen = candidates[0]
  return chosen
    ? arrival(
        trip,
        checkedAt,
        chosen.arrivalAt,
        chosen.source,
        chosen.scheduledAt,
      )
    : { kind: 'empty', tripId: trip.id, checkedAt }
}

// The daily calendar is the official planner's timetable, including tomorrow.
// Validate stop AND route identity so an outdated numeric route ID cannot show
// another line. Coordinates and the destination rows are never retained.
export function normalizeSchedule(body, trip, date, receivedAt) {
  if (
    !body ||
    body.success !== true ||
    !body.data ||
    !Array.isArray(body.data.start)
  )
    throw new Error('Invalid timetable response')
  return body.data.start
    .flatMap((entry) => {
      if (
        !entry ||
        String(entry.stopcode) !== trip.stopCode ||
        entry.routeDesc !== trip.routeDesc ||
        entry.routeId !== trip.routeId
      )
        throw new Error('Timetable route or stop changed')
      if (entry.isCanceled === true) return []
      const time = parseIsraelTimestamp(entry.departureTime, receivedAt)
      return Number.isFinite(time) && israelTime(time).date === date
        ? [time]
        : []
    })
    .sort((a, b) => a - b)
}

export function createArrivalProvider({ fetchJson, now = Date.now }) {
  const schedules = {}
  return async (trip) => {
    const time = now()
    const date = trip.serviceDate || israelTime(time).date
    // Keep the whole on-demand search inside the phone/watch request deadlines.
    // Empty dates are cached too; no periodic or background lookup is added.
    const deadline = time + 8000
    const request = (url, maxWait) => {
      const remaining = deadline - now()
      if (remaining <= 0) throw new Error('Request timed out')
      return withDeadline(fetchJson(url), Math.min(maxWait, remaining))
    }
    if (date === israelTime(time).date) {
      try {
        const current = normalizeArrivals(
          await request(arrivalUrl(trip), 3500),
          trip,
          now(),
        )
        if (current.kind === 'arrival') return current
      } catch {
        /* Try the timetable when the live service is unreachable. */
      }
    }
    const lastDate = addDays(israelTime(time).date, SCHEDULE_LOOKAHEAD_DAYS)
    const days = (schedules[trip.id] ||= {})
    for (const saved of Object.keys(days))
      if (
        saved < date ||
        saved > lastDate ||
        now() - days[saved].checkedAt >= SCHEDULE_CACHE_MS ||
        days[saved].checkedAt > now()
      )
        delete days[saved]
    for (let day = date; day <= lastDate; day = addDays(day, 1)) {
      let cached = days[day]
      if (!cached || now() - cached.checkedAt >= SCHEDULE_CACHE_MS) {
        const body = await request(scheduleUrl(trip, day), 4500)
        cached = {
          checkedAt: now(),
          times: normalizeSchedule(body, trip, day, now()),
        }
        days[day] = cached
      }
      const next = cached.times.find((value) => value >= now() - 30000)
      if (next !== undefined)
        return arrival(trip, cached.checkedAt, next, 'scheduled', next)
    }
    return {
      kind: 'empty',
      tripId: trip.id,
      source: 'scheduled',
      checkedAt: time,
    }
  }
}
