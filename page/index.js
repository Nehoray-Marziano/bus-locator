import { BasePage } from '@zeppos/zml/base-page'
import * as ui from '@zos/ui'
import { LocalStorage } from '@zos/storage'
import { createController } from './controller.js'
import { buildWatchView } from './view.js'

const store = new LocalStorage()
function readCache() {
  try {
    return store.getItem('commute')
  } catch {
    return null
  }
}
function writeCache(value) {
  try {
    store.setItem('commute', value)
  } catch {
    /* Session still works. */
  }
}

Page(
  BasePage({
    build() {
      const render = buildWatchView(ui, () => this.controller.refresh())
      this.controller = createController({
        request: () => this.request({ method: 'commute.get', params: {} }),
        render,
        readCache,
        writeCache,
      })
      this.resume()
    },
    resume() {
      if (!this.controller || this.timer) return
      this.controller.resume()
      // Only redraw the local countdown while visible; never fetch on a timer.
      this.timer = setInterval(() => this.controller.tick(), 15000)
    },
    onResume() {
      this.resume()
    },
    onPause() {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
      this.controller?.pause()
    },
    onDestroy() {
      this.onPause()
    },
  }),
)
