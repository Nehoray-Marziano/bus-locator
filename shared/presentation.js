import { sizes } from './theme.js'

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
  const shortTown = (town) =>
    town === 'Meitar' ? 'MTR' : town === 'Jerusalem' ? 'JLM' : 'Your stop'
  return {
    hasArrival,
    live,
    scheduled,
    showClock,
    etaTone:
      !hasArrival || demo
        ? 'text'
        : live
          ? 'success'
          : scheduled
            ? 'warning'
            : 'muted',
    journey: model.destination
      ? `${model.boarding} to ${model.destination}`
      : model.boarding,
    status: hasArrival
      ? demo
        ? 'Demo'
        : live
          ? 'Live'
          : scheduled
            ? 'Scheduled'
            : 'Cached'
      : emptyStatus,
    tone: live
      ? 'success'
      : scheduled || model.tone === 'warning'
        ? 'warning'
        : 'muted',
    value: hasArrival ? (showClock ? model.eta : model.number) : '—',
    valueSize: showClock
      ? sizes.clock
      : model.number.length > 2
        ? sizes.compactCountdown
        : sizes.countdown,
    unit: showClock
      ? model.tomorrow
        ? 'Tomorrow'
        : 'Today'
      : model.number === 'Due'
        ? 'Arriving now'
        : 'min',
    headline: hasArrival ? '' : headline,
    detail: hasArrival ? '' : recovery,
    cardRoute: model.destination
      ? `${shortTown(model.boarding)} → ${shortTown(model.destination)}`
      : shortTown(model.boarding),
    cardStatus: hasArrival
      ? demo
        ? 'Demo'
        : live
          ? 'Live'
          : scheduled
            ? 'Est.'
            : 'Cached'
      : '',
    cardValue:
      model.status === 'SETUP'
        ? 'Open app'
        : model.status === 'CHECKING'
          ? 'Checking…'
          : 'Tap to check',
    cardDetail: model.status === 'NO UPDATE' ? 'No saved ETA' : emptyStatus,
  }
}
