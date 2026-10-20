import * as ui from '@zos/ui'
import { push } from '@zos/router'
import { LocalStorage } from '@zos/storage'
import { Screen } from '@zos/sensor'
import { bindScreenVisibility } from '../shared/visibility.js'
import { createCardController } from './controller.js'
import { buildCardView } from './view.js'

// This optional card reads cache only. Firmware availability needs device QA.
const card = {
  state: { controller: null, visibility: null, focused: false },
  build() {
    ui.setAppWidgetSize({ h: 220 })
    const bounds = { ...ui.getAppWidgetSize(), h: 220 }
    const render = buildCardView(
      ui,
      bounds,
      () =>
        push({
          url: 'page/index',
          params: JSON.stringify({
            direction: this.state.controller?.getDirection(),
          }),
        }),
      () => this.state.controller?.switchDirection(),
    )
    const store = new LocalStorage()
    this.state.controller = createCardController({
      readCache: () => store.getItem('commute'),
      render,
    })
    this.state.visibility = bindScreenVisibility({
      screen: new Screen(),
      focused: this.state.focused,
      onResume: () => this.state.controller.resume(),
      onPause: () => this.state.controller.pause(),
    })
  },
  onResume() {
    this.state.focused = true
    this.state.visibility?.setFocused(true)
  },
  onPause() {
    this.state.focused = false
    this.state.visibility?.setFocused(false)
  },
  onDestroy() {
    this.state.visibility?.destroy()
    this.state.controller?.pause()
    this.state.controller = null
  },
}

AppWidget(card)
