import { parseClock } from './time.js'

export const DEFAULTS = {
  switchTime: '10:00',
  eveningTime: '18:00',
  demo: false,
}

/** @returns {CommuteConfig} */
export function readConfig(get) {
  const values = {}
  for (const key of Object.keys(DEFAULTS)) {
    const raw = get(key)
    let value = raw
    try {
      value = JSON.parse(raw)
    } catch {
      /* Zepp may store plain strings. */
    }
    values[key] = raw == null || raw === '' ? DEFAULTS[key] : value
  }
  const demo = values.demo === true || values.demo === 'true'
  const switchMinute = parseClock(values.switchTime)
  const eveningMinute = parseClock(values.eveningTime)
  if (switchMinute === null || switchMinute === 0)
    return { error: 'Use a switch time between 00:01 and 23:59.' }
  if (eveningMinute === null || eveningMinute <= switchMinute)
    return { error: 'Evening time must be after the return switch time.' }
  const trips = [
    {
      id: 'morning',
      from: 'Meitar',
      to: 'Jerusalem',
      stopCode: '14100',
      stopName: 'Metar Junction',
      routeDesc: '10440-2-#',
      routeId: 28879,
      stopId: 26745,
      endStopId: 11734,
      startMinute: 0,
      endMinute: switchMinute,
    },
    {
      id: 'return',
      from: 'Jerusalem',
      to: 'Meitar',
      stopCode: '222',
      stopName: 'Teddy Stadium / Beitar',
      routeDesc: '10440-1-#',
      routeId: 28878,
      stopId: 8750,
      endStopId: 27918,
      startMinute: switchMinute,
      endMinute: eveningMinute,
    },
  ]
  trips.push({
    ...trips[0],
    startMinute: eveningMinute,
    endMinute: 1440,
    dayOffset: 1,
  })
  return { demo, trips }
}
