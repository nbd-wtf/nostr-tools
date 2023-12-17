import type { Event } from './event.ts'

export const utf8Decoder = new TextDecoder('utf-8')
export const utf8Encoder = new TextEncoder()

export function normalizeURL(url: string): string {
  let p = new URL(url)
  p.pathname = p.pathname.replace(/\/+/g, '/')
  if (p.pathname.endsWith('/')) p.pathname = p.pathname.slice(0, -1)
  if ((p.port === '80' && p.protocol === 'ws:') || (p.port === '443' && p.protocol === 'wss:')) p.port = ''
  p.searchParams.sort()
  p.hash = ''
  return p.toString()
}

//
// fast insert-into-sorted-array functions adapted from https://github.com/terrymorse58/fast-sorted-array
//
export function insertEventIntoDescendingList(sortedArray: Event[], event: Event) {
  let start = 0
  let end = sortedArray.length - 1
  let midPoint
  let position = start

  if (end < 0) {
    position = 0
  } else if (event.created_at < sortedArray[end].created_at) {
    position = end + 1
  } else if (event.created_at >= sortedArray[start].created_at) {
    position = start
  } else
    while (true) {
      if (end <= start + 1) {
        position = end
        break
      }
      midPoint = Math.floor(start + (end - start) / 2)
      if (sortedArray[midPoint].created_at > event.created_at) {
        start = midPoint
      } else if (sortedArray[midPoint].created_at < event.created_at) {
        end = midPoint
      } else {
        // aMidPoint === num
        position = midPoint
        break
      }
    }

  // insert when num is NOT already in (no duplicates)
  if (sortedArray[position]?.id !== event.id) {
    return [...sortedArray.slice(0, position), event, ...sortedArray.slice(position)]
  }

  return sortedArray
}

export function insertEventIntoAscendingList(sortedArray: Event[], event: Event) {
  let start = 0
  let end = sortedArray.length - 1
  let midPoint
  let position = start

  if (end < 0) {
    position = 0
  } else if (event.created_at > sortedArray[end].created_at) {
    position = end + 1
  } else if (event.created_at <= sortedArray[start].created_at) {
    position = start
  } else
    while (true) {
      if (end <= start + 1) {
        position = end
        break
      }
      midPoint = Math.floor(start + (end - start) / 2)
      if (sortedArray[midPoint].created_at < event.created_at) {
        start = midPoint
      } else if (sortedArray[midPoint].created_at > event.created_at) {
        end = midPoint
      } else {
        // aMidPoint === num
        position = midPoint
        break
      }
    }

  // insert when num is NOT already in (no duplicates)
  if (sortedArray[position]?.id !== event.id) {
    return [...sortedArray.slice(0, position), event, ...sortedArray.slice(position)]
  }

  return sortedArray
}

export class QueueNode<V> {
  public value: V
  public next: QueueNode<V> | null = null
  public prev: QueueNode<V> | null = null

  constructor(message: V) {
    this.value = message
  }
}

export class Queue<V> {
  public first: QueueNode<V> | null
  public last: QueueNode<V> | null

  constructor() {
    this.first = null
    this.last = null
  }

  enqueue(value: V): boolean {
    const newNode = new QueueNode(value)
    if (!this.last) {
      // list is empty
      this.first = newNode
      this.last = newNode
    } else if (this.last === this.first) {
      // list has a single element
      this.last = newNode
      this.last.prev = this.first
      this.first.next = newNode
    } else {
      // list has elements, add as last
      newNode.prev = this.last
      this.last.next = newNode
      this.last = newNode
    }
    return true
  }

  dequeue(): V | null {
    if (!this.first) return null

    if (this.first === this.last) {
      const target = this.first
      this.first = null
      this.last = null
      return target.value
    }

    const target = this.first
    this.first = target.next

    return target.value
  }
}
