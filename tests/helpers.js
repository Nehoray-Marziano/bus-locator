export const NOW = Date.parse('2026-10-19T05:00:00Z')
export function prediction(overrides = {}) {
  return {
    kind: 'arrival',
    tripId: 'morning',
    date: '2026-10-19',
    checkedAt: NOW,
    arrivalAt: NOW + 600000,
    lineLabel: '440',
    stopName: 'Metar Junction',
    ...overrides,
  }
}
