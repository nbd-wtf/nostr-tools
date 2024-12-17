import { AbstractSimplePool } from './abstract-pool.ts'
import { Subscription } from './abstract-relay.ts'
import type { Event, EventTemplate } from './core.ts'
import { fetchRelayInformation, RelayInformation } from './nip11.ts'
import { AddressPointer, decode } from './nip19.ts'
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
  about?: string
  isPublic?: boolean
  isOpen?: boolean
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
}

/**
 * Generates a group metadata event template.
 *
 * @param group - The group object.
 * @returns An event template with the generated group metadata that can be signed later.
 */
export function generateGroupMetadataEventTemplate(group: Group): EventTemplate {
  const tags: string[][] = [['d', group.metadata.id]]
  group.metadata.name && tags.push(['name', group.metadata.name])
  group.metadata.picture && tags.push(['picture', group.metadata.picture])
  group.metadata.about && tags.push(['about', group.metadata.about])
  group.metadata.isPublic && tags.push(['public'])
  group.metadata.isOpen && tags.push(['open'])

  return {
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    kind: 39000,
    tags,
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
      case 'about':
        metadata.about = value
        break
      case 'public':
        metadata.isPublic = true
        break
      case 'open':
        metadata.isOpen = true
        break
    }
  }

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
  if (code.startsWith('naddr1')) {
    try {
      let { data } = decode(code)

      let { relays, identifier } = data as AddressPointer
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
