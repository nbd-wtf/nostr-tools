import { describe, expect, test } from 'bun:test'

import { Event } from './core.ts'
import { ClassifiedListing, DraftClassifiedListing } from './kinds.ts'
import { ClassifiedListingObject, generateEventTemplate, parseEvent, validateEvent } from './nip99.ts'
import { finalizeEvent, generateSecretKey } from './pure.ts'

describe('validateEvent', () => {
  test('should return true for a valid classified listing event', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(true)
  })

  test('should return false when the "d" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          // Missing 'd' tag
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "title" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          // Missing 'title' tag
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "summary" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          // Missing 'summary' tag
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "published_at" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          // Missing 'published_at' tag
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "location" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          // Missing 'location' tag
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "price" tag is missing', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          // Missing 'price' tag
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "published_at" tag is not a valid timestamp', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', 'not-a-valid-timestamp'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "price" tag has not a valid price', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', 'not-a-valid-price', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "price" tag has not a valid currency', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'not-a-valid-currency'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event)).toBe(false)
  })

  test('should return false when the "price" tag has not a valid number of elements', () => {
    const sk = generateSecretKey()
    const event1: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
        ],
      },
      sk,
    )

    expect(validateEvent(event1)).toBe(false)
  })

  test('should return false when the "a" tag has not a valid number of elements', () => {
    const sk = generateSecretKey()
    const event1: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['a', 'extra1'],
          ['a', 'extra2', 'value2', 'extra3'],
        ],
      },
      sk,
    )

    const event2: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: ClassifiedListing,
        content: 'Lorem ipsum dolor sit amet.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['e', 'extra1'],
          ['e', 'extra2', 'value2', 'extra3'],
        ],
      },
      sk,
    )

    expect(validateEvent(event1)).toBe(false)
    expect(validateEvent(event2)).toBe(false)
  })
})

describe('parseEvent', () => {
  test('should parse a valid event', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: DraftClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          ['d', 'sample-title'],
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    const expectedListing = {
      title: 'Sample Title',
      summary: 'Sample Summary',
      publishedAt: '1296962229',
      location: 'NYC',
      price: {
        amount: '100',
        currency: 'USD',
      },
      images: [
        {
          url: 'https://example.com/image1.jpg',
          dimensions: '800x600',
        },
        {
          url: 'https://example.com/image2.jpg',
        },
      ],
      hashtags: ['tag1', 'tag2'],
      additionalTags: {
        e: ['value1', 'value2'],
        a: ['value1', 'value2'],
      },
      content:
        'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
      isDraft: true,
    }

    expect(parseEvent(event)).toEqual(expectedListing)
  })

  test('should throw an error for an invalid event', () => {
    const sk = generateSecretKey()
    const event: Event = finalizeEvent(
      {
        created_at: Math.floor(Date.now() / 1000),
        kind: DraftClassifiedListing,
        content:
          'Lorem [ipsum][nostr:nevent1qqst8cujky046negxgwwm5ynqwn53t8aqjr6afd8g59nfqwxpdhylpcpzamhxue69uhhyetvv9ujuetcv9khqmr99e3k7mg8arnc9] dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
        tags: [
          // Missing 'd' tag
          ['title', 'Sample Title'],
          ['summary', 'Sample Summary'],
          ['published_at', '1296962229'],
          ['location', 'NYC'],
          ['price', '100', 'USD'],
          ['image', 'https://example.com/image1.jpg', '800x600'],
          ['image', 'https://example.com/image2.jpg'],
          ['t', 'tag1'],
          ['t', 'tag2'],
          ['e', 'value1', 'value2'],
          ['a', 'value1', 'value2'],
        ],
      },
      sk,
    )

    expect(() => parseEvent(event)).toThrow(Error)
  })
})

describe('generateEventTemplate', () => {
  test('should generate the correct event template for a classified listing', () => {
    const listing: ClassifiedListingObject = {
      title: 'Sample Title',
      summary: 'Sample Summary',
      publishedAt: '1296962229',
      location: 'NYC',
      price: {
        amount: '100',
        currency: 'USD',
      },
      images: [
        {
          url: 'https://example.com/image1.jpg',
          dimensions: '800x600',
        },
        {
          url: 'https://example.com/image2.jpg',
        },
      ],
      hashtags: ['tag1', 'tag2'],
      additionalTags: {
        extra1: 'value1',
        extra2: 'value2',
      },
      content:
        'Lorem ipsum dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
      isDraft: true,
    }

    const expectedEventTemplate = {
      kind: DraftClassifiedListing,
      content:
        'Lorem ipsum dolor sit amet. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nRead more at nostr:naddr1qqzkjurnw4ksz9thwden5te0wfjkccte9ehx7um5wghx7un8qgs2d90kkcq3nk2jry62dyf50k0h36rhpdtd594my40w9pkal876jxgrqsqqqa28pccpzu.',
      tags: [
        ['d', 'sample-title'],
        ['title', 'Sample Title'],
        ['published_at', '1296962229'],
        ['summary', 'Sample Summary'],
        ['location', 'NYC'],
        ['price', '100', 'USD'],
        ['image', 'https://example.com/image1.jpg', '800x600'],
        ['image', 'https://example.com/image2.jpg'],
        ['t', 'tag1'],
        ['t', 'tag2'],
        ['extra1', 'value1'],
        ['extra2', 'value2'],
      ],
      created_at: expect.any(Number),
    }

    expect(generateEventTemplate(listing)).toEqual(expectedEventTemplate)
  })
})
