import { colors, fonts, sizes } from './theme.js'

// Shared, labelled control: no extra information row or persistent setting.
export function buildDirectionButton(ui, bounds, switchDirection) {
  const button = ui.createWidget(ui.widget.BUTTON, {
    ...bounds,
    radius: sizes.radius,
    text: 'Reverse',
    text_size: 18,
    font: fonts.body,
    color: colors.ink,
    normal_color: colors.primary,
    press_color: colors.pressed,
    click_func: switchDirection,
  })
  return (model) => {
    button.setProperty(ui.prop.TEXT, model.manual ? 'Reset' : 'Reverse')
    button.setProperty(ui.prop.VISIBLE, Boolean(model.direction))
  }
}
