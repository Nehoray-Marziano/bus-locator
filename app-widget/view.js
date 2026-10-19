import { colors, fonts } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'

export function buildCardView(ui, bounds, open) {
  const { widget, prop, align } = ui
  ui.createWidget(widget.BUTTON, {
    x: 0,
    y: 0,
    ...bounds,
    text: '',
    normal_color: colors.background,
    press_color: colors.surface,
    click_func: open,
  })
  const scale = Math.min(bounds.w / 440, bounds.h / 200)
  const left = (bounds.w - 392 * scale) / 2
  const top = (bounds.h - 170 * scale) / 2
  const label = (x, y, w, h, size, color, font = fonts.body) =>
    ui.createWidget(widget.TEXT, {
      x: left + x * scale,
      y: top + y * scale,
      w: w * scale,
      h: h * scale,
      text: '',
      font,
      text_size: Math.round(size * scale),
      color,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: ui.text_style.WRAP,
    })
  const route = label(0, 0, 392, 36, 27, colors.primary)
  const number = label(0, 42, 210, 93, 82, colors.text)
  const status = label(230, 52, 162, 62, 23, colors.text)
  const dot = ui.createWidget(widget.FILL_RECT, {
    x: left,
    y: top + 150 * scale,
    w: 6 * scale,
    h: 6 * scale,
    radius: 3 * scale,
    color: colors.background,
  })
  const footer = label(17, 139, 375, 28, 20, colors.muted)
  return (model) => {
    const display = presentation(model)
    dot.setProperty(
      prop.COLOR,
      display.live && display.status === 'Live'
        ? colors.success
        : colors.background,
    )
    route.setProperty(prop.TEXT, `440  /  ${model.boarding}`)
    number.setProperty(prop.TEXT, display.live ? model.number : '—')
    status.setProperty(prop.TEXT, display.live ? display.unit : display.status)
    footer.setProperty(
      prop.TEXT,
      display.live ? display.caption : 'Tap to check your bus',
    )
  }
}
