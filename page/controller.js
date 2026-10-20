import { normalizeDirection, switchedDirection } from '../shared/model.js'
import { cachedView, mergeCache } from '../shared/cache.js'
import { readConfig } from '../shared/config.js'

export function createController({
  request,
  render,
  readCache,
  writeCache,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  initialDirection = null,
  reportRenderError = (_error) => {},
}) {
  let value = readCache()
  let direction = normalizeDirection(initialDirection)
  let busy = false
  let active = false
  let generation = 0
  let timeout = null
  let disconnected = false

  function draw() {
    if (!active) return
    const model = cachedView(value, now(), busy, direction)
    try {
      render(
        disconnected
          ? {
              ...model,
              status: 'PHONE UNREACHABLE',
              detail: 'Open Zepp and check Bluetooth.',
            }
          : model,
      )
    } catch (error) {
      // A native drawing failure must never prevent a request, timeout or save.
      reportRenderError(error)
    }
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
    disconnected = false
    const token = ++generation
    timeout = setTimer(() => {
      if (token !== generation) return
      cancel()
      disconnected = true
      draw()
    }, 12000)
    draw()
    try {
      const response = await request(direction)
      if (!active || token !== generation) return
      if (!response || !response.config) throw new Error('Invalid response')
      value = mergeCache(value, response)
      writeCache(value)
    } catch {
      if (!active || token !== generation) return
      // Keep only a matching cached ETA, visibly marked as disconnected.
      cancel()
      disconnected = true
      draw()
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
      direction = null
    },
    switchDirection() {
      if (!active) return
      cancel()
      direction = switchedDirection(
        value?.config || readConfig(() => null),
        now(),
        direction,
      )
      return refresh()
    },
    refresh,
    tick: draw,
  }
}
