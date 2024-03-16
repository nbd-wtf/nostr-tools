import { expect, test } from 'bun:test'

import { EventTemplate } from './core.ts'
import {
  BadgeAward as BadgeAwardKind,
  BadgeDefinition as BadgeDefinitionKind,
  ProfileBadges as ProfileBadgesKind,
} from './kinds.ts'
import { finalizeEvent, generateSecretKey } from './pure.ts'

import {
  BadgeAward,
  BadgeDefinition,
  ProfileBadges,
  generateBadgeAwardEventTemplate,
  generateBadgeDefinitionEventTemplate,
  generateProfileBadgesEventTemplate,
  validateBadgeAwardEvent,
  validateBadgeDefinitionEvent,
  validateProfileBadgesEvent,
} from './nip58.ts'

test('BadgeDefinition has required property "d"', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
  }
  expect(badge.d).toEqual('badge-id')
})

test('BadgeDefinition has optional property "name"', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
    name: 'Badge Name',
  }
  expect(badge.name).toEqual('Badge Name')
})

test('BadgeDefinition has optional property "description"', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
    description: 'Badge Description',
  }
  expect(badge.description).toEqual('Badge Description')
})

test('BadgeDefinition has optional property "image"', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
    image: ['https://example.com/badge.png', '1024x1024'],
  }
  expect(badge.image).toEqual(['https://example.com/badge.png', '1024x1024'])
})

test('BadgeDefinition has optional property "thumbs"', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
    thumbs: [
      ['https://example.com/thumb.png', '100x100'],
      ['https://example.com/thumb2.png', '200x200'],
    ],
  }
  expect(badge.thumbs).toEqual([
    ['https://example.com/thumb.png', '100x100'],
    ['https://example.com/thumb2.png', '200x200'],
  ])
})

test('BadgeAward has required property "a"', () => {
  const badgeAward: BadgeAward = {
    a: 'badge-definition-address',
    p: [
      ['pubkey1', 'relay1'],
      ['pubkey2', 'relay2'],
    ],
  }
  expect(badgeAward.a).toEqual('badge-definition-address')
})

test('BadgeAward has required property "p"', () => {
  const badgeAward: BadgeAward = {
    a: 'badge-definition-address',
    p: [
      ['pubkey1', 'relay1'],
      ['pubkey2', 'relay2'],
    ],
  }
  expect(badgeAward.p).toEqual([
    ['pubkey1', 'relay1'],
    ['pubkey2', 'relay2'],
  ])
})

test('ProfileBadges has required property "d"', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [],
  }
  expect(profileBadges.d).toEqual('profile_badges')
})

test('ProfileBadges has required property "badges"', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [],
  }
  expect(profileBadges.badges).toEqual([])
})

test('ProfileBadges badges array contains objects with required properties "a" and "e"', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [
      {
        a: 'badge-definition-address',
        e: ['badge-award-event-id'],
      },
    ],
  }
  expect(profileBadges.badges[0].a).toEqual('badge-definition-address')
  expect(profileBadges.badges[0].e).toEqual(['badge-award-event-id'])
})

test('generateBadgeDefinitionEventTemplate generates EventTemplate with mandatory tags', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
  }
  const eventTemplate = generateBadgeDefinitionEventTemplate(badge)
  expect(eventTemplate.tags).toEqual([['d', 'badge-id']])
})

test('generateBadgeDefinitionEventTemplate generates EventTemplate with optional tags', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
    name: 'Badge Name',
    description: 'Badge Description',
    image: ['https://example.com/badge.png', '1024x1024'],
    thumbs: [
      ['https://example.com/thumb.png', '100x100'],
      ['https://example.com/thumb2.png', '200x200'],
    ],
  }
  const eventTemplate = generateBadgeDefinitionEventTemplate(badge)
  expect(eventTemplate.tags).toEqual([
    ['d', 'badge-id'],
    ['name', 'Badge Name'],
    ['description', 'Badge Description'],
    ['image', 'https://example.com/badge.png', '1024x1024'],
    ['thumb', 'https://example.com/thumb.png', '100x100'],
    ['thumb', 'https://example.com/thumb2.png', '200x200'],
  ])
})

test('generateBadgeDefinitionEventTemplate generates EventTemplate without optional tags', () => {
  const badge: BadgeDefinition = {
    d: 'badge-id',
  }
  const eventTemplate = generateBadgeDefinitionEventTemplate(badge)
  expect(eventTemplate.tags).toEqual([['d', 'badge-id']])
})

test('validateBadgeDefinitionEvent returns true for valid BadgeDefinition event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: BadgeDefinitionKind,
    tags: [
      ['d', 'badge-id'],
      ['name', 'Badge Name'],
      ['description', 'Badge Description'],
      ['image', 'https://example.com/badge.png', '1024x1024'],
      ['thumb', 'https://example.com/thumb.png', '100x100'],
      ['thumb', 'https://example.com/thumb2.png', '200x200'],
    ],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateBadgeDefinitionEvent(event)

  expect(isValid).toBe(true)
})

test('validateBadgeDefinitionEvent returns false for invalid BadgeDefinition event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: BadgeDefinitionKind,
    tags: [],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateBadgeDefinitionEvent(event)

  expect(isValid).toBe(false)
})

test('generateBadgeAwardEventTemplate generates EventTemplate with mandatory tags', () => {
  const badgeAward: BadgeAward = {
    a: 'badge-definition-address',
    p: [
      ['pubkey1', 'relay1'],
      ['pubkey2', 'relay2'],
    ],
  }
  const eventTemplate = generateBadgeAwardEventTemplate(badgeAward)
  expect(eventTemplate.tags).toEqual([
    ['a', 'badge-definition-address'],
    ['p', 'pubkey1', 'relay1'],
    ['p', 'pubkey2', 'relay2'],
  ])
})

test('generateBadgeAwardEventTemplate generates EventTemplate without optional tags', () => {
  const badgeAward: BadgeAward = {
    a: 'badge-definition-address',
    p: [
      ['pubkey1', 'relay1'],
      ['pubkey2', 'relay2'],
    ],
  }
  const eventTemplate = generateBadgeAwardEventTemplate(badgeAward)
  expect(eventTemplate.tags).toEqual([
    ['a', 'badge-definition-address'],
    ['p', 'pubkey1', 'relay1'],
    ['p', 'pubkey2', 'relay2'],
  ])
})

test('generateBadgeAwardEventTemplate generates EventTemplate with optional tags', () => {
  const badgeAward: BadgeAward = {
    a: 'badge-definition-address',
    p: [
      ['pubkey1', 'relay1'],
      ['pubkey2', 'relay2'],
    ],
  }
  const eventTemplate = generateBadgeAwardEventTemplate(badgeAward)
  expect(eventTemplate.tags).toEqual([
    ['a', 'badge-definition-address'],
    ['p', 'pubkey1', 'relay1'],
    ['p', 'pubkey2', 'relay2'],
  ])
})

test('validateBadgeAwardEvent returns true for valid BadgeAward event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: BadgeAwardKind,
    tags: [
      ['a', 'badge-definition-address'],
      ['p', 'pubkey1', 'relay1'],
      ['p', 'pubkey2', 'relay2'],
    ],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateBadgeAwardEvent(event)

  expect(isValid).toBe(true)
})

test('validateBadgeAwardEvent returns false for invalid BadgeAward event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: BadgeAwardKind,
    tags: [],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateBadgeAwardEvent(event)

  expect(isValid).toBe(false)
})

test('generateProfileBadgesEventTemplate generates EventTemplate with mandatory tags', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [],
  }
  const eventTemplate = generateProfileBadgesEventTemplate(profileBadges)
  expect(eventTemplate.tags).toEqual([['d', 'profile_badges']])
})

test('generateProfileBadgesEventTemplate generates EventTemplate with optional tags', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [
      {
        a: 'badge-definition-address',
        e: ['badge-award-event-id'],
      },
    ],
  }
  const eventTemplate = generateProfileBadgesEventTemplate(profileBadges)
  expect(eventTemplate.tags).toEqual([
    ['d', 'profile_badges'],
    ['a', 'badge-definition-address'],
    ['e', 'badge-award-event-id'],
  ])
})

test('generateProfileBadgesEventTemplate generates EventTemplate with multiple optional tags', () => {
  const profileBadges: ProfileBadges = {
    d: 'profile_badges',
    badges: [
      {
        a: 'badge-definition-address1',
        e: ['badge-award-event-id1', 'badge-award-event-id2'],
      },
      {
        a: 'badge-definition-address2',
        e: ['badge-award-event-id3'],
      },
    ],
  }
  const eventTemplate = generateProfileBadgesEventTemplate(profileBadges)
  expect(eventTemplate.tags).toEqual([
    ['d', 'profile_badges'],
    ['a', 'badge-definition-address1'],
    ['e', 'badge-award-event-id1', 'badge-award-event-id2'],
    ['a', 'badge-definition-address2'],
    ['e', 'badge-award-event-id3'],
  ])
})

test('validateProfileBadgesEvent returns true for valid ProfileBadges event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: ProfileBadgesKind,
    tags: [
      ['d', 'profile_badges'],
      ['a', 'badge-definition-address'],
      ['e', 'badge-award-event-id'],
    ],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateProfileBadgesEvent(event)

  expect(isValid).toBe(true)
})

test('validateProfileBadgesEvent returns false for invalid ProfileBadges event', () => {
  const sk = generateSecretKey()
  const eventTemplate: EventTemplate = {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: ProfileBadgesKind,
    tags: [],
  }
  const event = finalizeEvent(eventTemplate, sk)
  const isValid = validateProfileBadgesEvent(event)

  expect(isValid).toBe(false)
})
