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

// nip10.ts
var nip10_exports = {};
__export(nip10_exports, {
  parse: () => parse
});
module.exports = __toCommonJS(nip10_exports);
function parse(event) {
  const result = {
    reply: void 0,
    root: void 0,
    mentions: [],
    profiles: [],
    quotes: []
  };
  let maybeParent;
  let maybeRoot;
  for (let i = event.tags.length - 1; i >= 0; i--) {
    const tag = event.tags[i];
    if (tag[0] === "e" && tag[1]) {
      const [_, eTagEventId, eTagRelayUrl, eTagMarker, eTagAuthor] = tag;
      const eventPointer = {
        id: eTagEventId,
        relays: eTagRelayUrl ? [eTagRelayUrl] : [],
        author: eTagAuthor
      };
      if (eTagMarker === "root") {
        result.root = eventPointer;
        continue;
      }
      if (eTagMarker === "reply") {
        result.reply = eventPointer;
        continue;
      }
      if (eTagMarker === "mention") {
        result.mentions.push(eventPointer);
        continue;
      }
      if (!maybeParent) {
        maybeParent = eventPointer;
      } else {
        maybeRoot = eventPointer;
      }
      result.mentions.push(eventPointer);
      continue;
    }
    if (tag[0] === "q" && tag[1]) {
      const [_, eTagEventId, eTagRelayUrl] = tag;
      result.quotes.push({
        id: eTagEventId,
        relays: eTagRelayUrl ? [eTagRelayUrl] : []
      });
    }
    if (tag[0] === "p" && tag[1]) {
      result.profiles.push({
        pubkey: tag[1],
        relays: tag[2] ? [tag[2]] : []
      });
      continue;
    }
  }
  if (!result.root) {
    result.root = maybeRoot || maybeParent || result.reply;
  }
  if (!result.reply) {
    result.reply = maybeParent || result.root;
  }
  ;
  [result.reply, result.root].forEach((ref) => {
    if (!ref)
      return;
    let idx = result.mentions.indexOf(ref);
    if (idx !== -1) {
      result.mentions.splice(idx, 1);
    }
    if (ref.author) {
      let author = result.profiles.find((p) => p.pubkey === ref.author);
      if (author && author.relays) {
        if (!ref.relays) {
          ref.relays = [];
        }
        author.relays.forEach((url) => {
          if (ref.relays?.indexOf(url) === -1)
            ref.relays.push(url);
        });
        author.relays = ref.relays;
      }
    }
  });
  result.mentions.forEach((ref) => {
    if (ref.author) {
      let author = result.profiles.find((p) => p.pubkey === ref.author);
      if (author && author.relays) {
        if (!ref.relays) {
          ref.relays = [];
        }
        author.relays.forEach((url) => {
          if (ref.relays.indexOf(url) === -1)
            ref.relays.push(url);
        });
        author.relays = ref.relays;
      }
    }
  });
  return result;
}
