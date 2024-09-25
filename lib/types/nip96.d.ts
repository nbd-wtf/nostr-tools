import { EventTemplate } from './core.ts';
/**
 * Represents the configuration for a server compliant with NIP-96.
 */
export type ServerConfiguration = {
    /**
     * The base URL from which file upload and deletion operations are served.
     * Also used for downloads if "download_url" is not specified.
     */
    api_url: string;
    /**
     * Optional. The base URL from which files are downloaded.
     * Used if different from the "api_url".
     */
    download_url?: string;
    /**
     * Optional. URL of another HTTP file storage server's configuration.
     * Used by nostr relays to delegate to another server.
     * In this case, "api_url" must be an empty string.
     */
    delegated_to_url?: string;
    /**
     * Optional. An array of NIP numbers that this server supports.
     */
    supported_nips?: number[];
    /**
     * Optional. URL to the server's Terms of Service.
     */
    tos_url?: string;
    /**
     * Optional. An array of MIME types supported by the server.
     */
    content_types?: string[];
    /**
     * Optional. Defines various storage plans offered by the server.
     */
    plans?: {
        [planKey: string]: {
            /**
             * The name of the storage plan.
             */
            name: string;
            /**
             * Optional. Indicates whether NIP-98 is required for uploads in this plan.
             */
            is_nip98_required?: boolean;
            /**
             * Optional. URL to a landing page providing more information about the plan.
             */
            url?: string;
            /**
             * Optional. The maximum file size allowed under this plan, in bytes.
             */
            max_byte_size?: number;
            /**
             * Optional. Defines the range of file expiration in days.
             * The first value indicates the minimum expiration time, and the second value indicates the maximum.
             * A value of 0 indicates no expiration.
             */
            file_expiration?: [number, number];
            /**
             * Optional. Specifies the types of media transformations supported under this plan.
             * Currently, only image transformations are considered.
             */
            media_transformations?: {
                /**
                 * Optional. An array of supported image transformation types.
                 */
                image?: string[];
            };
        };
    };
};
/**
 * Represents the optional form data fields for file upload in accordance with NIP-96.
 */
export type OptionalFormDataFields = {
    /**
     * Specifies the desired expiration time of the file on the server.
     * It should be a string representing a UNIX timestamp in seconds.
     * An empty string indicates that the file should be stored indefinitely.
     */
    expiration?: string;
    /**
     * Indicates the size of the file in bytes.
     * This field can be used by the server to pre-validate the file size before processing the upload.
     */
    size?: string;
    /**
     * Provides a strict description of the file for accessibility purposes,
     * particularly useful for visibility-impaired users.
     */
    alt?: string;
    /**
     * A loose, more descriptive caption for the file.
     * This can be used for additional context or commentary about the file.
     */
    caption?: string;
    /**
     * Specifies the intended use of the file.
     * Can be either 'avatar' or 'banner', indicating if the file is to be used as an avatar or a banner.
     * Absence of this field suggests standard file upload without special treatment.
     */
    media_type?: 'avatar' | 'banner';
    /**
     * The MIME type of the file being uploaded.
     * This can be used for early rejection by the server if the file type isn't supported.
     */
    content_type?: string;
    /**
     * Other custom form data fields.
     */
    [key: string]: string | undefined;
};
/**
 * Type representing the response from a NIP-96 compliant server after a file upload request.
 */
export type FileUploadResponse = {
    /**
     * The status of the upload request.
     * - 'success': Indicates the file was successfully uploaded.
     * - 'error': Indicates there was an error in the upload process.
     * - 'processing': Indicates the file is still being processed (used in cases of delayed processing).
     */
    status: 'success' | 'error' | 'processing';
    /**
     * A message provided by the server, which could be a success message, error description, or processing status.
     */
    message: string;
    /**
     * Optional. A URL provided by the server where the upload processing status can be checked.
     * This is relevant in cases where the file upload involves delayed processing.
     */
    processing_url?: string;
    /**
     * Optional. An event object conforming to NIP-94, which includes details about the uploaded file.
     * This object is typically provided in the response for a successful upload and contains
     * essential information such as the download URL and file metadata.
     */
    nip94_event?: {
        /**
         * A collection of key-value pairs (tags) providing metadata about the uploaded file.
         * Standard tags include:
         * - 'url': The URL where the file can be accessed.
         * - 'ox': The SHA-256 hash of the original file before any server-side transformations.
         * Additional optional tags might include file dimensions, MIME type, etc.
         */
        tags: Array<[string, string]>;
        /**
         * A content field, which is typically empty for file upload events but included for consistency with the NIP-94 structure.
         */
        content: string;
    };
};
/**
 * Type representing the response from a NIP-96 compliant server after a delayed processing request.
 */
export type DelayedProcessingResponse = {
    /**
     * The status of the delayed processing request.
     * - 'processing': Indicates the file is still being processed.
     * - 'error': Indicates there was an error in the processing.
     */
    status: 'processing' | 'error';
    /**
     * A message provided by the server, which could be a success message or error description.
     */
    message: string;
    /**
     * The percentage of the file that has been processed. This is a number between 0 and 100.
     */
    percentage: number;
};
/**
 * Validates the server configuration.
 *
 * @param config - The server configuration object.
 * @returns True if the configuration is valid, false otherwise.
 */
export declare function validateServerConfiguration(config: ServerConfiguration): boolean;
/**
 * Fetches, parses, and validates the server configuration from the given URL.
 *
 * @param serverUrl The URL of the server.
 * @returns The server configuration, or an error if the configuration could not be fetched or parsed.
 */
export declare function readServerConfig(serverUrl: string): Promise<ServerConfiguration>;
/**
 * Validates if the given object is a valid FileUploadResponse.
 *
 * @param response - The object to validate.
 * @returns true if the object is a valid FileUploadResponse, otherwise false.
 */
export declare function validateFileUploadResponse(response: any): response is FileUploadResponse;
/**
 * Uploads a file to a NIP-96 compliant server.
 *
 * @param file - The file to be uploaded.
 * @param serverApiUrl - The API URL of the server, retrieved from the server's configuration.
 * @param nip98AuthorizationHeader - The authorization header from NIP-98.
 * @param optionalFormDataFields - Optional form data fields.
 * @returns A promise that resolves to the server's response.
 */
export declare function uploadFile(file: File, serverApiUrl: string, nip98AuthorizationHeader: string, optionalFormDataFields?: OptionalFormDataFields): Promise<FileUploadResponse>;
/**
 * Generates the URL for downloading a file from a NIP-96 compliant server.
 *
 * @param fileHash - The SHA-256 hash of the original file.
 * @param serverDownloadUrl - The base URL provided by the server, retrieved from the server's configuration.
 * @param fileExtension - An optional parameter that specifies the file extension (e.g., '.jpg', '.png').
 * @returns A string representing the complete URL to download the file.
 *
 */
export declare function generateDownloadUrl(fileHash: string, serverDownloadUrl: string, fileExtension?: string): string;
/**
 * Sends a request to delete a file from a NIP-96 compliant server.
 *
 * @param fileHash - The SHA-256 hash of the original file.
 * @param serverApiUrl - The base API URL of the server, retrieved from the server's configuration.
 * @param nip98AuthorizationHeader - The authorization header from NIP-98.
 * @returns A promise that resolves to the server's response to the deletion request.
 *
 */
export declare function deleteFile(fileHash: string, serverApiUrl: string, nip98AuthorizationHeader: string): Promise<any>;
/**
 * Validates the server's response to a delayed processing request.
 *
 * @param response - The server's response to a delayed processing request.
 * @returns A boolean indicating whether the response is valid.
 */
export declare function validateDelayedProcessingResponse(response: any): response is DelayedProcessingResponse;
/**
 * Checks the processing status of a file when delayed processing is used.
 *
 * @param processingUrl - The URL provided by the server where the processing status can be checked.
 * @returns A promise that resolves to an object containing the processing status and other relevant information.
 */
export declare function checkFileProcessingStatus(processingUrl: string): Promise<FileUploadResponse | DelayedProcessingResponse>;
/**
 * Generates an event template to indicate a user's File Server Preferences.
 * This event is of kind 10096 and is used to specify one or more preferred servers for file uploads.
 *
 * @param serverUrls - An array of URLs representing the user's preferred file storage servers.
 * @returns An object representing a Nostr event template for setting file server preferences.
 */
export declare function generateFSPEventTemplate(serverUrls: string[]): EventTemplate;
/**
 * Calculates the SHA-256 hash of a given file. This hash is used in various NIP-96 operations,
 * such as file upload, download, and deletion, to uniquely identify files.
 *
 * @param file - The file for which the SHA-256 hash needs to be calculated.
 * @returns A promise that resolves to the SHA-256 hash of the file.
 */
export declare function calculateFileHash(file: Blob): Promise<string>;
