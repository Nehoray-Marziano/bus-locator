import test from 'node:test'
import assert from 'node:assert/strict'
import { readConfig } from '../shared/config.js'
import { activeTrip, validateArrival, viewModel } from '../shared/model.js'
import { presentation } from '../shared/presentation.js'
import {
  createArrivalProvider,
  normalizeArrivals,
  normalizeSchedule,
  scheduleUrl,
} from '../app-side/provider.js'
import { createCommuteService } from '../app-side/service.js'
import { NOW, prediction } from './helpers.js'

const config = readConfig(() => null)
const trip = activeTrip(config, NOW)
const evening = Date.parse('2026-10-19T15:00:00Z')
const tomorrow = Date.parse('2026-10-20T03:18:00Z')
const table = (date = '2026-10-19', extras = {}) => ({
  success: true,
  data: {
    start: [
      {
        routeId: trip.routeId,
        routeDesc: trip.routeDesc,
        stopcode: 14100,
        departureTime: `${date}T08:10:00`,
        isCanceled: false,
        ...extras,
      },
    ],
  },
})
const empty = { success: true, data: { 14100: null } }

test('evening and midnight target the same next-morning service date, across year and DST', () => {
  for (const [time, date] of [
    ['2026-10-19T15:00:00Z', '2026-10-20'],
    ['2026-10-19T21:00:00Z', '2026-10-20'],
    ['2026-12-31T16:00:00Z', '2027-01-01'],
    ['2026-10-24T15:00:00Z', '2026-10-25'],
  ]) {
    const selected = activeTrip(config, Date.parse(time))
    assert.equal(selected.from, 'Meitar')
    assert.equal(selected.serviceDate, date)
  }
})

test('settings require morning switch before evening switch', () => {
  for (const eveningTime of ['10:00', '09:59', '25:00', 18])
    assert.ok(
      readConfig((key) => (key === 'eveningTime' ? eveningTime : null)).error,
    )
})

test('scheduled arrivals survive beyond live freshness and never get a green live label', () => {
  const data = prediction({ source: 'scheduled', arrivalAt: NOW + 3600000 })
  const model = viewModel(data, config, NOW + 121000)
  assert.equal(model.status, 'SCHEDULED')
  assert.equal(model.number, '58')
  assert.equal(presentation(model).live, false)
  assert.equal(presentation(model).tone, 'warning')
  assert.equal(validateArrival(data, trip.id, NOW + 121000).source, 'scheduled')
})

test('expired live ETA falls back only to an actual supplied future timetable time', () => {
  const model = viewModel(
    prediction({ scheduledAt: NOW + 600000 }),
    config,
    NOW + 121000,
  )
  assert.equal(model.source, 'scheduled')
  assert.equal(presentation(model).status, 'Scheduled')
  assert.equal(viewModel(prediction(), config, NOW + 121000).unit, '')
  assert.equal(
    viewModel(prediction({ scheduledAt: NOW - 1 }), config, NOW + 121000).unit,
    '',
  )
})

test('tomorrow schedule is labelled with date context, survives midnight and rejects today cache', () => {
  const selected = activeTrip(config, evening)
  const snapshot = validateArrival(
    prediction({
      source: 'scheduled',
      checkedAt: evening,
      arrivalAt: tomorrow,
    }),
    'morning',
    evening,
    selected.serviceDate,
  )
  const model = viewModel(snapshot, config, evening)
  assert.equal(model.tomorrow, true)
  assert.equal(presentation(model).value, '06:18')
  assert.equal(presentation(model).unit, 'Tomorrow')
  assert.equal(
    viewModel(snapshot, config, Date.parse('2026-10-19T21:00:00Z')).tomorrow,
    false,
  )
  assert.equal(viewModel(prediction(), config, evening).unit, '')
})

test('schedule identity, service date, cancellation and invalid dates are checked', () => {
  assert.equal(
    normalizeSchedule(table(), trip, '2026-10-19', NOW)[0],
    NOW + 600000,
  )
  assert.deepEqual(
    normalizeSchedule(table('2026-10-20'), trip, '2026-10-19', NOW),
    [],
  )
  assert.deepEqual(
    normalizeSchedule(
      table('2026-10-19', { isCanceled: true }),
      trip,
      '2026-10-19',
      NOW,
    ),
    [],
  )
  assert.deepEqual(
    normalizeSchedule(
      table('2026-10-19', { departureTime: 'soon' }),
      trip,
      '2026-10-19',
      NOW,
    ),
    [],
  )
  for (const changes of [
    { stopcode: 222 },
    { routeId: 1 },
    { routeDesc: 'wrong' },
  ])
    assert.throws(() =>
      normalizeSchedule(table('2026-10-19', changes), trip, '2026-10-19', NOW),
    )
})

test('live feed strict false is a schedule; canceled and malformed flags never become ETA', () => {
  const body = (entry) => ({
    success: true,
    data: {
      14100: {
        stopCode: 14100,
        startTime: '2026-10-19T08:00:00',
        isFutureSearch: false,
        stopTimes: [{ arrivalTime: '2026-10-19T08:10:00', ...entry }],
      },
    },
  })
  assert.equal(
    normalizeArrivals(body({ isRealTime: false }), trip, NOW).source,
    'scheduled',
  )
  assert.equal(
    normalizeArrivals(body({ isRealTime: true, isCanceled: true }), trip, NOW)
      .kind,
    'empty',
  )
})

test('live API empty or offline uses timetable; cached timetable avoids repeat calendar downloads', async () => {
  for (const offline of [false, true]) {
    let dailyCalls = 0
    const provider = createArrivalProvider({
      now: () => NOW,
      fetchJson: async (url) => {
        if (url.includes('GetRouteDailyCalendar')) {
          dailyCalls++
          return table()
        }
        if (offline) throw new Error('Live service offline')
        return empty
      },
    })
    assert.equal((await provider(trip)).source, 'scheduled')
    assert.equal((await provider(trip)).arrivalAt, NOW + 600000)
    assert.equal(dailyCalls, 1)
  }
})

test('tomorrow is one timetable request with correct date/boarding stop and no live query', async () => {
  const selected = activeTrip(config, evening)
  let calls = 0
  const provider = createArrivalProvider({
    now: () => evening,
    fetchJson: async (url) => {
      calls++
      assert.equal(url, scheduleUrl(selected, '2026-10-20'))
      return table('2026-10-20', { departureTime: '2026-10-20T06:18:00' })
    },
  })
  const service = createCommuteService({
    getSetting: () => null,
    now: () => evening,
    fetchArrival: provider,
  })
  const response = await service()
  assert.equal(response.snapshot.date, '2026-10-20')
  assert.equal(
    viewModel(response.snapshot, response.config, evening).eta,
    '06:18',
  )
  await service()
  assert.equal(calls, 1)
})

test('expired/cross-date scheduled times cannot be accepted as a valid arrival', () => {
  for (const changes of [
    { source: 'unknown' },
    { source: 'scheduled', checkedAt: NOW - 86400001 },
    { source: 'scheduled', arrivalAt: NOW + 37 * 3600000 },
    { source: 'scheduled', arrivalAt: tomorrow },
  ])
    assert.throws(() => validateArrival(prediction(changes), trip.id, NOW))
})

test('phone timeout override never claims the cached number is a connected live update', () => {
  const model = {
    ...viewModel(prediction(), config, NOW),
    status: 'PHONE UNREACHABLE',
  }
  assert.equal(presentation(model).hasArrival, true)
  assert.equal(presentation(model).live, false)
  assert.equal(presentation(model).status, 'Cached')
})
