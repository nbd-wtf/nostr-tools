import {Event} from './event'

export const utf8Decoder = new TextDecoder('utf-8')
export const utf8Encoder = new TextEncoder()

//
// fast insert-into-sorted-array functions adapted from https://github.com/terrymorse58/fast-sorted-array
//
export function insertEventIntoDescendingList(
  sortedArray: Event[],
  event: Event
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
  sortedArray: Event[],
  event: Event
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
