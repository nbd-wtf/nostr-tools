import { sha256 } from '@noble/hashes/sha256'
import { EventTemplate } from './core.ts'
import { FileServerPreference } from './kinds.ts'
import { bytesToHex } from '@noble/hashes/utils'

/**
 * Represents the configuration for a server compliant with NIP-96.
 */
export type ServerConfiguration = {
  /**
   * The base URL from which file upload and deletion operations are served.
   * Also used for downloads if "download_url" is not specified.
   */
  api_url: string

  /**
   * Optional. The base URL from which files are downloaded.
   * Used if different from the "api_url".
   */
  download_url?: string

  /**
   * Optional. URL of another HTTP file storage server's configuration.
   * Used by nostr relays to delegate to another server.
   * In this case, "api_url" must be an empty string.
   */
  delegated_to_url?: string

  /**
   * Optional. An array of NIP numbers that this server supports.
   */
  supported_nips?: number[]

  /**
   * Optional. URL to the server's Terms of Service.
   */
  tos_url?: string

  /**
   * Optional. An array of MIME types supported by the server.
   */
  content_types?: string[]

  /**
   * Optional. Defines various storage plans offered by the server.
   */
  plans?: {
    [planKey: string]: {
      /**
       * The name of the storage plan.
       */
      name: string

      /**
       * Optional. Indicates whether NIP-98 is required for uploads in this plan.
       */
      is_nip98_required?: boolean

      /**
       * Optional. URL to a landing page providing more information about the plan.
       */
      url?: string

      /**
       * Optional. The maximum file size allowed under this plan, in bytes.
       */
      max_byte_size?: number

      /**
       * Optional. Defines the range of file expiration in days.
       * The first value indicates the minimum expiration time, and the second value indicates the maximum.
       * A value of 0 indicates no expiration.
       */
      file_expiration?: [number, number]

      /**
       * Optional. Specifies the types of media transformations supported under this plan.
       * Currently, only image transformations are considered.
       */
      media_transformations?: {
        /**
         * Optional. An array of supported image transformation types.
         */
        image?: string[]
      }
    }
  }
}

/**
 * Represents the optional form data fields for file upload in accordance with NIP-96.
 */
export type OptionalFormDataFields = {
  /**
   * Specifies the desired expiration time of the file on the server.
   * It should be a string representing a UNIX timestamp in seconds.
   * An empty string indicates that the file should be stored indefinitely.
   */
  expiration?: string

  /**
   * Indicates the size of the file in bytes.
   * This field can be used by the server to pre-validate the file size before processing the upload.
   */
  size?: string

  /**
   * Provides a strict description of the file for accessibility purposes,
   * particularly useful for visibility-impaired users.
   */
  alt?: string

  /**
   * A loose, more descriptive caption for the file.
   * This can be used for additional context or commentary about the file.
   */
  caption?: string

  /**
   * Specifies the intended use of the file.
   * Can be either 'avatar' or 'banner', indicating if the file is to be used as an avatar or a banner.
   * Absence of this field suggests standard file upload without special treatment.
   */
  media_type?: 'avatar' | 'banner'

  /**
   * The MIME type of the file being uploaded.
   * This can be used for early rejection by the server if the file type isn't supported.
   */
  content_type?: string

  /**
   * Other custom form data fields.
   */
  [key: string]: string | undefined
}

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
  status: 'success' | 'error' | 'processing'

  /**
   * A message provided by the server, which could be a success message, error description, or processing status.
   */
  message: string

  /**
   * Optional. A URL provided by the server where the upload processing status can be checked.
   * This is relevant in cases where the file upload involves delayed processing.
   */
  processing_url?: string

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
    tags: Array<[string, string]>

    /**
     * A content field, which is typically empty for file upload events but included for consistency with the NIP-94 structure.
     */
    content: string
  }
}

/**
 * Type representing the response from a NIP-96 compliant server after a delayed processing request.
 */
export type DelayedProcessingResponse = {
  /**
   * The status of the delayed processing request.
   * - 'processing': Indicates the file is still being processed.
   * - 'error': Indicates there was an error in the processing.
   */
  status: 'processing' | 'error'

  /**
   * A message provided by the server, which could be a success message or error description.
   */
  message: string

  /**
   * The percentage of the file that has been processed. This is a number between 0 and 100.
   */
  percentage: number
}

/**
 * Validates the server configuration.
 *
 * @param config - The server configuration object.
 * @returns True if the configuration is valid, false otherwise.
 */
export function validateServerConfiguration(config: ServerConfiguration): boolean {
  if (Boolean(config.api_url) == false) {
    return false
  }

  if (Boolean(config.delegated_to_url) && Boolean(config.api_url)) {
    return false
  }

  return true
}

/**
 * Fetches, parses, and validates the server configuration from the given URL.
 *
 * @param serverUrl The URL of the server.
 * @returns The server configuration, or an error if the configuration could not be fetched or parsed.
 */
export async function readServerConfig(serverUrl: string): Promise<ServerConfiguration> {
  const HTTPROUTE = '/.well-known/nostr/nip96.json' as const
  let fetchUrl = ''

  try {
    const { origin } = new URL(serverUrl)
    fetchUrl = origin + HTTPROUTE
  } catch (error) {
    throw new Error('Invalid URL')
  }

  try {
    const response = await fetch(fetchUrl)

    if (!response.ok) {
      throw new Error(`Error fetching ${fetchUrl}: ${response.statusText}`)
    }

    const data: any = await response.json()

    if (!data) {
      throw new Error('No data')
    }

    if (!validateServerConfiguration(data)) {
      throw new Error('Invalid configuration data')
    }

    return data
  } catch (_) {
    throw new Error(`Error fetching.`)
  }
}

/**
 * Validates if the given object is a valid FileUploadResponse.
 *
 * @param response - The object to validate.
 * @returns true if the object is a valid FileUploadResponse, otherwise false.
 */
export function validateFileUploadResponse(response: any): response is FileUploadResponse {
  if (typeof response !== 'object' || response === null) return false

  if (!response.status || !response.message) {
    return false
  }

  if (response.status !== 'success' && response.status !== 'error' && response.status !== 'processing') {
    return false
  }

  if (typeof response.message !== 'string') {
    return false
  }

  if (response.status === 'processing' && !response.processing_url) {
    return false
  }

  if (response.processing_url) {
    if (typeof response.processing_url !== 'string') {
      return false
    }
  }

  if (response.status === 'success' && !response.nip94_event) {
    return false
  }

  if (response.nip94_event) {
    if (
      !response.nip94_event.tags ||
      !Array.isArray(response.nip94_event.tags) ||
      response.nip94_event.tags.length === 0
    ) {
      return false
    }

    for (const tag of response.nip94_event.tags) {
      if (!Array.isArray(tag) || tag.length !== 2) return false

      if (typeof tag[0] !== 'string' || typeof tag[1] !== 'string') return false
    }

    if (!(response.nip94_event.tags as string[]).find(t => t[0] === 'url')) {
      return false
    }

    if (!(response.nip94_event.tags as string[]).find(t => t[0] === 'ox')) {
      return false
    }
  }

  return true
}

/**
 * Uploads a file to a NIP-96 compliant server.
 *
 * @param file - The file to be uploaded.
 * @param serverApiUrl - The API URL of the server, retrieved from the server's configuration.
 * @param nip98AuthorizationHeader - The authorization header from NIP-98.
 * @param optionalFormDataFields - Optional form data fields.
 * @returns A promise that resolves to the server's response.
 */
export async function uploadFile(
  file: File,
  serverApiUrl: string,
  nip98AuthorizationHeader: string,
  optionalFormDataFields?: OptionalFormDataFields,
): Promise<FileUploadResponse> {
  // Create FormData object
  const formData = new FormData()

  // Append the authorization header to HTML Form Data
  formData.append('Authorization', nip98AuthorizationHeader)

  // Append optional fields to FormData
  optionalFormDataFields &&
    Object.entries(optionalFormDataFields).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value)
      }
    })

  // Append the file to FormData as the last field
  formData.append('file', file)

  // Make the POST request to the server
  const response = await fetch(serverApiUrl, {
    method: 'POST',
    headers: {
      Authorization: nip98AuthorizationHeader,
    },
    body: formData,
  })

  if (response.ok === false) {
    // 413 Payload Too Large
    if (response.status === 413) {
      throw new Error('File too large!')
    }

    // 400 Bad Request
    if (response.status === 400) {
      throw new Error('Bad request! Some fields are missing or invalid!')
    }

    // 403 Forbidden
    if (response.status === 403) {
      throw new Error('Forbidden! Payload tag does not match the requested file!')
    }

    // 402 Payment Required
    if (response.status === 402) {
      throw new Error('Payment required!')
    }

    // unknown error
    throw new Error('Unknown error in uploading file!')
  }

  try {
    const parsedResponse = await response.json()

    if (!validateFileUploadResponse(parsedResponse)) {
      throw new Error('Invalid response from the server!')
    }

    return parsedResponse
  } catch (error) {
    throw new Error('Error parsing JSON response!')
  }
}

/**
 * Generates the URL for downloading a file from a NIP-96 compliant server.
 *
 * @param fileHash - The SHA-256 hash of the original file.
 * @param serverDownloadUrl - The base URL provided by the server, retrieved from the server's configuration.
 * @param fileExtension - An optional parameter that specifies the file extension (e.g., '.jpg', '.png').
 * @returns A string representing the complete URL to download the file.
 *
 */
export function generateDownloadUrl(fileHash: string, serverDownloadUrl: string, fileExtension?: string): string {
  // Construct the base download URL using the file hash
  let downloadUrl = `${serverDownloadUrl}/${fileHash}`

  // Append the file extension if provided
  if (fileExtension) {
    downloadUrl += fileExtension
  }

  return downloadUrl
}

/**
 * Sends a request to delete a file from a NIP-96 compliant server.
 *
 * @param fileHash - The SHA-256 hash of the original file.
 * @param serverApiUrl - The base API URL of the server, retrieved from the server's configuration.
 * @param nip98AuthorizationHeader - The authorization header from NIP-98.
 * @returns A promise that resolves to the server's response to the deletion request.
 *
 */
export async function deleteFile(
  fileHash: string,
  serverApiUrl: string,
  nip98AuthorizationHeader: string,
): Promise<any> {
  // make sure the serverApiUrl ends with a slash
  if (!serverApiUrl.endsWith('/')) {
    serverApiUrl += '/'
  }

  // Construct the URL for the delete request
  const deleteUrl = `${serverApiUrl}${fileHash}`

  // Send the DELETE request
  const response = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: {
      Authorization: nip98AuthorizationHeader,
    },
  })

  // Handle the response
  if (!response.ok) {
    throw new Error('Error deleting file!')
  }

  // Return the response from the server
  try {
    return await response.json()
  } catch (error) {
    throw new Error('Error parsing JSON response!')
  }
}

/**
 * Validates the server's response to a delayed processing request.
 *
 * @param response - The server's response to a delayed processing request.
 * @returns A boolean indicating whether the response is valid.
 */
export function validateDelayedProcessingResponse(response: any): response is DelayedProcessingResponse {
  if (typeof response !== 'object' || response === null) return false

  if (!response.status || !response.message || !response.percentage) {
    return false
  }

  if (response.status !== 'processing' && response.status !== 'error') {
    return false
  }

  if (typeof response.message !== 'string') {
    return false
  }

  if (typeof response.percentage !== 'number') {
    return false
  }

  if (Number(response.percentage) < 0 || Number(response.percentage) > 100) {
    return false
  }

  return true
}

/**
 * Checks the processing status of a file when delayed processing is used.
 *
 * @param processingUrl - The URL provided by the server where the processing status can be checked.
 * @returns A promise that resolves to an object containing the processing status and other relevant information.
 */
export async function checkFileProcessingStatus(
  processingUrl: string,
): Promise<FileUploadResponse | DelayedProcessingResponse> {
  // Make the GET request to the processing URL
  const response = await fetch(processingUrl)

  // Handle the response
  if (!response.ok) {
    throw new Error(`Failed to retrieve processing status. Server responded with status: ${response.status}`)
  }

  // Parse the response
  try {
    const parsedResponse = await response.json()

    // 201 Created: Indicates the processing is over.
    if (response.status === 201) {
      // Validate the response
      if (!validateFileUploadResponse(parsedResponse)) {
        throw new Error('Invalid response from the server!')
      }

      return parsedResponse
    }

    // 200 OK: Indicates the processing is still ongoing.
    if (response.status === 200) {
      // Validate the response
      if (!validateDelayedProcessingResponse(parsedResponse)) {
        throw new Error('Invalid response from the server!')
      }

      return parsedResponse
    }

    throw new Error('Invalid response from the server!')
  } catch (error) {
    throw new Error('Error parsing JSON response!')
  }
}

/**
 * Generates an event template to indicate a user's File Server Preferences.
 * This event is of kind 10096 and is used to specify one or more preferred servers for file uploads.
 *
 * @param serverUrls - An array of URLs representing the user's preferred file storage servers.
 * @returns An object representing a Nostr event template for setting file server preferences.
 */
export function generateFSPEventTemplate(serverUrls: string[]): EventTemplate {
  serverUrls = serverUrls.filter(serverUrl => {
    try {
      new URL(serverUrl)
      return true
    } catch (error) {
      return false
    }
  })

  return {
    kind: FileServerPreference,
    content: '',
    tags: serverUrls.map(serverUrl => ['server', serverUrl]),
    created_at: Math.floor(Date.now() / 1000),
  }
}

/**
 * Calculates the SHA-256 hash of a given file. This hash is used in various NIP-96 operations,
 * such as file upload, download, and deletion, to uniquely identify files.
 *
 * @param file - The file for which the SHA-256 hash needs to be calculated.
 * @returns A promise that resolves to the SHA-256 hash of the file.
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  return bytesToHex(sha256(new Uint8Array(await file.arrayBuffer())))
}
