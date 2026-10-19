import { colors, fonts, sizes } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'

// Allocate once; refresh only changes text and size on the existing widgets.
export function buildWatchView(ui, refresh) {
  const { createWidget, widget, align, text_style, prop } = ui
  const labels = {}
  const text = (name, x, y, w, h, size, color, horizontal = align.CENTER_H) => {
    labels[name] = createWidget(widget.TEXT, {
      x,
      y,
      w,
      h,
      text: '',
      text_size: size,
      color,
      font: fonts.body,
      align_h: horizontal,
      align_v: align.CENTER_V,
      text_style: text_style.WRAP,
    })
  }
  const rect = (x, y, w, h, radius, color) =>
    createWidget(widget.FILL_RECT, { x, y, w, h, radius, color })
  rect(0, 0, 480, 480, 240, colors.background)
  rect(201, 48, 78, 36, 18, colors.primary)
  text('line', 201, 48, 78, 36, 24, colors.ink)
  text('boarding', 65, 103, 350, 52, sizes.title, colors.text)
  rect(72, 177, 336, 174, sizes.panelRadius, colors.panel)
  text('number', 96, 178, 288, 135, sizes.countdown, colors.ink)
  text('unit', 96, 309, 288, 29, sizes.caption, colors.panelMuted)
  text('headline', 96, 202, 288, 124, 32, colors.ink)
  text('caption', 64, 365, 352, 32, sizes.caption, colors.muted)
  const liveDot = rect(157, 378, 6, 6, 3, colors.background)
  text(
    'liveCaption',
    174,
    365,
    220,
    32,
    sizes.caption,
    colors.muted,
    align.LEFT,
  )
  const buttonBounds = { x: 145, y: 413, w: 190, h: 48 }
  const button = createWidget(widget.BUTTON, {
    ...buttonBounds,
    radius: sizes.radius,
    text_size: sizes.button,
    font: fonts.body,
    normal_color: colors.primary,
    press_color: colors.pressed,
    color: colors.ink,
    text: 'Refresh',
    click_func: refresh,
  })
  return (model) => {
    const display = presentation(model)
    const isLive = display.live && display.status === 'Live'
    const values = {
      line: '440',
      boarding: model.boarding,
      number: display.live ? model.number : '',
      unit: display.live ? display.unit : '',
      headline: display.headline,
      caption: isLive ? '' : display.caption,
      liveCaption: isLive ? display.caption : '',
    }
    for (const name of Object.keys(labels))
      labels[name].setProperty(prop.TEXT, values[name] || '')
    labels.number.setProperty(prop.TEXT_SIZE, display.numberSize)
    labels.caption.setProperty(prop.COLOR, colors[display.statusColor])
    liveDot.setProperty(prop.COLOR, isLive ? colors.success : colors.background)
    // Zepp BUTTON updates require bounds alongside changed properties.
    button.setProperty(prop.MORE, { ...buttonBounds, text: model.action })
  }
}
