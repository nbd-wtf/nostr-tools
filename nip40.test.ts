import { describe, test, expect, jest, spyOn } from 'bun:test'
import { buildEvent } from './test-helpers.ts'
import { getExpiration, isEventExpired, waitForExpire, onExpire } from './nip40.ts'

describe('getExpiration', () => {
  test('returns the expiration as a Date object', () => {
    const event = buildEvent({ tags: [['expiration', '123']] })
    const result = getExpiration(event)
    expect(result).toEqual(new Date(123000))
  })

  test('returns undefined when the tag is not a number', () => {
    const event = buildEvent({ tags: [['expiration', 'soon']] })
    const result = getExpiration(event)
    expect(result).toBeUndefined()
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

  test('does not resolve early when the expiration is more than 24.8 days away', async () => {
    const future = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const event = buildEvent({ tags: [['expiration', future.toString()]] })
    const delays: number[] = []
    const spy = spyOn(global, 'setTimeout').mockImplementation(((_: unknown, ms: number) => {
      delays.push(ms)
      return 0
    }) as any)
    let resolved = false
    waitForExpire(event).then(() => (resolved = true))
    await Promise.resolve()
    spy.mockRestore()
    expect(resolved).toEqual(false)
    expect(delays).toEqual([2 ** 31 - 1])
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

  test('does not call the callback when the tag is not a number', async () => {
    const event = buildEvent({ tags: [['expiration', 'soon']] })
    const callback = jest.fn()
    onExpire(event, callback)
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(callback).not.toHaveBeenCalled()
  })
})
