import { NostrEvent } from './core.ts'
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
  | {
      type: 'emoji'
      shortcode: string
      url: string
    }
  | {
      type: 'hashtag'
      value: string
    }

const noCharacter = /\W/m
const noURLCharacter = /[^\w\/] |[^\w\/]$|$|,| /m
const MAX_HASHTAG_LENGTH = 42

export function* parse(content: string | NostrEvent): Iterable<Block> {
  let emojis: { type: 'emoji'; shortcode: string; url: string }[] = []
  if (typeof content !== 'string') {
    for (let i = 0; i < content.tags.length; i++) {
      const tag = content.tags[i]
      if (tag[0] === 'emoji' && tag.length >= 3) {
        emojis.push({ type: 'emoji', shortcode: tag[1], url: tag[2] })
      }
    }
    content = content.content
  }

  const max = content.length
  let prevIndex = 0
  let index = 0
  mainloop: while (index < max) {
    const u = content.indexOf(':', index)
    const h = content.indexOf('#', index)
    if (u === -1 && h === -1) {
      // reached end
      break mainloop
    }

    if (u === -1 || (h >= 0 && h < u)) {
      // parse hashtag
      if (h === 0 || content[h - 1] === ' ') {
        const m = content.slice(h + 1, h + MAX_HASHTAG_LENGTH).match(noCharacter)
        const end = m ? h + 1 + m.index! : max
        yield { type: 'text', text: content.slice(prevIndex, h) }
        yield { type: 'hashtag', value: content.slice(h + 1, end) }
        index = end
        prevIndex = index
        continue mainloop
      }

      // ignore this, it is nothing
      index = h + 1
      continue mainloop
    }

    // otherwise parse things that have an ":"
    if (content.slice(u - 5, u) === 'nostr') {
      const m = content.slice(u + 60).match(noCharacter)
      const end = m ? u + 60 + m.index! : max
      try {
        let pointer: ProfilePointer | AddressPointer | EventPointer
        let { data, type } = decode(content.slice(u + 1, end))

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
          yield { type: 'text', text: content.slice(prevIndex, u - 5) }
        }
        yield { type: 'reference', pointer }
        index = end
        prevIndex = index
        continue mainloop
      } catch (_err) {
        // ignore this, not a valid nostr uri
        index = u + 1
        continue mainloop
      }
    } else if (content.slice(u - 5, u) === 'https' || content.slice(u - 4, u) === 'http') {
      const m = content.slice(u + 4).match(noURLCharacter)
      const end = m ? u + 4 + m.index! : max
      const prefixLen = content[u - 1] === 's' ? 5 : 4
      try {
        let url = new URL(content.slice(u - prefixLen, end))
        if (url.hostname.indexOf('.') === -1) {
          throw new Error('invalid url')
        }

        if (prevIndex !== u - prefixLen) {
          yield { type: 'text', text: content.slice(prevIndex, u - prefixLen) }
        }

        if (/\.(png|jpe?g|gif|webp|heic|svg)$/i.test(url.pathname)) {
          yield { type: 'image', url: url.toString() }
          index = end
          prevIndex = index
          continue mainloop
        }
        if (/\.(mp4|avi|webm|mkv|mov)$/i.test(url.pathname)) {
          yield { type: 'video', url: url.toString() }
          index = end
          prevIndex = index
          continue mainloop
        }
        if (/\.(mp3|aac|ogg|opus|wav|flac)$/i.test(url.pathname)) {
          yield { type: 'audio', url: url.toString() }
          index = end
          prevIndex = index
          continue mainloop
        }

        yield { type: 'url', url: url.toString() }
        index = end
        prevIndex = index
        continue mainloop
      } catch (_err) {
        // ignore this, not a valid url
        index = end + 1
        continue mainloop
      }
    } else if (content.slice(u - 3, u) === 'wss' || content.slice(u - 2, u) === 'ws') {
      const m = content.slice(u + 4).match(noURLCharacter)
      const end = m ? u + 4 + m.index! : max
      const prefixLen = content[u - 1] === 's' ? 3 : 2
      try {
        let url = new URL(content.slice(u - prefixLen, end))
        if (url.hostname.indexOf('.') === -1) {
          throw new Error('invalid ws url')
        }

        if (prevIndex !== u - prefixLen) {
          yield { type: 'text', text: content.slice(prevIndex, u - prefixLen) }
        }
        yield { type: 'relay', url: url.toString() }
        index = end
        prevIndex = index
        continue mainloop
      } catch (_err) {
        // ignore this, not a valid url
        index = end + 1
        continue mainloop
      }
    } else {
      // try to parse an emoji shortcode
      for (let e = 0; e < emojis.length; e++) {
        const emoji = emojis[e]
        if (
          content[u + emoji.shortcode.length + 1] === ':' &&
          content.slice(u + 1, u + emoji.shortcode.length + 1) === emoji.shortcode
        ) {
          // found an emoji
          if (prevIndex !== u) {
            yield { type: 'text', text: content.slice(prevIndex, u) }
          }
          yield emoji
          index = u + emoji.shortcode.length + 2
          prevIndex = index
          continue mainloop
        }
      }

      // ignore this, it is nothing
      index = u + 1
      continue mainloop
    }
  }

  if (prevIndex !== max) {
    yield { type: 'text', text: content.slice(prevIndex) }
  }
}
