import { mkdirSync, writeFileSync } from 'node:fs'
import { buildWatchView } from '../page/view.js'
import { viewModel } from '../shared/model.js'
import { readConfig } from '../shared/config.js'
import { nativeUI } from '../tests/native-ui.js'
import { colors } from '../shared/theme.js'
import { buildCardView } from '../app-widget/view.js'

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
]
const output = scenes.map(([title, model]) => {
  const ui = nativeUI()
  buildWatchView(ui, () => {})(model)
  return { title, commands: ui.commands }
})
mkdirSync('artifacts', { recursive: true })
writeFileSync('artifacts/watch-layouts.json', JSON.stringify(output, null, 2))
const card = nativeUI()
buildCardView(card, { w: 440, h: 200, radius: 30 }, () => {})(scenes[0][1])
writeFileSync(
  'artifacts/card-layout.json',
  JSON.stringify(card.commands, null, 2),
)
writeFileSync('artifacts/preview-colors.json', JSON.stringify(colors, null, 2))
console.log(
  `Generated ${output.length} native watch states and a shortcut card (synthetic data).`,
)
