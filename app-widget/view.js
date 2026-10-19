import { colors, fonts } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { drawIcon } from '../shared/icons.js'
import { buildDirectionButton } from '../shared/direction-button.js'

export function cardLayout(bounds) {
  const margin = Math.max(0, bounds.margin || 0)
  const width = Math.min(bounds.w, 480 - 2 * margin)
  const inset = Math.max(28, Math.ceil((bounds.radius || 0) * 0.65), margin)
  const scale = Math.min(1, (width - 2 * inset) / 320, (bounds.h - 32) / 176)
  return {
    left: Math.round((width - 320 * scale) / 2),
    top: Math.round((bounds.h - 176 * scale) / 2),
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
  const rect = (x, y, w, h, radius, color) =>
    ui.createWidget(widget.FILL_RECT, { x, y, w, h, radius, color })
  const text = (x, y, w, h, size, font = fonts.body, horizontal = align.LEFT) =>
    ui.createWidget(widget.TEXT, {
      x,
      y,
      w,
      h,
      text: '',
      font,
      text_size: Math.round(size * scale),
      color: colors.text,
      align_h: horizontal,
      align_v: align.CENTER_V,
      text_style: ui.text_style.WRAP,
    })
  rect(left, top, 88 * scale, 34 * scale, 14 * scale, colors.primary)
  drawIcon(
    ui,
    'bus',
    left + 7 * scale,
    top + 5 * scale,
    24 * scale,
    colors.ink,
    colors.primary,
  )
  const line = text(
    left + 35 * scale,
    top,
    50 * scale,
    34 * scale,
    24,
    fonts.bold,
  )
  line.setProperty(prop.TEXT, '440')
  line.setProperty(prop.COLOR, colors.ink)
  const live = drawIcon(
    ui,
    'live',
    left + width - 144 * scale,
    top + 5 * scale,
    24 * scale,
    colors.success,
    colors.surface,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    left + width - 144 * scale,
    top + 5 * scale,
    24 * scale,
    colors.warning,
    colors.surface,
  )
  const status = text(
    left + width - 110 * scale,
    top,
    110 * scale,
    34 * scale,
    20,
  )

  const valueWidth = width - 96
  const bubble = rect(
    left,
    top + 44 * scale,
    valueWidth,
    96 * scale,
    28 * scale,
    colors.surface,
  )
  const value = text(
    left + 8 * scale,
    top + 45 * scale,
    valueWidth - 16 * scale,
    68 * scale,
    64,
    fonts.bold,
    align.CENTER_H,
  )
  const unit = text(
    left + 8 * scale,
    top + 111 * scale,
    valueWidth - 16 * scale,
    26 * scale,
    20,
    fonts.body,
    align.CENTER_H,
  )
  const updateDirection = buildDirectionButton(
    ui,
    { x: left + width - 84, y: top + 68 * scale, w: 84, h: 48 },
    switchDirection,
  )
  const route = text(left, top + 148 * scale, width, 28 * scale, 22)
  return (model) => {
    const display = presentation(model)
    updateDirection(model)
    bubble.setProperty(prop.COLOR, colors[display.fill])
    status.setProperty(prop.TEXT, display.hasArrival ? display.status : '')
    status.setProperty(prop.COLOR, colors[display.tone])
    value.setProperty(
      prop.TEXT,
      display.hasArrival ? display.value : display.cardValue,
    )
    value.setProperty(
      prop.TEXT_SIZE,
      Math.round(
        (display.hasArrival ? (display.showClock ? 48 : 64) : 24) * scale,
      ),
    )
    value.setProperty(prop.COLOR, colors[display.ink])
    unit.setProperty(
      prop.TEXT,
      display.hasArrival ? display.unit : 'Tap to check',
    )
    unit.setProperty(
      prop.TEXT_SIZE,
      Math.round((display.hasArrival ? 20 : 16) * scale),
    )
    unit.setProperty(prop.COLOR, colors[display.ink])
    route.setProperty(prop.TEXT, display.journey)
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
  }
}
