/** Regex for a single emoji shortcode. */
export const EMOJI_SHORTCODE_REGEX = /:(\w+):/

/** Regex to find emoji shortcodes in content. */
export const regex = (): RegExp => new RegExp(`\\B${EMOJI_SHORTCODE_REGEX.source}\\B`, 'g')

/** Represents a Nostr custom emoji. */
export interface CustomEmoji {
  /** The matched emoji name with colons. */
  shortcode: `:${string}:`
  /** The matched emoji name without colons. */
  name: string
}

/** Match result for a custom emoji in text content. */
export interface CustomEmojiMatch extends CustomEmoji {
  /** Index where the emoji begins in the text content. */
  start: number
  /** Index where the emoji ends in the text content. */
  end: number
}

/** Find all custom emoji shortcodes. */
export function* matchAll(content: string): Iterable<CustomEmojiMatch> {
  const matches = content.matchAll(regex())

  for (const match of matches) {
    try {
      const [shortcode, name] = match

      yield {
        shortcode: shortcode as `:${string}:`,
        name,
        start: match.index!,
        end: match.index! + shortcode.length,
      }
    } catch (_e) {
      // do nothing
    }
  }
}

/** Replace all emoji shortcodes in the content. */
export function replaceAll(content: string, replacer: (match: CustomEmoji) => string): string {
  return content.replaceAll(regex(), (shortcode, name) => {
    return replacer({
      shortcode: shortcode as `:${string}:`,
      name,
    })
  })
}
