// Records the same widget commands sent to Zepp. This is a contract/geometry
// harness, not a replacement for firmware or simulator testing.
export function nativeUI() {
  const commands = []
  return {
    commands,
    widget: {
      TEXT: 'TEXT',
      FILL_RECT: 'FILL_RECT',
      BUTTON: 'BUTTON',
      ARC: 'ARC',
    },
    align: { CENTER_H: 'CENTER_H', CENTER_V: 'CENTER_V', LEFT: 'LEFT' },
    text_style: { WRAP: 'WRAP' },
    prop: {
      TEXT: 'text',
      COLOR: 'color',
      TEXT_SIZE: 'text_size',
      MORE: 'more',
    },
    createWidget(type, options) {
      const command = { type, ...options }
      commands.push(command)
      return {
        setProperty(name, value) {
          if (name === 'more') Object.assign(command, value)
          else command[name] = value
        },
      }
    },
  }
}
