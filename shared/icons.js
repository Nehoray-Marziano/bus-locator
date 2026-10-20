// Small native pictograms: no image decoding, icon font, animation, or downloads.
export function drawIcon(ui, name, x, y, size, color, background) {
  const parts = []
  let isVisible = true
  let repaint = null
  const rect = (dx, dy, w, h, radius = 0, cutout = false) => {
    const part = ui.createWidget(ui.widget.FILL_RECT, {
      x: x + dx * size,
      y: y + dy * size,
      w: w * size,
      h: h * size,
      radius: radius * size,
      color: cutout ? background : color,
    })
    part.setEnable(false)
    parts.push(part)
  }
  const arc = (radius, start, end) => {
    const centerY = name === 'live' ? 0.82 : 0.5
    const part = ui.createWidget(ui.widget.ARC, {
      x: x + (0.5 - radius) * size,
      y: y + (centerY - radius) * size,
      w: 2 * radius * size,
      h: 2 * radius * size,
      radius: radius * size,
      start_angle: start,
      end_angle: end,
      line_width: Math.max(2, Math.round(size / 11)),
      color,
    })
    part.setEnable(false)
    parts.push(part)
  }
  if (name === 'bus') {
    rect(0.14, 0.08, 0.72, 0.75, 0.2)
    rect(0.23, 0.23, 0.22, 0.28, 0.06, true)
    rect(0.55, 0.23, 0.22, 0.28, 0.06, true)
    rect(0.25, 0.64, 0.1, 0.08, 0.04, true)
    rect(0.65, 0.64, 0.1, 0.08, 0.04, true)
    rect(0.2, 0.77, 0.15, 0.17, 0.04)
    rect(0.65, 0.77, 0.15, 0.17, 0.04)
  } else if (name === 'live') {
    for (const radius of [0.46, 0.3, 0.14]) arc(radius, 225, 315)
    rect(0.44, 0.76, 0.12, 0.12, 0.06)
  } else if (name === 'calendar') {
    rect(0.08, 0.18, 0.84, 0.74, 0.16)
    rect(0.18, 0.4, 0.64, 0.42, 0.02, true)
    rect(0.25, 0.05, 0.1, 0.25, 0.04)
    rect(0.65, 0.05, 0.1, 0.25, 0.04)
    rect(0.29, 0.51, 0.18, 0.18, 0.02)
  } else if (name === 'refresh') {
    // One closed silhouette keeps the shaft and triangular head connected even
    // after native pixel rounding. Separate rounded bars leave a broken joint.
    const canvas = ui.createWidget(ui.widget.CANVAS, { x, y, w: size, h: size })
    canvas.setEnable(false)
    parts.push(canvas)
    const points = []
    const halfStroke = Math.max(2, Math.round(size / 10)) / (2 * size)
    const point = (radius, angle) => ({
      x: (0.5 + radius * Math.cos((angle * Math.PI) / 180)) * size,
      y: (0.5 + radius * Math.sin((angle * Math.PI) / 180)) * size,
    })
    for (let angle = 45; angle <= 315; angle += 5)
      points.push(point(0.34 + halfStroke, angle))
    const end = point(0.34, 315)
    const diagonal = Math.SQRT1_2 * size
    points.push(
      { x: end.x + 0.18 * diagonal, y: end.y - 0.18 * diagonal },
      { x: end.x + 0.16 * diagonal, y: end.y + 0.16 * diagonal },
      { x: end.x - 0.18 * diagonal, y: end.y + 0.18 * diagonal },
    )
    for (let angle = 315; angle >= 45; angle -= 5)
      points.push(point(0.34 - halfStroke, angle))
    points.push(points[0])
    canvas.drawPoly({ data_array: points, color })
    // Clear the drawing as well as widget visibility so the longer Checking…
    // label has the full button width even if native canvas pixels persist.
    repaint = (visible) => {
      canvas.clear({ x: 0, y: 0, w: size, h: size })
      if (visible) canvas.drawPoly({ data_array: points, color })
    }
  }
  return {
    setVisible(visible) {
      for (const part of parts) part.setProperty(ui.prop.VISIBLE, visible)
      if (visible !== isVisible && repaint) repaint(visible)
      isVisible = visible
    },
  }
}
