import { AbstractSimplePool } from './abstract-pool.ts'
import { Subscription } from './abstract-relay.ts'
import type { Event, EventTemplate } from './core.ts'
import { fetchRelayInformation, RelayInformation } from './nip11.ts'
import { decode, NostrTypeGuard } from './nip19.ts'
import { normalizeURL } from './utils.ts'

/**
 * Represents a NIP29 group.
 */
export type Group = {
  relay: string
  metadata: GroupMetadata
  admins?: GroupAdmin[]
  members?: GroupMember[]
  reference: GroupReference
}

/**
 * Represents the metadata for a NIP29 group.
 */
export type GroupMetadata = {
  id: string
  pubkey: string
  name?: string
  picture?: string
  banner?: string
  about?: string
  isPrivate?: boolean
  isRestricted?: boolean
  isHidden?: boolean
  isClosed?: boolean
  hasLiveKit?: boolean
  supportedKinds?: string[]
  parent?: string
  children?: string[]
}

/**
 * Represents a NIP29 group reference.
 */
export type GroupReference = {
  id: string
  host: string
}

/**
 * Represents a NIP29 group member.
 */
export type GroupMember = {
  pubkey: string
  label?: string
}

/**
 * Represents a NIP29 group admin.
 */
export type GroupAdmin = {
  pubkey: string
  label?: string
  permissions: GroupAdminPermission[]
}

/**
 * Represents the permissions that a NIP29 group admin can have.
 */
export enum GroupAdminPermission {
  /** @deprecated use PutUser instead */
  AddUser = 'add-user',
  EditMetadata = 'edit-metadata',
  DeleteEvent = 'delete-event',
  RemoveUser = 'remove-user',
  /** @deprecated removed from NIP */
  AddPermission = 'add-permission',
  /** @deprecated removed from NIP */
  RemovePermission = 'remove-permission',
  /** @deprecated removed from NIP */
  EditGroupStatus = 'edit-group-status',
  PutUser = 'put-user',
  CreateGroup = 'create-group',
  DeleteGroup = 'delete-group',
  CreateInvite = 'create-invite',
  UpdatePinList = 'update-pin-list',
}

function buildGroupMetadataTags(metadata: GroupMetadata): string[][] {
  const tags: string[][] = []
  metadata.name && tags.push(['name', metadata.name])
  metadata.picture && tags.push(['picture', metadata.picture])
  metadata.banner && tags.push(['banner', metadata.banner])
  metadata.about && tags.push(['about', metadata.about])
  metadata.isPrivate && tags.push(['private'])
  metadata.isRestricted && tags.push(['restricted'])
  metadata.isHidden && tags.push(['hidden'])
  metadata.isClosed && tags.push(['closed'])
  metadata.hasLiveKit && tags.push(['livekit'])
  metadata.supportedKinds &&
    metadata.supportedKinds.length > 0 &&
    tags.push(['supported_kinds', ...metadata.supportedKinds])
  metadata.parent && tags.push(['parent', metadata.parent])
  metadata.children &&
    metadata.children.forEach(child => {
      tags.push(['child', child])
    })

  return tags
}

/**
 * Generates a group metadata event template.
 *
 * @param group - The group object.
 * @returns An event template with the generated group metadata that can be signed later.
 */
export function generateGroupMetadataEventTemplate(group: Group): EventTemplate {
  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39000,
    tags: [['d', group.metadata.id], ...buildGroupMetadataTags(group.metadata)],
  }
}

/**
 * Validates a group metadata event.
 *
 * @param event - The event to validate.
 * @returns A boolean indicating whether the event is valid.
 */
export function validateGroupMetadataEvent(event: Event): boolean {
  if (event.kind !== 39000) return false

  if (!event.pubkey) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  return true
}

/**
 * Generates an event template for group admins.
 *
 * @param group - The group object.
 * @param admins - An array of group admins.
 * @returns The generated event template with the group admins that can be signed later.
 */
export function generateGroupAdminsEventTemplate(group: Group, admins: GroupAdmin[]): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  for (const admin of admins) {
    tags.push(['p', admin.pubkey, admin.label || '', ...admin.permissions])
  }

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39001,
    tags,
  }
}

/**
 * Validates a group admins event.
 *
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export function validateGroupAdminsEvent(event: Event): boolean {
  if (event.kind !== 39001) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  // validate permissions
  for (const [tag, _value, _label, ...permissions] of event.tags) {
    if (tag !== 'p') continue

    for (let i = 0; i < permissions.length; i += 1) {
      if (typeof permissions[i] !== 'string') return false

      // validate permission name from the GroupAdminPermission enum
      if (!Object.values(GroupAdminPermission).includes(permissions[i] as GroupAdminPermission)) return false
    }
  }

  return true
}

/**
 * Generates an event template for a group with its members.
 *
 * @param group - The group object.
 * @param members - An array of group members.
 * @returns The generated event template with the group members that can be signed later.
 */
export function generateGroupMembersEventTemplate(group: Group, members: GroupMember[]): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  for (const member of members) {
    tags.push(['p', member.pubkey, member.label || ''])
  }

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39002,
    tags,
  }
}

/**
 * Validates a group members event.
 *
 * @param event - The event to validate.
 * @returns Returns `true` if the event is a valid group members event, `false` otherwise.
 */
export function validateGroupMembersEvent(event: Event): boolean {
  if (event.kind !== 39002) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  return true
}

/**
 * Returns the normalized relay URL based on the provided group reference.
 *
 * @param groupReference - The group reference object containing the host.
 * @returns The normalized relay URL.
 */
export function getNormalizedRelayURLByGroupReference(groupReference: GroupReference): string {
  return normalizeURL(groupReference.host)
}

/**
 * Fetches relay information by group reference.
 *
 * @param groupReference The group reference.
 * @returns A promise that resolves to the relay information.
 */
export async function fetchRelayInformationByGroupReference(groupReference: GroupReference): Promise<RelayInformation> {
  const normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)

  return fetchRelayInformation(normalizedRelayURL)
}

/**
 * Fetches the group metadata event from the specified pool.
 * If the normalizedRelayURL is not provided, it will be obtained using the groupReference.
 * If the relayInformation is not provided, it will be fetched using the normalizedRelayURL.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool to fetch the group metadata event from.
 * @param {GroupReference} options.groupReference - The reference to the group.
 * @param {string} [options.normalizedRelayURL] - The normalized URL of the relay.
 * @param {RelayInformation} [options.relayInformation] - The relay information object.
 * @returns {Promise<Event>} The group metadata event that can be parsed later to get the group metadata object.
 * @throws {Error} If the group is not found on the specified relay.
 */
export async function fetchGroupMetadataEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupMetadataEvent = await pool.get([normalizedRelayURL], {
    kinds: [39000],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupMetadataEvent) throw new Error(`group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupMetadataEvent
}

/**
 * Parses a group metadata event and returns the corresponding GroupMetadata object.
 *
 * @param event - The event to parse.
 * @returns The parsed GroupMetadata object.
 * @throws An error if the group metadata event is invalid.
 */
export function parseGroupMetadataEvent(event: Event): GroupMetadata {
  if (!validateGroupMetadataEvent(event)) throw new Error('invalid group metadata event')

  const metadata: GroupMetadata = {
    id: '',
    pubkey: event.pubkey,
  }

  for (const [tag, value] of event.tags) {
    switch (tag) {
      case 'd':
        metadata.id = value
        break
      case 'name':
        metadata.name = value
        break
      case 'picture':
        metadata.picture = value
        break
      case 'banner':
        metadata.banner = value
        break
      case 'about':
        metadata.about = value
        break
      case 'private':
        metadata.isPrivate = true
        break
      case 'restricted':
        metadata.isRestricted = true
        break
      case 'hidden':
        metadata.isHidden = true
        break
      case 'closed':
        metadata.isClosed = true
        break
      case 'livekit':
        metadata.hasLiveKit = true
        break
      case 'parent':
        metadata.parent = value
        break
    }
  }

  const supportedKinds = event.tags.filter(([tag]) => tag === 'supported_kinds').flatMap(([, ...values]) => values)
  if (supportedKinds.length > 0) metadata.supportedKinds = supportedKinds

  const children = event.tags.filter(([tag]) => tag === 'child').map(([, value]) => value)
  if (children.length > 0) metadata.children = children

  return metadata
}

/**
 * Fetches the group admins event from the specified pool.
 * If the normalizedRelayURL is not provided, it will be obtained from the groupReference.
 * If the relayInformation is not provided, it will be fetched using the normalizedRelayURL.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool to fetch the group admins event from.
 * @param {GroupReference} options.groupReference - The reference to the group.
 * @param {string} [options.normalizedRelayURL] - The normalized relay URL.
 * @param {RelayInformation} [options.relayInformation] - The relay information.
 * @returns {Promise<Event>} The group admins event that can be parsed later to get the group admins object.
 * @throws {Error} If the group admins event is not found on the specified relay.
 */
export async function fetchGroupAdminsEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupAdminsEvent = await pool.get([normalizedRelayURL], {
    kinds: [39001],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupAdminsEvent) throw new Error(`admins for group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupAdminsEvent
}

/**
 * Parses a group admins event and returns an array of GroupAdmin objects.
 *
 * @param event - The event to parse.
 * @returns An array of GroupAdmin objects.
 * @throws Throws an error if the group admins event is invalid.
 */
export function parseGroupAdminsEvent(event: Event): GroupAdmin[] {
  if (!validateGroupAdminsEvent(event)) throw new Error('invalid group admins event')

  const admins: GroupAdmin[] = []

  for (const [tag, value, label, ...permissions] of event.tags) {
    if (tag !== 'p') continue

    admins.push({
      pubkey: value,
      label,
      permissions: permissions as GroupAdminPermission[],
    })
  }

  return admins
}

/**
 * Fetches the group members event from the specified relay.
 * If the normalizedRelayURL is not provided, it will be obtained using the groupReference.
 * If the relayInformation is not provided, it will be fetched using the normalizedRelayURL.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool object.
 * @param {GroupReference} options.groupReference - The group reference object.
 * @param {string} [options.normalizedRelayURL] - The normalized relay URL.
 * @param {RelayInformation} [options.relayInformation] - The relay information object.
 * @returns {Promise<Event>} The group members event that can be parsed later to get the group members object.
 * @throws {Error} If the group members event is not found.
 */
export async function fetchGroupMembersEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupMembersEvent = await pool.get([normalizedRelayURL], {
    kinds: [39002],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupMembersEvent) throw new Error(`members for group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupMembersEvent
}

/**
 * Fetches the group roles event from the specified pool.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool object.
 * @param {GroupReference} options.groupReference - The group reference object.
 * @param {string} [options.normalizedRelayURL] - The normalized relay URL.
 * @param {RelayInformation} [options.relayInformation] - The relay information object.
 * @returns {Promise<Event>} The group roles event that can be parsed later to get the group roles object.
 * @throws {Error} If the group roles event is not found.
 */
export async function fetchGroupRolesEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupRolesEvent = await pool.get([normalizedRelayURL], {
    kinds: [39003],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupRolesEvent) throw new Error(`roles for group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupRolesEvent
}

/**
 * Fetches the group livekit participants event from the specified pool.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool object.
 * @param {GroupReference} options.groupReference - The group reference object.
 * @param {string} [options.normalizedRelayURL] - The normalized relay URL.
 * @param {RelayInformation} [options.relayInformation] - The relay information object.
 * @returns {Promise<Event>} The group livekit participants event that can be parsed later to get the participants.
 * @throws {Error} If the group livekit participants event is not found.
 */
export async function fetchGroupLivekitParticipantsEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupLivekitParticipantsEvent = await pool.get([normalizedRelayURL], {
    kinds: [39004],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupLivekitParticipantsEvent)
    throw new Error(`livekit participants for group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupLivekitParticipantsEvent
}

/**
 * Fetches the group pinned events event from the specified pool.
 *
 * @param {Object} options - The options object.
 * @param {AbstractSimplePool} options.pool - The pool object.
 * @param {GroupReference} options.groupReference - The group reference object.
 * @param {string} [options.normalizedRelayURL] - The normalized relay URL.
 * @param {RelayInformation} [options.relayInformation] - The relay information object.
 * @returns {Promise<Event>} The group pinned events event that can be parsed later to get the pinned events.
 * @throws {Error} If the group pinned events event is not found.
 */
export async function fetchGroupPinnedEventsEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Event> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const groupPinnedEventsEvent = await pool.get([normalizedRelayURL], {
    kinds: [39005],
    authors: [relayInformation.pubkey],
    '#d': [groupReference.id],
  })

  if (!groupPinnedEventsEvent)
    throw new Error(`pinned events for group '${groupReference.id}' not found on ${normalizedRelayURL}`)

  return groupPinnedEventsEvent
}

/**
 * Parses a group members event and returns an array of GroupMember objects.
 * @param event - The event to parse.
 * @returns An array of GroupMember objects.
 * @throws Throws an error if the group members event is invalid.
 */
export function parseGroupMembersEvent(event: Event): GroupMember[] {
  if (!validateGroupMembersEvent(event)) throw new Error('invalid group members event')

  const members: GroupMember[] = []

  for (const [tag, value, label] of event.tags) {
    if (tag !== 'p') continue

    members.push({
      pubkey: value,
      label,
    })
  }

  return members
}

/**
 * Represents a NIP29 group role.
 */
export type GroupRole = {
  name: string
  description?: string
}

/**
 * Generates an event template for the roles supported by a group.
 *
 * @param group - The group object.
 * @param roles - An array of group roles.
 * @returns The generated event template with the group roles that can be signed later.
 */
export function generateGroupRolesEventTemplate(group: Group, roles: GroupRole[]): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  for (const role of roles) {
    const tag = ['role', role.name]
    role.description && tag.push(role.description)
    tags.push(tag)
  }

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39003,
    tags,
  }
}

/**
 * Validates a group roles event.
 *
 * @param event - The event to validate.
 * @returns True if the event is a valid group roles event, false otherwise.
 */
export function validateGroupRolesEvent(event: Event): boolean {
  if (event.kind !== 39003) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  return true
}

/**
 * Parses a group roles event and returns an array of GroupRole objects.
 *
 * @param event - The event to parse.
 * @returns An array of GroupRole objects.
 * @throws Throws an error if the group roles event is invalid.
 */
export function parseGroupRolesEvent(event: Event): GroupRole[] {
  if (!validateGroupRolesEvent(event)) throw new Error('invalid group roles event')

  const roles: GroupRole[] = []

  for (const [tag, name, description] of event.tags) {
    if (tag !== 'role') continue

    roles.push({ name, description })
  }

  return roles
}

/**
 * Generates an event template for the livekit participants of a group.
 *
 * @param group - The group object.
 * @param participants - An array of pubkeys currently live in the group's AV rooms.
 * @returns The generated event template with the livekit participants that can be signed later.
 */
export function generateGroupLivekitParticipantsEventTemplate(group: Group, participants: string[]): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  participants.forEach(pubkey => {
    tags.push(['participant', pubkey])
  })

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39004,
    tags,
  }
}

/**
 * Validates a group livekit participants event.
 *
 * @param event - The event to validate.
 * @returns True if the event is a valid group livekit participants event, false otherwise.
 */
export function validateGroupLivekitParticipantsEvent(event: Event): boolean {
  if (event.kind !== 39004) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  return true
}

/**
 * Parses a group livekit participants event and returns an array of participant pubkeys.
 *
 * @param event - The event to parse.
 * @returns An array of participant pubkeys.
 * @throws Throws an error if the group livekit participants event is invalid.
 */
export function parseGroupLivekitParticipantsEvent(event: Event): string[] {
  if (!validateGroupLivekitParticipantsEvent(event)) throw new Error('invalid group livekit participants event')

  return event.tags.filter(([tag]) => tag === 'participant').map(([, pubkey]) => pubkey)
}

/**
 * Represents a reference to a pinned event in a NIP29 group.
 */
export type GroupPinnedEvent = {
  type: 'e' | 'a'
  value: string
}

/**
 * Generates an event template for the events pinned in a group.
 *
 * @param group - The group object.
 * @param pinnedEvents - An array of references to pinned events, in display order.
 * @returns The generated event template with the pinned events that can be signed later.
 */
export function generateGroupPinnedEventsEventTemplate(group: Group, pinnedEvents: GroupPinnedEvent[]): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  pinnedEvents.forEach(pinnedEvent => {
    tags.push([pinnedEvent.type, pinnedEvent.value])
  })

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39005,
    tags,
  }
}

/**
 * Validates a group pinned events event.
 *
 * @param event - The event to validate.
 * @returns True if the event is a valid group pinned events event, false otherwise.
 */
export function validateGroupPinnedEventsEvent(event: Event): boolean {
  if (event.kind !== 39005) return false

  const requiredTags = ['d'] as const
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag)) return false
  }

  return true
}

/**
 * Parses a group pinned events event and returns an array of GroupPinnedEvent objects.
 *
 * @param event - The event to parse.
 * @returns An array of GroupPinnedEvent objects.
 * @throws Throws an error if the group pinned events event is invalid.
 */
export function parseGroupPinnedEventsEvent(event: Event): GroupPinnedEvent[] {
  if (!validateGroupPinnedEventsEvent(event)) throw new Error('invalid group pinned events event')

  const pinnedEvents: GroupPinnedEvent[] = []

  for (const [tag, value] of event.tags) {
    if (tag !== 'e' && tag !== 'a') continue

    pinnedEvents.push({ type: tag, value })
  }

  return pinnedEvents
}

/**
 * Generates a group moderation event template. These events require the `h` tag and
 * may optionally carry timeline references in `previous` tags.
 */
function generateGroupModerationEventTemplate(
  kind: number,
  groupId: string,
  content: string,
  tags: string[][],
  previous?: string[],
): EventTemplate {
  const allTags: string[][] = [['h', groupId], ...tags]
  previous && previous.length > 0 && allTags.push(['previous', ...previous])

  return {
    content,
    created_at: Math.floor(Date.now() / 1000),
    kind,
    tags: allTags,
  }
}

/**
 * Generates a `put-user` (kind:9000) moderation event template.
 *
 * @param groupId - The id of the group.
 * @param pubkey - The pubkey of the user to add or update.
 * @param roles - Optional roles to assign to the user.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generatePutUserEventTemplate(
  groupId: string,
  pubkey: string,
  roles?: string[],
  reason?: string,
  previous?: string[],
): EventTemplate {
  return generateGroupModerationEventTemplate(9000, groupId, reason || '', [['p', pubkey, ...(roles || [])]], previous)
}

/**
 * Generates a `remove-user` (kind:9001) moderation event template.
 *
 * @param groupId - The id of the group.
 * @param pubkey - The pubkey of the user to remove.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateRemoveUserEventTemplate(
  groupId: string,
  pubkey: string,
  reason?: string,
  previous?: string[],
): EventTemplate {
  return generateGroupModerationEventTemplate(9001, groupId, reason || '', [['p', pubkey]], previous)
}

/**
 * Generates an `edit-metadata` (kind:9002) moderation event template carrying
 * all the metadata fields of the group.
 *
 * @param group - The group object with the updated metadata.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateEditGroupMetadataEventTemplate(
  group: Group,
  reason?: string,
  previous?: string[],
): EventTemplate {
  return generateGroupModerationEventTemplate(
    9002,
    group.metadata.id,
    reason || '',
    buildGroupMetadataTags(group.metadata),
    previous,
  )
}

/**
 * Generates a `delete-event` (kind:9005) moderation event template.
 *
 * @param groupId - The id of the group.
 * @param eventId - The id of the event to delete.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateDeleteEventEventTemplate(
  groupId: string,
  eventId: string,
  reason?: string,
  previous?: string[],
): EventTemplate {
  return generateGroupModerationEventTemplate(9005, groupId, reason || '', [['e', eventId]], previous)
}

/**
 * Generates a `create-group` (kind:9007) moderation event template.
 *
 * @param groupId - The id of the group to create.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateCreateGroupEventTemplate(groupId: string, reason?: string, previous?: string[]): EventTemplate {
  return generateGroupModerationEventTemplate(9007, groupId, reason || '', [], previous)
}

/**
 * Generates a `delete-group` (kind:9008) moderation event template.
 *
 * @param groupId - The id of the group to delete.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateDeleteGroupEventTemplate(groupId: string, reason?: string, previous?: string[]): EventTemplate {
  return generateGroupModerationEventTemplate(9008, groupId, reason || '', [], previous)
}

/**
 * Generates a `create-invite` (kind:9009) moderation event template.
 *
 * @param groupId - The id of the group.
 * @param code - An arbitrary invite code.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateCreateInviteEventTemplate(
  groupId: string,
  code: string,
  reason?: string,
  previous?: string[],
): EventTemplate {
  return generateGroupModerationEventTemplate(9009, groupId, reason || '', [['code', code]], previous)
}

/**
 * Generates an `update-pin-list` (kind:9010) moderation event template.
 *
 * @param groupId - The id of the group.
 * @param pinnedEvents - The full ordered list of pinned events.
 * @param reason - Optional reason for the action.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateUpdatePinListEventTemplate(
  groupId: string,
  pinnedEvents: GroupPinnedEvent[],
  reason?: string,
  previous?: string[],
): EventTemplate {
  const tags = pinnedEvents.map(pinnedEvent => [pinnedEvent.type, pinnedEvent.value])
  return generateGroupModerationEventTemplate(9010, groupId, reason || '', tags, previous)
}

/**
 * Generates a group join request (kind:9021) event template.
 *
 * @param groupId - The id of the group.
 * @param inviteCode - Optional invite code to be preauthorized by the relay.
 * @param reason - Optional reason for the request.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateGroupJoinRequestEventTemplate(
  groupId: string,
  inviteCode?: string,
  reason?: string,
  previous?: string[],
): EventTemplate {
  const tags: string[][] = [['h', groupId]]
  inviteCode && tags.push(['code', inviteCode])
  previous && previous.length > 0 && tags.push(['previous', ...previous])

  return {
    content: reason || '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 9021,
    tags,
  }
}

/**
 * Generates a group leave request (kind:9022) event template.
 *
 * @param groupId - The id of the group.
 * @param reason - Optional reason for the request.
 * @param previous - Optional timeline references.
 * @returns The generated event template that can be signed later.
 */
export function generateGroupLeaveRequestEventTemplate(
  groupId: string,
  reason?: string,
  previous?: string[],
): EventTemplate {
  const tags: string[][] = [['h', groupId]]
  previous && previous.length > 0 && tags.push(['previous', ...previous])

  return {
    content: reason || '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 9022,
    tags,
  }
}

/**
 * Fetches and parses the group metadata event, group admins event, and group members event from the specified pool.
 * If the normalized relay URL is not provided, it will be obtained using the group reference.
 * If the relay information is not provided, it will be fetched using the normalized relay URL.
 *
 * @param {Object} options - The options for loading the group.
 * @param {AbstractSimplePool} options.pool - The pool to load the group from.
 * @param {GroupReference} options.groupReference - The reference of the group to load.
 * @param {string} [options.normalizedRelayURL] - The normalized URL of the relay to use.
 * @param {RelayInformation} [options.relayInformation] - The relay information to use.
 * @returns {Promise<Group>} A promise that resolves to the loaded group.
 */
export async function loadGroup({
  pool,
  groupReference,
  normalizedRelayURL,
  relayInformation,
}: {
  pool: AbstractSimplePool
  groupReference: GroupReference
  normalizedRelayURL?: string
  relayInformation?: RelayInformation
}): Promise<Group> {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference)
  }

  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL)
  }

  const metadataEvent = await fetchGroupMetadataEvent({ pool, groupReference, normalizedRelayURL, relayInformation })
  const metadata = parseGroupMetadataEvent(metadataEvent)

  const adminsEvent = await fetchGroupAdminsEvent({ pool, groupReference, normalizedRelayURL, relayInformation })
  const admins = parseGroupAdminsEvent(adminsEvent)

  const membersEvent = await fetchGroupMembersEvent({ pool, groupReference, normalizedRelayURL, relayInformation })
  const members = parseGroupMembersEvent(membersEvent)

  const group: Group = {
    relay: normalizedRelayURL,
    metadata,
    admins,
    members,
    reference: groupReference,
  }

  return group
}

/**
 * Loads a group from the specified pool using the provided group code.
 *
 * @param {AbstractSimplePool} pool - The pool to load the group from.
 * @param {string} code - The code representing the group.
 * @returns {Promise<Group>} - A promise that resolves to the loaded group.
 * @throws {Error} - If the group code is invalid.
 */
export async function loadGroupFromCode(pool: AbstractSimplePool, code: string): Promise<Group> {
  const groupReference = parseGroupCode(code)

  if (!groupReference) throw new Error('invalid group code')

  return loadGroup({ pool, groupReference })
}

/**
 * Parses a group code and returns a GroupReference object.
 *
 * @param code The group code to parse.
 * @returns A GroupReference object if the code is valid, otherwise null.
 */
export function parseGroupCode(code: string): null | GroupReference {
  if (NostrTypeGuard.isNAddr(code)) {
    try {
      let { data } = decode(code)

      let { relays, identifier } = data
      if (!relays || relays.length === 0) return null

      let host = relays![0]
      if (host.startsWith('wss://')) {
        host = host.slice(6)
      }
      return { host, id: identifier }
    } catch (err) {
      return null
    }
  } else if (code.split("'").length === 2) {
    let spl = code.split("'")
    return { host: spl[0], id: spl[1] }
  }

  return null
}

/**
 * Encodes a group reference into a string.
 *
 * @param gr - The group reference to encode.
 * @returns The encoded group reference as a string.
 */
export function encodeGroupReference(gr: GroupReference): string {
  const { host, id } = gr
  const normalizedHost = host.replace(/^(https?:\/\/|wss?:\/\/)/, '')

  return `${normalizedHost}'${id}`
}

/**
 * Subscribes to relay groups metadata events and calls the provided event handler function
 * when an event is received.
 *
 * @param {Object} options - The options for subscribing to relay groups metadata events.
 * @param {AbstractSimplePool} options.pool - The pool to subscribe to.
 * @param {string} options.relayURL - The URL of the relay.
 * @param {Function} options.onError - The error handler function.
 * @param {Function} options.onEvent - The event handler function.
 * @param {Function} [options.onConnect] - The connect handler function.
 * @returns {Function} - A function to close the subscription
 */
export function subscribeRelayGroupsMetadataEvents({
  pool,
  relayURL,
  onError,
  onEvent,
  onConnect,
}: {
  pool: AbstractSimplePool
  relayURL: string
  onError: (err: Error) => void
  onEvent: (event: Event) => void
  onConnect?: () => void
}): () => void {
  let sub: Subscription

  const normalizedRelayURL = normalizeURL(relayURL)

  fetchRelayInformation(normalizedRelayURL)
    .then(async info => {
      const abstractedRelay = await pool.ensureRelay(normalizedRelayURL)

      onConnect?.()

      sub = abstractedRelay.prepareSubscription(
        [
          {
            kinds: [39000],
            limit: 50,
            authors: [info.pubkey],
          },
        ],
        {
          onevent(event: Event) {
            onEvent(event)
          },
        },
      )
    })
    .catch(err => {
      sub.close()

      onError(err)
    })

  return () => sub.close()
}
