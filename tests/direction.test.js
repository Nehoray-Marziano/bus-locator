import test from 'node:test'
import assert from 'node:assert/strict'
import { activeTrip, viewModel } from '../shared/model.js'
import { readConfig } from '../shared/config.js'
import { cachedView, mergeCache } from '../shared/cache.js'
import { createController } from '../page/controller.js'
import { createCardController } from '../app-widget/controller.js'
import { createCommuteService } from '../app-side/service.js'
import { buildWatchView } from '../page/view.js'
import { buildCardView } from '../app-widget/view.js'
import { nativeUI } from './native-ui.js'
import { NOW, prediction } from './helpers.js'

const config = readConfig(() => null)
const response = (id = 'morning') => ({
  config,
  snapshot: prediction({ tripId: id }),
})

function page(request, initialDirection = null) {
  const screens = []
  const writes = []
  const timers = new Map()
  let next = 0
  const controller = createController({
    request,
    initialDirection,
    now: () => NOW,
    render: (model) => screens.push(model),
    readCache: () => null,
    writeCache: (value) => writes.push(value),
    setTimer: (fn) => {
      timers.set(++next, fn)
      return next
    },
    clearTimer: (id) => timers.delete(id),
  })
  return { controller, screens, writes, timers }
}

test('manual directions preserve the automatic service date, including tomorrow after 18:00', () => {
  const evening = Date.parse('2026-10-19T15:00:00Z')
  assert.equal(activeTrip(config, NOW, 'return').stopCode, '222')
  assert.equal(activeTrip(config, NOW, 'return').serviceDate, '2026-10-19')
  assert.equal(activeTrip(config, evening, 'return').serviceDate, '2026-10-20')
  assert.equal(activeTrip(config, evening, 'morning').serviceDate, '2026-10-20')
  assert.equal(activeTrip(config, NOW, 'arbitrary-stop').id, 'morning')
  assert.equal(viewModel(prediction(), config, NOW, false, 'return').unit, '')
})

test('app swaps, refreshes the chosen direction, returns to Auto, and resets after pause', async () => {
  const calls = []
  const get = createCommuteService({
    getSetting: () => null,
    now: () => NOW,
    fetchArrival: async (trip) => {
      calls.push(trip.id)
      return prediction({ tripId: trip.id })
    },
  })
  const state = page(get)
  await state.controller.resume()
  assert.equal(state.screens.at(-1).boarding, 'Meitar')
  await state.controller.switchDirection()
  assert.equal(state.screens.at(-1).boarding, 'Jerusalem')
  assert.equal(state.screens.at(-1).number, '10')
  assert.equal(state.screens.at(-1).manual, true)
  await state.controller.refresh()
  assert.equal(state.screens.at(-1).boarding, 'Jerusalem')
  await state.controller.switchDirection()
  assert.equal(state.screens.at(-1).boarding, 'Meitar')
  assert.equal(state.screens.at(-1).manual, false)
  await state.controller.switchDirection()
  state.controller.pause()
  await state.controller.resume()
  assert.equal(state.screens.at(-1).boarding, 'Meitar')
  assert.equal(state.screens.at(-1).manual, false)
  assert.deepEqual(calls, ['morning', 'return'])
  const stored = state.writes.at(-1)
  assert.deepEqual(Object.keys(stored).sort(), [
    'config',
    'snapshot',
    'snapshots',
  ])
  assert.deepEqual(Object.keys(stored.snapshots).sort(), ['morning', 'return'])
  assert.equal(state.timers.size, 0)
})

test('swapping during a request ignores its late response and never saves the wrong trip', async () => {
  const pending = []
  const state = page(
    (direction) =>
      new Promise((resolve) => pending.push({ direction, resolve })),
  )
  const opening = state.controller.resume()
  const swap = state.controller.switchDirection()
  assert.deepEqual(
    pending.map((item) => item.direction),
    [null, 'return'],
  )
  pending[1].resolve(response('return'))
  await swap
  pending[0].resolve(response())
  await opening
  assert.equal(state.screens.at(-1).boarding, 'Jerusalem')
  assert.equal(state.writes.length, 1)
  assert.equal(state.writes[0].snapshot.tripId, 'return')
  const reverting = state.controller.switchDirection()
  state.controller.pause()
  pending[2].resolve(response())
  await reverting
  assert.equal(state.writes.length, 1)
  assert.equal(state.timers.size, 0)
})

test('a card launch selection is consumed for one app session only', async () => {
  for (const initial of ['return', 'invalid']) {
    const requested = []
    const state = page(async (direction) => {
      requested.push(direction)
      return response(direction || 'morning')
    }, initial)
    await state.controller.resume()
    assert.equal(state.screens.at(-1).manual, initial === 'return')
    state.controller.pause()
    await state.controller.resume()
    assert.equal(state.screens.at(-1).manual, false)
    assert.equal(state.screens.at(-1).boarding, 'Meitar')
    assert.deepEqual(requested, [initial === 'return' ? 'return' : null, null])
  }
})

test('card follows the automatic boarding direction without a swap action', () => {
  const stored = mergeCache(response(), response('return'))
  const screens = []
  let time = NOW
  const controller = createCardController({
    readCache: () => stored,
    now: () => time,
    render: (model) => screens.push(model),
    setTimer: () => 1,
    clearTimer: () => {},
  })
  controller.resume()
  assert.equal(screens.at(-1).boarding, 'Meitar')
  time = Date.parse('2026-10-19T09:00:00Z')
  controller.pause()
  controller.resume()
  assert.equal(screens.at(-1).boarding, 'Jerusalem')
  assert.equal(screens.at(-1).manual, false)
  assert.equal(controller.switchDirection, undefined)
  controller.pause()
})

test('phone coalesces each direction independently and rapid alternating taps preserve cooldowns', async () => {
  const finish = {}
  const calls = []
  const get = createCommuteService({
    now: () => NOW,
    getSetting: () => null,
    fetchArrival: (trip) => {
      calls.push(trip.id)
      return new Promise((resolve) => {
        finish[trip.id] = resolve
      })
    },
  })
  const requests = [get(), get('return'), get(), get('return')]
  finish.return(prediction({ tripId: 'return' }))
  finish.morning(prediction())
  const values = await Promise.all(requests)
  assert.deepEqual(
    values.map((value) => value.snapshot.tripId),
    ['morning', 'return', 'morning', 'return'],
  )
  for (let index = 0; index < 10; index++)
    await get(index % 2 ? 'return' : null)
  assert.deepEqual(calls, ['morning', 'return'])
})

test('synchronous provider failures can be retried after the request gap', async () => {
  let time = NOW
  let fail = true
  const get = createCommuteService({
    getSetting: () => null,
    now: () => time,
    fetchArrival: (trip) => {
      if (fail) throw new Error('Offline')
      return prediction({ tripId: trip.id, checkedAt: time })
    },
  })
  assert.equal((await get('return')).snapshot.kind, 'error')
  time += 31000
  fail = false
  assert.equal((await get('return')).snapshot.kind, 'arrival')
  assert.equal((await get()).snapshot.kind, 'arrival')
})

test('legacy cache migrates into two bounded slots without persisting a direction preference', () => {
  const cache = mergeCache(response(), response('return'))
  assert.equal(cachedView(cache, NOW).boarding, 'Meitar')
  assert.equal(cachedView(cache, NOW).number, '10')
  assert.equal(cachedView(cache, NOW, false, 'return').number, '10')
  const tomorrow = mergeCache(cache, {
    config,
    snapshot: prediction({ tripId: 'morning', date: '2026-10-20' }),
  })
  assert.equal(Object.keys(tomorrow.snapshots).length, 2)
  assert.equal(cachedView(tomorrow, NOW).unit, '')
  assert.deepEqual(tomorrow.config, config)
  const demo = mergeCache(cache, {
    config: { ...config, demo: true },
    snapshot: prediction({ demo: true }),
  })
  assert.deepEqual(Object.keys(demo.snapshots), ['morning'])
})

test('only the app exposes Reverse/Reset; the whole card opens the app', () => {
  const ui = nativeUI()
  let swaps = 0
  const update = buildWatchView(
    ui,
    () => {},
    () => swaps++,
  )
  update(viewModel(prediction(), config, NOW))
  const control = ui.commands.find(
    (item) => item.type === 'BUTTON' && item.text === 'Reverse',
  )
  assert.ok(control.w >= 48 && control.h >= 48)
  control.click_func()
  assert.equal(swaps, 1)
  update(
    viewModel(prediction({ tripId: 'return' }), config, NOW, false, 'return'),
  )
  assert.equal(control.text, 'Reset')
  control.click_func()
  assert.equal(swaps, 2)
  update(viewModel(null, { error: 'Settings invalid' }, NOW))
  assert.equal(control.visible, false)

  const card = nativeUI()
  let opens = 0
  const render = buildCardView(
    card,
    { w: 432, h: 264, radius: 48, margin: 24 },
    () => opens++,
  )
  render(viewModel(prediction(), config, NOW))
  const buttons = card.commands.filter((item) => item.type === 'BUTTON')
  assert.equal(buttons.length, 1)
  assert.equal(buttons[0].w, 432)
  assert.equal(buttons[0].h, 264)
  assert.ok(
    card.commands.slice(1).every((item) => item.enabled === false),
    'text and decoration never swallow taps',
  )
  // Native z-order hit testing: taps on the ETA, header and route reach the
  // same button because all higher widgets explicitly pass input through.
  for (const [x, y] of [
    [100, 35],
    [240, 120],
    [240, 230],
    [420, 120],
  ]) {
    const target = [...card.commands]
      .reverse()
      .find(
        (item) =>
          item.enabled !== false &&
          item.visible !== false &&
          x >= item.x &&
          y >= item.y &&
          x < item.x + item.w &&
          y < item.y + item.h,
      )
    assert.equal(target, buttons[0])
    target.click_func()
  }
  assert.equal(opens, 4)
  render(viewModel(null, config, NOW))
  assert.ok(card.commands.some((item) => item.text === 'Tap to check'))
  assert.ok(
    card.commands.every(
      (item) => !['Ready', 'Reverse', 'Reset'].includes(item.text),
    ),
  )
})
