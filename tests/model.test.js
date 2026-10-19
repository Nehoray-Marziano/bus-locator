import test from 'node:test'
import assert from 'node:assert/strict'
import { readConfig } from '../shared/config.js'
import { activeTrip, validateArrival, viewModel } from '../shared/model.js'
import { NOW, prediction } from './helpers.js'

const config = readConfig(() => null)
test('defaults switch to Jerusalem at 10:00 and tomorrow Meitar at 18:00 every day', () => {
  for (let day = 18; day <= 24; day++) {
    assert.equal(
      activeTrip(config, Date.parse(`2026-10-${day}T06:59:59Z`)).stopCode,
      '14100',
    )
    assert.equal(
      activeTrip(config, Date.parse(`2026-10-${day}T07:00:00Z`)).stopCode,
      '222',
    )
    assert.equal(
      activeTrip(config, Date.parse(`2026-10-${day}T14:59:59Z`)).id,
      'return',
    )
    const evening = activeTrip(config, Date.parse(`2026-10-${day}T15:00:00Z`))
    assert.equal(evening.stopCode, '14100')
    assert.equal(evening.serviceDate, `2026-10-${day + 1}`)
  }
})
test('Zepp JSON strings and raw strings work; switch time is editable', () => {
  const custom = readConfig((key) => ({ switchTime: '"10:00"' })[key])
  assert.equal(
    activeTrip(custom, Date.parse('2026-10-19T07:00:00Z')).id,
    'return',
  )
})
test('configuration rejects bad switch times without making a request', () => {
  for (const switchTime of ['24:00', '00:00', 'noon', 12, false])
    assert.ok(
      readConfig((key) => (key === 'switchTime' ? switchTime : null)).error,
    )
})
test('demo must be explicitly enabled; ordinary setup needs no server or key', () => {
  assert.equal(readConfig(() => null).demo, false)
  assert.equal(readConfig((key) => (key === 'demo' ? 'true' : null)).demo, true)
  assert.equal(
    readConfig((key) => (key === 'demo' ? 'false' : null)).demo,
    false,
  )
})
test('countdown rounds up, shows Due at zero and expires passed arrivals', () => {
  assert.equal(viewModel(prediction(), config, NOW + 1).number, '10')
  const due = prediction({ arrivalAt: NOW })
  assert.equal(viewModel(due, config, NOW).number, 'Due')
  assert.equal(viewModel(due, config, NOW + 31000).status, 'UPDATE NEEDED')
})
test('stale and future source timestamps never show a live countdown', () => {
  assert.equal(
    viewModel(prediction(), config, NOW + 120001).status,
    'OLD UPDATE',
  )
  assert.equal(
    viewModel(prediction({ checkedAt: NOW + 31000 }), config, NOW).status,
    'OLD UPDATE',
  )
})
test('previous date and opposite direction cannot leak through the cache', () => {
  assert.equal(
    viewModel(prediction({ date: '2026-10-18' }), config, NOW).status,
    'NO UPDATE',
  )
  assert.equal(
    viewModel(prediction({ tripId: 'return' }), config, NOW).status,
    'NO UPDATE',
  )
})
test('demo, empty, setup, loading and error are distinct', () => {
  assert.equal(
    viewModel(prediction({ demo: true }), config, NOW).status,
    'DEMO · SAMPLE DATA',
  )
  assert.equal(
    viewModel(prediction({ kind: 'empty' }), config, NOW).status,
    'NO PREDICTION',
  )
  assert.equal(viewModel(null, null, NOW).status, 'SETUP')
  assert.equal(viewModel(null, config, NOW, true).status, 'CHECKING')
  assert.equal(
    viewModel(prediction({ kind: 'error' }), config, NOW).status,
    'UNAVAILABLE',
  )
})
test('prediction contract rejects wrong trips, fake types, stale and malformed arrivals', () => {
  for (const changes of [
    { tripId: 'return' },
    { kind: 'schedule' },
    { checkedAt: NOW - 120001 },
    { checkedAt: NOW + 31000 },
    { arrivalAt: 'soon' },
    { arrivalAt: NOW + 7 * 3600000 },
    { stopName: null },
  ]) {
    assert.throws(() => validateArrival(prediction(changes), 'morning', NOW))
  }
  assert.equal(
    validateArrival(prediction(), 'morning', NOW).arrivalAt,
    NOW + 600000,
  )
})
