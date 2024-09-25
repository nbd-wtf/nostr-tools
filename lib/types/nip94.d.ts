import { Event, EventTemplate } from './core.ts';
/**
 * Type definition for File Metadata as specified in NIP-94.
 * This type is used to represent the metadata associated with a file sharing event (kind: 1063).
 */
export type FileMetadataObject = {
    /**
     * A description or caption for the file content.
     */
    content: string;
    /**
     * The URL to download the file.
     */
    url: string;
    /**
     * The MIME type of the file, in lowercase.
     */
    m: string;
    /**
     * The SHA-256 hex-encoded string of the file.
     */
    x: string;
    /**
     * The SHA-256 hex-encoded string of the original file, before any transformations done by the upload server.
     */
    ox: string;
    /**
     * Optional: The size of the file in bytes.
     */
    size?: string;
    /**
     * Optional: The dimensions of the file in pixels, in the format "<width>x<height>".
     */
    dim?: string;
    /**
     * Optional: The URI to the magnet file.
     */
    magnet?: string;
    /**
     * Optional: The torrent infohash.
     */
    i?: string;
    /**
     * Optional: The blurhash string to show while the file is being loaded by the client.
     */
    blurhash?: string;
    /**
     * Optional: The URL of the thumbnail image with the same aspect ratio as the original file.
     */
    thumb?: string;
    /**
     * Optional: The URL of a preview image with the same dimensions as the original file.
     */
    image?: string;
    /**
     * Optional: A text excerpt or summary of the file's content.
     */
    summary?: string;
    /**
     * Optional: A description for accessibility, providing context or a brief description of the file.
     */
    alt?: string;
    /**
     * Optional: fallback URLs in case url fails.
     */
    fallback?: string[];
};
/**
 * Generates an event template based on a file metadata object.
 *
 * @param fileMetadata - The file metadata object.
 * @returns The event template.
 */
export declare function generateEventTemplate(fileMetadata: FileMetadataObject): EventTemplate;
/**
 * Validates an event to ensure it is a valid file metadata event.
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export declare function validateEvent(event: Event): boolean;
/**
 * Parses an event and returns a file metadata object.
 * @param event - The event to parse.
 * @returns The file metadata object.
 * @throws Error if the event is invalid.
 */
export declare function parseEvent(event: Event): FileMetadataObject;
