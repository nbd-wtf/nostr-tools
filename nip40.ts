import { Event } from './core.ts'

/** Get the expiration of the event as a `Date` object, if any. */
function getExpiration(event: Event): Date | undefined {
  const tag = event.tags.find(([name]) => name === 'expiration')
  if (tag) {
    return new Date(parseInt(tag[1]) * 1000)
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
  if (expiration) {
    const diff = expiration.getTime() - Date.now()
    if (diff > 0) {
      await sleep(diff)
      return event
    } else {
      return event
    }
  } else {
    throw new Error('Event has no expiration')
  }
}

/** Calls the callback when the event expires. */
function onExpire(event: Event, callback: (event: Event) => void): void {
  waitForExpire(event)
    .then(callback)
    .catch(() => {})
}

/** Resolves when the given number of milliseconds have elapsed. */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { getExpiration, isEventExpired, waitForExpire, onExpire }
