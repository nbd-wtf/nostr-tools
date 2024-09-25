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

// nip30.ts
var nip30_exports = {};
__export(nip30_exports, {
  EMOJI_SHORTCODE_REGEX: () => EMOJI_SHORTCODE_REGEX,
  matchAll: () => matchAll,
  regex: () => regex,
  replaceAll: () => replaceAll
});
module.exports = __toCommonJS(nip30_exports);
var EMOJI_SHORTCODE_REGEX = /:(\w+):/;
var regex = () => new RegExp(`\\B${EMOJI_SHORTCODE_REGEX.source}\\B`, "g");
function* matchAll(content) {
  const matches = content.matchAll(regex());
  for (const match of matches) {
    try {
      const [shortcode, name] = match;
      yield {
        shortcode,
        name,
        start: match.index,
        end: match.index + shortcode.length
      };
    } catch (_e) {
    }
  }
}
function replaceAll(content, replacer) {
  return content.replaceAll(regex(), (shortcode, name) => {
    return replacer({
      shortcode,
      name
    });
  });
}
