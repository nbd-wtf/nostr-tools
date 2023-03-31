var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// keys.ts
import * as secp256k1 from "@noble/secp256k1";
function generatePrivateKey() {
  return secp256k1.utils.bytesToHex(secp256k1.utils.randomPrivateKey());
}
function getPublicKey(privateKey) {
  return secp256k1.utils.bytesToHex(secp256k1.schnorr.getPublicKey(privateKey));
}

// event.ts
import * as secp256k12 from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

// utils.ts
var utils_exports = {};
__export(utils_exports, {
  insertEventIntoAscendingList: () => insertEventIntoAscendingList,
  insertEventIntoDescendingList: () => insertEventIntoDescendingList,
  normalizeURL: () => normalizeURL,
  utf8Decoder: () => utf8Decoder,
  utf8Encoder: () => utf8Encoder
});
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();
function normalizeURL(url) {
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
function insertEventIntoDescendingList(sortedArray, event) {
  let start = 0;
  let end = sortedArray.length - 1;
  let midPoint;
  let position = start;
  if (end < 0) {
    position = 0;
  } else if (event.created_at < sortedArray[end].created_at) {
    position = end + 1;
  } else if (event.created_at >= sortedArray[start].created_at) {
    position = start;
  } else
    while (true) {
      if (end <= start + 1) {
        position = end;
        break;
      }
      midPoint = Math.floor(start + (end - start) / 2);
      if (sortedArray[midPoint].created_at > event.created_at) {
        start = midPoint;
      } else if (sortedArray[midPoint].created_at < event.created_at) {
        end = midPoint;
      } else {
        position = midPoint;
        break;
      }
    }
  if (sortedArray[position]?.id !== event.id) {
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ];
  }
  return sortedArray;
}
function insertEventIntoAscendingList(sortedArray, event) {
  let start = 0;
  let end = sortedArray.length - 1;
  let midPoint;
  let position = start;
  if (end < 0) {
    position = 0;
  } else if (event.created_at > sortedArray[end].created_at) {
    position = end + 1;
  } else if (event.created_at <= sortedArray[start].created_at) {
    position = start;
  } else
    while (true) {
      if (end <= start + 1) {
        position = end;
        break;
      }
      midPoint = Math.floor(start + (end - start) / 2);
      if (sortedArray[midPoint].created_at < event.created_at) {
        start = midPoint;
      } else if (sortedArray[midPoint].created_at > event.created_at) {
        end = midPoint;
      } else {
        position = midPoint;
        break;
      }
    }
  if (sortedArray[position]?.id !== event.id) {
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ];
  }
  return sortedArray;
}

// event.ts
var Kind = /* @__PURE__ */ ((Kind2) => {
  Kind2[Kind2["Metadata"] = 0] = "Metadata";
  Kind2[Kind2["Text"] = 1] = "Text";
  Kind2[Kind2["RecommendRelay"] = 2] = "RecommendRelay";
  Kind2[Kind2["Contacts"] = 3] = "Contacts";
  Kind2[Kind2["EncryptedDirectMessage"] = 4] = "EncryptedDirectMessage";
  Kind2[Kind2["EventDeletion"] = 5] = "EventDeletion";
  Kind2[Kind2["Reaction"] = 7] = "Reaction";
  Kind2[Kind2["ChannelCreation"] = 40] = "ChannelCreation";
  Kind2[Kind2["ChannelMetadata"] = 41] = "ChannelMetadata";
  Kind2[Kind2["ChannelMessage"] = 42] = "ChannelMessage";
  Kind2[Kind2["ChannelHideMessage"] = 43] = "ChannelHideMessage";
  Kind2[Kind2["ChannelMuteUser"] = 44] = "ChannelMuteUser";
  Kind2[Kind2["Report"] = 1984] = "Report";
  Kind2[Kind2["ZapRequest"] = 9734] = "ZapRequest";
  Kind2[Kind2["Zap"] = 9735] = "Zap";
  Kind2[Kind2["RelayList"] = 10002] = "RelayList";
  Kind2[Kind2["ClientAuth"] = 22242] = "ClientAuth";
  Kind2[Kind2["Article"] = 30023] = "Article";
  return Kind2;
})(Kind || {});
function getBlankEvent() {
  return {
    kind: 255,
    content: "",
    tags: [],
    created_at: 0
  };
}
function finishEvent(t, privateKey) {
  let event = t;
  event.pubkey = getPublicKey(privateKey);
  event.id = getEventHash(event);
  event.sig = signEvent(event, privateKey);
  return event;
}
function serializeEvent(evt) {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content
  ]);
}
function getEventHash(event) {
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
  return secp256k12.utils.bytesToHex(eventHash);
}
function validateEvent(event) {
  if (typeof event !== "object")
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
function verifySignature(event) {
  return secp256k12.schnorr.verifySync(
    event.sig,
    getEventHash(event),
    event.pubkey
  );
}
function signEvent(event, key) {
  return secp256k12.utils.bytesToHex(
    secp256k12.schnorr.signSync(getEventHash(event), key)
  );
}

// filter.ts
function matchFilter(filter, event) {
  if (filter.ids && filter.ids.indexOf(event.id) === -1)
    return false;
  if (filter.kinds && filter.kinds.indexOf(event.kind) === -1)
    return false;
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1)
    return false;
  for (let f in filter) {
    if (f[0] === "#") {
      let tagName = f.slice(1);
      let values = filter[`#${tagName}`];
      if (values && !event.tags.find(
        ([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1
      ))
        return false;
    }
  }
  if (filter.since && event.created_at < filter.since)
    return false;
  if (filter.until && event.created_at >= filter.until)
    return false;
  return true;
}
function matchFilters(filters, event) {
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event))
      return true;
  }
  return false;
}

// fakejson.ts
var fakejson_exports = {};
__export(fakejson_exports, {
  getHex64: () => getHex64,
  getInt: () => getInt,
  getSubscriptionId: () => getSubscriptionId,
  matchEventId: () => matchEventId,
  matchEventKind: () => matchEventKind,
  matchEventPubkey: () => matchEventPubkey
});
function getHex64(json, field) {
  let len = field.length + 3;
  let idx = json.indexOf(`"${field}":`) + len;
  let s = json.slice(idx).indexOf(`"`) + idx + 1;
  return json.slice(s, s + 64);
}
function getInt(json, field) {
  let len = field.length;
  let idx = json.indexOf(`"${field}":`) + len + 3;
  let sliced = json.slice(idx);
  let end = Math.min(sliced.indexOf(","), sliced.indexOf("}"));
  return parseInt(sliced.slice(0, end), 10);
}
function getSubscriptionId(json) {
  let idx = json.slice(0, 22).indexOf(`"EVENT"`);
  if (idx === -1)
    return null;
  let pstart = json.slice(idx + 7 + 1).indexOf(`"`);
  if (pstart === -1)
    return null;
  let start = idx + 7 + 1 + pstart;
  let pend = json.slice(start + 1, 80).indexOf(`"`);
  if (pend === -1)
    return null;
  let end = start + 1 + pend;
  return json.slice(start + 1, end);
}
function matchEventId(json, id) {
  return id === getHex64(json, "id");
}
function matchEventPubkey(json, pubkey) {
  return pubkey === getHex64(json, "pubkey");
}
function matchEventKind(json, kind) {
  return kind === getInt(json, "kind");
}

// relay.ts
function relayInit(url, options = {}) {
  let { listTimeout = 3e3, getTimeout = 3e3 } = options;
  var ws;
  var openSubs = {};
  var listeners = {
    connect: [],
    disconnect: [],
    error: [],
    notice: []
  };
  var subListeners = {};
  var pubListeners = {};
  async function connectRelay() {
    return new Promise((resolve, reject) => {
      try {
        ws = new WebSocket(url);
      } catch (err) {
        reject(err);
      }
      ws.onopen = () => {
        listeners.connect.forEach((cb) => cb());
        resolve();
      };
      ws.onerror = () => {
        listeners.error.forEach((cb) => cb());
        reject();
      };
      ws.onclose = async () => {
        listeners.disconnect.forEach((cb) => cb());
      };
      let incomingMessageQueue = [];
      let handleNextInterval;
      ws.onmessage = (e) => {
        incomingMessageQueue.push(e.data);
        if (!handleNextInterval) {
          handleNextInterval = setInterval(handleNext, 0);
        }
      };
      function handleNext() {
        if (incomingMessageQueue.length === 0) {
          clearInterval(handleNextInterval);
          handleNextInterval = null;
          return;
        }
        var json = incomingMessageQueue.shift();
        if (!json)
          return;
        let subid = getSubscriptionId(json);
        if (subid) {
          let so = openSubs[subid];
          if (so && so.alreadyHaveEvent && so.alreadyHaveEvent(getHex64(json, "id"), url)) {
            return;
          }
        }
        try {
          let data = JSON.parse(json);
          switch (data[0]) {
            case "EVENT":
              let id = data[1];
              let event = data[2];
              if (validateEvent(event) && openSubs[id] && (openSubs[id].skipVerification || verifySignature(event)) && matchFilters(openSubs[id].filters, event)) {
                openSubs[id];
                (subListeners[id]?.event || []).forEach((cb) => cb(event));
              }
              return;
            case "EOSE": {
              let id2 = data[1];
              if (id2 in subListeners) {
                subListeners[id2].eose.forEach((cb) => cb());
                subListeners[id2].eose = [];
              }
              return;
            }
            case "OK": {
              let id2 = data[1];
              let ok = data[2];
              let reason = data[3] || "";
              if (id2 in pubListeners) {
                if (ok)
                  pubListeners[id2].ok.forEach((cb) => cb());
                else
                  pubListeners[id2].failed.forEach((cb) => cb(reason));
                pubListeners[id2].ok = [];
                pubListeners[id2].failed = [];
              }
              return;
            }
            case "NOTICE":
              let notice = data[1];
              listeners.notice.forEach((cb) => cb(notice));
              return;
          }
        } catch (err) {
          return;
        }
      }
    });
  }
  function connected() {
    return ws?.readyState === 1;
  }
  async function connect() {
    if (connected())
      return;
    await connectRelay();
  }
  async function trySend(params) {
    let msg = JSON.stringify(params);
    if (!connected()) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      if (!connected()) {
        return;
      }
    }
    try {
      ws.send(msg);
    } catch (err) {
      console.log(err);
    }
  }
  const sub = (filters, {
    skipVerification = false,
    alreadyHaveEvent = null,
    id = Math.random().toString().slice(2)
  } = {}) => {
    let subid = id;
    openSubs[subid] = {
      id: subid,
      filters,
      skipVerification,
      alreadyHaveEvent
    };
    trySend(["REQ", subid, ...filters]);
    return {
      sub: (newFilters, newOpts = {}) => sub(newFilters || filters, {
        skipVerification: newOpts.skipVerification || skipVerification,
        alreadyHaveEvent: newOpts.alreadyHaveEvent || alreadyHaveEvent,
        id: subid
      }),
      unsub: () => {
        delete openSubs[subid];
        delete subListeners[subid];
        trySend(["CLOSE", subid]);
      },
      on: (type, cb) => {
        subListeners[subid] = subListeners[subid] || {
          event: [],
          eose: []
        };
        subListeners[subid][type].push(cb);
      },
      off: (type, cb) => {
        let listeners2 = subListeners[subid];
        let idx = listeners2[type].indexOf(cb);
        if (idx >= 0)
          listeners2[type].splice(idx, 1);
      }
    };
  };
  return {
    url,
    sub,
    on: (type, cb) => {
      listeners[type].push(cb);
      if (type === "connect" && ws?.readyState === 1) {
        ;
        cb();
      }
    },
    off: (type, cb) => {
      let index = listeners[type].indexOf(cb);
      if (index !== -1)
        listeners[type].splice(index, 1);
    },
    list: (filters, opts) => new Promise((resolve) => {
      let s = sub(filters, opts);
      let events = [];
      let timeout = setTimeout(() => {
        s.unsub();
        resolve(events);
      }, listTimeout);
      s.on("eose", () => {
        s.unsub();
        clearTimeout(timeout);
        resolve(events);
      });
      s.on("event", (event) => {
        events.push(event);
      });
    }),
    get: (filter, opts) => new Promise((resolve) => {
      let s = sub([filter], opts);
      let timeout = setTimeout(() => {
        s.unsub();
        resolve(null);
      }, getTimeout);
      s.on("event", (event) => {
        s.unsub();
        clearTimeout(timeout);
        resolve(event);
      });
    }),
    publish(event) {
      if (!event.id)
        throw new Error(`event ${event} has no id`);
      let id = event.id;
      trySend(["EVENT", event]);
      return {
        on: (type, cb) => {
          pubListeners[id] = pubListeners[id] || {
            ok: [],
            failed: []
          };
          pubListeners[id][type].push(cb);
        },
        off: (type, cb) => {
          let listeners2 = pubListeners[id];
          if (!listeners2)
            return;
          let idx = listeners2[type].indexOf(cb);
          if (idx >= 0)
            listeners2[type].splice(idx, 1);
        }
      };
    },
    connect,
    close() {
      listeners = { connect: [], disconnect: [], error: [], notice: [] };
      subListeners = {};
      pubListeners = {};
      if (ws.readyState === WebSocket.OPEN) {
        ws?.close();
      }
    },
    get status() {
      return ws?.readyState ?? 3;
    }
  };
}

// pool.ts
var SimplePool = class {
  _conn;
  _seenOn = {};
  eoseSubTimeout;
  getTimeout;
  constructor(options = {}) {
    this._conn = {};
    this.eoseSubTimeout = options.eoseSubTimeout || 3400;
    this.getTimeout = options.getTimeout || 3400;
  }
  close(relays) {
    relays.forEach((url) => {
      let relay = this._conn[normalizeURL(url)];
      if (relay)
        relay.close();
    });
  }
  async ensureRelay(url) {
    const nm = normalizeURL(url);
    const existing = this._conn[nm];
    if (existing && existing.status === 1)
      return existing;
    if (existing) {
      await existing.connect();
      return existing;
    }
    const relay = relayInit(nm, {
      getTimeout: this.getTimeout * 0.9,
      listTimeout: this.getTimeout * 0.9
    });
    this._conn[nm] = relay;
    await relay.connect();
    return relay;
  }
  sub(relays, filters, opts) {
    let _knownIds = /* @__PURE__ */ new Set();
    let modifiedOpts = { ...opts || {} };
    modifiedOpts.alreadyHaveEvent = (id, url) => {
      if (opts?.alreadyHaveEvent?.(id, url)) {
        return true;
      }
      let set = this._seenOn[id] || /* @__PURE__ */ new Set();
      set.add(url);
      this._seenOn[id] = set;
      return _knownIds.has(id);
    };
    let subs = [];
    let eventListeners = /* @__PURE__ */ new Set();
    let eoseListeners = /* @__PURE__ */ new Set();
    let eosesMissing = relays.length;
    let eoseSent = false;
    let eoseTimeout = setTimeout(() => {
      eoseSent = true;
      for (let cb of eoseListeners.values())
        cb();
    }, this.eoseSubTimeout);
    relays.forEach(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
      } catch (err) {
        handleEose();
        return;
      }
      if (!r)
        return;
      let s = r.sub(filters, modifiedOpts);
      s.on("event", (event) => {
        _knownIds.add(event.id);
        for (let cb of eventListeners.values())
          cb(event);
      });
      s.on("eose", () => {
        if (eoseSent)
          return;
        handleEose();
      });
      subs.push(s);
      function handleEose() {
        eosesMissing--;
        if (eosesMissing === 0) {
          clearTimeout(eoseTimeout);
          for (let cb of eoseListeners.values())
            cb();
        }
      }
    });
    let greaterSub = {
      sub(filters2, opts2) {
        subs.forEach((sub) => sub.sub(filters2, opts2));
        return greaterSub;
      },
      unsub() {
        subs.forEach((sub) => sub.unsub());
      },
      on(type, cb) {
        if (type === "event") {
          eventListeners.add(cb);
        } else if (type === "eose") {
          eoseListeners.add(cb);
        }
      },
      off(type, cb) {
        if (type === "event") {
          eventListeners.delete(cb);
        } else if (type === "eose")
          eoseListeners.delete(cb);
      }
    };
    return greaterSub;
  }
  get(relays, filter, opts) {
    return new Promise((resolve) => {
      let sub = this.sub(relays, [filter], opts);
      let timeout = setTimeout(() => {
        sub.unsub();
        resolve(null);
      }, this.getTimeout);
      sub.on("event", (event) => {
        resolve(event);
        clearTimeout(timeout);
        sub.unsub();
      });
    });
  }
  list(relays, filters, opts) {
    return new Promise((resolve) => {
      let events = [];
      let sub = this.sub(relays, filters, opts);
      sub.on("event", (event) => {
        events.push(event);
      });
      sub.on("eose", () => {
        sub.unsub();
        resolve(events);
      });
    });
  }
  publish(relays, event) {
    const pubs = [];
    relays.forEach(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
        pubs.push(r.publish(event));
      } catch (_) {
      }
    });
    return {
      on(type, cb) {
        pubs.forEach((pub, i) => {
          pub.on(type, () => cb(relays[i]));
        });
      },
      off() {
      }
    };
  }
  seenOn(id) {
    return Array.from(this._seenOn[id]?.values?.() || []);
  }
};

// nip04.ts
var nip04_exports = {};
__export(nip04_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt
});
import { randomBytes } from "@noble/hashes/utils";
import * as secp256k13 from "@noble/secp256k1";
import { base64 } from "@scure/base";
async function encrypt(privkey, pubkey, text) {
  const key = secp256k13.getSharedSecret(privkey, "02" + pubkey);
  const normalizedKey = getNormalizedX(key);
  let iv = Uint8Array.from(randomBytes(16));
  let plaintext = utf8Encoder.encode(text);
  let cryptoKey = await crypto.subtle.importKey(
    "raw",
    normalizedKey,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  let ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    plaintext
  );
  let ctb64 = base64.encode(new Uint8Array(ciphertext));
  let ivb64 = base64.encode(new Uint8Array(iv.buffer));
  return `${ctb64}?iv=${ivb64}`;
}
async function decrypt(privkey, pubkey, data) {
  let [ctb64, ivb64] = data.split("?iv=");
  let key = secp256k13.getSharedSecret(privkey, "02" + pubkey);
  let normalizedKey = getNormalizedX(key);
  let cryptoKey = await crypto.subtle.importKey(
    "raw",
    normalizedKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  let ciphertext = base64.decode(ctb64);
  let iv = base64.decode(ivb64);
  let plaintext = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    ciphertext
  );
  let text = utf8Decoder.decode(plaintext);
  return text;
}
function getNormalizedX(key) {
  return key.slice(1, 33);
}

// nip05.ts
var nip05_exports = {};
__export(nip05_exports, {
  queryProfile: () => queryProfile,
  searchDomain: () => searchDomain,
  useFetchImplementation: () => useFetchImplementation
});
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function searchDomain(domain, query = "") {
  try {
    let res = await (await _fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)).json();
    return res.names;
  } catch (_) {
    return {};
  }
}
async function queryProfile(fullname) {
  let [name, domain] = fullname.split("@");
  if (!domain) {
    domain = name;
    name = "_";
  }
  if (!name.match(/^[A-Za-z0-9-_]+$/))
    return null;
  if (!domain.includes("."))
    return null;
  let res;
  try {
    res = await (await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`)).json();
  } catch (err) {
    return null;
  }
  if (!res?.names?.[name])
    return null;
  let pubkey = res.names[name];
  let relays = res.relays?.[pubkey] || [];
  return {
    pubkey,
    relays
  };
}

// nip06.ts
var nip06_exports = {};
__export(nip06_exports, {
  generateSeedWords: () => generateSeedWords,
  privateKeyFromSeedWords: () => privateKeyFromSeedWords,
  validateWords: () => validateWords
});
import * as secp256k14 from "@noble/secp256k1";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import {
  generateMnemonic,
  mnemonicToSeedSync,
  validateMnemonic
} from "@scure/bip39";
import { HDKey } from "@scure/bip32";
function privateKeyFromSeedWords(mnemonic, passphrase) {
  let root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic, passphrase));
  let privateKey = root.derive(`m/44'/1237'/0'/0/0`).privateKey;
  if (!privateKey)
    throw new Error("could not derive private key");
  return secp256k14.utils.bytesToHex(privateKey);
}
function generateSeedWords() {
  return generateMnemonic(wordlist);
}
function validateWords(words) {
  return validateMnemonic(words, wordlist);
}

// nip19.ts
var nip19_exports = {};
__export(nip19_exports, {
  decode: () => decode,
  naddrEncode: () => naddrEncode,
  neventEncode: () => neventEncode,
  noteEncode: () => noteEncode,
  nprofileEncode: () => nprofileEncode,
  npubEncode: () => npubEncode,
  nsecEncode: () => nsecEncode
});
import * as secp256k15 from "@noble/secp256k1";
import { bech32 } from "@scure/base";
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
          pubkey: secp256k15.utils.bytesToHex(tlv[0][0]),
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
      return {
        type: "nevent",
        data: {
          id: secp256k15.utils.bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
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
          pubkey: secp256k15.utils.bytesToHex(tlv[2][0]),
          kind: parseInt(secp256k15.utils.bytesToHex(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nsec":
    case "npub":
    case "note":
      return { type: prefix, data: secp256k15.utils.bytesToHex(data) };
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
      continue;
    result[t] = result[t] || [];
    result[t].push(v);
  }
  return result;
}
function nsecEncode(hex) {
  return encodeBytes("nsec", hex);
}
function npubEncode(hex) {
  return encodeBytes("npub", hex);
}
function noteEncode(hex) {
  return encodeBytes("note", hex);
}
function encodeBytes(prefix, hex) {
  let data = secp256k15.utils.hexToBytes(hex);
  let words = bech32.toWords(data);
  return bech32.encode(prefix, words, Bech32MaxSize);
}
function nprofileEncode(profile) {
  let data = encodeTLV({
    0: [secp256k15.utils.hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map((url) => utf8Encoder.encode(url))
  });
  let words = bech32.toWords(data);
  return bech32.encode("nprofile", words, Bech32MaxSize);
}
function neventEncode(event) {
  let data = encodeTLV({
    0: [secp256k15.utils.hexToBytes(event.id)],
    1: (event.relays || []).map((url) => utf8Encoder.encode(url))
  });
  let words = bech32.toWords(data);
  return bech32.encode("nevent", words, Bech32MaxSize);
}
function naddrEncode(addr) {
  let kind = new ArrayBuffer(4);
  new DataView(kind).setUint32(0, addr.kind, false);
  let data = encodeTLV({
    0: [utf8Encoder.encode(addr.identifier)],
    1: (addr.relays || []).map((url) => utf8Encoder.encode(url)),
    2: [secp256k15.utils.hexToBytes(addr.pubkey)],
    3: [new Uint8Array(kind)]
  });
  let words = bech32.toWords(data);
  return bech32.encode("naddr", words, Bech32MaxSize);
}
function encodeTLV(tlv) {
  let entries = [];
  Object.entries(tlv).forEach(([t, vs]) => {
    vs.forEach((v) => {
      let entry = new Uint8Array(v.length + 2);
      entry.set([parseInt(t)], 0);
      entry.set([v.length], 1);
      entry.set(v, 2);
      entries.push(entry);
    });
  });
  return secp256k15.utils.concatBytes(...entries);
}

// nip26.ts
var nip26_exports = {};
__export(nip26_exports, {
  createDelegation: () => createDelegation,
  getDelegator: () => getDelegator
});
import * as secp256k16 from "@noble/secp256k1";
import { sha256 as sha2562 } from "@noble/hashes/sha256";
function createDelegation(privateKey, parameters) {
  let conditions = [];
  if ((parameters.kind || -1) >= 0)
    conditions.push(`kind=${parameters.kind}`);
  if (parameters.until)
    conditions.push(`created_at<${parameters.until}`);
  if (parameters.since)
    conditions.push(`created_at>${parameters.since}`);
  let cond = conditions.join("&");
  if (cond === "")
    throw new Error("refusing to create a delegation without any conditions");
  let sighash = sha2562(
    utf8Encoder.encode(`nostr:delegation:${parameters.pubkey}:${cond}`)
  );
  let sig = secp256k16.utils.bytesToHex(
    secp256k16.schnorr.signSync(sighash, privateKey)
  );
  return {
    from: getPublicKey(privateKey),
    to: parameters.pubkey,
    cond,
    sig
  };
}
function getDelegator(event) {
  let tag = event.tags.find((tag2) => tag2[0] === "delegation" && tag2.length >= 4);
  if (!tag)
    return null;
  let pubkey = tag[1];
  let cond = tag[2];
  let sig = tag[3];
  let conditions = cond.split("&");
  for (let i = 0; i < conditions.length; i++) {
    let [key, operator, value] = conditions[i].split(/\b/);
    if (key === "kind" && operator === "=" && event.kind === parseInt(value))
      continue;
    else if (key === "created_at" && operator === "<" && event.created_at < parseInt(value))
      continue;
    else if (key === "created_at" && operator === ">" && event.created_at > parseInt(value))
      continue;
    else
      return null;
  }
  let sighash = sha2562(
    utf8Encoder.encode(`nostr:delegation:${event.pubkey}:${cond}`)
  );
  if (!secp256k16.schnorr.verifySync(sig, sighash, pubkey))
    return null;
  return pubkey;
}

// nip39.ts
var nip39_exports = {};
__export(nip39_exports, {
  useFetchImplementation: () => useFetchImplementation2,
  validateGithub: () => validateGithub
});
var _fetch2;
try {
  _fetch2 = fetch;
} catch {
}
function useFetchImplementation2(fetchImplementation) {
  _fetch2 = fetchImplementation;
}
async function validateGithub(pubkey, username, proof) {
  try {
    let res = await (await _fetch2(`https://gist.github.com/${username}/${proof}/raw`)).text();
    return res === `Verifying that I control the following Nostr public key: ${pubkey}`;
  } catch (_) {
    return false;
  }
}

// nip57.ts
var nip57_exports = {};
__export(nip57_exports, {
  getZapEndpoint: () => getZapEndpoint,
  makeZapReceipt: () => makeZapReceipt,
  makeZapRequest: () => makeZapRequest,
  useFetchImplementation: () => useFetchImplementation3,
  validateZapRequest: () => validateZapRequest
});
import { bech32 as bech322 } from "@scure/base";
var _fetch3;
try {
  _fetch3 = fetch;
} catch {
}
function useFetchImplementation3(fetchImplementation) {
  _fetch3 = fetchImplementation;
}
async function getZapEndpoint(metadata) {
  try {
    let lnurl = "";
    let { lud06, lud16 } = JSON.parse(metadata.content);
    if (lud06) {
      let { words } = bech322.decode(lud06, 1e3);
      let data = bech322.fromWords(words);
      lnurl = utf8Decoder.decode(data);
    } else if (lud16) {
      let [name, domain] = lud16.split("@");
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`;
    } else {
      return null;
    }
    let res = await _fetch3(lnurl);
    let body = await res.json();
    if (body.allowsNostr && body.nostrPubkey) {
      return body.callback;
    }
  } catch (err) {
  }
  return null;
}
function makeZapRequest({
  profile,
  event,
  amount,
  relays,
  comment = ""
}) {
  if (!amount)
    throw new Error("amount not given");
  if (!profile)
    throw new Error("profile not given");
  let zr = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1e3),
    content: comment,
    tags: [
      ["p", profile],
      ["amount", amount.toString()],
      ["relays", ...relays]
    ]
  };
  if (event) {
    zr.tags.push(["e", event]);
  }
  return zr;
}
function validateZapRequest(zapRequestString) {
  let zapRequest;
  try {
    zapRequest = JSON.parse(zapRequestString);
  } catch (err) {
    return "Invalid zap request JSON.";
  }
  if (!validateEvent(zapRequest))
    return "Zap request is not a valid Nostr event.";
  if (!verifySignature(zapRequest))
    return "Invalid signature on zap request.";
  let p = zapRequest.tags.find(([t, v]) => t === "p" && v);
  if (!p)
    return "Zap request doesn't have a 'p' tag.";
  if (!p[1].match(/^[a-f0-9]{64}$/))
    return "Zap request 'p' tag is not valid hex.";
  let e = zapRequest.tags.find(([t, v]) => t === "e" && v);
  if (e && !e[1].match(/^[a-f0-9]{64}$/))
    return "Zap request 'e' tag is not valid hex.";
  let relays = zapRequest.tags.find(([t, v]) => t === "relays" && v);
  if (!relays)
    return "Zap request doesn't have a 'relays' tag.";
  return null;
}
function makeZapReceipt({
  zapRequest,
  preimage,
  bolt11,
  paidAt
}) {
  let zr = JSON.parse(zapRequest);
  let tagsFromZapRequest = zr.tags.filter(
    ([t]) => t === "e" || t === "p" || t === "a"
  );
  let zap = {
    kind: 9735,
    created_at: Math.round(paidAt.getTime() / 1e3),
    content: "",
    tags: [
      ...tagsFromZapRequest,
      ["bolt11", bolt11],
      ["description", zapRequest]
    ]
  };
  if (preimage) {
    zap.tags.push(["preimage", preimage]);
  }
  return zap;
}

// nip111.ts
var nip111_exports = {};
__export(nip111_exports, {
  loginWithX: () => loginWithX,
  privateKeyFromX: () => privateKeyFromX,
  registerWithX: () => registerWithX,
  signInWithX: () => signInWithX,
  signInWithXStandalone: () => signInWithXStandalone,
  useFetchImplementation: () => useFetchImplementation4
});
import * as secp256k17 from "@noble/secp256k1";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 as sha2563 } from "@noble/hashes/sha256";
var _fetch4;
try {
  _fetch4 = fetch;
} catch {
}
function useFetchImplementation4(fetchImplementation) {
  _fetch4 = fetchImplementation;
}
async function privateKeyFromX(username, caip10, sig, password) {
  if (sig.length < 64)
    throw new Error("Signature too short; length should be 65 bytes");
  let inputKey = await sha2563(secp256k17.utils.hexToBytes(sig.toLowerCase().startsWith("0x") ? sig.slice(2) : sig));
  let info = `${caip10}:${username}`;
  let salt = await sha2563(`${info}:${password ? password : ""}:${sig.slice(-64)}`);
  let hashKey = await hkdf(sha2563, inputKey, salt, info, 42);
  return secp256k17.utils.bytesToHex(secp256k17.utils.hashToPrivateKey(hashKey));
}
var registerWithX = privateKeyFromX;
var loginWithX = signInWithX;
async function signInWithX(username, caip10, sig, password) {
  let profile = null;
  let petname = username;
  if (username.includes(".")) {
    try {
      profile = await queryProfile(username);
    } catch (e) {
      console.log(e);
      throw new Error("Nostr Profile Not Found");
    }
    if (profile == null) {
      throw new Error("Nostr Profile Not Found");
    }
    petname = username.split("@").length == 2 ? username.split("@")[0] : username.split(".")[0];
  }
  let privkey = await privateKeyFromX(username, caip10, sig, password);
  let pubkey = getPublicKey(privkey);
  if (profile?.pubkey && pubkey !== profile.pubkey) {
    throw new Error("Invalid Signature/Password");
  }
  return {
    petname,
    profile,
    privkey
  };
}
async function signInWithXStandalone(username, caip10, sig, password) {
  let profile = null;
  let petname = username;
  if (username.includes(".")) {
    petname = username.split("@").length == 2 ? username.split("@")[0] : username.split(".")[0];
  }
  let privkey = await privateKeyFromX(username, caip10, sig, password);
  let pubkey = getPublicKey(privkey);
  return {
    petname,
    pubkey
  };
}

// index.ts
import * as secp256k18 from "@noble/secp256k1";
import { hmac } from "@noble/hashes/hmac";
import { sha256 as sha2564 } from "@noble/hashes/sha256";
secp256k18.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha2564, key, secp256k18.utils.concatBytes(...msgs));
secp256k18.utils.sha256Sync = (...msgs) => sha2564(secp256k18.utils.concatBytes(...msgs));
export {
  Kind,
  SimplePool,
  finishEvent,
  fakejson_exports as fj,
  generatePrivateKey,
  getBlankEvent,
  getEventHash,
  getPublicKey,
  matchFilter,
  matchFilters,
  nip04_exports as nip04,
  nip05_exports as nip05,
  nip06_exports as nip06,
  nip111_exports as nip111,
  nip19_exports as nip19,
  nip26_exports as nip26,
  nip39_exports as nip39,
  nip57_exports as nip57,
  relayInit,
  serializeEvent,
  signEvent,
  utils_exports as utils,
  validateEvent,
  verifySignature
};
