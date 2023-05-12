import {Event, finishEvent, Kind, verifySignature} from './event.ts'
import {EventPointer} from './nip19.ts'

export type RepostEventTemplate = {
  /**
   * Pass only non-nip18 tags if you have to.
   * Nip18 tags ('e' and 'p' tags pointing to the reposted event) will be added automatically.
   */
  tags?: string[][]

  /**
   * Pass an empty string to NOT include the stringified JSON of the reposted event.
   * Any other content will be ignored and replaced with the stringified JSON of the reposted event.
   * @default Stringified JSON of the reposted event
   */
  content?: '';

  created_at: number
}

export function finishRepostEvent(
  t: RepostEventTemplate,
  reposted: Event<number>,
  relayUrl: string,
  privateKey: string,
): Event<Kind.Repost> {
  return finishEvent({
    kind: Kind.Repost,
    tags: [
      ...(t.tags ?? []),
      [ 'e', reposted.id, relayUrl ],
      [ 'p', reposted.pubkey ],
    ],
    content: t.content === '' ? '' : JSON.stringify(reposted),
    created_at: t.created_at,
  }, privateKey)
}

export function getRepostedEventPointer(event: Event<number>): undefined | EventPointer {
  if (event.kind !== Kind.Repost) {
    return undefined
  }

  let lastETag: undefined | string[]
  let lastPTag: undefined | string[]

  for (let i = event.tags.length - 1; i >= 0 && (lastETag === undefined || lastPTag === undefined); i--) {
    const tag = event.tags[i]
    if (tag.length >= 2) {
      if (tag[0] === 'e' && lastETag === undefined) {
        lastETag = tag
      } else if (tag[0] === 'p' && lastPTag === undefined) {
        lastPTag = tag
      }
    }
  }

  if (lastETag === undefined) {
    return undefined
  }

  return {
    id: lastETag[1],
    relays: [ lastETag[2], lastPTag?.[2] ].filter((x): x is string => typeof x === 'string'),
    author: lastPTag?.[1],
  }
}

export type GetRepostedEventOptions = {
  skipVerification?: boolean,
};

export function getRepostedEvent(event: Event<number>, { skipVerification }: GetRepostedEventOptions = {}): undefined | Event<number> {
  const pointer = getRepostedEventPointer(event)

  if (pointer === undefined || event.content === '') {
    return undefined
  }

  let repostedEvent: undefined | Event<number>

  try {
    repostedEvent = JSON.parse(event.content) as Event<number>
  } catch (error) {
    return undefined
  }

  if (repostedEvent.id !== pointer.id) {
    return undefined
  }

  if (!skipVerification && !verifySignature(repostedEvent)) {
    return undefined
  }

  return repostedEvent
}
