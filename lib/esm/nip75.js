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
export {
  generateGoalEventTemplate,
  validateZapGoalEvent
};
