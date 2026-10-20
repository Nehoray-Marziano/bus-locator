import { colors, fonts, sizes } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { drawIcon } from '../shared/icons.js'
import { buildDirectionButton } from '../shared/direction-button.js'

export function buildWatchView(ui, refresh, switchDirection = () => {}) {
  const { widget, prop, align } = ui
  const labels = {}
  const rect = (x, y, w, h, radius, color) =>
    ui.createWidget(widget.FILL_RECT, { x, y, w, h, radius, color })
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
    labels[name] = ui.createWidget(widget.TEXT, {
      x,
      y,
      w,
      h,
      text: '',
      text_size: size,
      font,
      color,
      align_h: horizontal,
      align_v: align.CENTER_V,
      text_style: ui.text_style.WRAP,
    })
  }
  rect(0, 0, 480, 480, 240, colors.background)
  drawIcon(ui, 'bus', 100, 57, 26, colors.primary, colors.background)
  text('line', 138, 51, 66, 40, 28, colors.text, fonts.bold, align.LEFT)
  const live = drawIcon(
    ui,
    'live',
    250,
    60,
    22,
    colors.success,
    colors.background,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    250,
    60,
    22,
    colors.warning,
    colors.background,
  )
  text('status', 283, 51, 116, 40, 20, colors.success, fonts.body, align.LEFT)

  text('number', 80, 102, 320, 138, sizes.countdown, colors.text, fonts.bold)
  text('unit', 88, 232, 304, 34, 24, colors.muted)
  text('headline', 88, 125, 304, 90, 30, colors.text, fonts.bold)
  text('recovery', 88, 224, 304, 48, 20, colors.muted)

  rect(88, 286, 304, 1, 0, colors.divider)
  // Two fixed stops show direction only; this is not a vehicle-progress bar.
  rect(91, 324, 2, 30, 1, colors.divider)
  rect(87, 316, 10, 10, 5, colors.primary)
  rect(87, 351, 10, 10, 5, colors.muted)
  rect(90, 354, 4, 4, 2, colors.background)
  text('boarding', 112, 301, 176, 38, 26, colors.text, fonts.bold, align.LEFT)
  text(
    'destination',
    112,
    339,
    176,
    30,
    20,
    colors.muted,
    fonts.body,
    align.LEFT,
  )
  const updateDirection = buildDirectionButton(
    ui,
    { x: 300, y: 314, w: 92, h: 48 },
    switchDirection,
  )

  const bounds = { x: 156, y: 398, w: 168, h: 52 }
  const button = ui.createWidget(widget.BUTTON, {
    ...bounds,
    radius: sizes.radius,
    text_size: 22,
    font: fonts.body,
    normal_color: colors.primary,
    press_color: colors.primaryPressed,
    color: colors.ink,
    text: 'Refresh',
    click_func: refresh,
  })
  const refreshIcon = drawIcon(
    ui,
    'refresh',
    174,
    413,
    22,
    colors.ink,
    colors.primary,
  )
  return (model) => {
    const display = presentation(model)
    updateDirection(model)
    const values = {
      line: '440',
      status: display.hasArrival ? display.status : '',
      number: display.hasArrival ? display.value : '',
      unit: display.hasArrival ? display.unit : '',
      headline: display.headline,
      recovery: display.hasArrival ? '' : display.detail,
      boarding: model.boarding,
      destination: model.destination ? `to ${model.destination}` : '',
    }
    for (const name of Object.keys(labels))
      labels[name].setProperty(prop.TEXT, values[name] || '')
    labels.number.setProperty(prop.TEXT_SIZE, display.valueSize)
    labels.number.setProperty(prop.COLOR, colors[display.etaTone])
    labels.status.setProperty(prop.COLOR, colors[display.tone])
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
    refreshIcon.setVisible(model.action === 'Refresh')
    button.setProperty(prop.MORE, { ...bounds, text: model.action })
  }
}
