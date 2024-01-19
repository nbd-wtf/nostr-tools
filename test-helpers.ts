import { Server } from 'mock-socket'

import { finalizeEvent, type Event, getPublicKey, generateSecretKey } from './pure.ts'
import { matchFilters, type Filter } from './filter.ts'

export function buildEvent(params: Partial<Event>): Event {
  return {
    id: '',
    kind: 1,
    pubkey: '',
    created_at: 0,
    content: '',
    tags: [],
    sig: '',
    ...params,
  }
}

let serial = 0

// the mock relay will always return 3 events before eose and then do ok with everything
export function newMockRelay(): { url: string; authors: string[] } {
  serial++
  const url = `wss://mock.relay.url/${serial}`
  const relay = new Server(url)
  const secretKeys = [generateSecretKey(), generateSecretKey(), generateSecretKey(), generateSecretKey()]

  relay.on('connection', (conn: any) => {
    let subs: { [subId: string]: { conn: any; filters: Filter[] } } = {}

    conn.on('message', (message: string) => {
      const data = JSON.parse(message)
      switch (data[0]) {
        case 'REQ': {
          let subId = data[1]
          let filters = data.slice(2)
          subs[subId] = { conn, filters }
          filters.forEach((filter: Filter) => {
            const kinds = filter.kinds?.length ? filter.kinds : [1]
            kinds.forEach(kind => {
              secretKeys.forEach(sk => {
                const event = finalizeEvent(
                  {
                    kind,
                    content: '',
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [],
                  },
                  sk,
                )
                conn.send(JSON.stringify(['EVENT', subId, event]))
              })
            })
          })
          conn.send(JSON.stringify(['EOSE', subId]))
          break
        }
        case 'CLOSE': {
          let subId = data[1]
          delete subs[subId]
          break
        }
        case 'EVENT': {
          let event = data[1]
          conn.send(JSON.stringify(['OK', event.id, 'true']))
          for (let subId in subs) {
            const { filters, conn: listener } = subs[subId]
            if (matchFilters(filters, event)) {
              listener.send(JSON.stringify(['EVENT', subId, event]))
            }
          }
          break
        }
      }
    })
  })

  return { url, authors: secretKeys.map(getPublicKey) }
}
