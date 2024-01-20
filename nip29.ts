import type { Event } from './pure'

export type Group = {
  id: string
  relay: string
  name?: string
  picture?: string
  about?: string
  public?: boolean
  open?: boolean
}

export function parseGroup(event: Event, relay: string): Group {
  const group: Partial<Group> = { relay }
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    switch (tag[0]) {
      case 'd':
        group.id = tag[1] || ''
        break
      case 'name':
        group.name = tag[1] || ''
        break
      case 'about':
        group.about = tag[1] || ''
        break
      case 'picture':
        group.picture = tag[1] || ''
        break
      case 'open':
        group.open = true
        break
      case 'public':
        group.public = true
        break
    }
  }
  return group as Group
}

export type Member = {
  pubkey: string
  label?: string
  permissions: string[]
}

export function parseMembers(event: Event): Member[] {
  const members = []
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    if (tag.length < 2) continue
    if (tag[0] !== 'p') continue
    if (!tag[1].match(/^[0-9a-f]{64}$/)) continue
    const member: Member = { pubkey: tag[1], permissions: [] }
    if (tag.length > 2) member.label = tag[2]
    if (tag.length > 3) member.permissions = tag.slice(3)
    members.push(member)
  }
  return members
}
