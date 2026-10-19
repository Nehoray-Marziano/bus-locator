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
  rect(88, 54, 104, 40, 16, colors.primary)
  drawIcon(ui, 'bus', 96, 60, 28, colors.ink, colors.primary)
  text('line', 126, 54, 62, 40, 24, colors.ink, fonts.bold)
  const live = drawIcon(
    ui,
    'live',
    244,
    60,
    24,
    colors.success,
    colors.background,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    244,
    60,
    24,
    colors.warning,
    colors.background,
  )
  text('status', 282, 54, 116, 40, 20, colors.success, fonts.body, align.LEFT)

  const bubble = rect(72, 114, 336, 174, 44, colors.surface)
  text('number', 88, 116, 304, 130, sizes.countdown, colors.ink, fonts.bold)
  text('unit', 88, 246, 304, 30, 22, colors.ink)
  text('headline', 92, 137, 296, 96, 30, colors.text, fonts.bold)
  text('recovery', 88, 243, 304, 34, 17, colors.muted)

  rect(76, 310, 328, 82, 24, colors.surface)
  // Two fixed stops show direction only; this is not a vehicle-progress bar.
  rect(91, 332, 2, 30, 1, colors.muted)
  rect(86, 322, 12, 12, 6, colors.primary)
  rect(86, 360, 12, 12, 6, colors.muted)
  rect(89, 363, 6, 6, 3, colors.surface)
  text('boarding', 112, 311, 176, 38, 26, colors.text, fonts.bold, align.LEFT)
  text(
    'destination',
    112,
    349,
    176,
    30,
    20,
    colors.muted,
    fonts.body,
    align.LEFT,
  )
  const updateDirection = buildDirectionButton(
    ui,
    { x: 300, y: 327, w: 92, h: 48 },
    switchDirection,
  )

  const bounds = { x: 156, y: 414, w: 168, h: 48 }
  const button = ui.createWidget(widget.BUTTON, {
    ...bounds,
    radius: sizes.radius,
    text_size: 22,
    font: fonts.body,
    normal_color: colors.primary,
    press_color: colors.pressed,
    color: colors.ink,
    text: 'Refresh',
    click_func: refresh,
  })
  const refreshIcon = drawIcon(
    ui,
    'refresh',
    172,
    427,
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
    bubble.setProperty(prop.COLOR, colors[display.fill])
    labels.number.setProperty(prop.TEXT_SIZE, display.valueSize)
    for (const name of ['number', 'unit'])
      labels[name].setProperty(prop.COLOR, colors[display.ink])
    labels.status.setProperty(prop.COLOR, colors[display.tone])
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
    refreshIcon.setVisible(model.action === 'Refresh')
    button.setProperty(prop.MORE, { ...bounds, text: model.action })
  }
}
