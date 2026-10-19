import { readConfig } from '../shared/config.js'
import { viewModel } from '../shared/model.js'

// Shortcut cards cannot start the documented phone BLE bridge. Read cache only,
// and keep its countdown/freshness honest while this card has focus.
export function createCardController({
  readCache,
  render,
  now = Date.now,
  setTimer = setInterval,
  clearTimer = clearInterval,
}) {
  let timer = null
  let active = false
  let value
  function load() {
    try {
      value = readCache()
    } catch {
      value = null
      // Storage can be unavailable on a new install; defaults still select a stop.
    }
  }
  function draw() {
    render(
      viewModel(
        value?.snapshot,
        value?.config || readConfig(() => null),
        now(),
      ),
    )
  }
  load()
  draw()
  return {
    resume() {
      active = true
      load()
      draw()
      if (timer === null)
        timer = setTimer(() => {
          if (active) draw()
        }, 15000)
    },
    pause() {
      active = false
      if (timer !== null) clearTimer(timer)
      timer = null
    },
  }
}
