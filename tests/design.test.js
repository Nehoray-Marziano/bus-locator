import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { colors, fonts } from '../shared/theme.js'
import { presentation } from '../shared/presentation.js'
import { buildCardView, cardLayout } from '../app-widget/view.js'
import { buildWatchView } from '../page/view.js'
import { drawIcon } from '../shared/icons.js'
import { viewModel } from '../shared/model.js'
import { readConfig } from '../shared/config.js'
import { nativeUI } from './native-ui.js'
import { NOW, prediction } from './helpers.js'

function luminance(color) {
  const values = [16, 8, 0]
    .map((shift) => ((color >> shift) & 255) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722
}
test('all text colors meet AA contrast on their actual surfaces', () => {
  for (const [foreground, background] of [
    ['text', 'background'],
    ['muted', 'background'],
    ['primary', 'background'],
    ['warning', 'background'],
    ['text', 'surface'],
    ['muted', 'surface'],
    ['success', 'surface'],
    ['warning', 'surface'],
    ['ink', 'primary'],
    ['ink', 'pressed'],
    ['ink', 'success'],
    ['ink', 'warning'],
  ]) {
    const levels = [
      luminance(colors[foreground]),
      luminance(colors[background]),
    ].sort((a, b) => b - a)
    assert.ok(
      (levels[0] + 0.05) / (levels[1] + 0.05) >= 4.5,
      `${foreground} on ${background}`,
    )
  }
  assert.ok(
    (luminance(colors.text) + 0.05) / (luminance(colors.surface) + 0.05) >= 4.5,
  )
})
test('DESIGN.md mirrors canonical runtime colors', () => {
  const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8')
  for (const [name, color] of Object.entries(colors))
    assert.match(
      design,
      new RegExp(
        `${name}: ['"]#${color.toString(16).padStart(6, '0')}['"]`,
        'i',
      ),
    )
})
test('native refresh button calls refresh and is at least 48px high', () => {
  const ui = nativeUI()
  let calls = 0
  buildWatchView(ui, () => calls++)
  const button = ui.commands.find(
    (command) => command.type === 'BUTTON' && command.text === 'Refresh',
  )
  assert.ok(button.h >= 48)
  button.click_func()
  assert.equal(calls, 1)
})

test('both surfaces show the boarding town before its destination', () => {
  const config = readConfig(() => null)
  for (const [time, boarding, opposite] of [
    [NOW, 'Meitar', 'Jerusalem'],
    [Date.parse('2026-10-19T09:00:00Z'), 'Jerusalem', 'Meitar'],
  ]) {
    const model = viewModel(null, config, time)
    const watch = nativeUI()
    buildWatchView(watch, () => {})(model)
    const origin = watch.commands.find((item) => item.text === boarding)
    const destination = watch.commands.find(
      (item) => item.text === `to ${opposite}`,
    )
    assert.ok(origin && destination && origin.y < destination.y)
    const card = nativeUI()
    buildCardView(card, { w: 440, h: 200, radius: 30 }, () => {})(model)
    assert.ok(
      card.commands.some((item) => item.text === `${boarding} to ${opposite}`),
    )
  }
})
test('native shapes stay within the round display, including rounded edges', () => {
  const ui = nativeUI()
  buildWatchView(ui, () => {})
  for (const item of ui.commands) {
    // Text boxes may include unused transparent corner space; inspect actual
    // text extents in the rendered layout preview as well.
    assert.ok(
      item.x >= 0 &&
        item.y >= 0 &&
        item.x + item.w <= 480 &&
        item.y + item.h <= 480,
    )
    if (item.type === 'FILL_RECT' || item.type === 'BUTTON') {
      const radius = Math.min(item.radius || 0, item.w / 2, item.h / 2)
      for (const cx of [item.x + radius, item.x + item.w - radius])
        for (const cy of [item.y + radius, item.y + item.h - radius])
          for (let angle = 0; angle < 360; angle += 5) {
            const x = cx + radius * Math.cos((angle * Math.PI) / 180)
            const y = cy + radius * Math.sin((angle * Math.PI) / 180)
            assert.ok(
              Math.hypot(x - 240, y - 240) <= 240.01,
              JSON.stringify(item),
            )
          }
    }
  }
})

test('long waits use a readable clock time; demo stays explicit', () => {
  const config = readConfig(() => null)
  const long = viewModel(
    prediction({ arrivalAt: NOW + 128 * 60000 }),
    config,
    NOW,
  )
  assert.equal(presentation(long).value, long.eta)
  assert.equal(presentation(long).valueSize, 82)
  assert.match(long.eta, /^\d{2}:\d{2}$/)
  assert.equal(
    presentation(viewModel(prediction({ demo: true }), config, NOW)).status,
    'Demo',
  )
})

test('empty state clears countdown; watch never displays backend station codes', () => {
  const ui = nativeUI()
  const update = buildWatchView(ui, () => {})
  const config = readConfig(() => null)
  update(viewModel(prediction(), config, NOW))
  const countdown = ui.commands.find(
    (item) => item.type === 'TEXT' && item.text === '10',
  )
  let content = ui.commands.map((item) => item.text || '').join(' ')
  assert.doesNotMatch(content, /14100|\b222\b|Metar Junction/)
  update(viewModel(prediction({ kind: 'empty' }), config, NOW))
  assert.equal(countdown.text, '')
  content = ui.commands.map((item) => item.text || '').join(' ')
  assert.match(content, /No arrivals/)
  assert.doesNotMatch(content, /14100|\b222\b/)
})

test('bundled fonts are small and every watch text widget uses them', () => {
  const ui = nativeUI()
  buildWatchView(ui, () => {})
  for (const item of ui.commands.filter(
    (item) => item.type === 'TEXT' || item.type === 'BUTTON',
  ))
    assert.ok(Object.values(fonts).includes(item.font))
  for (const path of Object.values(fonts)) {
    const bytes = readFileSync(
      new URL(`../assets/trex3/${path}`, import.meta.url),
    )
    assert.ok(bytes.length > 1000 && bytes.length < 35000)
    assert.equal(bytes.readUInt32BE(0), 0x00010000)
  }
})

test('broadcast waves mark only fresh live data on both surfaces', () => {
  const config = readConfig(() => null)
  for (const surface of ['watch', 'card']) {
    const ui = nativeUI()
    const update =
      surface === 'watch'
        ? buildWatchView(ui, () => {})
        : buildCardView(ui, { w: 440, h: 220, radius: 30 }, () => {})
    const waves = ui.commands.filter(
      (item) => item.type === 'ARC' && item.color === colors.success,
    )
    assert.equal(waves.length, 3)
    const calendar = ui.commands.filter((item) => item.color === colors.warning)
    assert.ok(calendar.length > 0)
    update(viewModel(prediction(), config, NOW))
    assert.ok(waves.every((item) => item.visible))
    assert.ok(calendar.every((item) => item.visible === false))
    update(viewModel(prediction({ source: 'scheduled' }), config, NOW))
    assert.ok(calendar.every((item) => item.visible))
    for (const sample of [
      prediction({ demo: true }),
      prediction({ source: 'scheduled' }),
      prediction({ checkedAt: NOW - 121000 }),
      prediction({ kind: 'error' }),
    ]) {
      update(viewModel(sample, config, NOW))
      assert.ok(waves.every((item) => item.visible === false))
    }
    assert.ok(calendar.every((item) => item.visible === false))
  }
})

test('arrival panels change source color and clear green after live data expires', () => {
  const config = readConfig(() => null)
  for (const surface of ['watch', 'card']) {
    const ui = nativeUI()
    const update =
      surface === 'watch'
        ? buildWatchView(ui, () => {})
        : buildCardView(
            ui,
            { w: 320, h: 220, radius: 32, margin: 16 },
            () => {},
          )
    update(viewModel(prediction(), config, NOW))
    const panel = ui.commands.find(
      (item) =>
        item.type === 'FILL_RECT' &&
        item.color === colors.success &&
        item.w > 100,
    )
    assert.ok(panel, 'fresh live ETA has a mint panel')
    const number = ui.commands.find(
      (item) => item.type === 'TEXT' && item.text === '10',
    )
    assert.equal(number.color, colors.ink)
    update(viewModel(prediction({ source: 'scheduled' }), config, NOW))
    assert.equal(panel.color, colors.warning)
    for (const sample of [
      prediction({ demo: true }),
      prediction({ checkedAt: NOW - 121000 }),
      prediction({ kind: 'empty' }),
      prediction({ kind: 'error' }),
    ]) {
      update(viewModel(sample, config, NOW))
      assert.notEqual(panel.color, colors.success)
    }
  }
})

test('shortcut card fits different surfaces and opens the app on tap', () => {
  for (const bounds of [
    { w: 440, h: 200, radius: 30 },
    { w: 400, h: 160, radius: 24 },
    { w: 432, h: 220, radius: 48, margin: 24 },
    { w: 400, h: 220, radius: 32, margin: 40 },
    { w: 320, h: 220, radius: 32, margin: 80 },
  ]) {
    const ui = nativeUI()
    let calls = 0
    const update = buildCardView(ui, bounds, () => calls++)
    update(
      viewModel(
        prediction(),
        readConfig(() => null),
        NOW,
      ),
    )
    for (const item of ui.commands) {
      assert.ok(
        item.x >= (bounds.margin || 0) &&
          item.y >= 0 &&
          item.x + item.w <= bounds.w + (bounds.margin || 0) &&
          item.y + item.h <= bounds.h,
      )
      if (item.type === 'TEXT') {
        const origin = bounds.margin || 0
        assert.ok(
          item.x >= origin + 28 && item.x + item.w <= origin + bounds.w - 28,
        )
      }
    }
    ui.commands[0].click_func()
    assert.equal(calls, 1)
    update(
      viewModel(
        null,
        readConfig(() => null),
        NOW,
      ),
    )
    assert.ok(ui.commands.some((item) => item.text === 'Tap to check'))
  }
})

test('system margin translates the entire card once without shrinking its content', () => {
  const bounds = { w: 400, h: 220, radius: 32 }
  const local = nativeUI()
  const native = nativeUI()
  buildCardView(local, bounds, () => {})
  buildCardView(native, { ...bounds, margin: 40 }, () => {})
  assert.equal(native.commands[0].x, 40)
  assert.equal(native.commands[0].x + native.commands[0].w, 440)
  const layout = cardLayout({ ...bounds, margin: 40 })
  assert.equal(layout.left + layout.width / 2, 240)
  for (const [index, item] of native.commands.entries()) {
    assert.ok(Math.abs(item.x - local.commands[index].x - 40) < 0.000001)
    assert.equal(item.w, local.commands[index].w)
    assert.equal(item.h, local.commands[index].h)
  }
})

test('refresh arrowhead joins the arc at its clockwise endpoint at native sizes', () => {
  for (const size of [22, 32]) {
    const ui = nativeUI()
    const icon = drawIcon(ui, 'refresh', 0, 0, size, colors.ink, colors.primary)
    const [arc, ...arms] = ui.commands
    const angle = (arc.end_angle * Math.PI) / 180
    const endpoint = {
      x: arc.x + arc.w / 2 + arc.radius * Math.cos(angle),
      y: arc.y + arc.h / 2 + arc.radius * Math.sin(angle),
    }
    for (const arm of arms) {
      assert.ok(endpoint.x >= arm.x && endpoint.x <= arm.x + arm.w)
      assert.ok(endpoint.y >= arm.y && endpoint.y <= arm.y + arm.h)
    }
    icon.setVisible(false)
    assert.ok(ui.commands.every((item) => item.visible === false))
  }
})

test('launcher icon retains an alpha channel at the native asset size', () => {
  const png = readFileSync(new URL('../assets/trex3/icon.png', import.meta.url))
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 124)
  assert.equal(png.readUInt32BE(20), 124)
  assert.equal(
    png[25],
    6,
    'RGBA PNG required; RGB bakes in a square background',
  )
})
test('state changes reserve the same geometry and do not allocate more widgets', () => {
  const ui = nativeUI()
  const update = buildWatchView(ui, () => {})
  const config = readConfig(() => null)
  const before = ui.commands.map(({ x, y, w, h }) => ({ x, y, w, h }))
  for (const snapshot of [
    null,
    prediction(),
    prediction({ kind: 'empty' }),
    prediction({ checkedAt: NOW - 121000 }),
    prediction({ demo: true }),
    prediction({ kind: 'error' }),
  ])
    update(viewModel(snapshot, config, NOW))
  assert.deepEqual(
    ui.commands.map(({ x, y, w, h }) => ({ x, y, w, h })),
    before,
  )
})
test('manifest grants storage only and registers no background or GPS service', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../app.json', import.meta.url)),
  )
  assert.deepEqual(manifest.permissions, ['device:os.local_storage'])
  const modules = manifest.targets.trex3.module
  for (const name of ['app-service', 'app-event', 'secondary-widget'])
    assert.equal(name in modules, false)
})
