import { decode, type AddressPointer, type ProfilePointer, type EventPointer } from './nip19.ts'

import type { Event } from './core.ts'

type Reference = {
  text: string
  profile?: ProfilePointer
  event?: EventPointer
  address?: AddressPointer
}

const mentionRegex = /\bnostr:((note|npub|naddr|nevent|nprofile)1\w+)\b|#\[(\d+)\]/g

export function parseReferences(evt: Event): Reference[] {
  let references: Reference[] = []
  for (let ref of evt.content.matchAll(mentionRegex)) {
    if (ref[2]) {
      // it's a NIP-27 mention
      try {
        let { type, data } = decode(ref[1])
        switch (type) {
          case 'npub': {
            references.push({
              text: ref[0],
              profile: { pubkey: data as string, relays: [] },
            })
            break
          }
          case 'nprofile': {
            references.push({
              text: ref[0],
              profile: data as ProfilePointer,
            })
            break
          }
          case 'note': {
            references.push({
              text: ref[0],
              event: { id: data as string, relays: [] },
            })
            break
          }
          case 'nevent': {
            references.push({
              text: ref[0],
              event: data as EventPointer,
            })
            break
          }
          case 'naddr': {
            references.push({
              text: ref[0],
              address: data as AddressPointer,
            })
            break
          }
        }
      } catch (err) {
        /***/
      }
    } else if (ref[3]) {
      // it's a NIP-10 mention
      let idx = parseInt(ref[3], 10)
      let tag = evt.tags[idx]
      if (!tag) continue

      switch (tag[0]) {
        case 'p': {
          references.push({
            text: ref[0],
            profile: { pubkey: tag[1], relays: tag[2] ? [tag[2]] : [] },
          })
          break
        }
        case 'e': {
          references.push({
            text: ref[0],
            event: { id: tag[1], relays: tag[2] ? [tag[2]] : [] },
          })
          break
        }
        case 'a': {
          try {
            let [kind, pubkey, identifier] = tag[1].split(':')
            references.push({
              text: ref[0],
              address: {
                identifier,
                pubkey,
                kind: parseInt(kind, 10),
                relays: tag[2] ? [tag[2]] : [],
              },
            })
          } catch (err) {
            /***/
          }
          break
        }
      }
    }
  }

  return references
}
