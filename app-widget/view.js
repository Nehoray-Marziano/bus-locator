import { colors, fonts, sizes } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { drawIcon } from '../shared/icons.js'
import { buildDirectionButton } from '../shared/direction-button.js'

export function cardLayout(bounds) {
  const margin = Math.max(0, bounds.margin || 0)
  const width = bounds.w
  const inset = Math.max(28, Math.ceil((bounds.radius || 0) * 0.65))
  const scale = Math.min(1, (width - 2 * inset) / 320, (bounds.h - 32) / 176)
  return {
    // T-Rex 3's native card drawing starts at the screen's left edge. The
    // reported width already excludes the system margin; apply it only once.
    left: margin + Math.round((width - 320 * scale) / 2),
    top: Math.round((bounds.h - 176 * scale) / 2),
    scale,
    width: 320 * scale,
  }
}

export function buildCardView(ui, bounds, open, switchDirection = () => {}) {
  const { widget, prop, align } = ui
  ui.createWidget(widget.BUTTON, {
    x: Math.max(0, bounds.margin || 0),
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
  drawIcon(
    ui,
    'bus',
    left,
    top + 5 * scale,
    24 * scale,
    colors.primary,
    colors.surface,
  )
  const line = text(
    left + 34 * scale,
    top,
    50 * scale,
    34 * scale,
    26,
    fonts.bold,
  )
  line.setProperty(prop.TEXT, '440')
  const live = drawIcon(
    ui,
    'live',
    left + width - 166 * scale,
    top + 5 * scale,
    24 * scale,
    colors.success,
    colors.surface,
  )
  const calendar = drawIcon(
    ui,
    'calendar',
    left + width - 166 * scale,
    top + 5 * scale,
    24 * scale,
    colors.warning,
    colors.surface,
  )
  const status = text(
    left + width - 132 * scale,
    top,
    132 * scale,
    34 * scale,
    20,
  )

  const valueWidth = width - 96
  const value = text(
    left,
    top + 30 * scale,
    valueWidth,
    96 * scale,
    sizes.cardCountdown,
    fonts.bold,
    align.LEFT,
  )
  const unit = text(
    left,
    top + 122 * scale,
    valueWidth,
    24 * scale,
    20,
    fonts.body,
    align.LEFT,
  )
  const updateDirection = buildDirectionButton(
    ui,
    { x: left + width - 84, y: top + 68 * scale, w: 84, h: 48 },
    switchDirection,
  )
  rect(left, top + 146 * scale, width, 1, 0, colors.divider)
  const route = text(left, top + 148 * scale, width, 28 * scale, 22)
  return (model) => {
    const display = presentation(model)
    updateDirection(model)
    status.setProperty(prop.TEXT, display.hasArrival ? display.status : '')
    status.setProperty(prop.COLOR, colors[display.tone])
    value.setProperty(
      prop.TEXT,
      display.hasArrival ? display.value : display.cardValue,
    )
    value.setProperty(
      prop.TEXT_SIZE,
      Math.round(
        (display.hasArrival
          ? display.showClock
            ? sizes.cardClock
            : sizes.cardCountdown
          : 24) * scale,
      ),
    )
    value.setProperty(prop.COLOR, colors[display.etaTone])
    unit.setProperty(
      prop.TEXT,
      display.hasArrival ? display.unit : 'Tap to check',
    )
    unit.setProperty(
      prop.TEXT_SIZE,
      Math.round((display.hasArrival ? 20 : 16) * scale),
    )
    unit.setProperty(prop.COLOR, colors.muted)
    route.setProperty(prop.TEXT, display.journey)
    live.setVisible(display.live)
    calendar.setVisible(display.scheduled)
  }
}
