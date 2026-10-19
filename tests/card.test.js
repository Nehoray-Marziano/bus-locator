import test from 'node:test'
import assert from 'node:assert/strict'
import { createCardController } from '../app-widget/controller.js'
import { readConfig } from '../shared/config.js'
import { NOW, prediction } from './helpers.js'

function setup(
  readCache = () => ({
    config: readConfig(() => null),
    snapshot: prediction(),
  }),
) {
  let time = NOW
  let nextId = 0
  const timers = new Map()
  const screens = []
  const controller = createCardController({
    readCache,
    render: (model) => screens.push(model),
    now: () => time,
    setTimer: (callback, interval) => {
      assert.equal(interval, 15000)
      timers.set(++nextId, callback)
      return nextId
    },
    clearTimer: (id) => timers.delete(id),
  })
  return {
    controller,
    screens,
    timers,
    setTime: (value) => {
      time = value
    },
    tick: () => {
      for (const callback of timers.values()) callback()
    },
  }
}

test('card reads cache without a timer until focused; countdown expires while visible', () => {
  let reads = 0
  const state = setup(() => {
    reads++
    return { config: readConfig(() => null), snapshot: prediction() }
  })
  assert.equal(state.screens.at(-1).number, '10')
  assert.equal(state.timers.size, 0)
  state.controller.resume()
  state.controller.resume()
  assert.equal(state.timers.size, 1)
  const beforeTicks = reads
  state.setTime(NOW + 60000)
  state.tick()
  assert.equal(state.screens.at(-1).number, '9')
  state.setTime(NOW + 120001)
  state.tick()
  assert.equal(state.screens.at(-1).unit, '')
  assert.equal(state.screens.at(-1).status, 'OLD UPDATE')
  assert.equal(reads, beforeTicks)
})

test('paused/destroyed card clears its timer and ignores queued callbacks', () => {
  const state = setup()
  state.controller.resume()
  const queued = [...state.timers.values()][0]
  const count = state.screens.length
  state.controller.pause()
  state.controller.pause()
  queued()
  assert.equal(state.timers.size, 0)
  assert.equal(state.screens.length, count)
  state.controller.resume()
  assert.equal(state.timers.size, 1)
})

test('first-install or unreadable cache still selects the boarding location', () => {
  for (const readCache of [
    () => null,
    () => {
      throw new Error('Storage unavailable')
    },
  ]) {
    const state = setup(readCache)
    assert.equal(state.screens.at(-1).boarding, 'Meitar')
    assert.equal(state.screens.at(-1).status, 'NO UPDATE')
    state.setTime(Date.parse('2026-10-19T09:00:00Z'))
    state.controller.resume()
    assert.equal(state.screens.at(-1).boarding, 'Jerusalem')
  }
})

test('noon switches the card boarding label and clears the opposite trip ETA', () => {
  const state = setup()
  state.setTime(Date.parse('2026-10-19T08:59:59Z'))
  state.controller.resume()
  assert.equal(state.screens.at(-1).boarding, 'Meitar')
  state.setTime(Date.parse('2026-10-19T09:00:00Z'))
  state.tick()
  assert.equal(state.screens.at(-1).boarding, 'Jerusalem')
  assert.equal(state.screens.at(-1).status, 'NO UPDATE')
  assert.equal(state.screens.at(-1).unit, '')
})
