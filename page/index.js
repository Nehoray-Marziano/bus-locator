import { BasePage } from '@zeppos/zml/base-page'
import * as ui from '@zos/ui'
import { LocalStorage } from '@zos/storage'
import { Screen } from '@zos/sensor'
import { setWakeUpRelaunch } from '@zos/display'
import { bindScreenVisibility } from '../shared/visibility.js'
import { createWatchCache } from '../shared/watch-storage.js'
import { createController } from './controller.js'
import { buildWatchView } from './view.js'

const cache = createWatchCache(LocalStorage)

Page(
  BasePage({
    onInit(params) {
      // Allow normal screen sleep, then return here on wrist raise. Do not undo
      // this in onDestroy: Zepp also destroys pages during automatic sleep.
      setWakeUpRelaunch({ relaunch: true })
      try {
        this.initialDirection = JSON.parse(params || '{}').direction
      } catch {
        this.initialDirection = null
      }
    },
    build() {
      const render = buildWatchView(
        ui,
        () => this.controller.refresh(),
        () => this.controller.switchDirection(),
      )
      this.controller = createController({
        request: (direction) =>
          this.request({ method: 'commute.get', params: { direction } }),
        initialDirection: this.initialDirection,
        render,
        readCache: cache.read,
        writeCache: cache.write,
      })
      this.visibility = bindScreenVisibility({
        screen: new Screen(),
        onResume: () => this.resume(),
        onPause: () => this.pause(),
      })
    },
    resume() {
      if (!this.controller || this.timer != null) return
      this.controller.resume()
      // Only redraw the local countdown while visible; never fetch on a timer.
      this.timer = setInterval(() => this.controller.tick(), 15000)
    },
    pause() {
      if (this.timer != null) clearInterval(this.timer)
      this.timer = null
      this.controller?.pause()
    },
    onDestroy() {
      this.visibility?.destroy()
      this.pause()
    },
  }),
)
