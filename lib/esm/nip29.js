// nip11.ts
var _fetch;
try {
  _fetch = fetch;
} catch {
}
async function fetchRelayInformation(url) {
  return await (await fetch(url.replace("ws://", "http://").replace("wss://", "https://"), {
    headers: { Accept: "application/nostr+json" }
  })).json();
}

// nip19.ts
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();
function normalizeURL(url) {
  if (url.indexOf("://") === -1)
    url = "wss://" + url;
  let p = new URL(url);
  p.pathname = p.pathname.replace(/\/+/g, "/");
  if (p.pathname.endsWith("/"))
    p.pathname = p.pathname.slice(0, -1);
  if (p.port === "80" && p.protocol === "ws:" || p.port === "443" && p.protocol === "wss:")
    p.port = "";
  p.searchParams.sort();
  p.hash = "";
  return p.toString();
}

// nip19.ts
var Bech32MaxSize = 5e3;
function decode(nip19) {
  let { prefix, words } = bech32.decode(nip19, Bech32MaxSize);
  let data = new Uint8Array(bech32.fromWords(words));
  switch (prefix) {
    case "nprofile": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nprofile");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      return {
        type: "nprofile",
        data: {
          pubkey: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nevent": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nevent");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (tlv[2] && tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      if (tlv[3] && tlv[3][0].length !== 4)
        throw new Error("TLV 3 should be 4 bytes");
      return {
        type: "nevent",
        data: {
          id: bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0] ? bytesToHex(tlv[2][0]) : void 0,
          kind: tlv[3]?.[0] ? parseInt(bytesToHex(tlv[3][0]), 16) : void 0
        }
      };
    }
    case "naddr": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for naddr");
      if (!tlv[2]?.[0])
        throw new Error("missing TLV 2 for naddr");
      if (tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      if (!tlv[3]?.[0])
        throw new Error("missing TLV 3 for naddr");
      if (tlv[3][0].length !== 4)
        throw new Error("TLV 3 should be 4 bytes");
      return {
        type: "naddr",
        data: {
          identifier: utf8Decoder.decode(tlv[0][0]),
          pubkey: bytesToHex(tlv[2][0]),
          kind: parseInt(bytesToHex(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nsec":
      return { type: prefix, data };
    case "npub":
    case "note":
      return { type: prefix, data: bytesToHex(data) };
    case "noffer": {
      const tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for noffer");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (!tlv[1]?.[0])
        throw new Error("missing TLV 1 for noffer");
      if (!tlv[2]?.[0])
        throw new Error("missing TLV 2 for noffer");
      if (!tlv[3]?.[0])
        throw new Error("missing TLV 3 for noffer");
      return {
        type: "noffer",
        data: {
          pubkey: bytesToHex(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          offer: utf8Decoder.decode(tlv[2][0]),
          priceType: tlv[3][0][0],
          price: tlv[4] ? parseInt(bytesToHex(tlv[4][0]), 16) : void 0
        }
      };
    }
    case "ndebit": {
      const tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for ndebit");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (!tlv[1]?.[0])
        throw new Error("missing TLV 1 for ndebit");
      return {
        type: "ndebit",
        data: {
          pubkey: bytesToHex(tlv[0][0]),
          relay: utf8Decoder.decode(tlv[1][0]),
          pointerId: tlv[2] ? utf8Decoder.decode(tlv[2][0]) : void 0
        }
      };
    }
    default:
      throw new Error(`unknown prefix ${prefix}`);
  }
}
function parseTLV(data) {
  let result = {};
  let rest = data;
  while (rest.length > 0) {
    let t = rest[0];
    let l = rest[1];
    let v = rest.slice(2, 2 + l);
    rest = rest.slice(2 + l);
    if (v.length < l)
      throw new Error(`not enough data to read on TLV ${t}`);
    result[t] = result[t] || [];
    result[t].push(v);
  }
  return result;
}

// nip29.ts
var GroupAdminPermission = /* @__PURE__ */ ((GroupAdminPermission2) => {
  GroupAdminPermission2["AddUser"] = "add-user";
  GroupAdminPermission2["EditMetadata"] = "edit-metadata";
  GroupAdminPermission2["DeleteEvent"] = "delete-event";
  GroupAdminPermission2["RemoveUser"] = "remove-user";
  GroupAdminPermission2["AddPermission"] = "add-permission";
  GroupAdminPermission2["RemovePermission"] = "remove-permission";
  GroupAdminPermission2["EditGroupStatus"] = "edit-group-status";
  return GroupAdminPermission2;
})(GroupAdminPermission || {});
function generateGroupMetadataEventTemplate(group) {
  const tags = [["d", group.metadata.id]];
  group.metadata.name && tags.push(["name", group.metadata.name]);
  group.metadata.picture && tags.push(["picture", group.metadata.picture]);
  group.metadata.about && tags.push(["about", group.metadata.about]);
  group.metadata.isPublic && tags.push(["public"]);
  group.metadata.isOpen && tags.push(["open"]);
  return {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: 39e3,
    tags
  };
}
function validateGroupMetadataEvent(event) {
  if (event.kind !== 39e3)
    return false;
  if (!event.pubkey)
    return false;
  const requiredTags = ["d"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
function generateGroupAdminsEventTemplate(group, admins) {
  const tags = [["d", group.metadata.id]];
  for (const admin of admins) {
    tags.push(["p", admin.pubkey, admin.label || "", ...admin.permissions]);
  }
  return {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: 39001,
    tags
  };
}
function validateGroupAdminsEvent(event) {
  if (event.kind !== 39001)
    return false;
  const requiredTags = ["d"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  for (const [tag, _value, _label, ...permissions] of event.tags) {
    if (tag !== "p")
      continue;
    for (let i = 0; i < permissions.length; i += 1) {
      if (typeof permissions[i] !== "string")
        return false;
      if (!Object.values(GroupAdminPermission).includes(permissions[i]))
        return false;
    }
  }
  return true;
}
function generateGroupMembersEventTemplate(group, members) {
  const tags = [["d", group.metadata.id]];
  for (const member of members) {
    tags.push(["p", member.pubkey, member.label || ""]);
  }
  return {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: 39002,
    tags
  };
}
function validateGroupMembersEvent(event) {
  if (event.kind !== 39002)
    return false;
  const requiredTags = ["d"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
function getNormalizedRelayURLByGroupReference(groupReference) {
  return normalizeURL(groupReference.host);
}
async function fetchRelayInformationByGroupReference(groupReference) {
  const normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference);
  return fetchRelayInformation(normalizedRelayURL);
}
async function fetchGroupMetadataEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL
}) {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference);
  }
  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL);
  }
  const groupMetadataEvent = await pool.get([normalizedRelayURL], {
    kinds: [39e3],
    authors: [relayInformation.pubkey],
    "#d": [groupReference.id]
  });
  if (!groupMetadataEvent)
    throw new Error(`group '${groupReference.id}' not found on ${normalizedRelayURL}`);
  return groupMetadataEvent;
}
function parseGroupMetadataEvent(event) {
  if (!validateGroupMetadataEvent(event))
    throw new Error("invalid group metadata event");
  const metadata = {
    id: "",
    pubkey: event.pubkey
  };
  for (const [tag, value] of event.tags) {
    switch (tag) {
      case "d":
        metadata.id = value;
        break;
      case "name":
        metadata.name = value;
        break;
      case "picture":
        metadata.picture = value;
        break;
      case "about":
        metadata.about = value;
        break;
      case "public":
        metadata.isPublic = true;
        break;
      case "open":
        metadata.isOpen = true;
        break;
    }
  }
  return metadata;
}
async function fetchGroupAdminsEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL
}) {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference);
  }
  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL);
  }
  const groupAdminsEvent = await pool.get([normalizedRelayURL], {
    kinds: [39001],
    authors: [relayInformation.pubkey],
    "#d": [groupReference.id]
  });
  if (!groupAdminsEvent)
    throw new Error(`admins for group '${groupReference.id}' not found on ${normalizedRelayURL}`);
  return groupAdminsEvent;
}
function parseGroupAdminsEvent(event) {
  if (!validateGroupAdminsEvent(event))
    throw new Error("invalid group admins event");
  const admins = [];
  for (const [tag, value, label, ...permissions] of event.tags) {
    if (tag !== "p")
      continue;
    admins.push({
      pubkey: value,
      label,
      permissions
    });
  }
  return admins;
}
async function fetchGroupMembersEvent({
  pool,
  groupReference,
  relayInformation,
  normalizedRelayURL
}) {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference);
  }
  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL);
  }
  const groupMembersEvent = await pool.get([normalizedRelayURL], {
    kinds: [39002],
    authors: [relayInformation.pubkey],
    "#d": [groupReference.id]
  });
  if (!groupMembersEvent)
    throw new Error(`members for group '${groupReference.id}' not found on ${normalizedRelayURL}`);
  return groupMembersEvent;
}
function parseGroupMembersEvent(event) {
  if (!validateGroupMembersEvent(event))
    throw new Error("invalid group members event");
  const members = [];
  for (const [tag, value, label] of event.tags) {
    if (tag !== "p")
      continue;
    members.push({
      pubkey: value,
      label
    });
  }
  return members;
}
async function loadGroup({
  pool,
  groupReference,
  normalizedRelayURL,
  relayInformation
}) {
  if (!normalizedRelayURL) {
    normalizedRelayURL = getNormalizedRelayURLByGroupReference(groupReference);
  }
  if (!relayInformation) {
    relayInformation = await fetchRelayInformation(normalizedRelayURL);
  }
  const metadataEvent = await fetchGroupMetadataEvent({ pool, groupReference, normalizedRelayURL, relayInformation });
  const metadata = parseGroupMetadataEvent(metadataEvent);
  const adminsEvent = await fetchGroupAdminsEvent({ pool, groupReference, normalizedRelayURL, relayInformation });
  const admins = parseGroupAdminsEvent(adminsEvent);
  const membersEvent = await fetchGroupMembersEvent({ pool, groupReference, normalizedRelayURL, relayInformation });
  const members = parseGroupMembersEvent(membersEvent);
  const group = {
    relay: normalizedRelayURL,
    metadata,
    admins,
    members,
    reference: groupReference
  };
  return group;
}
async function loadGroupFromCode(pool, code) {
  const groupReference = parseGroupCode(code);
  if (!groupReference)
    throw new Error("invalid group code");
  return loadGroup({ pool, groupReference });
}
function parseGroupCode(code) {
  if (code.startsWith("naddr1")) {
    try {
      let { data } = decode(code);
      let { relays, identifier } = data;
      if (!relays || relays.length === 0)
        return null;
      let host = relays[0];
      if (host.startsWith("wss://")) {
        host = host.slice(6);
      }
      return { host, id: identifier };
    } catch (err) {
      return null;
    }
  } else if (code.split("'").length === 2) {
    let spl = code.split("'");
    return { host: spl[0], id: spl[1] };
  }
  return null;
}
function encodeGroupReference(gr) {
  const { host, id } = gr;
  const normalizedHost = host.replace(/^(https?:\/\/|wss?:\/\/)/, "");
  return `${normalizedHost}'${id}`;
}
function subscribeRelayGroupsMetadataEvents({
  pool,
  relayURL,
  onError,
  onEvent,
  onConnect
}) {
  let sub;
  const normalizedRelayURL = normalizeURL(relayURL);
  fetchRelayInformation(normalizedRelayURL).then(async (info) => {
    const abstractedRelay = await pool.ensureRelay(normalizedRelayURL);
    onConnect?.();
    sub = abstractedRelay.prepareSubscription(
      [
        {
          kinds: [39e3],
          limit: 50,
          authors: [info.pubkey]
        }
      ],
      {
        onevent(event) {
          onEvent(event);
        }
      }
    );
  }).catch((err) => {
    sub.close();
    onError(err);
  });
  return () => sub.close();
}
export {
  GroupAdminPermission,
  encodeGroupReference,
  fetchGroupAdminsEvent,
  fetchGroupMembersEvent,
  fetchGroupMetadataEvent,
  fetchRelayInformationByGroupReference,
  generateGroupAdminsEventTemplate,
  generateGroupMembersEventTemplate,
  generateGroupMetadataEventTemplate,
  getNormalizedRelayURLByGroupReference,
  loadGroup,
  loadGroupFromCode,
  parseGroupAdminsEvent,
  parseGroupCode,
  parseGroupMembersEvent,
  parseGroupMetadataEvent,
  subscribeRelayGroupsMetadataEvents,
  validateGroupAdminsEvent,
  validateGroupMembersEvent,
  validateGroupMetadataEvent
};
