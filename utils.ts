import type {Event} from './event.ts'

export const utf8Decoder = new TextDecoder('utf-8')
export const utf8Encoder = new TextEncoder()

export function normalizeURL(url: string): string {
  let p = new URL(url)
  p.pathname = p.pathname.replace(/\/+/g, '/')
  if (p.pathname.endsWith('/')) p.pathname = p.pathname.slice(0, -1)
  if (
    (p.port === '80' && p.protocol === 'ws:') ||
    (p.port === '443' && p.protocol === 'wss:')
  )
    p.port = ''
  p.searchParams.sort()
  p.hash = ''
  return p.toString()
}

//
// fast insert-into-sorted-array functions adapted from https://github.com/terrymorse58/fast-sorted-array
//
export function insertEventIntoDescendingList(
  sortedArray: Event<number>[],
  event: Event<number>
) {
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
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ]
  }

  return sortedArray
}

export function insertEventIntoAscendingList(
  sortedArray: Event<number>[],
  event: Event<number>
) {
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
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ]
  }

  return sortedArray
}

export class MessageNode {
  private _value: string
  private _next: MessageNode | null

  public get value(): string {
    return this._value
  }
  public set value(message: string) {
    this._value = message
  }
  public get next(): MessageNode | null {
    return this._next
  }
  public set next(node: MessageNode | null) {
    this._next = node
  }

  constructor(message: string) {
    this._value = message
    this._next = null
  }
}

export class MessageQueue {
  private _first: MessageNode | null
  private _last: MessageNode | null

  public get first(): MessageNode | null {
    return this._first
  }
  public set first(messageNode: MessageNode | null) {
    this._first = messageNode
  }
  public get last(): MessageNode | null {
    return this._last
  }
  public set last(messageNode: MessageNode | null) {
    this._last = messageNode
  }
  private _size: number
  public get size(): number {
    return this._size
  }
  public set size(v: number) {
    this._size = v
  }

  constructor() {
    this._first = null
    this._last = null
    this._size = 0
  }
  enqueue(message: string): boolean {
    const newNode = new MessageNode(message)
    if (this._size === 0 || !this._last) {
      this._first = newNode
      this._last = newNode
    } else {
      this._last.next = newNode
      this._last = newNode
    }
    this._size++
    return true
  }
  dequeue(): string | null {
    if (this._size === 0 || !this._first) return null

    let prev = this._first
    this._first = prev.next
    prev.next = null

    this._size--
    return prev.value
  }
}
