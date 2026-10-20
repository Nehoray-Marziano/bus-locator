// Records the same widget commands sent to Zepp. This is a contract/geometry
// harness, not a replacement for firmware or simulator testing.
export function nativeUI({ ignoreCanvasVisibility = false } = {}) {
  const commands = []
  return {
    commands,
    widget: {
      TEXT: 'TEXT',
      FILL_RECT: 'FILL_RECT',
      BUTTON: 'BUTTON',
      ARC: 'ARC',
      CANVAS: 'CANVAS',
    },
    align: { CENTER_H: 'CENTER_H', CENTER_V: 'CENTER_V', LEFT: 'LEFT' },
    text_style: { WRAP: 'WRAP' },
    prop: {
      TEXT: 'text',
      COLOR: 'color',
      TEXT_SIZE: 'text_size',
      MORE: 'more',
      VISIBLE: 'visible',
    },
    createWidget(type, options) {
      const command = { type, ...options }
      commands.push(command)
      return {
        setEnable(value) {
          command.enabled = value
        },
        drawPoly(options) {
          command.polygons ||= []
          command.polygons.push(options)
        },
        clear() {
          command.polygons = []
        },
        setProperty(name, value) {
          if (ignoreCanvasVisibility && type === 'CANVAS' && name === 'visible')
            return
          if (name === 'more') Object.assign(command, value)
          else command[name] = value
        },
      }
    },
  }
}
