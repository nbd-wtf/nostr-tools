import { Event, EventTemplate } from './core.ts';
/**
 * Represents the details of a price.
 * @example { amount: '100', currency: 'USD', frequency: 'month' }
 * @example { amount: '100', currency: 'EUR' }
 */
export type PriceDetails = {
    /**
     * The amount of the price.
     */
    amount: string;
    /**
     * The currency of the price in 3-letter ISO 4217 format.
     * @example 'USD'
     */
    currency: string;
    /**
     * The optional frequency of payment.
     * Can be one of: 'hour', 'day', 'week', 'month', 'year', or a custom string.
     */
    frequency?: string;
};
/**
 * Represents a classified listing object.
 */
export type ClassifiedListingObject = {
    /**
     * Whether the listing is a draft or not.
     */
    isDraft: boolean;
    /**
     * A title of the listing.
     */
    title: string;
    /**
     * A short summary or tagline.
     */
    summary: string;
    /**
     * A description in Markdown format.
     */
    content: string;
    /**
     * Timestamp in unix seconds of when the listing was published.
     */
    publishedAt: string;
    /**
     * Location of the listing.
     * @example 'NYC'
     */
    location: string;
    /**
     * Price details.
     */
    price: PriceDetails;
    /**
     * Images of the listing with optional dimensions.
     */
    images: Array<{
        url: string;
        dimensions?: string;
    }>;
    /**
     * Tags/Hashtags (i.e. categories, keywords, etc.)
     */
    hashtags: string[];
    /**
     * Other standard tags.
     * @example "g", a geohash for more precise location
     */
    additionalTags: Record<string, string | string[]>;
};
/**
 * Validates an event to ensure it is a valid classified listing event.
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export declare function validateEvent(event: Event): boolean;
/**
 * Parses an event and returns a classified listing object.
 * @param event - The event to parse.
 * @returns The classified listing object.
 * @throws Error if the event is invalid.
 */
export declare function parseEvent(event: Event): ClassifiedListingObject;
/**
 * Generates an event template based on a classified listing object.
 *
 * @param listing - The classified listing object.
 * @returns The event template.
 */
export declare function generateEventTemplate(listing: ClassifiedListingObject): EventTemplate;
