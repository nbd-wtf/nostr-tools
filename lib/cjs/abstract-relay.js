"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// abstract-relay.ts
var abstract_relay_exports = {};
__export(abstract_relay_exports, {
  AbstractRelay: () => AbstractRelay,
  Subscription: () => Subscription
});
module.exports = __toCommonJS(abstract_relay_exports);

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

// kinds.ts
var ClientAuth = 22242;

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
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event)) {
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
