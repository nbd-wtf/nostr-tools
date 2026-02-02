import type { NostrEvent } from './core.ts'

export const utf8Decoder: TextDecoder = new TextDecoder('utf-8')
export const utf8Encoder: TextEncoder = new TextEncoder()

export { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'

export function normalizeURL(url: string): string {
  try {
    if (url.indexOf('://') === -1) url = 'wss://' + url
    let p = new URL(url)
    if (p.protocol === 'http:') p.protocol = 'ws:'
    else if (p.protocol === 'https:') p.protocol = 'wss:'
    p.pathname = p.pathname.replace(/\/+/g, '/')
    if (p.pathname.endsWith('/')) p.pathname = p.pathname.slice(0, -1)
    if ((p.port === '80' && p.protocol === 'ws:') || (p.port === '443' && p.protocol === 'wss:')) p.port = ''
    p.searchParams.sort()
    p.hash = ''
    return p.toString()
  } catch (e) {
    throw new Error(`Invalid URL: ${url}`)
  }
}

export function insertEventIntoDescendingList(sortedArray: NostrEvent[], event: NostrEvent): NostrEvent[] {
  const [idx, found] = binarySearch(sortedArray, b => {
    if (event.id === b.id) return 0
    if (event.created_at === b.created_at) return -1
    return b.created_at - event.created_at
  })
  if (!found) {
    sortedArray.splice(idx, 0, event)
  }
  return sortedArray
}

export function insertEventIntoAscendingList(sortedArray: NostrEvent[], event: NostrEvent): NostrEvent[] {
  const [idx, found] = binarySearch(sortedArray, b => {
    if (event.id === b.id) return 0
    if (event.created_at === b.created_at) return -1
    return event.created_at - b.created_at
  })
  if (!found) {
    sortedArray.splice(idx, 0, event)
  }
  return sortedArray
}

export function binarySearch<T>(arr: T[], compare: (b: T) => number): [number, boolean] {
  let start = 0
  let end = arr.length - 1

  while (start <= end) {
    const mid = Math.floor((start + end) / 2)
    const cmp = compare(arr[mid])

    if (cmp === 0) {
      return [mid, true]
    }

    if (cmp < 0) {
      end = mid - 1
    } else {
      start = mid + 1
    }
  }

  return [start, false]
}

export function mergeReverseSortedLists(list1: NostrEvent[], list2: NostrEvent[]): NostrEvent[] {
  const result: NostrEvent[] = new Array(list1.length + list2.length)
  result.length = 0
  let i1 = 0
  let i2 = 0
  let sameTimestampIds: string[] = []

  while (i1 < list1.length && i2 < list2.length) {
    let next: NostrEvent
    if (list1[i1]?.created_at > list2[i2]?.created_at) {
      next = list1[i1]
      i1++
    } else {
      next = list2[i2]
      i2++
    }

    if (result.length > 0 && result[result.length - 1].created_at === next.created_at) {
      if (sameTimestampIds.includes(next.id)) continue
    } else {
      sameTimestampIds.length = 0
    }

    result.push(next)
    sameTimestampIds.push(next.id)
  }

  while (i1 < list1.length) {
    const next = list1[i1]
    i1++

    if (result.length > 0 && result[result.length - 1].created_at === next.created_at) {
      if (sameTimestampIds.includes(next.id)) continue
    } else {
      sameTimestampIds.length = 0
    }
    result.push(next)
    sameTimestampIds.push(next.id)
  }

  while (i2 < list2.length) {
    const next = list2[i2]
    i2++

    if (result.length > 0 && result[result.length - 1].created_at === next.created_at) {
      if (sameTimestampIds.includes(next.id)) continue
    } else {
      sameTimestampIds.length = 0
    }
    result.push(next)
    sameTimestampIds.push(next.id)
  }

  return result
}
