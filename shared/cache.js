import { readConfig } from './config.js'
import { activeTrip, viewModel } from './model.js'

// Retain one observation per direction. Selection itself is never persisted.
export function mergeCache(previous, response) {
  const snapshots = {}
  if (Boolean(previous?.config?.demo) !== Boolean(response.config.demo))
    previous = null
  for (const id of ['morning', 'return']) {
    const snapshot =
      response.snapshot?.tripId === id
        ? response.snapshot
        : previous?.snapshots?.[id] ||
          (previous?.snapshot?.tripId === id ? previous.snapshot : null)
    if (snapshot) snapshots[id] = snapshot
  }
  return { config: response.config, snapshot: response.snapshot, snapshots }
}

export function cachedView(value, now, busy = false, direction = null) {
  const config = value?.config || readConfig(() => null)
  const trip = activeTrip(config, now, direction)
  const snapshot = value?.snapshots?.[trip?.id] || value?.snapshot
  return viewModel(snapshot, config, now, busy, direction)
}
