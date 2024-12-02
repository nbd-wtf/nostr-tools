// core.ts
var verifiedSymbol = Symbol("verified");
var isRecord = (obj) => obj instanceof Object;
function validateEvent(event) {
  if (!isRecord(event))
    return false;
  if (typeof event.kind !== "number")
    return false;
  if (typeof event.content !== "string")
    return false;
  if (typeof event.created_at !== "number")
    return false;
  if (typeof event.pubkey !== "string")
    return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/))
    return false;
  if (!Array.isArray(event.tags))
    return false;
  for (let i = 0; i < event.tags.length; i++) {
    let tag = event.tags[i];
    if (!Array.isArray(tag))
      return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object")
        return false;
    }
  }
  return true;
}

// kinds.ts
function isRegularKind(kind) {
  return 1e3 <= kind && kind < 1e4 || [1, 2, 4, 5, 6, 7, 8, 16, 40, 41, 42, 43, 44].includes(kind);
}
function isReplaceableKind(kind) {
  return [0, 3].includes(kind) || 1e4 <= kind && kind < 2e4;
}
function isEphemeralKind(kind) {
  return 2e4 <= kind && kind < 3e4;
}
function isParameterizedReplaceableKind(kind) {
  return 3e4 <= kind && kind < 4e4;
}
function classifyKind(kind) {
  if (isRegularKind(kind))
    return "regular";
  if (isReplaceableKind(kind))
    return "replaceable";
  if (isEphemeralKind(kind))
    return "ephemeral";
  if (isParameterizedReplaceableKind(kind))
    return "parameterized";
  return "unknown";
}
function isKind(event, kind) {
  const kindAsArray = kind instanceof Array ? kind : [kind];
  return validateEvent(event) && kindAsArray.includes(event.kind) || false;
}
var Metadata = 0;
var ShortTextNote = 1;
var RecommendRelay = 2;
var Contacts = 3;
var EncryptedDirectMessage = 4;
var EventDeletion = 5;
var Repost = 6;
var Reaction = 7;
var BadgeAward = 8;
var Seal = 13;
var PrivateDirectMessage = 14;
var GenericRepost = 16;
var ChannelCreation = 40;
var ChannelMetadata = 41;
var ChannelMessage = 42;
var ChannelHideMessage = 43;
var ChannelMuteUser = 44;
var OpenTimestamps = 1040;
var GiftWrap = 1059;
var FileMetadata = 1063;
var LiveChatMessage = 1311;
var ProblemTracker = 1971;
var Report = 1984;
var Reporting = 1984;
var Label = 1985;
var CommunityPostApproval = 4550;
var JobRequest = 5999;
var JobResult = 6999;
var JobFeedback = 7e3;
var ZapGoal = 9041;
var ZapRequest = 9734;
var Zap = 9735;
var Highlights = 9802;
var Mutelist = 1e4;
var Pinlist = 10001;
var RelayList = 10002;
var BookmarkList = 10003;
var CommunitiesList = 10004;
var PublicChatsList = 10005;
var BlockedRelaysList = 10006;
var SearchRelaysList = 10007;
var InterestsList = 10015;
var UserEmojiList = 10030;
var DirectMessageRelaysList = 10050;
var FileServerPreference = 10096;
var NWCWalletInfo = 13194;
var LightningPubRPC = 21e3;
var ClientAuth = 22242;
var NWCWalletRequest = 23194;
var NWCWalletResponse = 23195;
var NostrConnect = 24133;
var HTTPAuth = 27235;
var Followsets = 3e4;
var Genericlists = 30001;
var Relaysets = 30002;
var Bookmarksets = 30003;
var Curationsets = 30004;
var ProfileBadges = 30008;
var BadgeDefinition = 30009;
var Interestsets = 30015;
var CreateOrUpdateStall = 30017;
var CreateOrUpdateProduct = 30018;
var LongFormArticle = 30023;
var DraftLong = 30024;
var Emojisets = 30030;
var Application = 30078;
var LiveEvent = 30311;
var UserStatuses = 30315;
var ClassifiedListing = 30402;
var DraftClassifiedListing = 30403;
var Date = 31922;
var Time = 31923;
var Calendar = 31924;
var CalendarEventRSVP = 31925;
var Handlerrecommendation = 31989;
var Handlerinformation = 31990;
var CommunityDefinition = 34550;
export {
  Application,
  BadgeAward,
  BadgeDefinition,
  BlockedRelaysList,
  BookmarkList,
  Bookmarksets,
  Calendar,
  CalendarEventRSVP,
  ChannelCreation,
  ChannelHideMessage,
  ChannelMessage,
  ChannelMetadata,
  ChannelMuteUser,
  ClassifiedListing,
  ClientAuth,
  CommunitiesList,
  CommunityDefinition,
  CommunityPostApproval,
  Contacts,
  CreateOrUpdateProduct,
  CreateOrUpdateStall,
  Curationsets,
  Date,
  DirectMessageRelaysList,
  DraftClassifiedListing,
  DraftLong,
  Emojisets,
  EncryptedDirectMessage,
  EventDeletion,
  FileMetadata,
  FileServerPreference,
  Followsets,
  GenericRepost,
  Genericlists,
  GiftWrap,
  HTTPAuth,
  Handlerinformation,
  Handlerrecommendation,
  Highlights,
  InterestsList,
  Interestsets,
  JobFeedback,
  JobRequest,
  JobResult,
  Label,
  LightningPubRPC,
  LiveChatMessage,
  LiveEvent,
  LongFormArticle,
  Metadata,
  Mutelist,
  NWCWalletInfo,
  NWCWalletRequest,
  NWCWalletResponse,
  NostrConnect,
  OpenTimestamps,
  Pinlist,
  PrivateDirectMessage,
  ProblemTracker,
  ProfileBadges,
  PublicChatsList,
  Reaction,
  RecommendRelay,
  RelayList,
  Relaysets,
  Report,
  Reporting,
  Repost,
  Seal,
  SearchRelaysList,
  ShortTextNote,
  Time,
  UserEmojiList,
  UserStatuses,
  Zap,
  ZapGoal,
  ZapRequest,
  classifyKind,
  isEphemeralKind,
  isKind,
  isParameterizedReplaceableKind,
  isRegularKind,
  isReplaceableKind
};
