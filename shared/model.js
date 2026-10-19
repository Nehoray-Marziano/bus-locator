import { clock, israelTime } from './time.js'

export const FRESH_MS = 120000
export const REQUEST_GAP_MS = 30000

export function activeTrip(config, now) {
  if (!config || config.error || !Array.isArray(config.trips)) return null
  const time = israelTime(now)
  return (
    config.trips.find(
      (trip) => time.minute >= trip.startMinute && time.minute < trip.endMinute,
    ) || null
  )
}

export function viewModel(snapshot, config, now, busy = false) {
  const trip = activeTrip(config, now)
  const base = {
    boarding: trip?.from || 'Your stop',
    destination: trip?.to || 'Your commute',
    origin: trip?.from || 'Meitar / Jerusalem',
    stopName: trip?.stopName || '',
    stopCode: trip?.stopCode || '',
    eta: '',
    checked: '',
    route: trip ? `${trip.from} > ${trip.to}` : 'Meitar / Jerusalem',
    number: '—',
    unit: '',
    detail: '',
    status: '',
    action: busy ? 'Checking…' : 'Refresh',
    tone: 'muted',
  }
  if (!config || config.error)
    return {
      ...base,
      status: 'SETUP',
      detail: config?.error || 'Open app settings in Zepp.',
    }
  if (!trip)
    return {
      ...base,
      status: 'SETUP',
      detail: 'Check commute settings in Zepp.',
    }
  if (
    !snapshot ||
    snapshot.tripId !== trip.id ||
    snapshot.date !== israelTime(now).date
  ) {
    return {
      ...base,
      status: busy ? 'CHECKING' : 'NO UPDATE',
      detail: busy
        ? 'Connecting through your phone'
        : 'Tap Refresh for this journey.',
    }
  }
  if (snapshot.kind === 'error')
    return {
      ...base,
      status: 'UNAVAILABLE',
      detail: snapshot.message || 'Check phone connection; retry.',
    }
  const age = now - snapshot.checkedAt
  if (!Number.isFinite(age) || age < -30000 || age > FRESH_MS) {
    return {
      ...base,
      status: 'OLD UPDATE',
      detail: 'Prediction expired. Tap Refresh.',
      tone: 'warning',
    }
  }
  if (snapshot.kind === 'empty')
    return {
      ...base,
      status: snapshot.demo ? 'DEMO · NO PREDICTION' : 'NO PREDICTION',
      detail: 'No live arrival reported for this bus.',
    }
  const remaining = snapshot.arrivalAt - now
  if (remaining < -30000)
    return {
      ...base,
      status: 'UPDATE NEEDED',
      detail: 'Arrival time passed. Tap Refresh.',
    }
  return {
    ...base,
    number: remaining <= 0 ? 'Due' : String(Math.ceil(remaining / 60000)),
    unit: remaining <= 0 ? 'at your stop' : 'min to your stop',
    status: snapshot.demo ? 'DEMO · SAMPLE DATA' : 'LIVE PREDICTION',
    detail: `440 · ${trip.stopCode} · ${trip.stopName}`,
    updated: `ETA ${clock(snapshot.arrivalAt)} · checked ${Math.max(0, Math.floor(age / 1000))}s ago`,
    eta: clock(snapshot.arrivalAt),
    checked: `Checked ${Math.max(0, Math.floor(age / 1000))}s ago`,
    tone: 'primary',
  }
}

export function validateArrival(data, tripId, now) {
  if (
    !data ||
    data.tripId !== tripId ||
    !Number.isFinite(data.checkedAt) ||
    now - data.checkedAt > FRESH_MS ||
    data.checkedAt > now + 30000
  ) {
    throw new Error('Invalid or expired prediction')
  }
  if (!['arrival', 'empty'].includes(data.kind))
    throw new Error('Invalid prediction type')
  if (
    data.kind === 'arrival' &&
    (!Number.isFinite(data.arrivalAt) ||
      data.arrivalAt < now - 30000 ||
      data.arrivalAt > now + 6 * 3600000 ||
      typeof data.stopName !== 'string' ||
      typeof data.lineLabel !== 'string')
  ) {
    throw new Error('Invalid arrival')
  }
  return {
    kind: data.kind,
    tripId,
    date: israelTime(now).date,
    checkedAt: data.checkedAt,
    arrivalAt: data.arrivalAt,
    stopName: data.stopName?.slice(0, 48),
    lineLabel: data.lineLabel?.slice(0, 16),
  }
}
