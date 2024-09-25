import { AbstractSimplePool } from './abstract-pool.ts';
import type { Event, EventTemplate } from './core.ts';
import { RelayInformation } from './nip11.ts';
/**
 * Represents a NIP29 group.
 */
export type Group = {
    relay: string;
    metadata: GroupMetadata;
    admins?: GroupAdmin[];
    members?: GroupMember[];
    reference: GroupReference;
};
/**
 * Represents the metadata for a NIP29 group.
 */
export type GroupMetadata = {
    id: string;
    pubkey: string;
    name?: string;
    picture?: string;
    about?: string;
    isPublic?: boolean;
    isOpen?: boolean;
};
/**
 * Represents a NIP29 group reference.
 */
export type GroupReference = {
    id: string;
    host: string;
};
/**
 * Represents a NIP29 group member.
 */
export type GroupMember = {
    pubkey: string;
    label?: string;
};
/**
 * Represents a NIP29 group admin.
 */
export type GroupAdmin = {
    pubkey: string;
    label?: string;
    permissions: GroupAdminPermission[];
};
/**
 * Represents the permissions that a NIP29 group admin can have.
 */
export declare enum GroupAdminPermission {
    AddUser = "add-user",
    EditMetadata = "edit-metadata",
    DeleteEvent = "delete-event",
    RemoveUser = "remove-user",
    AddPermission = "add-permission",
    RemovePermission = "remove-permission",
    EditGroupStatus = "edit-group-status"
}
/**
 * Generates a group metadata event template.
 *
 * @param group - The group object.
 * @returns An event template with the generated group metadata that can be signed later.
 */
export declare function generateGroupMetadataEventTemplate(group: Group): EventTemplate;
/**
 * Validates a group metadata event.
 *
 * @param event - The event to validate.
 * @returns A boolean indicating whether the event is valid.
 */
export declare function validateGroupMetadataEvent(event: Event): boolean;
/**
 * Generates an event template for group admins.
 *
 * @param group - The group object.
 * @param admins - An array of group admins.
 * @returns The generated event template with the group admins that can be signed later.
 */
export declare function generateGroupAdminsEventTemplate(group: Group, admins: GroupAdmin[]): EventTemplate;
/**
 * Validates a group admins event.
 *
 * @param event - The event to validate.
 * @returns True if the event is valid, false otherwise.
 */
export declare function validateGroupAdminsEvent(event: Event): boolean;
/**
 * Generates an event template for a group with its members.
 *
 * @param group - The group object.
 * @param members - An array of group members.
 * @returns The generated event template with the group members that can be signed later.
 */
export declare function generateGroupMembersEventTemplate(group: Group, members: GroupMember[]): EventTemplate;
/**
 * Validates a group members event.
 *
 * @param event - The event to validate.
 * @returns Returns `true` if the event is a valid group members event, `false` otherwise.
 */
export declare function validateGroupMembersEvent(event: Event): boolean;
/**
 * Returns the normalized relay URL based on the provided group reference.
 *
 * @param groupReference - The group reference object containing the host.
 * @returns The normalized relay URL.
 */
export declare function getNormalizedRelayURLByGroupReference(groupReference: GroupReference): string;
/**
 * Fetches relay information by group reference.
 *
 * @param groupReference The group reference.
 * @returns A promise that resolves to the relay information.
 */
export declare function fetchRelayInformationByGroupReference(groupReference: GroupReference): Promise<RelayInformation>;
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
export declare function fetchGroupMetadataEvent({ pool, groupReference, relayInformation, normalizedRelayURL, }: {
    pool: AbstractSimplePool;
    groupReference: GroupReference;
    normalizedRelayURL?: string;
    relayInformation?: RelayInformation;
}): Promise<Event>;
/**
 * Parses a group metadata event and returns the corresponding GroupMetadata object.
 *
 * @param event - The event to parse.
 * @returns The parsed GroupMetadata object.
 * @throws An error if the group metadata event is invalid.
 */
export declare function parseGroupMetadataEvent(event: Event): GroupMetadata;
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
export declare function fetchGroupAdminsEvent({ pool, groupReference, relayInformation, normalizedRelayURL, }: {
    pool: AbstractSimplePool;
    groupReference: GroupReference;
    normalizedRelayURL?: string;
    relayInformation?: RelayInformation;
}): Promise<Event>;
/**
 * Parses a group admins event and returns an array of GroupAdmin objects.
 *
 * @param event - The event to parse.
 * @returns An array of GroupAdmin objects.
 * @throws Throws an error if the group admins event is invalid.
 */
export declare function parseGroupAdminsEvent(event: Event): GroupAdmin[];
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
export declare function fetchGroupMembersEvent({ pool, groupReference, relayInformation, normalizedRelayURL, }: {
    pool: AbstractSimplePool;
    groupReference: GroupReference;
    normalizedRelayURL?: string;
    relayInformation?: RelayInformation;
}): Promise<Event>;
/**
 * Parses a group members event and returns an array of GroupMember objects.
 * @param event - The event to parse.
 * @returns An array of GroupMember objects.
 * @throws Throws an error if the group members event is invalid.
 */
export declare function parseGroupMembersEvent(event: Event): GroupMember[];
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
export declare function loadGroup({ pool, groupReference, normalizedRelayURL, relayInformation, }: {
    pool: AbstractSimplePool;
    groupReference: GroupReference;
    normalizedRelayURL?: string;
    relayInformation?: RelayInformation;
}): Promise<Group>;
/**
 * Loads a group from the specified pool using the provided group code.
 *
 * @param {AbstractSimplePool} pool - The pool to load the group from.
 * @param {string} code - The code representing the group.
 * @returns {Promise<Group>} - A promise that resolves to the loaded group.
 * @throws {Error} - If the group code is invalid.
 */
export declare function loadGroupFromCode(pool: AbstractSimplePool, code: string): Promise<Group>;
/**
 * Parses a group code and returns a GroupReference object.
 *
 * @param code The group code to parse.
 * @returns A GroupReference object if the code is valid, otherwise null.
 */
export declare function parseGroupCode(code: string): null | GroupReference;
/**
 * Encodes a group reference into a string.
 *
 * @param gr - The group reference to encode.
 * @returns The encoded group reference as a string.
 */
export declare function encodeGroupReference(gr: GroupReference): string;
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
export declare function subscribeRelayGroupsMetadataEvents({ pool, relayURL, onError, onEvent, onConnect, }: {
    pool: AbstractSimplePool;
    relayURL: string;
    onError: (err: Error) => void;
    onEvent: (event: Event) => void;
    onConnect?: () => void;
}): () => void;
