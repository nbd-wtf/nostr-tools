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

export function mergeFilters(...filters: Filter<number>[]): Filter<number> {
  let result: Filter<number> = {}
  for (let i = 0; i < filters.length; i++) {
    let filter = filters[i]
    Object.entries(filter).forEach(([property, values]) => {
      if (
        property === 'kinds' ||
        property === 'ids' ||
        property === 'authors' ||
        property[0] === '#'
      ) {
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

    if (filter.limit && (!result.limit || filter.limit > result.limit))
      result.limit = filter.limit
    if (filter.until && (!result.until || filter.until > result.until))
      result.until = filter.until
    if (filter.since && (!result.since || filter.since < result.since))
      result.since = filter.since
  }

  return result
}
