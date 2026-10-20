import test from 'node:test'
import assert from 'node:assert/strict'
import { createController } from '../page/controller.js'
import { readConfig } from '../shared/config.js'
import { NOW, prediction } from './helpers.js'
import { buildWatchView } from '../page/view.js'
import { buildCardView } from '../app-widget/view.js'
import { nativeUI } from './native-ui.js'
import { cachedView } from '../shared/cache.js'

function setup(request, { render = () => {} } = {}) {
  let time = NOW
  let saved = null
  let fireTimeout
  let activeTimers = 0
  const screens = []
  const errors = []
  const controller = createController({
    request,
    render: (model) => {
      screens.push(model)
      render(model)
    },
    reportRenderError: (error) => errors.push(error),
    now: () => time,
    readCache: () => null,
    writeCache: (value) => (saved = value),
    setTimer: (callback) => {
      fireTimeout = callback
      activeTimers++
      return 1
    },
    clearTimer: () => activeTimers--,
  })
  return {
    controller,
    screens,
    errors,
    get saved() {
      return saved
    },
    get timers() {
      return activeTimers
    },
    timeout() {
      fireTimeout()
    },
    setTime(value) {
      time = value
    },
  }
}
const response = () => ({
  config: readConfig(() => null),
  snapshot: prediction(),
})
test('opening fetches once; local ticks never request the network', async () => {
  let calls = 0
  const state = setup(async () => {
    calls++
    return response()
  })
  await state.controller.resume()
  for (let i = 0; i < 100; i++) state.controller.tick()
  assert.equal(calls, 1)
  assert.equal(state.screens.at(-1).number, '10')
  assert.equal(state.timers, 0)
  assert.equal(state.saved.snapshot.arrivalAt, NOW + 600000)
})
test('backgrounded pages cannot render, fetch or save late responses', async () => {
  let finish
  let calls = 0
  const state = setup(() => {
    calls++
    return new Promise((resolve) => (finish = resolve))
  })
  const pending = state.controller.resume()
  state.controller.pause()
  const length = state.screens.length
  finish(response())
  await pending
  state.controller.tick()
  await state.controller.refresh()
  assert.equal(state.screens.length, length)
  assert.equal(state.saved, null)
  assert.equal(state.timers, 0)
  assert.equal(calls, 1)
})
test('duplicate taps are blocked while busy', async () => {
  let finish
  let calls = 0
  const state = setup(() => {
    calls++
    return new Promise((resolve) => (finish = resolve))
  })
  const pending = state.controller.resume()
  await state.controller.refresh()
  assert.equal(calls, 1)
  finish(response())
  await pending
})
test('timeout releases busy state and late responses are ignored', async () => {
  let finish
  const state = setup(() => new Promise((resolve) => (finish = resolve)))
  const pending = state.controller.resume()
  state.timeout()
  assert.equal(state.screens.at(-1).status, 'PHONE UNREACHABLE')
  state.controller.tick()
  assert.equal(state.screens.at(-1).status, 'PHONE UNREACHABLE')
  finish(response())
  await pending
  assert.equal(state.saved, null)
  assert.equal(state.timers, 0)
})
test('local ticks expire live predictions and switch direction without old data', async () => {
  const state = setup(async () => response())
  await state.controller.resume()
  state.setTime(NOW + 121000)
  state.controller.tick()
  assert.equal(state.screens.at(-1).status, 'OLD UPDATE')
  state.setTime(Date.parse('2026-10-19T09:00:00Z'))
  state.controller.tick()
  assert.equal(state.screens.at(-1).route, 'Jerusalem > Meitar')
  assert.equal(state.screens.at(-1).number, '—')
})
test('phone failures show actionable recovery', async () => {
  const state = setup(async () => {
    throw new Error('Bluetooth off')
  })
  await state.controller.resume()
  assert.equal(state.screens.at(-1).status, 'PHONE UNREACHABLE')
  assert.equal(state.timers, 0)
})

test('initial and busy drawing failures cannot prevent fetching, saving or releasing busy', async () => {
  let faults = 2
  let calls = 0
  const state = setup(
    async () => {
      calls++
      return response()
    },
    {
      render: () => {
        if (faults-- > 0) throw new Error('Native widget update failed')
      },
    },
  )
  await state.controller.resume()
  assert.equal(calls, 1)
  assert.equal(state.saved.snapshot.arrivalAt, NOW + 600000)
  assert.equal(state.screens.at(-1).number, '10')
  assert.equal(state.errors.length, 2)
  assert.equal(state.timers, 0)
  await state.controller.refresh()
  assert.equal(calls, 2, 'busy was released after the drawing failures')
})

test('the actual native view completes Checking and saves an ETA visible on the card', async () => {
  const watch = nativeUI()
  const render = buildWatchView(watch, () => {})
  let saved
  let calls = 0
  const errors = []
  const controller = createController({
    request: async () => {
      calls++
      return response()
    },
    render,
    readCache: () => null,
    writeCache: (value) => (saved = value),
    now: () => NOW,
    reportRenderError: (error) => errors.push(error),
  })
  await controller.resume()
  assert.equal(calls, 1)
  assert.ok(saved?.snapshot)
  assert.deepEqual(errors, [], 'native redraw uses the documented Canvas API')
  assert.ok(watch.commands.some((item) => item.text === '10'))
  assert.ok(watch.commands.some((item) => item.text === 'Refresh'))
  const card = nativeUI()
  buildCardView(card, { w: 432, h: 264, radius: 48, margin: 24 }, () => {})(
    cachedView(saved, NOW),
  )
  assert.ok(card.commands.some((item) => item.text === '10'))
  controller.pause()
})
