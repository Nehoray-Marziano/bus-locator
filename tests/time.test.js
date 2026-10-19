import test from 'node:test'
import assert from 'node:assert/strict'
import { clock, israelTime, parseClock } from '../shared/time.js'

test('Israel time matches the IANA database every day across 2024–2030', () => {
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  for (
    let time = Date.UTC(2024, 0, 1);
    time < Date.UTC(2031, 0, 1);
    time += 6 * 3600000
  ) {
    const parts = Object.fromEntries(
      format.formatToParts(time).map(({ type, value }) => [type, value]),
    )
    const expectedDate = `${parts.year}-${parts.month}-${parts.day}`
    const actual = israelTime(time)
    assert.equal(actual.date, expectedDate)
    assert.equal(actual.minute, Number(parts.hour) * 60 + Number(parts.minute))
  }
})

test('spring DST jump and autumn repeated hour have exact boundaries', () => {
  assert.equal(clock(Date.parse('2026-03-26T23:59:59Z')), '01:59')
  assert.equal(clock(Date.parse('2026-03-27T00:00:00Z')), '03:00')
  assert.equal(clock(Date.parse('2026-10-24T22:59:59Z')), '01:59')
  assert.equal(clock(Date.parse('2026-10-24T23:00:00Z')), '01:00')
})

test('clock parser rejects malformed, out-of-range and numeric input', () => {
  for (const value of [
    '24:00',
    '1:00',
    '12:60',
    '',
    null,
    1200,
    '12:00<script>',
  ])
    assert.equal(parseClock(value), null)
  assert.equal(parseClock('00:00'), 0)
  assert.equal(parseClock('23:59'), 1439)
})
