import { Event, EventTemplate } from './core.ts'
import { ClassifiedListing, DraftClassifiedListing } from './kinds.ts'

/**
 * Represents the details of a price.
 * @example { amount: '100', currency: 'USD', frequency: 'month' }
 * @example { amount: '100', currency: 'EUR' }
 */
export type PriceDetails = {
  /**
   * The amount of the price.
   */
  amount: string
  /**
   * The currency of the price in 3-letter ISO 4217 format.
   * @example 'USD'
   */
  currency: string
  /**
   * The optional frequency of payment.
   * Can be one of: 'hour', 'day', 'week', 'month', 'year', or a custom string.
   */
  frequency?: string
}

/**
 * Represents a classified listing object.
 */
export type ClassifiedListingObject = {
  /**
   * Whether the listing is a draft or not.
   */
  isDraft: boolean
  /**
   * A title of the listing.
   */
  title: string
  /**
   * A short summary or tagline.
   */
  summary: string
  /**
   * A description in Markdown format.
   */
  content: string
  /**
   * Timestamp in unix seconds of when the listing was published.
   */
  publishedAt: string
  /**
   * Location of the listing.
   * @example 'NYC'
   */
  location: string
  /**
   * Price details.
   */
  price: PriceDetails
  /**
   * Images of the listing with optional dimensions.
   */
  images: Array<{
    url: string
    dimensions?: string
  }>
  /**
   * Tags/Hashtags (i.e. categories, keywords, etc.)
   */
  hashtags: string[]
  /**
   * Other standard tags.
   * @example "g", a geohash for more precise location
   */
  additionalTags: Record<string, string | string[]>
}

/**
 * Validates an event to ensure it is a valid classified listing event.
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export function validateEvent(event: Event): boolean {
  if (![ClassifiedListing, DraftClassifiedListing].includes(event.kind)) return false

  const requiredTags = ['d', 'title', 'summary', 'location', 'published_at', 'price']
  const requiredTagCount = requiredTags.length
  const tagCounts: Record<string, number> = {}

  if (event.tags.length < requiredTagCount) return false

  for (const tag of event.tags) {
    if (tag.length < 2) return false

    const [tagName, ...tagValues] = tag

    if (tagName == 'published_at') {
      const timestamp = parseInt(tagValues[0])
      if (isNaN(timestamp)) return false
    } else if (tagName == 'price') {
      if (tagValues.length < 2) return false

      const price = parseInt(tagValues[0])
      if (isNaN(price) || tagValues[1].length != 3) return false
    } else if ((tagName == 'e' || tagName == 'a') && tag.length != 3) {
      return false
    }

    if (requiredTags.includes(tagName)) {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1
    }
  }

  return Object.values(tagCounts).every(count => count == 1) && Object.keys(tagCounts).length == requiredTagCount
}

/**
 * Parses an event and returns a classified listing object.
 * @param event - The event to parse.
 * @returns The classified listing object.
 * @throws Error if the event is invalid.
 */
export function parseEvent(event: Event): ClassifiedListingObject {
  if (!validateEvent(event)) {
    throw new Error('Invalid event')
  }

  const listing: ClassifiedListingObject = {
    isDraft: event.kind === DraftClassifiedListing,
    title: '',
    summary: '',
    content: event.content,
    publishedAt: '',
    location: '',
    price: {
      amount: '',
      currency: '',
    },
    images: [],
    hashtags: [],
    additionalTags: {},
  }

  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i]
    const [tagName, ...tagValues] = tag

    if (tagName == 'title') {
      listing.title = tagValues[0]
    } else if (tagName == 'summary') {
      listing.summary = tagValues[0]
    } else if (tagName == 'published_at') {
      listing.publishedAt = tagValues[0]
    } else if (tagName == 'location') {
      listing.location = tagValues[0]
    } else if (tagName == 'price') {
      listing.price.amount = tagValues[0]
      listing.price.currency = tagValues[1]

      if (tagValues.length == 3) {
        listing.price.frequency = tagValues[2]
      }
    } else if (tagName == 'image') {
      listing.images.push({
        url: tagValues[0],
        dimensions: tagValues?.[1] ?? undefined,
      })
    } else if (tagName == 't') {
      listing.hashtags.push(tagValues[0])
    } else if (tagName == 'e' || tagName == 'a') {
      listing.additionalTags[tagName] = [...tagValues]
    }
  }

  return listing
}

/**
 * Generates an event template based on a classified listing object.
 *
 * @param listing - The classified listing object.
 * @returns The event template.
 */
export function generateEventTemplate(listing: ClassifiedListingObject): EventTemplate {
  const priceTag = ['price', listing.price.amount, listing.price.currency]
  if (listing.price.frequency) priceTag.push(listing.price.frequency)

  const tags: string[][] = [
    ['d', listing.title.trim().toLowerCase().replace(/ /g, '-')],
    ['title', listing.title],
    ['published_at', listing.publishedAt],
    ['summary', listing.summary],
    ['location', listing.location],
    priceTag,
  ]

  for (let i = 0; i < listing.images.length; i++) {
    const image = listing.images[i]
    const imageTag = ['image', image.url]
    if (image.dimensions) imageTag.push(image.dimensions)

    tags.push(imageTag)
  }

  for (let i = 0; i < listing.hashtags.length; i++) {
    const t = listing.hashtags[i]

    tags.push(['t', t])
  }

  for (const [key, value] of Object.entries(listing.additionalTags)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const val = value[i]

        tags.push([key, val])
      }
    } else {
      tags.push([key, value])
    }
  }

  return {
    kind: listing.isDraft ? DraftClassifiedListing : ClassifiedListing,
    content: listing.content,
    tags,
    created_at: Math.floor(Date.now() / 1000),
  }
}
