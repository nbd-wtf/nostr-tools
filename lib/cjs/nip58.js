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

// nip58.ts
var nip58_exports = {};
__export(nip58_exports, {
  generateBadgeAwardEventTemplate: () => generateBadgeAwardEventTemplate,
  generateBadgeDefinitionEventTemplate: () => generateBadgeDefinitionEventTemplate,
  generateProfileBadgesEventTemplate: () => generateProfileBadgesEventTemplate,
  validateBadgeAwardEvent: () => validateBadgeAwardEvent,
  validateBadgeDefinitionEvent: () => validateBadgeDefinitionEvent,
  validateProfileBadgesEvent: () => validateProfileBadgesEvent
});
module.exports = __toCommonJS(nip58_exports);

// kinds.ts
var BadgeAward = 8;
var ProfileBadges = 30008;
var BadgeDefinition = 30009;

// nip58.ts
function generateBadgeDefinitionEventTemplate({
  d,
  description,
  image,
  name,
  thumbs
}) {
  const tags = [["d", d]];
  name && tags.push(["name", name]);
  description && tags.push(["description", description]);
  image && tags.push(["image", ...image]);
  if (thumbs) {
    for (const thumb of thumbs) {
      tags.push(["thumb", ...thumb]);
    }
  }
  const eventTemplate = {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: BadgeDefinition,
    tags
  };
  return eventTemplate;
}
function validateBadgeDefinitionEvent(event) {
  if (event.kind !== BadgeDefinition)
    return false;
  const requiredTags = ["d"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
function generateBadgeAwardEventTemplate({ a, p }) {
  const tags = [["a", a]];
  for (const _p of p) {
    tags.push(["p", ..._p]);
  }
  const eventTemplate = {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: BadgeAward,
    tags
  };
  return eventTemplate;
}
function validateBadgeAwardEvent(event) {
  if (event.kind !== BadgeAward)
    return false;
  const requiredTags = ["a", "p"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
function generateProfileBadgesEventTemplate({ badges }) {
  const tags = [["d", "profile_badges"]];
  for (const badge of badges) {
    tags.push(["a", badge.a], ["e", ...badge.e]);
  }
  const eventTemplate = {
    content: "",
    created_at: Math.floor(Date.now() / 1e3),
    kind: ProfileBadges,
    tags
  };
  return eventTemplate;
}
function validateProfileBadgesEvent(event) {
  if (event.kind !== ProfileBadges)
    return false;
  const requiredTags = ["d"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
