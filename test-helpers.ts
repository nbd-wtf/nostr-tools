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

/**
 * A mock Relay class for testing purposes.
 * This mock relay returns some events before eose and then will be ok with everything.
 * @class
 * @example
 * const mockRelay = new MockRelay()
 * const relay = new Relay(mockRelay.getUrl())
 * await relay.connect()
 * // Do some testing
 * relay.close()
 * mockRelay.close()
 * mockRelay.stop()
 */
export class MockRelay {
  private _url: string
  private _server: Server
  private _secretKeys: Uint8Array[]
  private _preloadedEvents: Event[]

  constructor(url?: string | undefined) {
    this._url = url ?? `wss://random.mock.relay/${Math.floor(Math.random() * 10000)}`
    this._server = new Server(this._url)
    this._secretKeys = [generateSecretKey(), generateSecretKey(), generateSecretKey(), generateSecretKey()]
    this._preloadedEvents = this._secretKeys.map(sk =>
      finalizeEvent(
        {
          kind: 1,
          content: '',
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
        },
        sk,
      ),
    )

    this._server.on('connection', (conn: any) => {
      let subs: { [subId: string]: { conn: any; filters: Filter[] } } = {}

      conn.on('message', (message: string) => {
        const data = JSON.parse(message)

        switch (data[0]) {
          case 'REQ': {
            let subId = data[1]
            let filters = data.slice(2)
            subs[subId] = { conn, filters }

            this._preloadedEvents.forEach(event => {
              conn.send(JSON.stringify(['EVENT', subId, event]))
            })

            filters.forEach((filter: Filter) => {
              const kinds = filter.kinds?.length ? filter.kinds : [1]

              kinds.forEach(kind => {
                this._secretKeys.forEach(sk => {
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
  }

  /**
   * Get the URL of the mock relay.
   * @returns The URL of the mock relay.
   */
  getUrl() {
    return this._url
  }

  /**
   * Get the public keys of the authors of the events.
   * @returns An array of public keys.
   */
  getAuthors() {
    return this._secretKeys.map(getPublicKey)
  }

  /**
   * Get the IDs of the events.
   * @returns An array of event IDs.
   */
  getEventsIds() {
    return this._preloadedEvents.map(evt => evt.id)
  }

  /**
   * Close the mock relay server.
   */
  close() {
    this._server.close()
  }

  /**
   * Stop the mock relay server.
   */
  stop() {
    this._server.stop()
  }
}
