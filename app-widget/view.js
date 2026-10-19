import { colors, fonts } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { drawIcon } from '../shared/icons.js'
import { buildDirectionButton } from '../shared/direction-button.js'

// Keep content clear of the system card margin and rounded side edges. Never
// place a unit/status column against the right edge of a circular watch.
export function cardLayout(bounds) {
  const margin = Math.max(0, bounds.margin || 0)
  const width = Math.min(bounds.w, 480 - 2 * margin)
  const inset = Math.max(28, Math.ceil((bounds.radius || 0) * 0.65), margin)
  const scale = Math.min(1, (width - 2 * inset) / 320, (bounds.h - 32) / 158)
  return {
    left: Math.round((width - 320 * scale) / 2),
    top: Math.round((bounds.h - 158 * scale) / 2),
    scale,
    width: 320 * scale,
  }
}

export function buildCardView(ui, bounds, open, switchDirection = () => {}) {
  const { widget, prop, align } = ui
  ui.createWidget(widget.BUTTON, {
    x: 0,
    y: 0,
    w: bounds.w,
    h: bounds.h,
    radius: bounds.radius,
    text: '',
    normal_color: colors.surface,
    press_color: colors.background,
    click_func: open,
  })
  const { left, top, scale, width } = cardLayout(bounds)
  const text = (y, h, size, font = fonts.body, indent = 0, right = 0) =>
    ui.createWidget(widget.TEXT, {
      x: left + indent * scale,
      y: top + y * scale,
      w: width - indent * scale - right,
      h: h * scale,
      text: '',
      font,
      text_size: Math.round(size * scale),
      color: colors.text,
      align_h: align.LEFT,
      align_v: align.CENTER_V,
      text_style: ui.text_style.WRAP,
    })
  drawIcon(
    ui,
    'bus',
    left,
    top + 5 * scale,
    24 * scale,
    colors.text,
    colors.surface,
  )
  const heading = text(0, 34, 22, fonts.bold, 36, 64)
  const updateDirection = buildDirectionButton(
    ui,
    { x: left + width - 56, y: top - 7, w: 56, h: 48 },
    switchDirection,
    true,
  )
  const value = text(38, 80, 64, fonts.bold)
  const live = drawIcon(
    ui,
    'live',
    left,
    top + 130 * scale,
    24 * scale,
    colors.success,
    colors.surface,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    left,
    top + 130 * scale,
    24 * scale,
    colors.warning,
    colors.surface,
  )
  const status = text(126, 30, 21, fonts.body, 36)
  return (model) => {
    const display = presentation(model)
    updateDirection(model)
    heading.setProperty(prop.TEXT, `440 · ${model.boarding}`)
    value.setProperty(prop.TEXT, display.cardValue)
    value.setProperty(
      prop.TEXT_SIZE,
      Math.round((display.hasArrival ? 64 : 30) * scale),
    )
    value.setProperty(prop.COLOR, colors[display.tone])
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
    status.setProperty(prop.TEXT, display.cardDetail)
    status.setProperty(prop.COLOR, colors[display.tone])
  }
}
