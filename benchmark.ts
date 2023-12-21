import { initNostrWasm } from 'nostr-wasm'
import { NostrEvent } from './core'
import { finalizeEvent, generateSecretKey } from './pure'
import { setNostrWasm, verifyEvent } from './wasm'
import { AbstractRelay } from './abstract-relay.ts'
import { Relay as PureRelay } from './relay.ts'
import { alwaysTrue } from './helpers.ts'

const EVENTS = 1000

let messages: string[] = []
let baseContent = ''
for (let i = 0; i < EVENTS; i++) {
  baseContent += 'a'
}
const secretKey = generateSecretKey()
for (let i = 0; i < EVENTS / 200; i++) {
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

const run = (relay: AbstractRelay) => async () => {
  return new Promise<void>(resolve => {
    let received = 0
    let sub = relay.prepareSubscription([{}], {
      onevent(_: NostrEvent) {
        received++
        if (received === messages.length - 1) {
          resolve()
          sub.closed = true
          sub.close()
        }
      },
      id: '_',
    })
    for (let e = 0; e < messages.length; e++) {
      relay._push(messages[e])
    }
  })
}

const benchmarks: Record<string, { test: () => Promise<void>; runs: number[] }> = {
  trusted: { test: run(trustedRelay), runs: [] },
  pure: { test: run(pureRelay), runs: [] },
  wasm: { test: run(wasmRelay), runs: [] },
}

for (let b = 0; b < 20; b++) {
  for (let name in benchmarks) {
    const { test, runs } = benchmarks[name]
    const before = performance.now()
    await test()
    runs.push(performance.now() - before)
  }
}

for (let name in benchmarks) {
  const { runs } = benchmarks[name]
  console.log(name, runs.reduce((a, b) => a + b, 0) / runs.length)
}
