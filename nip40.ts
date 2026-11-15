import { Event } from './core.ts'

/** Get the expiration of the event as a `Date` object, if any. */
function getExpiration(event: Event): Date | undefined {
  const tag = event.tags.find(([name]) => name === 'expiration')
  if (tag) {
    const expiration = new Date(parseInt(tag[1]) * 1000)
    // a tag that is not a number is treated as no expiration
    if (!isNaN(expiration.getTime())) return expiration
  }
}

/** Check if the event has expired. */
function isEventExpired(event: Event): boolean {
  const expiration = getExpiration(event)
  if (expiration) {
    return Date.now() > expiration.getTime()
  } else {
    return false
  }
}

/** Returns a promise that resolves when the event expires. */
async function waitForExpire(event: Event): Promise<Event> {
  const expiration = getExpiration(event)
  if (!expiration) {
    throw new Error('Event has no expiration')
  }
  // setTimeout fires at once for delays above 2^31-1 ms (~24.8 days),
  // so wait in steps and check the clock again after each one.
  let diff: number
  while ((diff = expiration.getTime() - Date.now()) > 0) {
    await sleep(Math.min(diff, MAX_TIMEOUT))
  }
  return event
}

/** Calls the callback when the event expires. */
function onExpire(event: Event, callback: (event: Event) => void): void {
  waitForExpire(event)
    .then(callback)
    .catch(() => {})
}

/** Largest delay setTimeout accepts. */
const MAX_TIMEOUT = 2 ** 31 - 1

/** Resolves when the given number of milliseconds have elapsed. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { getExpiration, isEventExpired, waitForExpire, onExpire }
