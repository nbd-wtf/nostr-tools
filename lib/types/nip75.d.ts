import { Event, EventTemplate } from './core.ts';
/**
 * Represents a fundraising goal in the Nostr network as defined by NIP-75.
 * This type is used to structure the information needed to create a goal event (`kind:9041`).
 */
export type Goal = {
    /**
     * A human-readable description of the fundraising goal.
     * This content should provide clear information about the purpose of the fundraising.
     */
    content: string;
    /**
     * The target amount for the fundraising goal in milisats.
     * This defines the financial target that the fundraiser aims to reach.
     */
    amount: string;
    /**
     * A list of relays where the zaps towards this goal will be sent to and tallied from.
     * Each relay is represented by its WebSocket URL.
     */
    relays: string[];
    /**
     * An optional timestamp (in seconds, UNIX epoch) indicating when the fundraising goal is considered closed.
     * Zaps published after this timestamp should not count towards the goal progress.
     * If not provided, the goal remains open indefinitely or until manually closed.
     */
    closedAt?: number;
    /**
     * An optional URL to an image related to the goal.
     * This can be used to visually represent the goal on client interfaces.
     */
    image?: string;
    /**
     * An optional brief description or summary of the goal.
     * This can provide a quick overview of the goal, separate from the detailed `content`.
     */
    summary?: string;
    /**
     * An optional URL related to the goal, providing additional information or actions through an 'r' tag.
     * This is a single URL, as per NIP-75 specifications for linking additional resources.
     */
    r?: string;
    /**
     * An optional parameterized replaceable event linked to the goal, specified through an 'a' tag.
     * This is a single event id, aligning with NIP-75's allowance for linking to specific events.
     */
    a?: string;
    /**
     * Optional tags specifying multiple beneficiary pubkeys or additional criteria for zapping,
     * allowing contributions to be directed towards multiple recipients or according to specific conditions.
     */
    zapTags?: string[][];
};
/**
 * Generates an EventTemplate for a fundraising goal based on the provided ZapGoal object.
 * This function is tailored to fit the structure of EventTemplate as defined in the library.
 * @param zapGoal The ZapGoal object containing the details of the fundraising goal.
 * @returns An EventTemplate object structured for creating a Nostr event.
 */
export declare function generateGoalEventTemplate({ amount, content, relays, a, closedAt, image, r, summary, zapTags, }: Goal): EventTemplate;
export declare function validateZapGoalEvent(event: Event): boolean;
