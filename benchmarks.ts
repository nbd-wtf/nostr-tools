import { run, bench, group, baseline } from 'mitata'
import { initNostrWasm } from 'nostr-wasm'
import { NostrEvent } from './core.ts'
import { finalizeEvent, generateSecretKey } from './pure.ts'
import { setNostrWasm, verifyEvent } from './wasm.ts'
import { AbstractRelay } from './abstract-relay.ts'
import { Relay as PureRelay } from './relay.ts'
import { alwaysTrue } from './helpers.ts'

// benchmarking relay reads with verifyEvent
const EVENTS = 200
let messages: string[] = []
let baseContent = ''
for (let i = 0; i < EVENTS; i++) {
  baseContent += 'a'
}
const secretKey = generateSecretKey()
for (let i = 0; i < EVENTS; i++) {
  const tags = []
  for (let t = 0; t < i; t++) {
    tags.push(['t', 'nada'])
  }
  const event = { created_at: Math.round(Date.now()) / 1000, kind: 1, content: baseContent.slice(0, EVENTS - i), tags }
  const signed = finalizeEvent(event, secretKey)
  messages.push(JSON.stringify(['EVENT', '_', signed]))
}

setNostrWasm(await initNostrWasm())

const pureRelay = new PureRelay('wss://pure.com/')
const trustedRelay = new AbstractRelay('wss://trusted.com/', { verifyEvent: alwaysTrue })
const wasmRelay = new AbstractRelay('wss://wasm.com/', { verifyEvent })

const runWith = (relay: AbstractRelay) => async () => {
  return new Promise<void>(resolve => {
    let received = 0
    let sub = relay.prepareSubscription([{}], {
      id: '_',
      onevent(_: NostrEvent) {
        received++
        if (received === messages.length - 1) {
          resolve()
          sub.closed = true
          sub.close()
        }
      },
    })
    for (let e = 0; e < messages.length; e++) {
      relay._onmessage({ data: messages[e] } as any)
    }
  })
}

group(`relay read ${EVENTS} messages and verify its events`, () => {
  baseline('wasm', runWith(wasmRelay))
  bench('pure js', runWith(pureRelay))
  bench('trusted', runWith(trustedRelay))
})

// actually running the thing
await run()
