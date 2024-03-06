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

/** Events are **parameterized replaceable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag, only the latest event is expected to be stored by relays, older versions are expected to be discarded. */
export function isParameterizedReplaceableKind(kind: number): boolean {
  return 30000 <= kind && kind < 40000
}

/** Classification of the event kind. */
export type KindClassification = 'regular' | 'replaceable' | 'ephemeral' | 'parameterized' | 'unknown'

/** Determine the classification of this kind of event if known, or `unknown`. */
export function classifyKind(kind: number): KindClassification {
  if (isRegularKind(kind)) return 'regular'
  if (isReplaceableKind(kind)) return 'replaceable'
  if (isEphemeralKind(kind)) return 'ephemeral'
  if (isParameterizedReplaceableKind(kind)) return 'parameterized'
  return 'unknown'
}

export const Metadata = 0
export const ShortTextNote = 1
export const RecommendRelay = 2
export const Contacts = 3
export const EncryptedDirectMessage = 4
export const EncryptedDirectMessages = 4
export const EventDeletion = 5
export const Repost = 6
export const Reaction = 7
export const BadgeAward = 8
export const GenericRepost = 16
export const ChannelCreation = 40
export const ChannelMetadata = 41
export const ChannelMessage = 42
export const ChannelHideMessage = 43
export const ChannelMuteUser = 44
export const OpenTimestamps = 1040
export const FileMetadata = 1063
export const LiveChatMessage = 1311
export const ProblemTracker = 1971
export const Report = 1984
export const Reporting = 1984
export const Label = 1985
export const CommunityPostApproval = 4550
export const JobRequest = 5999
export const JobResult = 6999
export const JobFeedback = 7000
export const ZapGoal = 9041
export const ZapRequest = 9734
export const Zap = 9735
export const Highlights = 9802
export const Mutelist = 10000
export const Pinlist = 10001
export const RelayList = 10002
export const BookmarkList = 10003
export const CommunitiesList = 10004
export const PublicChatsList = 10005
export const BlockedRelaysList = 10006
export const SearchRelaysList = 10007
export const InterestsList = 10015
export const UserEmojiList = 10030
export const FileServerPreference = 10096
export const NWCWalletInfo = 13194
export const LightningPubRPC = 21000
export const ClientAuth = 22242
export const NWCWalletRequest = 23194
export const NWCWalletResponse = 23195
export const NostrConnect = 24133
export const HTTPAuth = 27235
export const Followsets = 30000
export const Genericlists = 30001
export const Relaysets = 30002
export const Bookmarksets = 30003
export const Curationsets = 30004
export const ProfileBadges = 30008
export const BadgeDefinition = 30009
export const Interestsets = 30015
export const CreateOrUpdateStall = 30017
export const CreateOrUpdateProduct = 30018
export const LongFormArticle = 30023
export const DraftLong = 30024
export const Emojisets = 30030
export const Application = 30078
export const LiveEvent = 30311
export const UserStatuses = 30315
export const ClassifiedListing = 30402
export const DraftClassifiedListing = 30403
export const Date = 31922
export const Time = 31923
export const Calendar = 31924
export const CalendarEventRSVP = 31925
export const Handlerrecommendation = 31989
export const Handlerinformation = 31990
export const CommunityDefinition = 34550
