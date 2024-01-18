import { describe, test, expect, jest } from 'bun:test'
import { buildEvent } from './test-helpers.ts'
import { getExpiration, isEventExpired, waitForExpire, onExpire } from './nip40.ts'

describe('getExpiration', () => {
  test('returns the expiration as a Date object', () => {
    const event = buildEvent({ tags: [['expiration', '123']] })
    const result = getExpiration(event)
    expect(result).toEqual(new Date(123000))
  })
})

describe('isEventExpired', () => {
  test('returns true when the event has expired', () => {
    const event = buildEvent({ tags: [['expiration', '123']] })
    const result = isEventExpired(event)
    expect(result).toEqual(true)
  })

  test('returns false when the event has not expired', () => {
    const future = Math.floor(Date.now() / 1000) + 10
    const event = buildEvent({ tags: [['expiration', future.toString()]] })
    const result = isEventExpired(event)
    expect(result).toEqual(false)
  })
})

describe('waitForExpire', () => {
  test('returns a promise that resolves when the event expires', async () => {
    const event = buildEvent({ tags: [['expiration', '123']] })
    const result = await waitForExpire(event)
    expect(result).toEqual(event)
  })
})

describe('onExpire', () => {
  test('calls the callback when the event expires', async () => {
    const event = buildEvent({ tags: [['expiration', '123']] })
    const callback = jest.fn()
    onExpire(event, callback)
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(callback).toHaveBeenCalled()
  })
})
