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

// nip99.ts
var nip99_exports = {};
__export(nip99_exports, {
  generateEventTemplate: () => generateEventTemplate,
  parseEvent: () => parseEvent,
  validateEvent: () => validateEvent
});
module.exports = __toCommonJS(nip99_exports);

// kinds.ts
var ClassifiedListing = 30402;
var DraftClassifiedListing = 30403;

// nip99.ts
function validateEvent(event) {
  if (![ClassifiedListing, DraftClassifiedListing].includes(event.kind))
    return false;
  const requiredTags = ["d", "title", "summary", "location", "published_at", "price"];
  const requiredTagCount = requiredTags.length;
  const tagCounts = {};
  if (event.tags.length < requiredTagCount)
    return false;
  for (const tag of event.tags) {
    if (tag.length < 2)
      return false;
    const [tagName, ...tagValues] = tag;
    if (tagName == "published_at") {
      const timestamp = parseInt(tagValues[0]);
      if (isNaN(timestamp))
        return false;
    } else if (tagName == "price") {
      if (tagValues.length < 2)
        return false;
      const price = parseInt(tagValues[0]);
      if (isNaN(price) || tagValues[1].length != 3)
        return false;
    } else if ((tagName == "e" || tagName == "a") && tag.length != 3) {
      return false;
    }
    if (requiredTags.includes(tagName)) {
      tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
    }
  }
  return Object.values(tagCounts).every((count) => count == 1) && Object.keys(tagCounts).length == requiredTagCount;
}
function parseEvent(event) {
  if (!validateEvent(event)) {
    throw new Error("Invalid event");
  }
  const listing = {
    isDraft: event.kind === DraftClassifiedListing,
    title: "",
    summary: "",
    content: event.content,
    publishedAt: "",
    location: "",
    price: {
      amount: "",
      currency: ""
    },
    images: [],
    hashtags: [],
    additionalTags: {}
  };
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    const [tagName, ...tagValues] = tag;
    if (tagName == "title") {
      listing.title = tagValues[0];
    } else if (tagName == "summary") {
      listing.summary = tagValues[0];
    } else if (tagName == "published_at") {
      listing.publishedAt = tagValues[0];
    } else if (tagName == "location") {
      listing.location = tagValues[0];
    } else if (tagName == "price") {
      listing.price.amount = tagValues[0];
      listing.price.currency = tagValues[1];
      if (tagValues.length == 3) {
        listing.price.frequency = tagValues[2];
      }
    } else if (tagName == "image") {
      listing.images.push({
        url: tagValues[0],
        dimensions: tagValues?.[1] ?? void 0
      });
    } else if (tagName == "t") {
      listing.hashtags.push(tagValues[0]);
    } else if (tagName == "e" || tagName == "a") {
      listing.additionalTags[tagName] = [...tagValues];
    }
  }
  return listing;
}
function generateEventTemplate(listing) {
  const priceTag = ["price", listing.price.amount, listing.price.currency];
  if (listing.price.frequency)
    priceTag.push(listing.price.frequency);
  const tags = [
    ["d", listing.title.trim().toLowerCase().replace(/ /g, "-")],
    ["title", listing.title],
    ["published_at", listing.publishedAt],
    ["summary", listing.summary],
    ["location", listing.location],
    priceTag
  ];
  for (let i = 0; i < listing.images.length; i++) {
    const image = listing.images[i];
    const imageTag = ["image", image.url];
    if (image.dimensions)
      imageTag.push(image.dimensions);
    tags.push(imageTag);
  }
  for (let i = 0; i < listing.hashtags.length; i++) {
    const t = listing.hashtags[i];
    tags.push(["t", t]);
  }
  for (const [key, value] of Object.entries(listing.additionalTags)) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const val = value[i];
        tags.push([key, val]);
      }
    } else {
      tags.push([key, value]);
    }
  }
  return {
    kind: listing.isDraft ? DraftClassifiedListing : ClassifiedListing,
    content: listing.content,
    tags,
    created_at: Math.floor(Date.now() / 1e3)
  };
}
