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
export {
  generateBadgeAwardEventTemplate,
  generateBadgeDefinitionEventTemplate,
  generateProfileBadgesEventTemplate,
  validateBadgeAwardEvent,
  validateBadgeDefinitionEvent,
  validateProfileBadgesEvent
};
