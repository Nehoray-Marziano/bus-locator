import { mkdirSync, writeFileSync } from 'node:fs'
import { buildWatchView } from '../page/view.js'
import { viewModel } from '../shared/model.js'
import { readConfig } from '../shared/config.js'
import { nativeUI } from '../tests/native-ui.js'
import { colors } from '../shared/theme.js'
import { buildCardView } from '../app-widget/view.js'
import { drawIcon } from '../shared/icons.js'

const now = Date.parse('2026-10-19T05:00:00Z')
const config = readConfig(() => null)
const sample = {
  kind: 'arrival',
  tripId: 'morning',
  date: '2026-10-19',
  checkedAt: now - 10000,
  arrivalAt: now + 12 * 60000,
  lineLabel: '440',
  stopName: 'Metar Junction',
}
const scenes = [
  ['Morning · synthetic prediction', viewModel(sample, config, now)],
  [
    'Return · synthetic prediction',
    viewModel(
      {
        ...sample,
        tripId: 'return',
        checkedAt: now + 8 * 3600000,
        arrivalAt: now + 8 * 3600000 + 4 * 60000,
      },
      config,
      now + 8 * 3600000,
    ),
  ],
  ['Due', viewModel({ ...sample, arrivalAt: now }, config, now)],
  [
    'Long wait / 128 minutes',
    viewModel({ ...sample, arrivalAt: now + 128 * 60000 }, config, now),
  ],
  ['Checking', viewModel(null, config, now, true)],
  ['First opening', viewModel(null, config, now)],
  ['Expired prediction', viewModel(sample, config, now + 121000)],
  ['No live prediction', viewModel({ ...sample, kind: 'empty' }, config, now)],
  [
    'Invalid settings',
    viewModel(null, { error: 'Use a valid switch time in Zepp.' }, now),
  ],
  [
    'Phone disconnected',
    {
      ...viewModel(null, config, now),
      status: 'PHONE UNREACHABLE',
      detail: 'Open Zepp and check Bluetooth.',
    },
  ],
  ['Explicit demo mode', viewModel({ ...sample, demo: true }, config, now)],
  [
    'Scheduled fallback',
    viewModel({ ...sample, source: 'scheduled' }, config, now),
  ],
  [
    'Tomorrow / scheduled',
    viewModel(
      {
        ...sample,
        date: '2026-10-20',
        source: 'scheduled',
        checkedAt: now + 10 * 3600000,
        arrivalAt: Date.parse('2026-10-20T03:18:00Z'),
      },
      config,
      now + 10 * 3600000,
    ),
  ],
  [
    'Offline cached ETA',
    { ...viewModel(sample, config, now), status: 'PHONE UNREACHABLE' },
  ],
  [
    'Manual return / synthetic prediction',
    viewModel({ ...sample, tripId: 'return' }, config, now, false, 'return'),
  ],
  [
    'Manual return / tomorrow scheduled',
    viewModel(
      {
        ...sample,
        tripId: 'return',
        date: '2026-10-20',
        source: 'scheduled',
        checkedAt: now + 10 * 3600000,
        arrivalAt: Date.parse('2026-10-20T11:58:59Z'),
      },
      config,
      now + 10 * 3600000,
      false,
      'return',
    ),
  ],
]
const output = scenes.map(([title, model]) => {
  const ui = nativeUI()
  buildWatchView(ui, () => {})(model)
  return { title, commands: ui.commands }
})
mkdirSync('artifacts', { recursive: true })
// Exercise the same widget through a busy cycle, including firmware that does
// not hide a Canvas via VISIBLE. The busy render must have no arrow pixels.
const refreshUI = nativeUI({ ignoreCanvasVisibility: true })
const updateRefresh = buildWatchView(refreshUI, () => {})
writeFileSync(
  'artifacts/refresh-button-states.json',
  JSON.stringify(
    [
      ['Refresh', false],
      ['Checking…', true],
      ['Refresh restored', false],
    ].map(([title, busy]) => {
      updateRefresh(viewModel(sample, config, now, busy))
      return { title, commands: JSON.parse(JSON.stringify(refreshUI.commands)) }
    }),
    null,
    2,
  ),
)
writeFileSync('artifacts/watch-layouts.json', JSON.stringify(output, null, 2))
const card = nativeUI()
buildCardView(card, { w: 440, h: 264, radius: 36, margin: 20 }, () => {})(
  scenes[0][1],
)
writeFileSync(
  'artifacts/card-layout.json',
  JSON.stringify(card.commands, null, 2),
)
writeFileSync('artifacts/preview-colors.json', JSON.stringify(colors, null, 2))
const cards = []
for (const bounds of [
  { w: 432, h: 264, radius: 48, margin: 24 },
  { w: 400, h: 264, radius: 32, margin: 40 },
  { w: 320, h: 264, radius: 32, margin: 80 },
])
  for (const index of Array.from({ length: 14 }, (_, index) => index)) {
    const ui = nativeUI()
    buildCardView(ui, bounds, () => {})(scenes[index][1])
    cards.push({
      title: `${bounds.w}px / ${scenes[index][0]}`,
      bounds,
      commands: ui.commands,
    })
  }
writeFileSync('artifacts/card-scenes.json', JSON.stringify(cards, null, 2))
writeFileSync(
  'artifacts/refresh-icons.json',
  JSON.stringify(
    [22, 32].map((size) => {
      const ui = nativeUI()
      drawIcon(ui, 'refresh', 0, 0, size, colors.ink, colors.primary)
      return { size, commands: ui.commands }
    }),
    null,
    2,
  ),
)
console.log(
  `Generated ${output.length} native watch states and a shortcut card (synthetic data).`,
)
