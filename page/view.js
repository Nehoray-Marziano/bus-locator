import { colors, fonts, sizes } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { drawIcon } from '../shared/icons.js'
import { buildDirectionButton } from '../shared/direction-button.js'

export function buildWatchView(ui, refresh, switchDirection = () => {}) {
  const { createWidget, widget, align, text_style, prop } = ui
  const labels = {}
  const text = (
    name,
    x,
    y,
    w,
    h,
    size,
    color,
    font = fonts.body,
    horizontal = align.CENTER_H,
  ) => {
    labels[name] = createWidget(widget.TEXT, {
      x,
      y,
      w,
      h,
      text: '',
      text_size: size,
      color,
      font,
      align_h: horizontal,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
    })
  }
  createWidget(widget.FILL_RECT, {
    x: 0,
    y: 0,
    w: 480,
    h: 480,
    radius: 240,
    color: colors.background,
  })
  drawIcon(ui, 'bus', 82, 85, 28, colors.text, colors.background)
  text('journey', 116, 76, 238, 44, 26, colors.text, fonts.bold, align.LEFT)
  const updateDirection = buildDirectionButton(
    ui,
    { x: 360, y: 76, w: 56, h: 48 },
    switchDirection,
  )
  text('number', 64, 153, 352, 142, sizes.countdown, colors.success, fonts.bold)
  text('unit', 64, 293, 352, 30, 22, colors.muted)
  text('headline', 70, 168, 340, 126, 32, colors.text, fonts.bold)
  const live = drawIcon(
    ui,
    'live',
    164,
    346,
    24,
    colors.success,
    colors.background,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    164,
    346,
    24,
    colors.warning,
    colors.background,
  )
  text('status', 202, 339, 196, 38, 23, colors.success, fonts.body, align.LEFT)
  text('recovery', 64, 338, 352, 42, 20, colors.muted)
  const bounds = { x: 135, y: 410, w: 210, h: 48 }
  const button = createWidget(widget.BUTTON, {
    ...bounds,
    radius: sizes.radius,
    text_size: sizes.button,
    font: fonts.bold,
    normal_color: colors.primary,
    press_color: colors.pressed,
    color: colors.ink,
    text: 'Refresh',
    click_func: refresh,
  })
  const refreshIcon = drawIcon(
    ui,
    'refresh',
    159,
    423,
    22,
    colors.ink,
    colors.primary,
  )
  return (model) => {
    const display = presentation(model)
    updateDirection(model)
    const values = {
      journey: `440 · ${model.boarding}`,
      number: display.hasArrival ? display.value : '',
      unit: display.hasArrival ? display.unit : '',
      headline: display.headline,
      status: display.hasArrival ? display.status : '',
      recovery: display.hasArrival ? '' : display.detail,
    }
    for (const name of Object.keys(labels))
      labels[name].setProperty(prop.TEXT, values[name] || '')
    labels.number.setProperty(prop.TEXT_SIZE, display.valueSize)
    labels.number.setProperty(prop.COLOR, colors[display.tone])
    labels.status.setProperty(prop.COLOR, colors[display.tone])
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
    // Keep the refresh arrow clear of the longer busy label.
    refreshIcon.setVisible(model.action === 'Refresh')
    button.setProperty(prop.MORE, { ...bounds, text: model.action })
  }
}
