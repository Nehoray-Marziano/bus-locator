import test from 'node:test'
import assert from 'node:assert/strict'
import { createCommuteService } from '../app-side/service.js'
import { withDeadline } from '../shared/deadline.js'
import { NOW, prediction } from './helpers.js'

function setup(fetchArrival, settings = {}) {
  let time = NOW
  const values = { ...settings }
  return {
    values,
    setTime(value) {
      time = value
    },
    get: createCommuteService({
      getSetting: (key) => values[key],
      fetchArrival,
      now: () => time,
    }),
  }
}
test('no requests at all until opened; repeated checks reuse the original observation', async () => {
  let calls = 0
  const service = setup(async () => {
    calls++
    return prediction()
  })
  assert.equal(calls, 0)
  await service.get()
  service.setTime(NOW + 29000)
  const cached = await service.get()
  assert.equal(calls, 1)
  assert.equal(cached.snapshot.checkedAt, NOW)
  service.setTime(NOW + 30000)
  await service.get()
  assert.equal(calls, 2)
})
test('concurrent taps share one request', async () => {
  let finish
  let calls = 0
  const service = setup(() => {
    calls++
    return new Promise((resolve) => (finish = resolve))
  })
  const requests = [service.get(), service.get(), service.get()]
  finish(prediction())
  await Promise.all(requests)
  assert.equal(calls, 1)
})
test('demo and invalid configuration consume no internet data', async () => {
  const noNetwork = () => assert.fail('Unexpected HTTP request')
  assert.equal(
    (await setup(noNetwork, { demo: true }).get()).snapshot.demo,
    true,
  )
  assert.ok(
    (await setup(noNetwork, { switchTime: '24:00' }).get()).config.error,
  )
})
test('refresh errors retain last prediction without making it fresh again', async () => {
  let fail = false
  const service = setup(async () => {
    if (fail) throw new Error('Offline')
    return prediction()
  })
  await service.get()
  fail = true
  service.setTime(NOW + 30001)
  assert.equal((await service.get()).snapshot.checkedAt, NOW)
})
test('initial errors are cached for the request gap and can be retried', async () => {
  let calls = 0
  const service = setup(async () => {
    calls++
    throw new Error('Offline')
  })
  assert.equal((await service.get()).snapshot.kind, 'error')
  assert.equal((await service.get()).snapshot.kind, 'error')
  assert.equal(calls, 1)
  service.setTime(NOW + 31000)
  await service.get()
  assert.equal(calls, 2)
})
test('configuration changes and direction changes ignore old requests', async () => {
  let finish
  const service = setup((trip) =>
    trip.id === 'morning'
      ? new Promise((resolve) => (finish = resolve))
      : Promise.resolve(
          prediction({
            tripId: 'return',
            checkedAt: Date.parse('2026-10-19T10:00:00Z'),
            arrivalAt: Date.parse('2026-10-19T10:10:00Z'),
          }),
        ),
  )
  const morning = service.get()
  service.setTime(Date.parse('2026-10-19T10:00:00Z'))
  assert.equal((await service.get()).snapshot.tripId, 'return')
  finish(prediction())
  await morning
  assert.equal((await service.get()).snapshot.tripId, 'return')
})
test('request deadlines reject hung operations and clear their timer', async () => {
  let fire
  let cancelled = false
  const pending = withDeadline(
    new Promise(() => {}),
    9000,
    (callback) => {
      fire = callback
      return 7
    },
    (id) => {
      assert.equal(id, 7)
      cancelled = true
    },
  )
  fire()
  await assert.rejects(pending, /timed out/)
  assert.equal(cancelled, true)
})
