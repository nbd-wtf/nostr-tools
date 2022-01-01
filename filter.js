export function matchFilter(filter, event) {
  if (filter.id && event.id !== filter.id) return false
  if (typeof filter.kind === 'number' && event.kind !== filter.kind) return false
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1)
    return false
  if (
    filter['#e'] &&
    !event.tags.find(([t, v]) => t === 'e' && v === filter['#e'])
  )
    return false
  if (
    filter['#p'] &&
    !event.tags.find(([t, v]) => t === 'p' && v === filter['#p'])
  )
    return false
  if (filter.since && event.created_at <= filter.since) return false

  return true
}

export function matchFilters(filters, event) {
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event)) return true
  }
  return false
}
