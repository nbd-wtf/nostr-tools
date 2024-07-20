import { Event } from './core.ts'
import { isParameterizedReplaceableKind, isReplaceableKind } from './kinds.ts'

export type Filter = {
  ids?: string[]
  kinds?: number[]
  authors?: string[]
  since?: number
  until?: number
  limit?: number
  search?: string
  [key: `#${string}`]: string[] | undefined
}

export function matchFilter(filter: Filter, event: Event): boolean {
  if (filter.ids && filter.ids.indexOf(event.id) === -1) {
    return false
  }
  if (filter.kinds && filter.kinds.indexOf(event.kind) === -1) {
    return false
  }
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
    return false
  }

  for (let f in filter) {
    if (f[0] === '#') {
      let tagName = f.slice(1)
      let values = filter[`#${tagName}`]
      if (values && !event.tags.find(([t, v]) => t === f.slice(1) && values!.indexOf(v) !== -1)) return false
    }
  }

  if (filter.since && event.created_at < filter.since) return false
  if (filter.until && event.created_at > filter.until) return false

  return true
}

export function matchFilters(filters: Filter[], event: Event): boolean {
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event)) {
      return true
    }
  }
  return false
}

export function mergeFilters(...filters: Filter[]): Filter {
  let result: Filter = {}
  for (let i = 0; i < filters.length; i++) {
    let filter = filters[i]
    Object.entries(filter).forEach(([property, values]) => {
      if (property === 'kinds' || property === 'ids' || property === 'authors' || property[0] === '#') {
        // @ts-ignore
        result[property] = result[property] || []
        // @ts-ignore
        for (let v = 0; v < values.length; v++) {
          // @ts-ignore
          let value = values[v]
          // @ts-ignore
          if (!result[property].includes(value)) result[property].push(value)
        }
      }
    })

    if (filter.limit && (!result.limit || filter.limit > result.limit)) result.limit = filter.limit
    if (filter.until && (!result.until || filter.until > result.until)) result.until = filter.until
    if (filter.since && (!result.since || filter.since < result.since)) result.since = filter.since
  }

  return result
}

/**
 * Calculate the intrinsic limit of a filter.
 * This function returns a positive integer, or `Infinity` if there is no intrinsic limit.
 */
export function getFilterLimit(filter: Filter): number {
  if (filter.ids && !filter.ids.length) return 0
  if (filter.kinds && !filter.kinds.length) return 0
  if (filter.authors && !filter.authors.length) return 0

  for (const [key, value] of Object.entries(filter)) {
    if (key[0] === '#' && Array.isArray(value) && !value.length) return 0
  }

  return Math.min(
    // The `limit` property creates an artificial limit.
    Math.max(0, filter.limit ?? Infinity),

    // There can only be one event per `id`.
    filter.ids?.length ?? Infinity,

    // Replaceable events are limited by the number of authors and kinds.
    filter.authors?.length && filter.kinds?.every(kind => isReplaceableKind(kind))
      ? filter.authors.length * filter.kinds.length
      : Infinity,

    // Parameterized replaceable events are limited by the number of authors, kinds, and "d" tags.
    filter.authors?.length && filter.kinds?.every(kind => isParameterizedReplaceableKind(kind)) && filter['#d']?.length
      ? filter.authors.length * filter.kinds.length * filter['#d'].length
      : Infinity,
  )
}
