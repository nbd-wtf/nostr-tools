import { describe, expect, test } from 'bun:test'
import type { Event } from './core.ts'
import {
  Group,
  GroupAdmin,
  GroupAdminPermission,
  GroupMember,
  GroupRole,
  GroupPinnedEvent,
  generateEditGroupMetadataEventTemplate,
  generateGroupAdminsEventTemplate,
  generateGroupJoinRequestEventTemplate,
  generateGroupLeaveRequestEventTemplate,
  generateGroupLivekitParticipantsEventTemplate,
  generateGroupMembersEventTemplate,
  generateGroupMetadataEventTemplate,
  generateGroupPinnedEventsEventTemplate,
  generateGroupRolesEventTemplate,
  generateCreateGroupEventTemplate,
  generateCreateInviteEventTemplate,
  generateDeleteEventEventTemplate,
  generateDeleteGroupEventTemplate,
  generatePutUserEventTemplate,
  generateRemoveUserEventTemplate,
  generateUpdatePinListEventTemplate,
  parseGroupAdminsEvent,
  parseGroupLivekitParticipantsEvent,
  parseGroupMembersEvent,
  parseGroupMetadataEvent,
  parseGroupPinnedEventsEvent,
  parseGroupRolesEvent,
  validateGroupAdminsEvent,
  validateGroupLivekitParticipantsEvent,
  validateGroupMembersEvent,
  validateGroupMetadataEvent,
  validateGroupPinnedEventsEvent,
  validateGroupRolesEvent,
} from './nip29.ts'

const group: Group = {
  relay: 'wss://relay.example.com',
  reference: {
    id: 'sample-group-id',
    host: 'wss://relay.example.com',
  },
  metadata: {
    id: 'sample-group-id',
    pubkey: 'sample-pubkey',
    name: 'Pizza Lovers',
    banner: 'https://pizza.com/banner.png',
    picture: 'https://pizza.com/pizza.png',
    about: 'a group for people who love pizza',
    isPrivate: true,
    isRestricted: true,
    isHidden: false,
    isClosed: false,
    hasLiveKit: true,
    supportedKinds: ['9', '11'],
  },
  members: [],
  admins: [],
}

const makeEvent = (template: ReturnType<typeof generateGroupMetadataEventTemplate>): Event => ({
  id: 'sample-id',
  pubkey: 'sample-pubkey',
  created_at: template.created_at,
  kind: template.kind,
  tags: template.tags,
  content: template.content,
  sig: 'sample-sig',
})

describe('NIP-29 group metadata event', () => {
  test('generateGroupMetadataEventTemplate emits all metadata fields', () => {
    const template = generateGroupMetadataEventTemplate(group)
    expect(template.kind).toBe(39000)
    expect(template.tags).toEqual([
      ['d', 'sample-group-id'],
      ['name', 'Pizza Lovers'],
      ['picture', 'https://pizza.com/pizza.png'],
      ['banner', 'https://pizza.com/banner.png'],
      ['about', 'a group for people who love pizza'],
      ['private'],
      ['restricted'],
      ['livekit'],
      ['supported_kinds', '9', '11'],
    ])
  })

  test('parseGroupMetadataEvent round-trips the metadata fields', () => {
    const metadata = parseGroupMetadataEvent(makeEvent(generateGroupMetadataEventTemplate(group)))
    expect(metadata).toEqual({
      id: 'sample-group-id',
      pubkey: 'sample-pubkey',
      name: 'Pizza Lovers',
      banner: 'https://pizza.com/banner.png',
      picture: 'https://pizza.com/pizza.png',
      about: 'a group for people who love pizza',
      isPrivate: true,
      isRestricted: true,
      hasLiveKit: true,
      supportedKinds: ['9', '11'],
    })
  })

  test('parseGroupMetadataEvent parses subgroups parent and child tags', () => {
    const event = makeEvent(generateGroupMetadataEventTemplate(group))
    event.tags.push(['parent', 'tech'])
    event.tags.push(['child', 'nostr'])
    const metadata = parseGroupMetadataEvent(event)
    expect(metadata.parent).toBe('tech')
    expect(metadata.children).toEqual(['nostr'])
  })

  test('validateGroupMetadataEvent rejects events without a d tag', () => {
    const event = makeEvent(generateGroupMetadataEventTemplate(group))
    event.tags = []
    expect(validateGroupMetadataEvent(event)).toBe(false)
  })
})

describe('NIP-29 group roles event', () => {
  const roles: GroupRole[] = [{ name: 'ceo', description: 'runs the place' }, { name: 'secretary' }]

  test('generateGroupRolesEventTemplate emits role tags', () => {
    const template = generateGroupRolesEventTemplate(group, roles)
    expect(template.kind).toBe(39003)
    expect(template.tags).toEqual([
      ['d', 'sample-group-id'],
      ['role', 'ceo', 'runs the place'],
      ['role', 'secretary'],
    ])
  })

  test('parseGroupRolesEvent round-trips roles', () => {
    const event = makeEvent(generateGroupRolesEventTemplate(group, roles))
    expect(validateGroupRolesEvent(event)).toBe(true)
    expect(parseGroupRolesEvent(event)).toEqual(roles)
  })
})

describe('NIP-29 group livekit participants event', () => {
  test('generateGroupLivekitParticipantsEventTemplate emits participant tags', () => {
    const template = generateGroupLivekitParticipantsEventTemplate(group, ['abc', 'def'])
    expect(template.kind).toBe(39004)
    expect(template.tags).toEqual([
      ['d', 'sample-group-id'],
      ['participant', 'abc'],
      ['participant', 'def'],
    ])
  })

  test('parseGroupLivekitParticipantsEvent round-trips participants', () => {
    const event = makeEvent(generateGroupLivekitParticipantsEventTemplate(group, ['abc', 'def']))
    expect(validateGroupLivekitParticipantsEvent(event)).toBe(true)
    expect(parseGroupLivekitParticipantsEvent(event)).toEqual(['abc', 'def'])
  })
})

describe('NIP-29 group pinned events event', () => {
  const pinnedEvents: GroupPinnedEvent[] = [
    { type: 'e', value: 'event-id-1' },
    { type: 'a', value: '1:pubkey:d-identifier' },
    { type: 'e', value: 'event-id-2' },
  ]

  test('generateGroupPinnedEventsEventTemplate emits e and a tags in order', () => {
    const template = generateGroupPinnedEventsEventTemplate(group, pinnedEvents)
    expect(template.kind).toBe(39005)
    expect(template.tags).toEqual([
      ['d', 'sample-group-id'],
      ['e', 'event-id-1'],
      ['a', '1:pubkey:d-identifier'],
      ['e', 'event-id-2'],
    ])
  })

  test('parseGroupPinnedEventsEvent round-trips pinned events in order', () => {
    const event = makeEvent(generateGroupPinnedEventsEventTemplate(group, pinnedEvents))
    expect(validateGroupPinnedEventsEvent(event)).toBe(true)
    expect(parseGroupPinnedEventsEvent(event)).toEqual(pinnedEvents)
  })
})

describe('NIP-29 moderation events', () => {
  const previous = ['eb96c864', '2db75638']

  test('generatePutUserEventTemplate', () => {
    const template = generatePutUserEventTemplate('sample-group-id', 'pubkey', ['ceo'], 'why', previous)
    expect(template.kind).toBe(9000)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['p', 'pubkey', 'ceo'],
      ['previous', 'eb96c864', '2db75638'],
    ])
  })

  test('generateRemoveUserEventTemplate', () => {
    const template = generateRemoveUserEventTemplate('sample-group-id', 'pubkey', 'bye')
    expect(template.kind).toBe(9001)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['p', 'pubkey'],
    ])
  })

  test('generateEditGroupMetadataEventTemplate', () => {
    const template = generateEditGroupMetadataEventTemplate(group)
    expect(template.kind).toBe(9002)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['name', 'Pizza Lovers'],
      ['picture', 'https://pizza.com/pizza.png'],
      ['banner', 'https://pizza.com/banner.png'],
      ['about', 'a group for people who love pizza'],
      ['private'],
      ['restricted'],
      ['livekit'],
      ['supported_kinds', '9', '11'],
    ])
  })

  test('generateDeleteEventEventTemplate', () => {
    const template = generateDeleteEventEventTemplate('sample-group-id', 'event-id', 'spam')
    expect(template.kind).toBe(9005)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['e', 'event-id'],
    ])
  })

  test('generateCreateGroupEventTemplate', () => {
    const template = generateCreateGroupEventTemplate('sample-group-id')
    expect(template.kind).toBe(9007)
    expect(template.tags).toEqual([['h', 'sample-group-id']])
  })

  test('generateDeleteGroupEventTemplate', () => {
    const template = generateDeleteGroupEventTemplate('sample-group-id')
    expect(template.kind).toBe(9008)
    expect(template.tags).toEqual([['h', 'sample-group-id']])
  })

  test('generateCreateInviteEventTemplate', () => {
    const template = generateCreateInviteEventTemplate('sample-group-id', 'invite-code')
    expect(template.kind).toBe(9009)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['code', 'invite-code'],
    ])
  })

  test('generateUpdatePinListEventTemplate', () => {
    const template = generateUpdatePinListEventTemplate('sample-group-id', [
      { type: 'e', value: 'event-id-1' },
      { type: 'a', value: '1:pubkey:d-identifier' },
    ])
    expect(template.kind).toBe(9010)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['e', 'event-id-1'],
      ['a', '1:pubkey:d-identifier'],
    ])
  })
})

describe('NIP-29 join and leave requests', () => {
  test('generateGroupJoinRequestEventTemplate includes optional code tag', () => {
    const template = generateGroupJoinRequestEventTemplate('sample-group-id', 'invite-code', 'want in')
    expect(template.kind).toBe(9021)
    expect(template.tags).toEqual([
      ['h', 'sample-group-id'],
      ['code', 'invite-code'],
    ])
    expect(template.content).toBe('want in')
  })

  test('generateGroupLeaveRequestEventTemplate', () => {
    const template = generateGroupLeaveRequestEventTemplate('sample-group-id', 'leaving')
    expect(template.kind).toBe(9022)
    expect(template.tags).toEqual([['h', 'sample-group-id']])
    expect(template.content).toBe('leaving')
  })
})

describe('NIP-29 admins and members events', () => {
  const admins: GroupAdmin[] = [
    { pubkey: 'admin-pubkey', label: 'boss', permissions: [GroupAdminPermission.PutUser] },
    { pubkey: 'admin-pubkey-2', label: '', permissions: [GroupAdminPermission.EditMetadata] },
  ]
  const members: GroupMember[] = [{ pubkey: 'member-pubkey', label: 'pizza lover' }]

  test('generateGroupAdminsEventTemplate and parse round-trip', () => {
    const template = generateGroupAdminsEventTemplate(group, admins)
    const event = makeEvent(template)
    expect(validateGroupAdminsEvent(event)).toBe(true)
    expect(parseGroupAdminsEvent(event)).toEqual(admins)
  })

  test('generateGroupMembersEventTemplate and parse round-trip', () => {
    const template = generateGroupMembersEventTemplate(group, members)
    const event = makeEvent(template)
    expect(validateGroupMembersEvent(event)).toBe(true)
    expect(parseGroupMembersEvent(event)).toEqual(members)
  })
})
