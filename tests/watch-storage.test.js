import test from 'node:test'
import assert from 'node:assert/strict'
import { createWatchCache } from '../shared/watch-storage.js'
import { createCardController } from '../app-widget/controller.js'
import { createController } from '../page/controller.js'
import { readConfig } from '../shared/config.js'
import { NOW, prediction } from './helpers.js'

test('a card built empty sees the app ETA on focus despite per-instance storage snapshots', async () => {
  let disk = null
  class Storage {
    constructor() {
      this.loaded = structuredClone(disk)
    }
    getItem() {
      return this.loaded
    }
    setItem(_key, value) {
      disk = structuredClone(value)
      this.loaded = value
    }
  }
  const oldInstance = new Storage()
  const cache = createWatchCache(Storage)
  const screens = []
  const card = createCardController({
    readCache: cache.read,
    render: (model) => screens.push(model),
    now: () => NOW,
    setTimer: () => 1,
    clearTimer: () => {},
  })
  assert.equal(screens.at(-1).status, 'NO UPDATE')
  const app = createController({
    readCache: cache.read,
    writeCache: cache.write,
    render: () => {},
    request: async () => ({
      config: readConfig(() => null),
      snapshot: prediction(),
    }),
    now: () => NOW,
  })
  await app.resume()
  assert.equal(
    oldInstance.getItem(),
    null,
    'reusing this instance reproduces Ready forever',
  )
  card.resume()
  assert.equal(screens.at(-1).number, '10')
  assert.equal(screens.at(-1).status, 'LIVE PREDICTION')
  card.pause()
  app.pause()
})

test('native storage failures do not crash either view', () => {
  for (const Storage of [
    class {
      constructor() {
        throw new Error('Unavailable')
      }
    },
    class {
      getItem() {
        throw new Error('Unreadable')
      }
      setItem() {
        throw new Error('Full')
      }
    },
  ]) {
    const cache = createWatchCache(Storage)
    assert.equal(cache.read(), null)
    assert.doesNotThrow(() => cache.write({ snapshot: null }))
  }
})
