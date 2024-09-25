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

// nip75.ts
var nip75_exports = {};
__export(nip75_exports, {
  generateGoalEventTemplate: () => generateGoalEventTemplate,
  validateZapGoalEvent: () => validateZapGoalEvent
});
module.exports = __toCommonJS(nip75_exports);

// kinds.ts
var ZapGoal = 9041;

// nip75.ts
function generateGoalEventTemplate({
  amount,
  content,
  relays,
  a,
  closedAt,
  image,
  r,
  summary,
  zapTags
}) {
  const tags = [
    ["amount", amount],
    ["relays", ...relays]
  ];
  closedAt && tags.push(["closed_at", closedAt.toString()]);
  image && tags.push(["image", image]);
  summary && tags.push(["summary", summary]);
  r && tags.push(["r", r]);
  a && tags.push(["a", a]);
  zapTags && tags.push(...zapTags);
  const eventTemplate = {
    created_at: Math.floor(Date.now() / 1e3),
    kind: ZapGoal,
    content,
    tags
  };
  return eventTemplate;
}
function validateZapGoalEvent(event) {
  if (event.kind !== ZapGoal)
    return false;
  const requiredTags = ["amount", "relays"];
  for (const tag of requiredTags) {
    if (!event.tags.find(([t]) => t == tag))
      return false;
  }
  return true;
}
