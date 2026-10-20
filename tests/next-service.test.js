import test from 'node:test'
import assert from 'node:assert/strict'
import { readConfig } from '../shared/config.js'
import { activeTrip, validateArrival, viewModel } from '../shared/model.js'
import { cachedView, mergeCache } from '../shared/cache.js'
import { presentation } from '../shared/presentation.js'
import { createArrivalProvider } from '../app-side/provider.js'
import { createCommuteService } from '../app-side/service.js'
import { createController } from '../page/controller.js'
import { nativeUI } from './native-ui.js'
import { buildWatchView } from '../page/view.js'
import { buildCardView } from '../app-widget/view.js'

const config = readConfig(() => null)
const now = Date.parse('2026-10-20T13:00:00Z') // 16:00 in Jerusalem.
const trip = activeTrip(config, now)
const calendar = (selected, departures) => ({
  success: true,
  data: {
    start: departures.map((departureTime) => ({
      routeId: selected.routeId,
      routeDesc: selected.routeDesc,
      stopcode: Number(selected.stopCode),
      departureTime,
      isCanceled: false,
    })),
  },
})
function providerFor(time, tables) {
  const calls = []
  return {
    calls,
    fetch: createArrivalProvider({
      now: () => time,
      fetchJson: async (url) => {
        calls.push(url)
        if (!url.includes('GetRouteDailyCalendar'))
          return {
            success: true,
            data: { [activeTrip(config, time).stopCode]: null },
          }
        const date = new URL(url).searchParams.get('day').slice(0, 10)
        const result = tables[date]
        if (result instanceof Error) throw result
        return result || calendar(activeTrip(config, time), [])
      },
    }),
  }
}

test('exhausted today rolls to tomorrow through phone, watch controller, cache and both views', async () => {
  const provider = providerFor(now, {
    '2026-10-20': calendar(trip, ['2026-10-20T15:00:00']),
    '2026-10-21': calendar(trip, ['2026-10-21T15:00:00']),
  })
  const service = createCommuteService({
    getSetting: () => null,
    now: () => now,
    fetchArrival: provider.fetch,
  })
  let saved
  let model
  const controller = createController({
    now: () => now,
    request: service,
    readCache: () => null,
    writeCache: (value) => (saved = value),
    render: (value) => (model = value),
  })
  await controller.resume()
  assert.equal(model.eta, '15:00')
  assert.equal(model.tomorrow, true)
  assert.equal(model.status, 'SCHEDULED')
  assert.equal(saved.snapshot.date, '2026-10-21')
  assert.equal(cachedView(saved, now).eta, '15:00')
  assert.equal(provider.calls.length, 3)
  for (const card of [false, true]) {
    const ui = nativeUI()
    const update = card
      ? buildCardView(ui, { w: 320, h: 264, margin: 80, radius: 32 }, () => {})
      : buildWatchView(ui, () => {})
    update(model)
    assert.ok(ui.commands.some((item) => item.text === '15:00'))
    assert.ok(ui.commands.some((item) => item.text === 'Tomorrow'))
  }
  await service()
  assert.equal(provider.calls.length, 3, 'phone cooldown still applies')
  controller.pause()
})

test('days without service are skipped and the actual weekday/date is shown', async () => {
  const time = Date.parse('2026-10-23T05:00:00Z') // Friday morning.
  const selected = activeTrip(config, time)
  const provider = providerFor(time, {
    '2026-10-25': calendar(selected, ['2026-10-25T06:18:00']),
  })
  const snapshot = validateArrival(
    await provider.fetch(selected),
    selected.id,
    time,
  )
  const display = presentation(viewModel(snapshot, config, time))
  assert.equal(snapshot.date, '2026-10-25')
  assert.equal(display.value, '06:18')
  assert.equal(display.unit, 'Sun 25/10')
  assert.equal(display.etaTone, 'warning')
  assert.equal(provider.calls.length, 4)
  await provider.fetch(selected)
  assert.equal(
    provider.calls.length,
    5,
    'daily results, including empty days, are cached',
  )
})

test('a later calendar failure is unavailable rather than a false no-arrivals result', async () => {
  const provider = providerFor(now, { '2026-10-21': new Error('Offline') })
  await assert.rejects(provider.fetch(trip), /Offline/)
})

test('a fully empty week stops after seven days ahead and reuses empty calendar results', async () => {
  const provider = providerFor(now, {})
  assert.equal((await provider.fetch(trip)).kind, 'empty')
  assert.equal(
    provider.calls.length,
    9,
    'one live query plus today and seven later dates',
  )
  assert.equal(
    new URL(provider.calls.at(-1)).searchParams.get('day').slice(0, 10),
    '2026-10-27',
  )
  await provider.fetch(trip)
  assert.equal(provider.calls.length, 10, 'only the live query repeats')
})

test('the whole search has one time budget and cannot start requests after it expires', async () => {
  let time = now
  let calls = 0
  const provider = createArrivalProvider({
    now: () => time,
    fetchJson: async (url) => {
      calls++
      if (!url.includes('GetRouteDailyCalendar')) {
        time += 3500
        throw new Error('Live unavailable')
      }
      time += 4500
      return calendar(trip, [])
    },
  })
  await assert.rejects(provider(trip), /timed out/)
  assert.equal(calls, 2, 'no next-day request starts after the shared budget')
})

test('an upcoming scheduled cache survives midnight and still obeys age/direction checks', () => {
  const evening = Date.parse('2026-10-23T15:00:00Z')
  const arrivalAt = Date.parse('2026-10-25T04:18:00Z')
  const snapshot = validateArrival(
    {
      kind: 'arrival',
      tripId: 'morning',
      source: 'scheduled',
      checkedAt: evening,
      arrivalAt,
      stopName: 'Metar Junction',
      lineLabel: '440',
    },
    'morning',
    evening,
    '2026-10-24',
  )
  const saved = mergeCache(null, { config, snapshot })
  assert.equal(presentation(cachedView(saved, evening)).unit, 'Sun 25/10')
  assert.equal(
    presentation(cachedView(saved, Date.parse('2026-10-23T22:00:00Z'))).unit,
    'Tomorrow',
  )
  assert.equal(cachedView(saved, evening + 86400001).unit, '')
  assert.equal(cachedView(saved, evening, false, 'return').unit, '')
  assert.equal(
    viewModel({ ...snapshot, date: '2026-10-24' }, config, evening).unit,
    '',
  )
})
