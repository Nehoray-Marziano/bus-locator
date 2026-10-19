import { parseClock } from './time.js'

export const DEFAULTS = {
  switchTime: '12:00',
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
  if (switchMinute === null || switchMinute === 0)
    return { error: 'Use a switch time between 00:01 and 23:59.' }
  const trips = [
    {
      id: 'morning',
      from: 'Meitar',
      to: 'Jerusalem',
      stopCode: '14100',
      stopName: 'Metar Junction',
      routeDesc: '10440-2-#',
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
      startMinute: switchMinute,
      endMinute: 1440,
    },
  ]
  return { demo, trips }
}
