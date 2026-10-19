import { colors, fonts, sizes } from './theme.js'

// Shared, labelled control: no extra information row or persistent setting.
export function buildDirectionButton(
  ui,
  bounds,
  switchDirection,
  card = false,
) {
  const button = ui.createWidget(ui.widget.BUTTON, {
    ...bounds,
    radius: sizes.radius,
    text: 'Swap',
    text_size: 18,
    font: fonts.body,
    color: colors.text,
    normal_color: card ? colors.background : colors.surface,
    press_color: card ? colors.surface : colors.background,
    click_func: switchDirection,
  })
  return (model) => {
    button.setProperty(ui.prop.TEXT, model.manual ? 'Auto' : 'Swap')
    button.setProperty(ui.prop.VISIBLE, Boolean(model.direction))
  }
}
