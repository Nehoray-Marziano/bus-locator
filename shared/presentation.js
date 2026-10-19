// Short labels shared by the watch and its cache-only card.
const states = {
  CHECKING: ['Checking', 'Checking…', ''],
  'NO UPDATE': ['Ready', 'Ready when\nyou are', 'Tap Refresh'],
  'NO PREDICTION': ['No live ETA', 'No live ETA', 'Try again shortly'],
  'DEMO · NO PREDICTION': ['Demo', 'No live ETA', 'Demo · sample data'],
  'OLD UPDATE': ['Expired', 'Update expired', 'Tap Refresh'],
  'UPDATE NEEDED': ['Refresh', 'Refresh needed', 'Tap Refresh'],
  UNAVAILABLE: ['Offline', 'Phone offline', 'Open Zepp and check Bluetooth'],
  'PHONE UNREACHABLE': [
    'Offline',
    'Phone offline',
    'Open Zepp and check Bluetooth',
  ],
  SETUP: ['Settings', 'Check settings', 'Open app settings in Zepp'],
}

export function presentation(model) {
  const live = Boolean(model.unit)
  const demo = model.status.startsWith('DEMO')
  const [status, headline, caption] = live
    ? [
        demo ? 'Demo' : 'Live',
        '',
        demo
          ? 'Demo · sample data'
          : `Live · ${model.checked.replace('Checked ', '')}`,
      ]
    : states[model.status] || states['NO UPDATE']
  return {
    live,
    status,
    headline,
    caption,
    statusColor: model.tone === 'warning' ? 'warning' : 'muted',
    numberSize: model.number.length > 2 ? 104 : 128,
    unit: model.number === 'Due' ? 'at your stop' : 'min',
  }
}
