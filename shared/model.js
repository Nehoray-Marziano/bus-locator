import { addDays, clock, israelTime, serviceDayLabel } from './time.js'

export const FRESH_MS = 120000
export const SCHEDULE_MAX_AGE_MS = 24 * 3600000
export const SCHEDULE_LOOKAHEAD_DAYS = 7
export const REQUEST_GAP_MS = 30000

export function activeTrip(config, now, direction = null) {
  if (!config || config.error || !Array.isArray(config.trips)) return null
  const time = israelTime(now)
  const automatic = config.trips.find(
    (item) => time.minute >= item.startMinute && time.minute < item.endMinute,
  )
  const trip =
    normalizeDirection(direction) && direction !== automatic?.id
      ? config.trips.find((item) => item.id === direction)
      : automatic
  return trip
    ? {
        ...trip,
        dayOffset: automatic?.dayOffset || 0,
        serviceDate: addDays(time.date, automatic?.dayOffset || 0),
      }
    : null
}

export function normalizeDirection(value) {
  return value === 'morning' || value === 'return' ? value : null
}

// A second tap returns to automatic selection, even across a clock boundary.
export function switchedDirection(config, now, direction) {
  if (direction) return null
  const trip = activeTrip(config, now)
  return trip ? (trip.id === 'morning' ? 'return' : 'morning') : null
}

export function viewModel(
  snapshot,
  config,
  now,
  busy = false,
  direction = null,
) {
  const trip = activeTrip(config, now, direction)
  const today = israelTime(now).date
  const tomorrow = Boolean(trip && trip.serviceDate === addDays(today, 1))
  const base = {
    direction: trip?.id || null,
    manual: Boolean(normalizeDirection(direction)),
    boarding: trip?.from || 'Your stop',
    destination: trip?.to || '',
    tomorrow,
    dayLabel: trip ? serviceDayLabel(trip.serviceDate, now) : '',
    eta: '',
    checked: '',
    source: '',
    route: trip ? `${trip.from} > ${trip.to}` : 'Meitar / Jerusalem',
    number: '—',
    unit: '',
    detail: '',
    status: '',
    action: busy ? 'Checking…' : 'Refresh',
    tone: 'muted',
  }
  if (!config || config.error || !trip)
    return {
      ...base,
      status: 'SETUP',
      detail: config?.error || 'Open app settings in Zepp.',
    }
  const futureSchedule =
    snapshot?.kind === 'arrival' &&
    snapshot.source === 'scheduled' &&
    Number.isFinite(snapshot.arrivalAt) &&
    snapshot.date === israelTime(snapshot.arrivalAt).date &&
    snapshot.date >= trip.serviceDate &&
    snapshot.date <= addDays(today, SCHEDULE_LOOKAHEAD_DAYS)
  if (
    !snapshot ||
    snapshot.tripId !== trip.id ||
    (snapshot.date !== trip.serviceDate && !futureSchedule) ||
    (snapshot.kind === 'arrival' &&
      (!Number.isFinite(snapshot.arrivalAt) ||
        snapshot.date !== israelTime(snapshot.arrivalAt).date))
  )
    return {
      ...base,
      status: busy ? 'CHECKING' : 'NO UPDATE',
      detail: 'Tap Refresh to check arrivals.',
    }
  if (snapshot.kind === 'error')
    return {
      ...base,
      status: 'UNAVAILABLE',
      detail: snapshot.message || 'Check phone and internet.',
    }
  const age = now - snapshot.checkedAt
  let source = snapshot.source || 'live'
  let arrivalAt = snapshot.arrivalAt
  if (
    source === 'live' &&
    age > FRESH_MS &&
    Number.isFinite(snapshot.scheduledAt) &&
    snapshot.scheduledAt >= now
  ) {
    source = 'scheduled'
    arrivalAt = snapshot.scheduledAt
  }
  const maxAge = source === 'scheduled' ? SCHEDULE_MAX_AGE_MS : FRESH_MS
  if (!Number.isFinite(age) || age < -30000 || age > maxAge)
    return {
      ...base,
      status: 'OLD UPDATE',
      detail: 'Tap Refresh for an update.',
      tone: 'warning',
    }
  if (snapshot.kind === 'empty')
    return {
      ...base,
      status: snapshot.demo ? 'DEMO · NO PREDICTION' : 'NO PREDICTION',
      detail: 'No upcoming arrival was returned.',
    }
  const remaining = arrivalAt - now
  const seconds = Math.max(0, Math.floor(age / 1000))
  const ageLabel =
    seconds < 60
      ? `${seconds}s`
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m`
        : `${Math.floor(seconds / 3600)}h`
  if (remaining < -30000)
    return {
      ...base,
      status: 'UPDATE NEEDED',
      detail: 'Tap Refresh for the next arrival.',
    }
  return {
    ...base,
    tomorrow: israelTime(arrivalAt).date === addDays(today, 1),
    dayLabel: serviceDayLabel(israelTime(arrivalAt).date, now),
    number: remaining <= 0 ? 'Due' : String(Math.ceil(remaining / 60000)),
    unit: remaining <= 0 ? 'at your stop' : 'min to your stop',
    source,
    status: snapshot.demo
      ? 'DEMO · SAMPLE DATA'
      : source === 'live'
        ? 'LIVE PREDICTION'
        : 'SCHEDULED',
    eta: clock(arrivalAt),
    checked: `Checked ${ageLabel} ago`,
    detail:
      source === 'scheduled'
        ? 'Timetable · not a live prediction'
        : 'Live arrival prediction',
    updated: `ETA ${clock(arrivalAt)}`,
    tone: source === 'scheduled' ? 'warning' : 'primary',
  }
}

export function validateArrival(
  data,
  tripId,
  now,
  serviceDate = israelTime(now).date,
) {
  const source = data?.source || 'live'
  const maxAge = source === 'scheduled' ? SCHEDULE_MAX_AGE_MS : FRESH_MS
  if (
    !data ||
    data.tripId !== tripId ||
    !['live', 'scheduled'].includes(source) ||
    !Number.isFinite(data.checkedAt) ||
    now - data.checkedAt > maxAge ||
    data.checkedAt > now + 30000
  )
    throw new Error('Invalid or expired prediction')
  if (!['arrival', 'empty'].includes(data.kind))
    throw new Error('Invalid prediction type')
  const validTime = (time, scheduled) =>
    Number.isFinite(time) &&
    time >= now - 30000 &&
    (scheduled
      ? israelTime(time).date >= serviceDate &&
        israelTime(time).date <=
          addDays(israelTime(now).date, SCHEDULE_LOOKAHEAD_DAYS)
      : time <= now + 6 * 3600000 && israelTime(time).date === serviceDate)
  if (
    data.kind === 'arrival' &&
    (!validTime(data.arrivalAt, source === 'scheduled') ||
      typeof data.stopName !== 'string' ||
      typeof data.lineLabel !== 'string')
  )
    throw new Error('Invalid arrival')
  return {
    kind: data.kind,
    tripId,
    date:
      data.kind === 'arrival' ? israelTime(data.arrivalAt).date : serviceDate,
    source,
    checkedAt: data.checkedAt,
    arrivalAt: data.arrivalAt,
    scheduledAt:
      validTime(data.scheduledAt, true) &&
      israelTime(data.scheduledAt).date === israelTime(data.arrivalAt).date
        ? data.scheduledAt
        : undefined,
    stopName: data.stopName?.slice(0, 48),
    lineLabel: data.lineLabel?.slice(0, 16),
  }
}
