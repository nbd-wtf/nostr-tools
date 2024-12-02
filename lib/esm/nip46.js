// pure.ts
import { schnorr } from "@noble/curves/secp256k1";
import { bytesToHex } from "@noble/hashes/utils";

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
  for (let i2 = 0; i2 < event.tags.length; i2++) {
    let tag = event.tags[i2];
    if (!Array.isArray(tag))
      return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object")
        return false;
    }
  }
  return true;
}

// pure.ts
import { sha256 } from "@noble/hashes/sha256";

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
var QueueNode = class {
  value;
  next = null;
  prev = null;
  constructor(message) {
    this.value = message;
  }
};
var Queue = class {
  first;
  last;
  constructor() {
    this.first = null;
    this.last = null;
  }
  enqueue(value) {
    const newNode = new QueueNode(value);
    if (!this.last) {
      this.first = newNode;
      this.last = newNode;
    } else if (this.last === this.first) {
      this.last = newNode;
      this.last.prev = this.first;
      this.first.next = newNode;
    } else {
      newNode.prev = this.last;
      this.last.next = newNode;
      this.last = newNode;
    }
    return true;
  }
  dequeue() {
    if (!this.first)
      return null;
    if (this.first === this.last) {
      const target2 = this.first;
      this.first = null;
      this.last = null;
      return target2.value;
    }
    const target = this.first;
    this.first = target.next;
    return target.value;
  }
};

// pure.ts
var JS = class {
  generateSecretKey() {
    return schnorr.utils.randomPrivateKey();
  }
  getPublicKey(secretKey) {
    return bytesToHex(schnorr.getPublicKey(secretKey));
  }
  finalizeEvent(t, secretKey) {
    const event = t;
    event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey));
    event.id = getEventHash(event);
    event.sig = bytesToHex(schnorr.sign(getEventHash(event), secretKey));
    event[verifiedSymbol] = true;
    return event;
  }
  verifyEvent(event) {
    if (typeof event[verifiedSymbol] === "boolean")
      return event[verifiedSymbol];
    const hash = getEventHash(event);
    if (hash !== event.id) {
      event[verifiedSymbol] = false;
      return false;
    }
    try {
      const valid = schnorr.verify(event.sig, hash, event.pubkey);
      event[verifiedSymbol] = valid;
      return valid;
    } catch (err) {
      event[verifiedSymbol] = false;
      return false;
    }
  }
};
function serializeEvent(evt) {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
}
function getEventHash(event) {
  let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
  return bytesToHex(eventHash);
}
var i = new JS();
var generateSecretKey = i.generateSecretKey;
var getPublicKey = i.getPublicKey;
var finalizeEvent = i.finalizeEvent;
var verifyEvent = i.verifyEvent;

// nip04.ts
import { bytesToHex as bytesToHex2, randomBytes } from "@noble/hashes/utils";
import { secp256k1 } from "@noble/curves/secp256k1";
import { cbc } from "@noble/ciphers/aes";
import { base64 } from "@scure/base";
async function decrypt(secretKey, pubkey, data) {
  const privkey = secretKey instanceof Uint8Array ? bytesToHex2(secretKey) : secretKey;
  let [ctb64, ivb64] = data.split("?iv=");
  let key = secp256k1.getSharedSecret(privkey, "02" + pubkey);
  let normalizedKey = getNormalizedX(key);
  let iv = base64.decode(ivb64);
  let ciphertext = base64.decode(ctb64);
  let plaintext = cbc(normalizedKey, iv).decrypt(ciphertext);
  return utf8Decoder.decode(plaintext);
}
function getNormalizedX(key) {
  return key.slice(1, 33);
}

// nip44.ts
import { chacha20 } from "@noble/ciphers/chacha";
import { equalBytes } from "@noble/ciphers/utils";
import { secp256k1 as secp256k12 } from "@noble/curves/secp256k1";
import { extract as hkdf_extract, expand as hkdf_expand } from "@noble/hashes/hkdf";
import { hmac } from "@noble/hashes/hmac";
import { sha256 as sha2562 } from "@noble/hashes/sha256";
import { concatBytes, randomBytes as randomBytes2 } from "@noble/hashes/utils";
import { base64 as base642 } from "@scure/base";
var minPlaintextSize = 1;
var maxPlaintextSize = 65535;
function getConversationKey(privkeyA, pubkeyB) {
  const sharedX = secp256k12.getSharedSecret(privkeyA, "02" + pubkeyB).subarray(1, 33);
  return hkdf_extract(sha2562, sharedX, "nip44-v2");
}
function getMessageKeys(conversationKey, nonce) {
  const keys = hkdf_expand(sha2562, conversationKey, nonce, 76);
  return {
    chacha_key: keys.subarray(0, 32),
    chacha_nonce: keys.subarray(32, 44),
    hmac_key: keys.subarray(44, 76)
  };
}
function calcPaddedLen(len) {
  if (!Number.isSafeInteger(len) || len < 1)
    throw new Error("expected positive integer");
  if (len <= 32)
    return 32;
  const nextPower = 1 << Math.floor(Math.log2(len - 1)) + 1;
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((len - 1) / chunk) + 1);
}
function writeU16BE(num) {
  if (!Number.isSafeInteger(num) || num < minPlaintextSize || num > maxPlaintextSize)
    throw new Error("invalid plaintext size: must be between 1 and 65535 bytes");
  const arr = new Uint8Array(2);
  new DataView(arr.buffer).setUint16(0, num, false);
  return arr;
}
function pad(plaintext) {
  const unpadded = utf8Encoder.encode(plaintext);
  const unpaddedLen = unpadded.length;
  const prefix = writeU16BE(unpaddedLen);
  const suffix = new Uint8Array(calcPaddedLen(unpaddedLen) - unpaddedLen);
  return concatBytes(prefix, unpadded, suffix);
}
function unpad(padded) {
  const unpaddedLen = new DataView(padded.buffer).getUint16(0);
  const unpadded = padded.subarray(2, 2 + unpaddedLen);
  if (unpaddedLen < minPlaintextSize || unpaddedLen > maxPlaintextSize || unpadded.length !== unpaddedLen || padded.length !== 2 + calcPaddedLen(unpaddedLen))
    throw new Error("invalid padding");
  return utf8Decoder.decode(unpadded);
}
function hmacAad(key, message, aad) {
  if (aad.length !== 32)
    throw new Error("AAD associated data must be 32 bytes");
  const combined = concatBytes(aad, message);
  return hmac(sha2562, key, combined);
}
function decodePayload(payload) {
  if (typeof payload !== "string")
    throw new Error("payload must be a valid string");
  const plen = payload.length;
  if (plen < 132 || plen > 87472)
    throw new Error("invalid payload length: " + plen);
  if (payload[0] === "#")
    throw new Error("unknown encryption version");
  let data;
  try {
    data = base642.decode(payload);
  } catch (error) {
    throw new Error("invalid base64: " + error.message);
  }
  const dlen = data.length;
  if (dlen < 99 || dlen > 65603)
    throw new Error("invalid data length: " + dlen);
  const vers = data[0];
  if (vers !== 2)
    throw new Error("unknown encryption version " + vers);
  return {
    nonce: data.subarray(1, 33),
    ciphertext: data.subarray(33, -32),
    mac: data.subarray(-32)
  };
}
function encrypt(plaintext, conversationKey, nonce = randomBytes2(32)) {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const padded = pad(plaintext);
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded);
  const mac = hmacAad(hmac_key, ciphertext, nonce);
  return base642.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac));
}
function decrypt2(payload, conversationKey) {
  const { nonce, ciphertext, mac } = decodePayload(payload);
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce);
  if (!equalBytes(calculatedMac, mac))
    throw new Error("invalid MAC");
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext);
  return unpad(padded);
}

// nip05.ts
var NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/;
var _fetch;
try {
  _fetch = fetch;
} catch (_) {
  null;
}

// kinds.ts
var ClientAuth = 22242;
var NostrConnect = 24133;
var Handlerinformation = 31990;

// filter.ts
function matchFilter(filter, event) {
  if (filter.ids && filter.ids.indexOf(event.id) === -1) {
    return false;
  }
  if (filter.kinds && filter.kinds.indexOf(event.kind) === -1) {
    return false;
  }
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
    return false;
  }
  for (let f in filter) {
    if (f[0] === "#") {
      let tagName = f.slice(1);
      let values = filter[`#${tagName}`];
      if (values && !event.tags.find(([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1))
        return false;
    }
  }
  if (filter.since && event.created_at < filter.since)
    return false;
  if (filter.until && event.created_at > filter.until)
    return false;
  return true;
}
function matchFilters(filters, event) {
  for (let i2 = 0; i2 < filters.length; i2++) {
    if (matchFilter(filters[i2], event)) {
      return true;
    }
  }
  return false;
}

// fakejson.ts
function getHex64(json, field) {
  let len = field.length + 3;
  let idx = json.indexOf(`"${field}":`) + len;
  let s = json.slice(idx).indexOf(`"`) + idx + 1;
  return json.slice(s, s + 64);
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

// nip42.ts
function makeAuthEvent(relayURL, challenge) {
  return {
    kind: ClientAuth,
    created_at: Math.floor(Date.now() / 1e3),
    tags: [
      ["relay", relayURL],
      ["challenge", challenge]
    ],
    content: ""
  };
}

// helpers.ts
async function yieldThread() {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    const handler = () => {
      ch.port1.removeEventListener("message", handler);
      resolve();
    };
    ch.port1.addEventListener("message", handler);
    ch.port2.postMessage(0);
    ch.port1.start();
  });
}
var alwaysTrue = (t) => {
  t[verifiedSymbol] = true;
  return true;
};

// abstract-relay.ts
var AbstractRelay = class {
  url;
  _connected = false;
  onclose = null;
  onnotice = (msg) => console.debug(`NOTICE from ${this.url}: ${msg}`);
  _onauth = null;
  baseEoseTimeout = 4400;
  connectionTimeout = 4400;
  publishTimeout = 4400;
  openSubs = /* @__PURE__ */ new Map();
  connectionTimeoutHandle;
  connectionPromise;
  openCountRequests = /* @__PURE__ */ new Map();
  openEventPublishes = /* @__PURE__ */ new Map();
  ws;
  incomingMessageQueue = new Queue();
  queueRunning = false;
  challenge;
  serial = 0;
  verifyEvent;
  _WebSocket;
  constructor(url, opts) {
    this.url = normalizeURL(url);
    this.verifyEvent = opts.verifyEvent;
    this._WebSocket = opts.websocketImplementation || WebSocket;
  }
  static async connect(url, opts) {
    const relay = new AbstractRelay(url, opts);
    await relay.connect();
    return relay;
  }
  closeAllSubscriptions(reason) {
    for (let [_, sub] of this.openSubs) {
      sub.close(reason);
    }
    this.openSubs.clear();
    for (let [_, ep] of this.openEventPublishes) {
      ep.reject(new Error(reason));
    }
    this.openEventPublishes.clear();
    for (let [_, cr] of this.openCountRequests) {
      cr.reject(new Error(reason));
    }
    this.openCountRequests.clear();
  }
  get connected() {
    return this._connected;
  }
  async connect() {
    if (this.connectionPromise)
      return this.connectionPromise;
    this.challenge = void 0;
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionTimeoutHandle = setTimeout(() => {
        reject("connection timed out");
        this.connectionPromise = void 0;
        this.onclose?.();
        this.closeAllSubscriptions("relay connection timed out");
      }, this.connectionTimeout);
      try {
        this.ws = new this._WebSocket(this.url);
      } catch (err) {
        reject(err);
        return;
      }
      this.ws.onopen = () => {
        clearTimeout(this.connectionTimeoutHandle);
        this._connected = true;
        resolve();
      };
      this.ws.onerror = (ev) => {
        reject(ev.message || "websocket error");
        if (this._connected) {
          this._connected = false;
          this.connectionPromise = void 0;
          this.onclose?.();
          this.closeAllSubscriptions("relay connection errored");
        }
      };
      this.ws.onclose = async () => {
        if (this._connected) {
          this._connected = false;
          this.connectionPromise = void 0;
          this.onclose?.();
          this.closeAllSubscriptions("relay connection closed");
        }
      };
      this.ws.onmessage = this._onmessage.bind(this);
    });
    return this.connectionPromise;
  }
  async runQueue() {
    this.queueRunning = true;
    while (true) {
      if (false === this.handleNext()) {
        break;
      }
      await yieldThread();
    }
    this.queueRunning = false;
  }
  handleNext() {
    const json = this.incomingMessageQueue.dequeue();
    if (!json) {
      return false;
    }
    const subid = getSubscriptionId(json);
    if (subid) {
      const so = this.openSubs.get(subid);
      if (!so) {
        return;
      }
      const id = getHex64(json, "id");
      const alreadyHave = so.alreadyHaveEvent?.(id);
      so.receivedEvent?.(this, id);
      if (alreadyHave) {
        return;
      }
    }
    try {
      let data = JSON.parse(json);
      switch (data[0]) {
        case "EVENT": {
          const so = this.openSubs.get(data[1]);
          const event = data[2];
          if (this.verifyEvent(event) && matchFilters(so.filters, event)) {
            so.onevent(event);
          }
          return;
        }
        case "COUNT": {
          const id = data[1];
          const payload = data[2];
          const cr = this.openCountRequests.get(id);
          if (cr) {
            cr.resolve(payload.count);
            this.openCountRequests.delete(id);
          }
          return;
        }
        case "EOSE": {
          const so = this.openSubs.get(data[1]);
          if (!so)
            return;
          so.receivedEose();
          return;
        }
        case "OK": {
          const id = data[1];
          const ok = data[2];
          const reason = data[3];
          const ep = this.openEventPublishes.get(id);
          if (ep) {
            if (ok)
              ep.resolve(reason);
            else
              ep.reject(new Error(reason));
            this.openEventPublishes.delete(id);
          }
          return;
        }
        case "CLOSED": {
          const id = data[1];
          const so = this.openSubs.get(id);
          if (!so)
            return;
          so.closed = true;
          so.close(data[2]);
          return;
        }
        case "NOTICE":
          this.onnotice(data[1]);
          return;
        case "AUTH": {
          this.challenge = data[1];
          this._onauth?.(data[1]);
          return;
        }
      }
    } catch (err) {
      return;
    }
  }
  async send(message) {
    if (!this.connectionPromise)
      throw new Error("sending on closed connection");
    this.connectionPromise.then(() => {
      this.ws?.send(message);
    });
  }
  async auth(signAuthEvent) {
    if (!this.challenge)
      throw new Error("can't perform auth, no challenge was received");
    const evt = await signAuthEvent(makeAuthEvent(this.url, this.challenge));
    const ret = new Promise((resolve, reject) => {
      this.openEventPublishes.set(evt.id, { resolve, reject });
    });
    this.send('["AUTH",' + JSON.stringify(evt) + "]");
    return ret;
  }
  async publish(event) {
    const ret = new Promise((resolve, reject) => {
      this.openEventPublishes.set(event.id, { resolve, reject });
    });
    this.send('["EVENT",' + JSON.stringify(event) + "]");
    setTimeout(() => {
      const ep = this.openEventPublishes.get(event.id);
      if (ep) {
        ep.reject(new Error("publish timed out"));
        this.openEventPublishes.delete(event.id);
      }
    }, this.publishTimeout);
    return ret;
  }
  async count(filters, params) {
    this.serial++;
    const id = params?.id || "count:" + this.serial;
    const ret = new Promise((resolve, reject) => {
      this.openCountRequests.set(id, { resolve, reject });
    });
    this.send('["COUNT","' + id + '",' + JSON.stringify(filters).substring(1));
    return ret;
  }
  subscribe(filters, params) {
    const subscription = this.prepareSubscription(filters, params);
    subscription.fire();
    return subscription;
  }
  prepareSubscription(filters, params) {
    this.serial++;
    const id = params.id || "sub:" + this.serial;
    const subscription = new Subscription(this, id, filters, params);
    this.openSubs.set(id, subscription);
    return subscription;
  }
  close() {
    this.closeAllSubscriptions("relay connection closed by us");
    this._connected = false;
    this.ws?.close();
  }
  _onmessage(ev) {
    this.incomingMessageQueue.enqueue(ev.data);
    if (!this.queueRunning) {
      this.runQueue();
    }
  }
};
var Subscription = class {
  relay;
  id;
  closed = false;
  eosed = false;
  filters;
  alreadyHaveEvent;
  receivedEvent;
  onevent;
  oneose;
  onclose;
  eoseTimeout;
  eoseTimeoutHandle;
  constructor(relay, id, filters, params) {
    this.relay = relay;
    this.filters = filters;
    this.id = id;
    this.alreadyHaveEvent = params.alreadyHaveEvent;
    this.receivedEvent = params.receivedEvent;
    this.eoseTimeout = params.eoseTimeout || relay.baseEoseTimeout;
    this.oneose = params.oneose;
    this.onclose = params.onclose;
    this.onevent = params.onevent || ((event) => {
      console.warn(
        `onevent() callback not defined for subscription '${this.id}' in relay ${this.relay.url}. event received:`,
        event
      );
    });
  }
  fire() {
    this.relay.send('["REQ","' + this.id + '",' + JSON.stringify(this.filters).substring(1));
    this.eoseTimeoutHandle = setTimeout(this.receivedEose.bind(this), this.eoseTimeout);
  }
  receivedEose() {
    if (this.eosed)
      return;
    clearTimeout(this.eoseTimeoutHandle);
    this.eosed = true;
    this.oneose?.();
  }
  close(reason = "closed by caller") {
    if (!this.closed && this.relay.connected) {
      this.relay.send('["CLOSE",' + JSON.stringify(this.id) + "]");
      this.closed = true;
    }
    this.relay.openSubs.delete(this.id);
    this.onclose?.(reason);
  }
};

// abstract-pool.ts
var AbstractSimplePool = class {
  relays = /* @__PURE__ */ new Map();
  seenOn = /* @__PURE__ */ new Map();
  trackRelays = false;
  verifyEvent;
  trustedRelayURLs = /* @__PURE__ */ new Set();
  _WebSocket;
  constructor(opts) {
    this.verifyEvent = opts.verifyEvent;
    this._WebSocket = opts.websocketImplementation;
  }
  async ensureRelay(url, params) {
    url = normalizeURL(url);
    let relay = this.relays.get(url);
    if (!relay) {
      relay = new AbstractRelay(url, {
        verifyEvent: this.trustedRelayURLs.has(url) ? alwaysTrue : this.verifyEvent,
        websocketImplementation: this._WebSocket
      });
      if (params?.connectionTimeout)
        relay.connectionTimeout = params.connectionTimeout;
      this.relays.set(url, relay);
    }
    await relay.connect();
    return relay;
  }
  close(relays) {
    relays.map(normalizeURL).forEach((url) => {
      this.relays.get(url)?.close();
    });
  }
  subscribeMany(relays, filters, params) {
    return this.subscribeManyMap(Object.fromEntries(relays.map((url) => [url, filters])), params);
  }
  subscribeManyMap(requests, params) {
    if (this.trackRelays) {
      params.receivedEvent = (relay, id) => {
        let set = this.seenOn.get(id);
        if (!set) {
          set = /* @__PURE__ */ new Set();
          this.seenOn.set(id, set);
        }
        set.add(relay);
      };
    }
    const _knownIds = /* @__PURE__ */ new Set();
    const subs = [];
    const relaysLength = Object.keys(requests).length;
    const eosesReceived = [];
    let handleEose = (i2) => {
      eosesReceived[i2] = true;
      if (eosesReceived.filter((a) => a).length === relaysLength) {
        params.oneose?.();
        handleEose = () => {
        };
      }
    };
    const closesReceived = [];
    let handleClose = (i2, reason) => {
      handleEose(i2);
      closesReceived[i2] = reason;
      if (closesReceived.filter((a) => a).length === relaysLength) {
        params.onclose?.(closesReceived);
        handleClose = () => {
        };
      }
    };
    const localAlreadyHaveEventHandler = (id) => {
      if (params.alreadyHaveEvent?.(id)) {
        return true;
      }
      const have = _knownIds.has(id);
      _knownIds.add(id);
      return have;
    };
    const allOpened = Promise.all(
      Object.entries(requests).map(async (req, i2, arr) => {
        if (arr.indexOf(req) !== i2) {
          handleClose(i2, "duplicate url");
          return;
        }
        let [url, filters] = req;
        url = normalizeURL(url);
        let relay;
        try {
          relay = await this.ensureRelay(url, {
            connectionTimeout: params.maxWait ? Math.max(params.maxWait * 0.8, params.maxWait - 1e3) : void 0
          });
        } catch (err) {
          handleClose(i2, err?.message || String(err));
          return;
        }
        let subscription = relay.subscribe(filters, {
          ...params,
          oneose: () => handleEose(i2),
          onclose: (reason) => handleClose(i2, reason),
          alreadyHaveEvent: localAlreadyHaveEventHandler,
          eoseTimeout: params.maxWait
        });
        subs.push(subscription);
      })
    );
    return {
      async close() {
        await allOpened;
        subs.forEach((sub) => {
          sub.close();
        });
      }
    };
  }
  subscribeManyEose(relays, filters, params) {
    const subcloser = this.subscribeMany(relays, filters, {
      ...params,
      oneose() {
        subcloser.close();
      }
    });
    return subcloser;
  }
  async querySync(relays, filter, params) {
    return new Promise(async (resolve) => {
      const events = [];
      this.subscribeManyEose(relays, [filter], {
        ...params,
        onevent(event) {
          events.push(event);
        },
        onclose(_) {
          resolve(events);
        }
      });
    });
  }
  async get(relays, filter, params) {
    filter.limit = 1;
    const events = await this.querySync(relays, filter, params);
    events.sort((a, b) => b.created_at - a.created_at);
    return events[0] || null;
  }
  publish(relays, event) {
    return relays.map(normalizeURL).map(async (url, i2, arr) => {
      if (arr.indexOf(url) !== i2) {
        return Promise.reject("duplicate url");
      }
      let r = await this.ensureRelay(url);
      return r.publish(event).then((reason) => {
        if (this.trackRelays) {
          let set = this.seenOn.get(event.id);
          if (!set) {
            set = /* @__PURE__ */ new Set();
            this.seenOn.set(event.id, set);
          }
          set.add(r);
        }
        return reason;
      });
    });
  }
  listConnectionStatus() {
    const map = /* @__PURE__ */ new Map();
    this.relays.forEach((relay, url) => map.set(url, relay.connected));
    return map;
  }
  destroy() {
    this.relays.forEach((conn) => conn.close());
    this.relays = /* @__PURE__ */ new Map();
  }
};

// pool.ts
var _WebSocket;
try {
  _WebSocket = WebSocket;
} catch {
}
var SimplePool = class extends AbstractSimplePool {
  constructor() {
    super({ verifyEvent, websocketImplementation: _WebSocket });
  }
};

// nip46.ts
var _fetch2;
try {
  _fetch2 = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch2 = fetchImplementation;
}
var BUNKER_REGEX = /^bunker:\/\/([0-9a-f]{64})\??([?\/\w:.=&%-]*)$/;
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function parseBunkerInput(input) {
  let match = input.match(BUNKER_REGEX);
  if (match) {
    try {
      const pubkey = match[1];
      const qs = new URLSearchParams(match[2]);
      return {
        pubkey,
        relays: qs.getAll("relay"),
        secret: qs.get("secret")
      };
    } catch (_err) {
    }
  }
  return queryBunkerProfile(input);
}
async function queryBunkerProfile(nip05) {
  const match = nip05.match(NIP05_REGEX);
  if (!match)
    return null;
  const [_, name = "_", domain] = match;
  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
    const res = await (await _fetch2(url, { redirect: "error" })).json();
    let pubkey = res.names[name];
    let relays = res.nip46[pubkey] || [];
    return { pubkey, relays, secret: null };
  } catch (_err) {
    return null;
  }
}
var BunkerSigner = class {
  pool;
  subCloser;
  isOpen;
  serial;
  idPrefix;
  listeners;
  waitingForAuth;
  secretKey;
  conversationKey;
  bp;
  cachedPubKey;
  constructor(clientSecretKey, bp, params = {}) {
    if (bp.relays.length === 0) {
      throw new Error("no relays are specified for this bunker");
    }
    this.pool = params.pool || new SimplePool();
    this.secretKey = clientSecretKey;
    this.conversationKey = getConversationKey(clientSecretKey, bp.pubkey);
    this.bp = bp;
    this.isOpen = false;
    this.idPrefix = Math.random().toString(36).substring(7);
    this.serial = 0;
    this.listeners = {};
    this.waitingForAuth = {};
    const listeners = this.listeners;
    const waitingForAuth = this.waitingForAuth;
    const convKey = this.conversationKey;
    this.subCloser = this.pool.subscribeMany(
      this.bp.relays,
      [{ kinds: [NostrConnect], authors: [bp.pubkey], "#p": [getPublicKey(this.secretKey)] }],
      {
        async onevent(event) {
          let o;
          try {
            o = JSON.parse(decrypt2(event.content, convKey));
          } catch (err) {
            o = JSON.parse(await decrypt(clientSecretKey, event.pubkey, event.content));
          }
          const { id, result, error } = o;
          if (result === "auth_url" && waitingForAuth[id]) {
            delete waitingForAuth[id];
            if (params.onauth) {
              params.onauth(error);
            } else {
              console.warn(
                `nostr-tools/nip46: remote signer ${bp.pubkey} tried to send an "auth_url"='${error}' but there was no onauth() callback configured.`
              );
            }
            return;
          }
          let handler = listeners[id];
          if (handler) {
            if (error)
              handler.reject(error);
            else if (result)
              handler.resolve(result);
            delete listeners[id];
          }
        }
      }
    );
    this.isOpen = true;
  }
  async close() {
    this.isOpen = false;
    this.subCloser.close();
  }
  async sendRequest(method, params) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isOpen)
          throw new Error("this signer is not open anymore, create a new one");
        this.serial++;
        const id = `${this.idPrefix}-${this.serial}`;
        const encryptedContent = encrypt(JSON.stringify({ id, method, params }), this.conversationKey);
        const verifiedEvent = finalizeEvent(
          {
            kind: NostrConnect,
            tags: [["p", this.bp.pubkey]],
            content: encryptedContent,
            created_at: Math.floor(Date.now() / 1e3)
          },
          this.secretKey
        );
        this.listeners[id] = { resolve, reject };
        this.waitingForAuth[id] = true;
        await Promise.any(this.pool.publish(this.bp.relays, verifiedEvent));
      } catch (err) {
        reject(err);
      }
    });
  }
  async ping() {
    let resp = await this.sendRequest("ping", []);
    if (resp !== "pong")
      throw new Error(`result is not pong: ${resp}`);
  }
  async connect() {
    await this.sendRequest("connect", [this.bp.pubkey, this.bp.secret || ""]);
  }
  async getPublicKey() {
    if (!this.cachedPubKey) {
      this.cachedPubKey = await this.sendRequest("get_public_key", []);
    }
    return this.cachedPubKey;
  }
  async getRelays() {
    return JSON.parse(await this.sendRequest("get_relays", []));
  }
  async signEvent(event) {
    let resp = await this.sendRequest("sign_event", [JSON.stringify(event)]);
    let signed = JSON.parse(resp);
    if (verifyEvent(signed)) {
      return signed;
    } else {
      throw new Error(`event returned from bunker is improperly signed: ${JSON.stringify(signed)}`);
    }
  }
  async nip04Encrypt(thirdPartyPubkey, plaintext) {
    return await this.sendRequest("nip04_encrypt", [thirdPartyPubkey, plaintext]);
  }
  async nip04Decrypt(thirdPartyPubkey, ciphertext) {
    return await this.sendRequest("nip04_decrypt", [thirdPartyPubkey, ciphertext]);
  }
  async nip44Encrypt(thirdPartyPubkey, plaintext) {
    return await this.sendRequest("nip44_encrypt", [thirdPartyPubkey, plaintext]);
  }
  async nip44Decrypt(thirdPartyPubkey, ciphertext) {
    return await this.sendRequest("nip44_decrypt", [thirdPartyPubkey, ciphertext]);
  }
};
async function createAccount(bunker, params, username, domain, email, localSecretKey = generateSecretKey()) {
  if (email && !EMAIL_REGEX.test(email))
    throw new Error("Invalid email");
  let rpc = new BunkerSigner(localSecretKey, bunker.bunkerPointer, params);
  let pubkey = await rpc.sendRequest("create_account", [username, domain, email || ""]);
  rpc.bp.pubkey = pubkey;
  await rpc.connect();
  return rpc;
}
async function fetchBunkerProviders(pool, relays) {
  const events = await pool.querySync(relays, {
    kinds: [Handlerinformation],
    "#k": [NostrConnect.toString()]
  });
  events.sort((a, b) => b.created_at - a.created_at);
  const validatedBunkers = await Promise.all(
    events.map(async (event, i2) => {
      try {
        const content = JSON.parse(event.content);
        try {
          if (events.findIndex((ev) => JSON.parse(ev.content).nip05 === content.nip05) !== i2)
            return void 0;
        } catch (err) {
        }
        const bp = await queryBunkerProfile(content.nip05);
        if (bp && bp.pubkey === event.pubkey && bp.relays.length) {
          return {
            bunkerPointer: bp,
            nip05: content.nip05,
            domain: content.nip05.split("@")[1],
            name: content.name || content.display_name,
            picture: content.picture,
            about: content.about,
            website: content.website,
            local: false
          };
        }
      } catch (err) {
        return void 0;
      }
    })
  );
  return validatedBunkers.filter((b) => b !== void 0);
}
export {
  BUNKER_REGEX,
  BunkerSigner,
  createAccount,
  fetchBunkerProviders,
  parseBunkerInput,
  queryBunkerProfile,
  useFetchImplementation
};
