import { Event, EventTemplate } from './core.ts';
/**
 * Represents the structure for defining a badge within the Nostr network.
 * This structure is used to create templates for badge definition events,
 * facilitating the recognition and awarding of badges to users for various achievements.
 */
export type BadgeDefinition = {
    /**
     * A unique identifier for the badge. This is used to distinguish badges
     * from one another and should be unique across all badge definitions.
     * Typically, this could be a short, descriptive string.
     */
    d: string;
    /**
     * An optional short name for the badge. This provides a human-readable
     * title for the badge, making it easier to recognize and refer to.
     */
    name?: string;
    /**
     * An optional description for the badge. This field can be used to
     * provide more detailed information about the badge, such as the criteria
     * for its awarding or its significance.
     */
    description?: string;
    /**
     * An optional image URL and dimensions for the badge. The first element
     * of the tuple is the URL pointing to a high-resolution image representing
     * the badge, and the second element specifies the image's dimensions in
     * the format "widthxheight". The recommended dimensions are 1024x1024 pixels.
     */
    image?: [string, string];
    /**
     * An optional list of thumbnail images for the badge. Each element in the
     * array is a tuple, where the first element is the URL pointing to a thumbnail
     * version of the badge image, and the second element specifies the thumbnail's
     * dimensions in the format "widthxheight". Multiple thumbnails can be provided
     * to support different display sizes.
     */
    thumbs?: Array<[string, string]>;
};
/**
 * Represents the structure for awarding a badge to one or more recipients
 * within the Nostr network. This structure is used to create templates for
 * badge award events, which are immutable and signify the recognition of
 * individuals' achievements or contributions.
 */
export type BadgeAward = {
    /**
     * A reference to the Badge Definition event. This is typically composed
     * of the event ID of the badge definition. It establishes a clear linkage
     * between the badge being awarded and its original definition, ensuring
     * that recipients are awarded the correct badge.
     */
    a: string;
    /**
     * An array of p tags, each containing a pubkey and its associated relays.
     */
    p: string[][];
};
/**
 * Represents the collection of badges a user chooses to display on their profile.
 * This structure is crucial for applications that allow users to showcase achievements
 * or recognitions in the form of badges, following the specifications of NIP-58.
 */
export type ProfileBadges = {
    /**
     * A unique identifier for the profile badges collection. According to NIP-58,
     * this should be set to "profile_badges" to differentiate it from other event types.
     */
    d: 'profile_badges';
    /**
     * A list of badges that the user has elected to display on their profile. Each item
     * in the array represents a specific badge, including references to both its definition
     * and the award event.
     */
    badges: Array<{
        /**
         * The event address of the badge definition. This is a reference to the specific badge
         * being displayed, linking back to the badge's original definition event. It allows
         * clients to fetch and display the badge's details, such as its name, description,
         * and image.
         */
        a: string;
        /**
         * The event id of the badge award with corresponding relays. This references the event
         * in which the badge was awarded to the user. It is crucial for verifying the
         * authenticity of the badge display, ensuring that the user was indeed awarded the
         * badge they are choosing to display.
         */
        e: string[];
    }>;
};
/**
 * Generates an EventTemplate based on the provided BadgeDefinition.
 *
 * @param {BadgeDefinition} badgeDefinition - The BadgeDefinition object.
 * @returns {EventTemplate} - The generated EventTemplate object.
 */
export declare function generateBadgeDefinitionEventTemplate({ d, description, image, name, thumbs, }: BadgeDefinition): EventTemplate;
/**
 * Validates a badge definition event.
 *
 * @param event - The event to validate.
 * @returns A boolean indicating whether the event is a valid badge definition event.
 */
export declare function validateBadgeDefinitionEvent(event: Event): boolean;
/**
 * Generates an EventTemplate based on the provided BadgeAward.
 *
 * @param {BadgeAward} badgeAward - The BadgeAward object.
 * @returns {EventTemplate} - The generated EventTemplate object.
 */
export declare function generateBadgeAwardEventTemplate({ a, p }: BadgeAward): EventTemplate;
/**
 * Validates a badge award event.
 *
 * @param event - The event to validate.
 * @returns A boolean indicating whether the event is a valid badge award event.
 */
export declare function validateBadgeAwardEvent(event: Event): boolean;
/**
 * Generates an EventTemplate based on the provided ProfileBadges.
 *
 * @param {ProfileBadges} profileBadges - The ProfileBadges object.
 * @returns {EventTemplate} - The generated EventTemplate object.
 */
export declare function generateProfileBadgesEventTemplate({ badges }: ProfileBadges): EventTemplate;
/**
 * Validates a profile badges event.
 *
 * @param event - The event to validate.
 * @returns A boolean indicating whether the event is a valid profile badges event.
 */
export declare function validateProfileBadgesEvent(event: Event): boolean;
