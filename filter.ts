import {Event, type Kind} from './event.ts'

export type Filter<K extends number = Kind> = {
  ids?: string[]
  kinds?: K[]
  authors?: string[]
  since?: number
  until?: number
  limit?: number
  search?: string
  [key: `#${string}`]: string[]
}

export function matchFilter(
  filter: Filter<number>,
  event: Event<number>
): boolean {
  if (filter.ids && filter.ids.indexOf(event.id) === -1) {
    if (!filter.ids.some(prefix => event.id.startsWith(prefix))) {
      return false
    }
  }
  if (filter.kinds && filter.kinds.indexOf(event.kind) === -1) return false
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
    if (!filter.authors.some(prefix => event.pubkey.startsWith(prefix))) {
      return false
    }
  }

  for (let f in filter) {
    if (f[0] === '#') {
      let tagName = f.slice(1)
      let values = filter[`#${tagName}`]
      if (
        values &&
        !event.tags.find(
          ([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1
        )
      )
        return false
    }
  }

  if (filter.since && event.created_at < filter.since) return false
  if (filter.until && event.created_at >= filter.until) return false

  return true
}

export function matchFilters(
  filters: Filter<number>[],
  event: Event<number>
): boolean {
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event)) return true
  }
  return false
}
