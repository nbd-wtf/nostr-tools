import { Event, EventTemplate } from './core.ts'
import { FileMetadata as FileMetadataKind } from './kinds.ts'

/**
 * Type definition for File Metadata as specified in NIP-94.
 * This type is used to represent the metadata associated with a file sharing event (kind: 1063).
 */
export type FileMetadataObject = {
  /**
   * A description or caption for the file content.
   */
  content: string

  /**
   * The URL to download the file.
   */
  url: string

  /**
   * The MIME type of the file, in lowercase.
   */
  m: string

  /**
   * The SHA-256 hex-encoded string of the file.
   */
  x: string

  /**
   * The SHA-256 hex-encoded string of the original file, before any transformations done by the upload server.
   */
  ox: string

  /**
   * Optional: The size of the file in bytes.
   */
  size?: string

  /**
   * Optional: The dimensions of the file in pixels, in the format "<width>x<height>".
   */
  dim?: string

  /**
   * Optional: The URI to the magnet file.
   */
  magnet?: string

  /**
   * Optional: The torrent infohash.
   */
  i?: string

  /**
   * Optional: The blurhash string to show while the file is being loaded by the client.
   */
  blurhash?: string

  /**
   * Optional: The URL of the thumbnail image with the same aspect ratio as the original file.
   */
  thumb?: string

  /**
   * Optional: The URL of a preview image with the same dimensions as the original file.
   */
  image?: string

  /**
   * Optional: A text excerpt or summary of the file's content.
   */
  summary?: string

  /**
   * Optional: A description for accessibility, providing context or a brief description of the file.
   */
  alt?: string

  /**
   * Optional: fallback URLs in case url fails.
   */
  fallback?: string[]
}

/**
 * Generates an event template based on a file metadata object.
 *
 * @param fileMetadata - The file metadata object.
 * @returns The event template.
 */
export function generateEventTemplate(fileMetadata: FileMetadataObject): EventTemplate {
  const eventTemplate: EventTemplate = {
    content: fileMetadata.content,
    created_at: Math.floor(Date.now() / 1000),
    kind: FileMetadataKind,
    tags: [
      ['url', fileMetadata.url],
      ['m', fileMetadata.m],
      ['x', fileMetadata.x],
      ['ox', fileMetadata.ox],
    ],
  }

  if (fileMetadata.size) eventTemplate.tags.push(['size', fileMetadata.size])
  if (fileMetadata.dim) eventTemplate.tags.push(['dim', fileMetadata.dim])
  if (fileMetadata.i) eventTemplate.tags.push(['i', fileMetadata.i])
  if (fileMetadata.blurhash) eventTemplate.tags.push(['blurhash', fileMetadata.blurhash])
  if (fileMetadata.thumb) eventTemplate.tags.push(['thumb', fileMetadata.thumb])
  if (fileMetadata.image) eventTemplate.tags.push(['image', fileMetadata.image])
  if (fileMetadata.summary) eventTemplate.tags.push(['summary', fileMetadata.summary])
  if (fileMetadata.alt) eventTemplate.tags.push(['alt', fileMetadata.alt])
  if (fileMetadata.fallback) fileMetadata.fallback.forEach(url => eventTemplate.tags.push(['fallback', url]))

  return eventTemplate
}

/**
 * Validates an event to ensure it is a valid file metadata event.
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export function validateEvent(event: Event): boolean {
  if (event.kind !== FileMetadataKind) return false

  if (!event.content) return false

  const requiredTags = ['url', 'm', 'x', 'ox'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  // validate optional size tag
  const sizeTag = event.tags.find(([t]) => t == 'size')
  if (sizeTag && isNaN(Number(sizeTag[1]))) return false

  // validate optional dim tag
  const dimTag = event.tags.find(([t]) => t == 'dim')
  if (dimTag && !dimTag[1].match(/^\d+x\d+$/)) return false

  return true
}

/**
 * Parses an event and returns a file metadata object.
 * @param event - The event to parse.
 * @returns The file metadata object.
 * @throws Error if the event is invalid.
 */
export function parseEvent(event: Event): FileMetadataObject {
  if (!validateEvent(event)) {
    throw new Error('Invalid event')
  }

  const fileMetadata: FileMetadataObject = {
    content: event.content,
    url: '',
    m: '',
    x: '',
    ox: '',
  }

  for (const [tag, value] of event.tags) {
    switch (tag) {
      case 'url':
        fileMetadata.url = value
        break
      case 'm':
        fileMetadata.m = value
        break
      case 'x':
        fileMetadata.x = value
        break
      case 'ox':
        fileMetadata.ox = value
        break
      case 'size':
        fileMetadata.size = value
        break
      case 'dim':
        fileMetadata.dim = value
        break
      case 'magnet':
        fileMetadata.magnet = value
        break
      case 'i':
        fileMetadata.i = value
        break
      case 'blurhash':
        fileMetadata.blurhash = value
        break
      case 'thumb':
        fileMetadata.thumb = value
        break
      case 'image':
        fileMetadata.image = value
        break
      case 'summary':
        fileMetadata.summary = value
        break
      case 'alt':
        fileMetadata.alt = value
        break
      case 'fallback':
        fileMetadata.fallback ??= []
        fileMetadata.fallback.push(value)
        break
    }
  }

  return fileMetadata
}
