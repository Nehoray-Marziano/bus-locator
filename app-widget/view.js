import { colors, fonts, sizes } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'

export function cardLayout(bounds) {
  const margin = Math.max(0, bounds.margin || 0)
  const inset = Math.max(28, Math.ceil((bounds.radius || 0) * 0.65))
  const width = Math.min(376, bounds.w - 2 * inset)
  const scale = Math.min(1, (bounds.h - 24) / 240)
  return {
    // Reported width excludes the native margin; translate the entire card once.
    left: margin + (bounds.w - width) / 2,
    top: (bounds.h - 240 * scale) / 2,
    scale,
    width,
  }
}

export function buildCardView(ui, bounds, open) {
  const { widget, prop, align } = ui
  ui.createWidget(widget.BUTTON, {
    x: Math.max(0, bounds.margin || 0),
    y: 0,
    w: bounds.w,
    h: bounds.h,
    radius: bounds.radius,
    text: '',
    normal_color: colors.surface,
    press_color: colors.control,
    click_func: open,
  })
  const { left, top, scale, width } = cardLayout(bounds)
  const text = (x, y, w, h, size, color, horizontal = align.CENTER_H) => {
    const label = ui.createWidget(widget.TEXT, {
      x,
      y,
      w,
      h,
      text: '',
      font: fonts.bold,
      text_size: Math.round(size * scale),
      color,
      align_h: horizontal,
      align_v: align.CENTER_V,
      text_style: ui.text_style.WRAP,
    })
    // Every visible pixel belongs to the one card action, including text.
    label.setEnable(false)
    return label
  }
  const line = text(left, top, 88, 36 * scale, 32, colors.text, align.LEFT)
  line.setProperty(prop.TEXT, '440')
  const status = text(
    left + width - 144,
    top,
    144,
    36 * scale,
    28,
    colors.muted,
  )
  const value = text(
    left,
    top + 36 * scale,
    width,
    132 * scale,
    sizes.cardCountdown,
    colors.text,
  )
  const unit = text(
    left,
    top + 164 * scale,
    width,
    36 * scale,
    30,
    colors.muted,
  )
  const route = text(
    left,
    top + 202 * scale,
    width,
    38 * scale,
    34,
    colors.text,
  )
  return (model) => {
    const display = presentation(model)
    status.setProperty(prop.TEXT, display.cardStatus)
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
          : 34) * scale,
      ),
    )
    value.setProperty(prop.COLOR, colors[display.etaTone])
    unit.setProperty(
      prop.TEXT,
      display.hasArrival ? display.unit : display.cardDetail,
    )
    route.setProperty(prop.TEXT, display.cardRoute)
  }
}
