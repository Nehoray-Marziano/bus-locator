import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeArrivals,
  arrivalUrl,
  createArrivalProvider,
} from '../app-side/provider.js'
import { createCommuteService } from '../app-side/service.js'
import { readConfig } from '../shared/config.js'
import { viewModel } from '../shared/model.js'
import { parseIsraelTimestamp } from '../shared/time.js'
import { NOW } from './helpers.js'

const trip = readConfig(() => null).trips[0]
function response(
  times = [{ arrivalTime: '2026-10-19T08:10:00', isRealTime: true }],
) {
  return {
    success: true,
    data: {
      14100: {
        stopCode: 14100,
        startTime: '2026-10-19T08:00:00.000000',
        isFutureSearch: false,
        stopTimes: times,
      },
    },
  }
}
test('direct URL queries only the fixed stop and route; encodes the # alternative', () => {
  const url = new URL(arrivalUrl(trip))
  assert.equal(url.searchParams.get('stopCodes'), '14100')
  assert.equal(url.searchParams.get('routeDesc'), '10440-2-#')
  assert.equal(url.hash, '')
  assert.equal(url.searchParams.size, 2)
  assert.equal(
    new URL(arrivalUrl(readConfig(() => null).trips[1])).searchParams.get(
      'stopCodes',
    ),
    '222',
  )
})
test('normalizes a live arrival and source query timestamp without GPS', () => {
  const result = normalizeArrivals(response(), trip, NOW)
  assert.equal(result.kind, 'arrival')
  assert.equal(result.arrivalAt, NOW + 600000)
  assert.equal(result.checkedAt, NOW)
  assert.equal('routeLocation' in result, false)
})
test('selects the earliest valid live prediction rather than the first schedule', () => {
  const result = normalizeArrivals(
    response([
      { arrivalTime: '2026-10-19T08:01:00', isRealTime: false },
      { arrivalTime: '2026-10-19T08:20:00', isRealTime: true },
      { arrivalTime: '2026-10-19T08:05:00', isRealTime: true },
    ]),
    trip,
    NOW,
  )
  assert.equal(result.arrivalAt, NOW + 5 * 60000)
})
for (const flag of ['false', 'true', 1, null, undefined]) {
  test(`does not claim live data for isRealTime=${String(flag)}`, () => {
    assert.equal(
      normalizeArrivals(
        response([{ arrivalTime: '2026-10-19T08:10:00', isRealTime: flag }]),
        trip,
        NOW,
      ).kind,
      'empty',
    )
  })
}
test('null stop payload and empty arrays are no prediction, not a transport failure', () => {
  assert.equal(
    normalizeArrivals({ success: true, data: { 14100: null } }, trip, NOW).kind,
    'empty',
  )
  assert.equal(normalizeArrivals(response([]), trip, NOW).kind, 'empty')
})
for (const [name, change] of [
  ['provider failure', (body) => (body.success = false)],
  ['wrong stop', (body) => (body.data['14100'].stopCode = 222)],
  ['missing stop', (body) => delete body.data['14100']],
  ['future search', (body) => (body.data['14100'].isFutureSearch = true)],
  ['malformed stop times', (body) => (body.data['14100'].stopTimes = {})],
  [
    'stale query',
    (body) => (body.data['14100'].startTime = '2026-10-19T07:57:59'),
  ],
  [
    'future query',
    (body) => (body.data['14100'].startTime = '2026-10-19T08:01:00'),
  ],
]) {
  test(`rejects ${name}`, () => {
    const body = response()
    change(body)
    assert.throws(() => normalizeArrivals(body, trip, NOW))
  })
}
test('invalid, expired and implausibly distant predictions are ignored', () => {
  for (const arrivalTime of [
    'soon',
    '2026-10-19T07:59:00',
    '2026-10-19T15:00:00',
  ])
    assert.equal(
      normalizeArrivals(
        response([{ arrivalTime, isRealTime: true }]),
        trip,
        NOW,
      ).kind,
      'empty',
    )
})
test('Israel-local response timestamps resolve standard time and DST ambiguity', () => {
  assert.equal(
    parseIsraelTimestamp('2026-01-01T08:00:00', NOW),
    Date.parse('2026-01-01T06:00:00Z'),
  )
  for (const hour of [22, 23]) {
    const reference = Date.parse(`2026-10-24T${hour}:30:00Z`)
    assert.equal(
      parseIsraelTimestamp('2026-10-25T01:30:00', reference),
      reference,
    )
  }
  assert.ok(Number.isNaN(parseIsraelTimestamp('2026-03-27T02:30:00', NOW)))
})
test('watch → phone → direct provider → countdown works with synthetic transport', async () => {
  let calls = 0
  const fetchArrival = createArrivalProvider({
    now: () => NOW,
    fetchJson: async (url) => {
      calls++
      assert.equal(url, arrivalUrl(trip))
      return response()
    },
  })
  const getCommute = createCommuteService({
    getSetting: () => null,
    now: () => NOW,
    fetchArrival,
  })
  const result = await getCommute()
  assert.equal(viewModel(result.snapshot, result.config, NOW).number, '10')
  await getCommute()
  assert.equal(calls, 1)
})
