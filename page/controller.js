import { viewModel } from '../shared/model.js'
import { readConfig } from '../shared/config.js'

export function createController({
  request,
  render,
  readCache,
  writeCache,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let value = readCache() || { config: readConfig(() => null), snapshot: null }
  let busy = false
  let active = false
  let generation = 0
  let timeout = null

  function draw() {
    if (active) render(viewModel(value.snapshot, value.config, now(), busy))
  }
  function cancel() {
    generation += 1
    busy = false
    if (timeout !== null) clearTimer(timeout)
    timeout = null
  }
  async function refresh() {
    if (!active || busy) return
    busy = true
    const token = ++generation
    draw()
    timeout = setTimer(() => {
      if (token !== generation) return
      cancel()
      render({
        ...viewModel(value.snapshot, value.config, now()),
        status: 'PHONE UNREACHABLE',
        detail: 'Open Zepp and check Bluetooth.',
      })
    }, 12000)
    try {
      const response = await request()
      if (!active || token !== generation) return
      if (!response || !response.config) throw new Error('Invalid response')
      value = response
      writeCache(value)
    } catch {
      if (!active || token !== generation) return
      // A usable cached prediction stays visible, with its original update age.
      if (!value.config || !value.snapshot) {
        cancel()
        render({
          ...viewModel(null, value.config, now()),
          status: 'PHONE UNREACHABLE',
          detail: 'Open Zepp and check Bluetooth.',
        })
        return
      }
    } finally {
      if (active && token === generation) {
        cancel()
        draw()
      }
    }
  }
  return {
    resume() {
      active = true
      draw()
      return refresh()
    },
    pause() {
      active = false
      cancel()
    },
    refresh,
    tick: draw,
  }
}
