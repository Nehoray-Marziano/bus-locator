import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { bindScreenVisibility } from '../shared/visibility.js'
import { createController } from '../page/controller.js'
import { createCardController } from '../app-widget/controller.js'
import { readConfig } from '../shared/config.js'
import { NOW, prediction } from './helpers.js'

// Run the real entry points with native Zepp APIs replaced by deterministic
// fakes. Controller-only tests cannot catch missing/incorrect OS lifecycle hooks.
function setup(surface, initialStatus = 1) {
  let definition
  let status = initialStatus
  let time = NOW
  let cache = { config: readConfig(() => null), snapshot: prediction() }
  let reads = 0
  let requests = 0
  let next = 0
  const listeners = new Set()
  const intervals = new Map()
  const timeouts = new Map()
  const screens = []
  const relaunch = []
  const callbacks = {}
  const screen = {
    getStatus: () => status,
    onChange: (fn) => listeners.add(fn),
    offChange: (fn) => listeners.delete(fn),
  }
  const context = {
    Page: (value) => (definition = value),
    AppWidget: (value) => (definition = value),
    BasePage: (value) => value,
    Screen: function () {
      return screen
    },
    LocalStorage: function () {
      return {
        getItem: () => {
          reads++
          return cache
        },
        setItem: (_key, value) => {
          cache = value
        },
      }
    },
    setWakeUpRelaunch: (value) => relaunch.push(value.relaunch),
    bindScreenVisibility,
    createController: (options) =>
      createController({
        ...options,
        now: () => time,
        setTimer: (fn) => {
          timeouts.set(++next, fn)
          return next
        },
        clearTimer: (id) => timeouts.delete(id),
      }),
    createCardController: (options) =>
      createCardController({
        ...options,
        now: () => time,
        setTimer: (fn) => {
          intervals.set(++next, fn)
          return next
        },
        clearTimer: (id) => intervals.delete(id),
      }),
    buildWatchView: (_ui, refresh) => {
      callbacks.refresh = refresh
      return (model) => screens.push(model)
    },
    buildCardView: () => (model) => screens.push(model),
    ui: { setAppWidgetSize() {}, getAppWidgetSize: () => ({ w: 400 }) },
    push() {},
    setInterval: (fn) => {
      intervals.set(++next, fn)
      return next
    },
    clearInterval: (id) => intervals.delete(id),
  }
  const source = readFileSync(
    new URL(`../${surface}/index.js`, import.meta.url),
    'utf8',
  )
  runInNewContext(source.replace(/^import .*$/gm, ''), context)
  definition.request = async () => {
    requests++
    return cache
  }
  definition.onInit?.('{}')
  definition.build()
  return {
    definition,
    screens,
    relaunch,
    listeners,
    intervals,
    timeouts,
    callbacks,
    get requests() {
      return requests
    },
    get reads() {
      return reads
    },
    setTime(value) {
      time = value
    },
    setCache(value) {
      cache = value
    },
    screen(value) {
      status = value
      // Exercise callbacks with no payload, as in the official Screen example.
      for (const fn of listeners) fn()
    },
  }
}

test('app refreshes on opening and each screen wake, with no duplicate or asleep requests', async () => {
  const state = setup('page')
  await Promise.resolve()
  assert.deepEqual(state.relaunch, [true])
  assert.equal(state.requests, 1)
  assert.equal(state.intervals.size, 1)
  state.screen(1)
  assert.equal(state.requests, 1)
  const queuedTick = [...state.intervals.values()][0]
  state.screen(2)
  assert.equal(state.intervals.size, 0)
  assert.equal(state.timeouts.size, 0)
  const count = state.screens.length
  queuedTick()
  state.callbacks.refresh()
  assert.equal(state.screens.length, count)
  assert.equal(state.requests, 1)
  state.setTime(NOW + 60000)
  state.screen(1)
  await Promise.resolve()
  assert.equal(state.requests, 2)
  assert.equal(state.screens.at(-1).number, '9')
  assert.equal(state.intervals.size, 1)
  const queuedChange = [...state.listeners][0]
  state.definition.onDestroy()
  state.definition.onDestroy()
  assert.equal(state.listeners.size, 0)
  assert.equal(state.intervals.size, 0)
  queuedChange()
  state.screen(1)
  assert.equal(state.requests, 2)
})

test('a rebuilt sleeping page waits for screen-on before fetching', () => {
  const state = setup('page', 2)
  assert.equal(state.requests, 0)
  assert.equal(state.intervals.size, 0)
  state.screen(1)
  assert.equal(state.requests, 1)
  state.definition.onDestroy()
})

test('sleep destruction keeps wake relaunch enabled and rebuilt page refreshes', () => {
  const state = setup('page')
  state.screen(2)
  state.definition.onDestroy()
  assert.deepEqual(state.relaunch, [true])
  const rebuilt = setup('page')
  assert.equal(rebuilt.requests, 1)
  rebuilt.definition.onDestroy()
})

test('card reloads cache on focus and wrist wake, while list/background stay idle', () => {
  const state = setup('app-widget')
  const initialReads = state.reads
  assert.equal(state.intervals.size, 0)
  state.screen(2)
  state.screen(1)
  assert.equal(state.reads, initialReads)
  state.setCache({
    config: readConfig(() => null),
    snapshot: prediction({ arrivalAt: NOW + 20 * 60000 }),
  })
  state.definition.onResume()
  assert.equal(state.screens.at(-1).number, '20')
  assert.equal(state.intervals.size, 1)
  const focusedReads = state.reads
  state.definition.onResume()
  assert.equal(state.reads, focusedReads)
  state.screen(2)
  assert.equal(state.intervals.size, 0)
  state.setTime(NOW + 60000)
  state.screen(1)
  assert.equal(state.screens.at(-1).number, '19')
  assert.equal(state.reads, focusedReads + 1)
  state.definition.onPause()
  assert.equal(state.intervals.size, 0)
  state.screen(2)
  state.screen(1)
  assert.equal(state.reads, focusedReads + 1)
  assert.equal(state.requests, 0)
  assert.deepEqual(state.relaunch, [])
  state.definition.onDestroy()
  assert.equal(state.listeners.size, 0)
})

test('card focus received while asleep waits for wake; paused focus never resumes', () => {
  const state = setup('app-widget', 2)
  state.definition.onResume()
  assert.equal(state.intervals.size, 0)
  state.screen(1)
  assert.equal(state.intervals.size, 1)
  state.screen(2)
  state.definition.onPause()
  const count = state.screens.length
  state.screen(1)
  assert.equal(state.intervals.size, 0)
  assert.equal(state.screens.length, count)
  state.definition.onDestroy()
})
