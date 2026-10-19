import { addDays, clock, israelTime } from './time.js'

export const FRESH_MS = 120000
export const SCHEDULE_MAX_AGE_MS = 24 * 3600000
export const REQUEST_GAP_MS = 30000

export function activeTrip(config, now) {
  if (!config || config.error || !Array.isArray(config.trips)) return null
  const time = israelTime(now)
  const trip = config.trips.find(
    (item) => time.minute >= item.startMinute && time.minute < item.endMinute,
  )
  return trip
    ? { ...trip, serviceDate: addDays(time.date, trip.dayOffset || 0) }
    : null
}

export function viewModel(snapshot, config, now, busy = false) {
  const trip = activeTrip(config, now)
  const tomorrow = Boolean(trip && trip.serviceDate !== israelTime(now).date)
  const base = {
    boarding: trip?.from || 'Your stop',
    destination: trip?.to || '',
    tomorrow,
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
  if (
    !snapshot ||
    snapshot.tripId !== trip.id ||
    snapshot.date !== trip.serviceDate
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
  const validTime = (time, hours) =>
    Number.isFinite(time) &&
    time >= now - 30000 &&
    time <= now + hours * 3600000 &&
    israelTime(time).date === serviceDate
  if (
    data.kind === 'arrival' &&
    (!validTime(data.arrivalAt, source === 'live' ? 6 : 36) ||
      typeof data.stopName !== 'string' ||
      typeof data.lineLabel !== 'string')
  )
    throw new Error('Invalid arrival')
  return {
    kind: data.kind,
    tripId,
    date: serviceDate,
    source,
    checkedAt: data.checkedAt,
    arrivalAt: data.arrivalAt,
    scheduledAt: validTime(data.scheduledAt, 36) ? data.scheduledAt : undefined,
    stopName: data.stopName?.slice(0, 48),
    lineLabel: data.lineLabel?.slice(0, 16),
  }
}
