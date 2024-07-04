import { describe, expect, it } from 'bun:test'

import { Event, EventTemplate } from './core.ts'
import { FileMetadata as FileMetadataKind } from './kinds.ts'
import { FileMetadataObject, generateEventTemplate, parseEvent, validateEvent } from './nip94.ts'
import { finalizeEvent, generateSecretKey } from './pure.ts'

describe('generateEventTemplate', () => {
  it('should generate the correct event template', () => {
    const fileMetadataObject: FileMetadataObject = {
      content: 'Lorem ipsum dolor sit amet',
      url: 'https://example.com/image.jpg',
      m: 'image/jpeg',
      x: 'image',
      ox: 'original',
      size: '1024',
      dim: '800x600',
      i: 'abc123',
      blurhash: 'abcdefg',
      thumb: 'https://example.com/thumb.jpg',
      image: 'https://example.com/image.jpg',
      summary: 'Lorem ipsum',
      alt: 'Image alt text',
      fallback: ['https://fallback1.example.com/image.jpg', 'https://fallback2.example.com/image.jpg'],
    }

    const expectedEventTemplate: EventTemplate = {
      content: 'Lorem ipsum dolor sit amet',
      created_at: expect.any(Number),
      kind: FileMetadataKind,
      tags: [
        ['url', 'https://example.com/image.jpg'],
        ['m', 'image/jpeg'],
        ['x', 'image'],
        ['ox', 'original'],
        ['size', '1024'],
        ['dim', '800x600'],
        ['i', 'abc123'],
        ['blurhash', 'abcdefg'],
        ['thumb', 'https://example.com/thumb.jpg'],
        ['image', 'https://example.com/image.jpg'],
        ['summary', 'Lorem ipsum'],
        ['alt', 'Image alt text'],
        ['fallback', 'https://fallback1.example.com/image.jpg'],
        ['fallback', 'https://fallback2.example.com/image.jpg'],
      ],
    }

    const eventTemplate = generateEventTemplate(fileMetadataObject)

    expect(eventTemplate).toEqual(expectedEventTemplate)
  })
})

describe('validateEvent', () => {
  it('should return true for a valid event', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(true)
  })

  it('should return false if kind is not FileMetadataKind', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: 0, // not FileMetadataKind
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  it('should return false if content is empty', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: '', // empty
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  it('should return false if required tags are missing', () => {
    const sk = generateSecretKey()

    const eventWithoutUrl: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          // missing url
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    const eventWithoutM: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          // missing m
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    const eventWithoutX: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          // missing x
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    const eventWithoutOx: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          // missing ox
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(eventWithoutUrl)).toBe(false)
    expect(validateEvent(eventWithoutM)).toBe(false)
    expect(validateEvent(eventWithoutX)).toBe(false)
    expect(validateEvent(eventWithoutOx)).toBe(false)
  })

  it('should return false if size is not a number', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', 'abc'], // not a number
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  it('should return false if dim is not a valid dimension string', () => {
    const sk = generateSecretKey()

    const eventWithInvalidDim: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', 'abc'], // invalid dim
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(validateEvent(eventWithInvalidDim)).toBe(false)
  })
})

describe('parseEvent', () => {
  it('should parse a valid event', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: 'Lorem ipsum dolor sit amet',
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback1.example.com/image.jpg'],
          ['fallback', 'https://fallback2.example.com/image.jpg'],
        ],
      },
      sk,
    )

    const parsedEvent = parseEvent(event)

    expect(parsedEvent).toEqual({
      content: 'Lorem ipsum dolor sit amet',
      url: 'https://example.com/image.jpg',
      m: 'image/jpeg',
      x: 'image',
      ox: 'original',
      size: '1024',
      dim: '800x600',
      i: 'abc123',
      blurhash: 'abcdefg',
      thumb: 'https://example.com/thumb.jpg',
      image: 'https://example.com/image.jpg',
      summary: 'Lorem ipsum',
      alt: 'Image alt text',
      fallback: ['https://fallback1.example.com/image.jpg', 'https://fallback2.example.com/image.jpg'],
    })
  })

  it('should throw an error if the event is invalid', () => {
    const sk = generateSecretKey()

    const event: Event = finalizeEvent(
      {
        content: '', // invalid
        created_at: Math.floor(Date.now() / 1000),
        kind: FileMetadataKind,
        tags: [
          ['url', 'https://example.com/image.jpg'],
          ['m', 'image/jpeg'],
          ['x', 'image'],
          ['ox', 'original'],
          ['size', '1024'],
          ['dim', '800x600'],
          ['i', 'abc123'],
          ['blurhash', 'abcdefg'],
          ['thumb', 'https://example.com/thumb.jpg'],
          ['image', 'https://example.com/image.jpg'],
          ['summary', 'Lorem ipsum'],
          ['alt', 'Image alt text'],
          ['fallback', 'https://fallback.example.com/image.jpg'],
        ],
      },
      sk,
    )

    expect(() => parseEvent(event)).toThrow('Invalid event')
  })
})
