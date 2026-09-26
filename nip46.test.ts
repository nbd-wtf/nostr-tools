import { test, expect } from 'bun:test'

import { BunkerSigner, createNostrConnectURI } from './nip46.ts'
import { generateSecretKey, getPublicKey, finalizeEvent } from './pure.ts'
import { getConversationKey, encrypt, decrypt } from './nip44.ts'
import { NostrConnect } from './kinds.ts'
import { EventTemplate } from './core.ts'

const clientSecretKey = generateSecretKey()
const clientPubkey = getPublicKey(clientSecretKey)

test('createNostrConnectURI always includes the secret', () => {
  const uri = new URL(createNostrConnectURI({ clientPubkey, relays: ['wss://relay.example.com'], secret: 'hunter2' }))

  expect(uri.searchParams.get('secret')).toEqual('hunter2')
})

test('fromURI rejects a URI without a secret', async () => {
  const uri = `nostrconnect://${clientPubkey}?relay=wss://relay.example.com`

  // otherwise a bunker replying `{"result": null}` would match `get('secret')`
  // and become the signer for this client
  await expect(BunkerSigner.fromURI(clientSecretKey, uri)).rejects.toThrow(/no secret/)
})

test('fromURI rejects a URI with an empty secret', async () => {
  const uri = `nostrconnect://${clientPubkey}?relay=wss://relay.example.com&secret=`

  await expect(BunkerSigner.fromURI(clientSecretKey, uri)).rejects.toThrow(/no secret/)
})

//
// a fake pool that acts as the remote signer: it decrypts each request with the
// conversation key and feeds back a response built by the `respond` function
//
type Request = { id: string; method: string; params: string[] }
type Response = { result?: any; error?: any } | undefined

function mockBunker(opts: { publish?: 'ok' | 'fail' } = {}) {
  const bunkerSecretKey = generateSecretKey()
  const bunkerPubkey = getPublicKey(bunkerSecretKey)
  const convKey = getConversationKey(clientSecretKey, bunkerPubkey)

  let respond: (req: Request) => Response = () => ({ result: 'ack' })
  let deliver: (content: string) => void = () => {}
  let closeSub: () => void = () => {}
  let opened = 0

  const event = (content: string) =>
    ({
      id: '0'.repeat(64),
      pubkey: bunkerPubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: NostrConnect,
      tags: [['p', clientPubkey]],
      content,
      sig: '0'.repeat(128),
    }) as any

  const pool = {
    subscribe(_relays: string[], _filter: any, handlers: any) {
      opened++
      deliver = (content: string) => {
        const p = handlers.onevent(event(content))
        if (p?.catch) p.catch(() => {})
      }
      closeSub = () => handlers.onclose([{ url: 'wss://mock', reason: 'closed' }])
      return { close: closeSub }
    },
    publish(_relays: string[], ev: any) {
      if (opts.publish === 'fail') return [Promise.reject(new Error('relay unreachable'))]
      const req: Request = JSON.parse(decrypt(ev.content, convKey))
      const res = respond(req)
      if (res) deliver(encrypt(JSON.stringify({ id: req.id, ...res }), convKey))
      return [Promise.resolve(ev.id)]
    },
  }

  return {
    bunkerSecretKey,
    bunkerPubkey,
    pool: pool as any,
    get opened() {
      return opened
    },
    /** what the bunker answers to each request */
    setResponse(fn: (req: Request) => Response) {
      respond = fn
    },
    /** push a raw (possibly garbage) payload as if the bunker had sent it */
    send(content: string) {
      deliver(content)
    },
    closeSub() {
      closeSub()
    },
    signer(params: any = {}) {
      return BunkerSigner.fromBunker(
        clientSecretKey,
        { relays: ['wss://mock'], pubkey: bunkerPubkey, secret: 'sec' },
        { pool, ...params },
      )
    },
  }
}

const template = (content: string): EventTemplate => ({
  kind: 1,
  content,
  tags: [],
  created_at: Math.floor(Date.now() / 1000),
})

test('a failed sign_event does not affect the next one', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer()
  let first = true
  bunker.setResponse(req =>
    req.method === 'sign_event'
      ? first
        ? ((first = false), { error: 'user rejected' })
        : { result: JSON.stringify(finalizeEvent(template('ok') as any, bunker.bunkerSecretKey)) }
      : { result: 'ack' },
  )

  await expect(signer.signEvent(template('rejected'))).rejects.toThrow('user rejected')
  const signed = await signer.signEvent(template('ok'))
  expect(signed.content).toEqual('ok')
})

test('a failed sign_event rejects with an Error, not a string', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer()
  bunker.setResponse(() => ({ error: 'user rejected' }))

  const err: any = await signer.signEvent(template('x')).catch(e => e)
  expect(err).toBeInstanceOf(Error)
  expect(err.message).toEqual('user rejected')
})

test('a response with a null result rejects instead of hanging', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer()
  bunker.setResponse(() => ({ result: null }))

  await expect(signer.signEvent(template('x'))).rejects.toThrow(/neither result nor error/)
})

test('a response with an empty string result is a valid answer', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer()
  bunker.setResponse(() => ({ result: '' }))

  expect(await signer.nip04Decrypt('somepubkey', 'ciphertext')).toEqual('')
})

test('undecryptable events are ignored and do not break pending requests', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer({ timeout: 200 })
  bunker.setResponse(() => undefined) // the bunker never answers on its own

  const pending = signer.signEvent(template('x'))
  // 24133 events from the signer that aren't valid answers for this conversation
  bunker.send('not-nip44-garbage')
  bunker.send(encrypt('not json', getConversationKey(clientSecretKey, bunker.bunkerPubkey)))
  bunker.send(encrypt(JSON.stringify({ result: 'ack' }), getConversationKey(clientSecretKey, bunker.bunkerPubkey)))
  bunker.send(
    encrypt(
      JSON.stringify({ id: 'some-other-id', result: 'ack' }),
      getConversationKey(clientSecretKey, bunker.bunkerPubkey),
    ),
  )

  await expect(pending).rejects.toThrow(/timeout after 200ms/)

  // and the signer is still usable
  bunker.setResponse(() => ({ result: JSON.stringify(finalizeEvent(template('ok') as any, bunker.bunkerSecretKey)) }))
  expect((await signer.signEvent(template('y'))).content).toEqual('ok')
})

test('an auth_url with no onauth callback rejects instead of hanging', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer({ timeout: 0 }) // no timeout: this must fail on its own
  bunker.setResponse(() => ({ result: 'auth_url', error: 'https://auth.example.com' }))

  await expect(signer.signEvent(template('x'))).rejects.toThrow(/no onauth\(\) callback configured/)
})

test('an auth_url with an onauth callback keeps the request pending until the real answer', async () => {
  const bunker = mockBunker()
  let authUrl: string | undefined
  let pendingId: string | undefined
  const signer = bunker.signer({ timeout: 0, onauth: (url: string) => (authUrl = url) })
  bunker.setResponse(req => {
    pendingId = req.id
    return { result: 'auth_url', error: 'https://auth.example.com' }
  })

  const pending = signer.signEvent(template('x'))
  expect(authUrl).toEqual('https://auth.example.com')

  // the user logs in and the bunker answers the same request again
  const signed = JSON.stringify(finalizeEvent(template('ok') as any, bunker.bunkerSecretKey))
  bunker.send(
    encrypt(
      JSON.stringify({ id: pendingId, result: signed }),
      getConversationKey(clientSecretKey, bunker.bunkerPubkey),
    ),
  )

  expect((await pending).content).toEqual('ok')
})

test('a request that is never answered times out', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer({ timeout: 50 })
  bunker.setResponse(() => undefined)

  await expect(signer.signEvent(template('x'))).rejects.toThrow(/timeout after 50ms waiting for "sign_event"/)
})

test('a failed publish rejects with a readable error and cleans up', async () => {
  const bunker = mockBunker({ publish: 'fail' })
  const signer = bunker.signer({ timeout: 0 })

  await expect(signer.signEvent(template('x'))).rejects.toThrow(
    /failed to send "sign_event" to any relay: .*relay unreachable/,
  )
  expect(Object.keys((signer as any).listeners)).toHaveLength(0)
  expect(Object.keys((signer as any).waitingForAuth)).toHaveLength(0)
})

test('a closed subscription rejects pending requests but the signer keeps working', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer({ timeout: 0 })
  bunker.setResponse(() => undefined)

  const pending = signer.signEvent(template('x'))
  bunker.closeSub()
  await expect(pending).rejects.toThrow(/subscription to the remote signer was closed/)

  // a new request gets a new subscription
  bunker.setResponse(() => ({ result: JSON.stringify(finalizeEvent(template('ok') as any, bunker.bunkerSecretKey)) }))
  expect((await signer.signEvent(template('y'))).content).toEqual('ok')
  expect(bunker.opened).toEqual(2)
})

test('settled requests leave no listeners behind', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer()
  bunker.setResponse(req => ({ result: req.method === 'ping' ? 'pong' : 'pubkey' }))

  for (let i = 0; i < 20; i++) await signer.ping()
  await signer.getPublicKey()

  expect(Object.keys((signer as any).listeners)).toHaveLength(0)
  expect(Object.keys((signer as any).waitingForAuth)).toHaveLength(0)
})

test('close() rejects pending requests', async () => {
  const bunker = mockBunker()
  const signer = bunker.signer({ timeout: 0 })
  bunker.setResponse(() => undefined)

  const pending = signer.signEvent(template('x'))
  await signer.close()
  await expect(pending).rejects.toThrow(/signer was closed/)
})
