import { NostrEvent, validateEvent } from './pure.ts'

/** Events are **regular**, which means they're all expected to be stored by relays. */
export function isRegularKind(kind: number): boolean {
  return (1000 <= kind && kind < 10000) || [1, 2, 4, 5, 6, 7, 8, 16, 40, 41, 42, 43, 44].includes(kind)
}

/** Events are **replaceable**, which means that, for each combination of `pubkey` and `kind`, only the latest event is expected to (SHOULD) be stored by relays, older versions are expected to be discarded. */
export function isReplaceableKind(kind: number): boolean {
  return [0, 3].includes(kind) || (10000 <= kind && kind < 20000)
}

/** Events are **ephemeral**, which means they are not expected to be stored by relays. */
export function isEphemeralKind(kind: number): boolean {
  return 20000 <= kind && kind < 30000
}

/** Events are **addressable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag, only the latest event is expected to be stored by relays, older versions are expected to be discarded. */
export function isAddressableKind(kind: number): boolean {
  return 30000 <= kind && kind < 40000
}

/** @deprecated use isAddressableKind instead */
export const isParameterizedReplaceableKind = isAddressableKind

/** Classification of the event kind. */
export type KindClassification = 'regular' | 'replaceable' | 'ephemeral' | 'parameterized' | 'unknown'

/** Determine the classification of this kind of event if known, or `unknown`. */
export function classifyKind(kind: number): KindClassification {
  if (isRegularKind(kind)) return 'regular'
  if (isReplaceableKind(kind)) return 'replaceable'
  if (isEphemeralKind(kind)) return 'ephemeral'
  if (isAddressableKind(kind)) return 'parameterized'
  return 'unknown'
}

export function isKind<T extends number>(event: unknown, kind: T | Array<T>): event is NostrEvent & { kind: T } {
  const kindAsArray: number[] = kind instanceof Array ? kind : [kind]
  return (validateEvent(event) && kindAsArray.includes(event.kind)) || false
}

export const Metadata = 0
export type Metadata = typeof Metadata
export const ShortTextNote = 1
export type ShortTextNote = typeof ShortTextNote
export const RecommendRelay = 2
export type RecommendRelay = typeof RecommendRelay
export const Contacts = 3
export type Contacts = typeof Contacts
export const EncryptedDirectMessage = 4
export type EncryptedDirectMessage = typeof EncryptedDirectMessage
export const EventDeletion = 5
export type EventDeletion = typeof EventDeletion
export const Repost = 6
export type Repost = typeof Repost
export const Reaction = 7
export type Reaction = typeof Reaction
export const BadgeAward = 8
export type BadgeAward = typeof BadgeAward
export const Seal = 13
export type Seal = typeof Seal
export const PrivateDirectMessage = 14
export type PrivateDirectMessage = typeof PrivateDirectMessage
export const GenericRepost = 16
export type GenericRepost = typeof GenericRepost
export const ChannelCreation = 40
export type ChannelCreation = typeof ChannelCreation
export const ChannelMetadata = 41
export type ChannelMetadata = typeof ChannelMetadata
export const ChannelMessage = 42
export type ChannelMessage = typeof ChannelMessage
export const ChannelHideMessage = 43
export type ChannelHideMessage = typeof ChannelHideMessage
export const ChannelMuteUser = 44
export type ChannelMuteUser = typeof ChannelMuteUser
export const OpenTimestamps = 1040
export type OpenTimestamps = typeof OpenTimestamps
export const GiftWrap = 1059
export type GiftWrap = typeof GiftWrap
export const FileMetadata = 1063
export type FileMetadata = typeof FileMetadata
export const LiveChatMessage = 1311
export type LiveChatMessage = typeof LiveChatMessage
export const ProblemTracker = 1971
export type ProblemTracker = typeof ProblemTracker
export const Report = 1984
export type Report = typeof Report
export const Reporting = 1984
export type Reporting = typeof Reporting
export const Label = 1985
export type Label = typeof Label
export const CommunityPostApproval = 4550
export type CommunityPostApproval = typeof CommunityPostApproval
export const JobRequest = 5999
export type JobRequest = typeof JobRequest
export const JobResult = 6999
export type JobResult = typeof JobResult
export const JobFeedback = 7000
export type JobFeedback = typeof JobFeedback
export const ZapGoal = 9041
export type ZapGoal = typeof ZapGoal
export const ZapRequest = 9734
export type ZapRequest = typeof ZapRequest
export const Zap = 9735
export type Zap = typeof Zap
export const Highlights = 9802
export type Highlights = typeof Highlights
export const Mutelist = 10000
export type Mutelist = typeof Mutelist
export const Pinlist = 10001
export type Pinlist = typeof Pinlist
export const RelayList = 10002
export type RelayList = typeof RelayList
export const BookmarkList = 10003
export type BookmarkList = typeof BookmarkList
export const CommunitiesList = 10004
export type CommunitiesList = typeof CommunitiesList
export const PublicChatsList = 10005
export type PublicChatsList = typeof PublicChatsList
export const BlockedRelaysList = 10006
export type BlockedRelaysList = typeof BlockedRelaysList
export const SearchRelaysList = 10007
export type SearchRelaysList = typeof SearchRelaysList
export const InterestsList = 10015
export type InterestsList = typeof InterestsList
export const UserEmojiList = 10030
export type UserEmojiList = typeof UserEmojiList
export const DirectMessageRelaysList = 10050
export type DirectMessageRelaysList = typeof DirectMessageRelaysList
export const FileServerPreference = 10096
export type FileServerPreference = typeof FileServerPreference
export const NWCWalletInfo = 13194
export type NWCWalletInfo = typeof NWCWalletInfo
export const LightningPubRPC = 21000
export type LightningPubRPC = typeof LightningPubRPC
export const ClientAuth = 22242
export type ClientAuth = typeof ClientAuth
export const NWCWalletRequest = 23194
export type NWCWalletRequest = typeof NWCWalletRequest
export const NWCWalletResponse = 23195
export type NWCWalletResponse = typeof NWCWalletResponse
export const NostrConnect = 24133
export type NostrConnect = typeof NostrConnect
export const HTTPAuth = 27235
export type HTTPAuth = typeof HTTPAuth
export const Followsets = 30000
export type Followsets = typeof Followsets
export const Genericlists = 30001
export type Genericlists = typeof Genericlists
export const Relaysets = 30002
export type Relaysets = typeof Relaysets
export const Bookmarksets = 30003
export type Bookmarksets = typeof Bookmarksets
export const Curationsets = 30004
export type Curationsets = typeof Curationsets
export const ProfileBadges = 30008
export type ProfileBadges = typeof ProfileBadges
export const BadgeDefinition = 30009
export type BadgeDefinition = typeof BadgeDefinition
export const Interestsets = 30015
export type Interestsets = typeof Interestsets
export const CreateOrUpdateStall = 30017
export type CreateOrUpdateStall = typeof CreateOrUpdateStall
export const CreateOrUpdateProduct = 30018
export type CreateOrUpdateProduct = typeof CreateOrUpdateProduct
export const LongFormArticle = 30023
export type LongFormArticle = typeof LongFormArticle
export const DraftLong = 30024
export type DraftLong = typeof DraftLong
export const Emojisets = 30030
export type Emojisets = typeof Emojisets
export const Application = 30078
export type Application = typeof Application
export const LiveEvent = 30311
export type LiveEvent = typeof LiveEvent
export const UserStatuses = 30315
export type UserStatuses = typeof UserStatuses
export const ClassifiedListing = 30402
export type ClassifiedListing = typeof ClassifiedListing
export const DraftClassifiedListing = 30403
export type DraftClassifiedListing = typeof DraftClassifiedListing
export const Date = 31922
export type Date = typeof Date
export const Time = 31923
export type Time = typeof Time
export const Calendar = 31924
export type Calendar = typeof Calendar
export const CalendarEventRSVP = 31925
export type CalendarEventRSVP = typeof CalendarEventRSVP
export const Handlerrecommendation = 31989
export type Handlerrecommendation = typeof Handlerrecommendation
export const Handlerinformation = 31990
export type Handlerinformation = typeof Handlerinformation
export const CommunityDefinition = 34550
export type CommunityDefinition = typeof CommunityDefinition
