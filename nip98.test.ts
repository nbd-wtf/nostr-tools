import {base64} from '@scure/base'
import {getToken, validateToken} from './nip98.ts'
import {Event, Kind, finishEvent} from './event.ts'
import {utf8Decoder} from './utils.ts'
import {generatePrivateKey, getPublicKey} from './keys.ts'

const sk = generatePrivateKey()

describe('getToken', () => {
  test('getToken GET returns without authorization scheme', async () => {
    let result = await getToken('http://test.com', 'get', e =>
      finishEvent(e, sk)
    )

    const decodedResult: Event = JSON.parse(
      utf8Decoder.decode(base64.decode(result))
    )

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(Kind.HttpAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'get']
    ])
  })

  test('getToken POST returns token without authorization scheme', async () => {
    let result = await getToken('http://test.com', 'post', e =>
      finishEvent(e, sk)
    )

    const decodedResult: Event = JSON.parse(
      utf8Decoder.decode(base64.decode(result))
    )

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(Kind.HttpAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'post']
    ])
  })

  test('getToken GET returns token WITH authorization scheme', async () => {
    const authorizationScheme = 'Nostr '

    let result = await getToken(
      'http://test.com',
      'post',
      e => finishEvent(e, sk),
      true
    )

    expect(result.startsWith(authorizationScheme)).toBe(true)

    const decodedResult: Event = JSON.parse(
      utf8Decoder.decode(base64.decode(result.replace(authorizationScheme, '')))
    )

    expect(decodedResult.created_at).toBeGreaterThan(0)
    expect(decodedResult.content).toBe('')
    expect(decodedResult.kind).toBe(Kind.HttpAuth)
    expect(decodedResult.pubkey).toBe(getPublicKey(sk))
    expect(decodedResult.tags).toStrictEqual([
      ['u', 'http://test.com'],
      ['method', 'post']
    ])
  })

  test('getToken unknown method throws an error', async () => {
    const result = getToken('http://test.com', 'fake', e => finishEvent(e, sk))
    await expect(result).rejects.toThrow(Error)
  })

  test('getToken missing loginUrl throws an error', async () => {
    const result = getToken('', 'get', e => finishEvent(e, sk))
    await expect(result).rejects.toThrow(Error)
  })

  test('getToken missing httpMethod throws an error', async () => {
    const result = getToken('http://test.com', '', e => finishEvent(e, sk))
    await expect(result).rejects.toThrow(Error)
  })
})

describe('validateToken', () => {
  test('validateToken returns true for valid token without authorization scheme', async () => {
    const validToken = await getToken('http://test.com', 'get', e =>
      finishEvent(e, sk)
    )

    const result = await validateToken(validToken, 'http://test.com', 'get')
    expect(result).toBe(true)
  })

  test('validateToken returns true for valid token with authorization scheme', async () => {
    const validToken = await getToken(
      'http://test.com',
      'get',
      e => finishEvent(e, sk),
      true
    )

    const result = await validateToken(validToken, 'http://test.com', 'get')
    expect(result).toBe(true)
  })

  test('validateToken throws an error for invalid token', async () => {
    const result = validateToken('fake', 'http://test.com', 'get')
    await expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for missing token', async () => {
    const result = validateToken('', 'http://test.com', 'get')
    await expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for a wrong url', async () => {
    const validToken = await getToken('http://test.com', 'get', e =>
      finishEvent(e, sk)
    )

    const result = validateToken(validToken, 'http://wrong-test.com', 'get')
    await expect(result).rejects.toThrow(Error)
  })

  test('validateToken throws an error for a wrong method', async () => {
    const validToken = await getToken('http://test.com', 'get', e =>
      finishEvent(e, sk)
    )

    const result = validateToken(validToken, 'http://test.com', 'post')
    await expect(result).rejects.toThrow(Error)
  })
})
