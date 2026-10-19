import * as ui from '@zos/ui'
import { push } from '@zos/router'
import { LocalStorage } from '@zos/storage'
import { createCardController } from './controller.js'
import { buildCardView } from './view.js'

let controller

// This optional card reads cache only. Firmware availability needs device QA.
AppWidget({
  build() {
    ui.setAppWidgetSize({ h: 220 })
    const bounds = { ...ui.getAppWidgetSize(), h: 220 }
    const render = buildCardView(
      ui,
      bounds,
      () =>
        push({
          url: 'page/index',
          params: JSON.stringify({ direction: controller?.getDirection() }),
        }),
      () => controller?.switchDirection(),
    )
    const store = new LocalStorage()
    controller = createCardController({
      readCache: () => store.getItem('commute'),
      render,
    })
  },
  onResume() {
    controller?.resume()
  },
  onPause() {
    controller?.pause()
  },
  onDestroy() {
    controller?.pause()
    controller = null
  },
})
