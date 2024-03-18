import { AbstractSimplePool } from './abstract-pool.ts'
import { Subscription } from './abstract-relay.ts'
import { decode } from './nip19.ts'
import type { Event } from './core.ts'
import { fetchRelayInformation } from './nip11.ts'
import { normalizeURL } from './utils.ts'
import { AddressPointer } from './nip19.ts'

export function subscribeRelayGroups(
  pool: AbstractSimplePool,
  url: string,
  params: {
    ongroups: (_: Group[]) => void
    onerror: (_: Error) => void
    onconnect?: () => void
  },
): () => void {
  let normalized = normalizeURL(url)
  let sub: Subscription
  let groups: Group[] = []

  fetchRelayInformation(normalized)
    .then(async info => {
      let rl = await pool.ensureRelay(normalized)
      params.onconnect?.()
      sub = rl.prepareSubscription(
        [
          {
            kinds: [39000],
            limit: 50,
            authors: [info.pubkey],
          },
        ],
        {
          onevent(event: Event) {
            groups.push(parseGroup(event, normalized))
          },
          oneose() {
            params.ongroups(groups)
            sub.onevent = (event: Event) => {
              groups.push(parseGroup(event, normalized))
              params.ongroups(groups)
            }
          },
        },
      )
      sub.fire()
    })
    .catch(params.onerror)

  return () => sub.close()
}

export async function loadGroup(pool: AbstractSimplePool, gr: GroupReference): Promise<Group> {
  let normalized = normalizeURL(gr.host)

  let info = await fetchRelayInformation(normalized)
  let event = await pool.get([normalized], {
    kinds: [39000],
    authors: [info.pubkey],
    '#d': [gr.id],
  })
  if (!event) throw new Error(`group '${gr.id}' not found on ${gr.host}`)
  return parseGroup(event, normalized)
}

export async function loadGroupFromCode(pool: AbstractSimplePool, code: string): Promise<Group> {
  let gr = parseGroupCode(code)
  if (!gr) throw new Error(`code "${code}" does not identify a group`)
  return loadGroup(pool, gr)
}

export type GroupReference = {
  id: string
  host: string
}

export function parseGroupCode(code: string): null | GroupReference {
  if (code.startsWith('naddr1')) {
    try {
      let { data } = decode(code)

      let { relays, identifier } = data as AddressPointer
      if (!relays || relays.length === 0) return null

      let host = relays![0]
      if (host.startsWith('wss://')) {
        host = host.slice(6)
      }
      return { host, id: identifier }
    } catch (err) {
      return null
    }
  } else if (code.split("'").length === 2) {
    let spl = code.split("'")
    return { host: spl[0], id: spl[1] }
  }

  return null
}

export function encodeGroupReference(gr: GroupReference): string {
  if (gr.host.startsWith('https://')) gr.host = gr.host.slice(8)
  if (gr.host.startsWith('wss://')) gr.host = gr.host.slice(6)
  return `${gr.host}'${gr.id}`
}

export type Group = {
  id: string
  relay: string
  pubkey: string
  name?: string
  picture?: string
  about?: string
  public?: boolean
  open?: boolean
}

export function parseGroup(event: Event, relay: string): Group {
  const group: Partial<Group> = { relay, pubkey: event.pubkey }
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
