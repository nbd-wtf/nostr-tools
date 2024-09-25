/** Regex for a single emoji shortcode. */
export declare const EMOJI_SHORTCODE_REGEX: RegExp;
/** Regex to find emoji shortcodes in content. */
export declare const regex: () => RegExp;
/** Represents a Nostr custom emoji. */
export interface CustomEmoji {
    /** The matched emoji name with colons. */
    shortcode: `:${string}:`;
    /** The matched emoji name without colons. */
    name: string;
}
/** Match result for a custom emoji in text content. */
export interface CustomEmojiMatch extends CustomEmoji {
    /** Index where the emoji begins in the text content. */
    start: number;
    /** Index where the emoji ends in the text content. */
    end: number;
}
/** Find all custom emoji shortcodes. */
export declare function matchAll(content: string): Iterable<CustomEmojiMatch>;
/** Replace all emoji shortcodes in the content. */
export declare function replaceAll(content: string, replacer: (match: CustomEmoji) => string): string;
