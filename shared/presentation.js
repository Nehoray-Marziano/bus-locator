const states = {
  CHECKING: ['Checking', 'Checking arrivals', ''],
  'NO UPDATE': ['Ready', 'Check your bus', 'Tap Refresh'],
  'NO PREDICTION': ['No arrivals', 'No arrivals found', 'Try Refresh later'],
  'DEMO · NO PREDICTION': ['Demo', 'No sample arrival', 'Demo mode'],
  'OLD UPDATE': ['Expired', 'Update needed', 'Tap Refresh'],
  'UPDATE NEEDED': ['Refresh', 'Check the next bus', 'Tap Refresh'],
  UNAVAILABLE: ['Offline', 'Phone offline', 'Open Zepp and check internet'],
  'PHONE UNREACHABLE': [
    'Offline',
    'Phone offline',
    'Open Zepp and check Bluetooth',
  ],
  SETUP: ['Settings', 'Check settings', 'Open app settings in Zepp'],
}

// Both surfaces use the same source labels. Green always means a fresh live ETA.
export function presentation(model) {
  const hasArrival = Boolean(model.unit)
  const demo = model.status.startsWith('DEMO')
  const live = hasArrival && !demo && model.status === 'LIVE PREDICTION'
  const scheduled = hasArrival && model.source === 'scheduled'
  const showClock = hasArrival && (model.tomorrow || Number(model.number) >= 60)
  const [emptyStatus, headline, recovery] =
    states[model.status] || states['NO UPDATE']
  return {
    hasArrival,
    live,
    scheduled,
    status: hasArrival
      ? demo
        ? 'Demo'
        : live
          ? 'Live'
          : scheduled
            ? 'Scheduled'
            : 'Cached ETA'
      : emptyStatus,
    tone: live
      ? 'success'
      : scheduled || model.tone === 'warning'
        ? 'warning'
        : 'muted',
    value: hasArrival ? (showClock ? model.eta : model.number) : '—',
    valueSize: showClock ? 82 : model.number.length > 2 ? 96 : 120,
    unit: showClock
      ? model.tomorrow
        ? 'Tomorrow'
        : 'Today'
      : model.number === 'Due'
        ? 'Arriving now'
        : 'min',
    headline: hasArrival ? '' : headline,
    detail: hasArrival ? '' : recovery,
    cardValue: hasArrival
      ? showClock
        ? model.eta
        : `${model.number}${model.number === 'Due' ? '' : ' min'}`
      : emptyStatus,
    cardDetail: hasArrival
      ? `${model.tomorrow ? 'Tomorrow · ' : ''}${demo ? 'Demo' : live ? 'Live' : scheduled ? 'Scheduled' : 'Cached'}`
      : 'Tap to check',
  }
}
