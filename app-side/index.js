import { BaseSideService, settingsLib } from '@zeppos/zml/base-side'
import { createCommuteService } from './service.js'
import { createArrivalProvider } from './provider.js'

const fetchArrival = createArrivalProvider({
  fetchJson: async (url) => {
    // Zepp fetch takes an options object and returns body, unlike browser fetch.
    const response = await fetch({
      url,
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (response.status !== 200) throw new Error('Arrival service unavailable')
    return typeof response.body === 'string'
      ? JSON.parse(response.body)
      : response.body
  },
})

const getCommute = createCommuteService({
  getSetting: (key) => settingsLib.getItem(key),
  fetchArrival,
})

AppSideService(
  BaseSideService({
    async onRequest(request, reply) {
      if (request.method !== 'commute.get')
        return reply(null, { error: 'Unknown request' })
      try {
        reply(null, await getCommute())
      } catch {
        reply(null, {
          config: { error: 'Could not read settings. Open Zepp.' },
          snapshot: null,
        })
      }
    },
  }),
)
