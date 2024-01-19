import type { Event } from './pure'

export type Group = {
  id: string
  name?: string
  picture?: string
  about?: string
  relay?: string
  public?: boolean
  open?: boolean
}

export function parseGroup(event: Event): Group {
  const chan: Partial<Group> = {}
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    switch (tag[0]) {
      case 'd':
        chan.id = tag[1] || ''
        break
      case 'name':
        chan.name = tag[1] || ''
        break
      case 'about':
        chan.about = tag[1] || ''
        break
      case 'picture':
        chan.picture = tag[1] || ''
        break
      case 'open':
        chan.open = true
        break
      case 'public':
        chan.public = true
        break
    }
  }
  return chan as Group
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
