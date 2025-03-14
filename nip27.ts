import { AddressPointer, EventPointer, ProfilePointer, decode } from './nip19.ts'

export type Block =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'reference'
      pointer: ProfilePointer | AddressPointer | EventPointer
    }
  | {
      type: 'url'
      url: string
    }
  | {
      type: 'relay'
      url: string
    }
  | {
      type: 'image'
      url: string
    }
  | {
      type: 'video'
      url: string
    }
  | {
      type: 'audio'
      url: string
    }

const noCharacter = /\W/m
const noURLCharacter = /\W |\W$|$|,| /m

export function* parse(content: string): Iterable<Block> {
  const max = content.length
  let prevIndex = 0
  let index = 0
  while (index < max) {
    let u = content.indexOf(':', index)
    if (u === -1) {
      // reached end
      break
    }

    if (content.substring(u - 5, u) === 'nostr') {
      const m = content.substring(u + 60).match(noCharacter)
      const end = m ? u + 60 + m.index! : max
      try {
        let pointer: ProfilePointer | AddressPointer | EventPointer
        let { data, type } = decode(content.substring(u + 1, end))

        switch (type) {
          case 'npub':
            pointer = { pubkey: data } as ProfilePointer
            break
          case 'nsec':
          case 'note':
            // ignore this, treat it as not a valid uri
            index = end + 1
            continue
          default:
            pointer = data as any
        }

        if (prevIndex !== u - 5) {
          yield { type: 'text', text: content.substring(prevIndex, u - 5) }
        }
        yield { type: 'reference', pointer }
        index = end
        prevIndex = index
        continue
      } catch (_err) {
        // ignore this, not a valid nostr uri
        index = u + 1
        continue
      }
    } else if (content.substring(u - 5, u) === 'https' || content.substring(u - 4, u) === 'http') {
      const m = content.substring(u + 4).match(noURLCharacter)
      const end = m ? u + 4 + m.index! : max
      const prefixLen = content[u - 1] === 's' ? 5 : 4
      try {
        let url = new URL(content.substring(u - prefixLen, end))
        if (url.hostname.indexOf('.') === -1) {
          throw new Error('invalid url')
        }

        if (prevIndex !== u - prefixLen) {
          yield { type: 'text', text: content.substring(prevIndex, u - prefixLen) }
        }

        if (
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.jpg') ||
          url.pathname.endsWith('.jpeg') ||
          url.pathname.endsWith('.gif') ||
          url.pathname.endsWith('.webp')
        ) {
          yield { type: 'image', url: url.toString() }
          index = end
          prevIndex = index
          continue
        }
        if (
          url.pathname.endsWith('.mp4') ||
          url.pathname.endsWith('.avi') ||
          url.pathname.endsWith('.webm') ||
          url.pathname.endsWith('.mkv')
        ) {
          yield { type: 'video', url: url.toString() }
          index = end
          prevIndex = index
          continue
        }
        if (
          url.pathname.endsWith('.mp3') ||
          url.pathname.endsWith('.aac') ||
          url.pathname.endsWith('.ogg') ||
          url.pathname.endsWith('.opus')
        ) {
          yield { type: 'audio', url: url.toString() }
          index = end
          prevIndex = index
          continue
        }

        yield { type: 'url', url: url.toString() }
        index = end
        prevIndex = index
        continue
      } catch (_err) {
        // ignore this, not a valid url
        index = end + 1
        continue
      }
    } else if (content.substring(u - 3, u) === 'wss' || content.substring(u - 2, u) === 'ws') {
      const m = content.substring(u + 4).match(noURLCharacter)
      const end = m ? u + 4 + m.index! : max
      const prefixLen = content[u - 1] === 's' ? 3 : 2
      try {
        let url = new URL(content.substring(u - prefixLen, end))
        if (url.hostname.indexOf('.') === -1) {
          throw new Error('invalid ws url')
        }

        if (prevIndex !== u - prefixLen) {
          yield { type: 'text', text: content.substring(prevIndex, u - prefixLen) }
        }
        yield { type: 'relay', url: url.toString() }
        index = end
        prevIndex = index
        continue
      } catch (_err) {
        // ignore this, not a valid url
        index = end + 1
        continue
      }
    } else {
      // ignore this, it is nothing
      index = u + 1
      continue
    }
  }

  if (prevIndex !== max) {
    yield { type: 'text', text: content.substring(prevIndex) }
  }
}
