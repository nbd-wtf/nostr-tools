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

// nip94.ts
var nip94_exports = {};
__export(nip94_exports, {
  generateEventTemplate: () => generateEventTemplate,
  parseEvent: () => parseEvent,
  validateEvent: () => validateEvent
});
module.exports = __toCommonJS(nip94_exports);

// kinds.ts
var FileMetadata = 1063;

// nip94.ts
function generateEventTemplate(fileMetadata) {
  const eventTemplate = {
    content: fileMetadata.content,
    created_at: Math.floor(Date.now() / 1e3),
    kind: FileMetadata,
    tags: [
      ["url", fileMetadata.url],
      ["m", fileMetadata.m],
      ["x", fileMetadata.x],
      ["ox", fileMetadata.ox]
    ]
  };
  if (fileMetadata.size)
    eventTemplate.tags.push(["size", fileMetadata.size]);
  if (fileMetadata.dim)
    eventTemplate.tags.push(["dim", fileMetadata.dim]);
  if (fileMetadata.i)
    eventTemplate.tags.push(["i", fileMetadata.i]);
  if (fileMetadata.blurhash)
    eventTemplate.tags.push(["blurhash", fileMetadata.blurhash]);
  if (fileMetadata.thumb)
    eventTemplate.tags.push(["thumb", fileMetadata.thumb]);
  if (fileMetadata.image)
    eventTemplate.tags.push(["image", fileMetadata.image]);
  if (fileMetadata.summary)
    eventTemplate.tags.push(["summary", fileMetadata.summary]);
  if (fileMetadata.alt)
    eventTemplate.tags.push(["alt", fileMetadata.alt]);
  if (fileMetadata.fallback)
    fileMetadata.fallback.forEach((url) => eventTemplate.tags.push(["fallback", url]));
  return eventTemplate;
}
function validateEvent(event) {
  if (event.kind !== FileMetadata)
    return false;
  if (!event.content)
    return false;
  const requiredTags = ["url", "m", "x", "ox"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  const sizeTag = event.tags.find(([t]) => t == "size");
  if (sizeTag && isNaN(Number(sizeTag[1])))
    return false;
  const dimTag = event.tags.find(([t]) => t == "dim");
  if (dimTag && !dimTag[1].match(/^\d+x\d+$/))
    return false;
  return true;
}
function parseEvent(event) {
  if (!validateEvent(event)) {
    throw new Error("Invalid event");
  }
  const fileMetadata = {
    content: event.content,
    url: "",
    m: "",
    x: "",
    ox: ""
  };
  for (const [tag, value] of event.tags) {
    switch (tag) {
      case "url":
        fileMetadata.url = value;
        break;
      case "m":
        fileMetadata.m = value;
        break;
      case "x":
        fileMetadata.x = value;
        break;
      case "ox":
        fileMetadata.ox = value;
        break;
      case "size":
        fileMetadata.size = value;
        break;
      case "dim":
        fileMetadata.dim = value;
        break;
      case "magnet":
        fileMetadata.magnet = value;
        break;
      case "i":
        fileMetadata.i = value;
        break;
      case "blurhash":
        fileMetadata.blurhash = value;
        break;
      case "thumb":
        fileMetadata.thumb = value;
        break;
      case "image":
        fileMetadata.image = value;
        break;
      case "summary":
        fileMetadata.summary = value;
        break;
      case "alt":
        fileMetadata.alt = value;
        break;
      case "fallback":
        fileMetadata.fallback ??= [];
        fileMetadata.fallback.push(value);
        break;
    }
  }
  return fileMetadata;
}
