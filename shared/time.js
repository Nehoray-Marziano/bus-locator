// Israel's current DST rule (since 2013), without Intl or a timezone database
// on the watch. All input/output timestamps are UTC milliseconds.
function lastSunday(year, month) {
  const end = new Date(Date.UTC(year, month + 1, 0))
  return end.getUTCDate() - end.getUTCDay()
}

export function israelTime(timestamp) {
  const year = new Date(timestamp).getUTCFullYear()
  const start = Date.UTC(year, 2, lastSunday(year, 2) - 2)
  const end = Date.UTC(year, 9, lastSunday(year, 9) - 1, 23)
  const offset = timestamp >= start && timestamp < end ? 180 : 120
  const local = new Date(timestamp + offset * 60000)
  return {
    date: local.toISOString().slice(0, 10),
    day: local.getUTCDay(),
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
  }
}

export function parseClock(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    return null
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

export function clock(timestamp) {
  const { minute } = israelTime(timestamp)
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

export function addDays(date, days) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10)
}

// The public MOT API emits Israel-local ISO strings without an offset. Resolve
// both possible offsets and round-trip them so DST gaps cannot be invented.
export function parseIsraelTimestamp(value, reference) {
  if (typeof value !== 'string') return NaN
  if (/(Z|[+-]\d{2}:\d{2})$/.test(value)) return Date.parse(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?$/.test(value))
    return NaN
  const wall = Date.parse(value.slice(0, 23) + 'Z')
  const date = value.slice(0, 10)
  const minute = Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16))
  const candidates = [wall - 120 * 60000, wall - 180 * 60000].filter((time) => {
    if (!Number.isFinite(time)) return false
    const local = israelTime(time)
    return local.date === date && local.minute === minute
  })
  candidates.sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference))
  return candidates[0] ?? NaN
}
