// nip40.ts
function getExpiration(event) {
  const tag = event.tags.find(([name]) => name === "expiration");
  if (tag) {
    return new Date(parseInt(tag[1]) * 1e3);
  }
}
function isEventExpired(event) {
  const expiration = getExpiration(event);
  if (expiration) {
    return Date.now() > expiration.getTime();
  } else {
    return false;
  }
}
async function waitForExpire(event) {
  const expiration = getExpiration(event);
  if (expiration) {
    const diff = expiration.getTime() - Date.now();
    if (diff > 0) {
      await sleep(diff);
      return event;
    } else {
      return event;
    }
  } else {
    throw new Error("Event has no expiration");
  }
}
function onExpire(event, callback) {
  waitForExpire(event).then(callback).catch(() => {
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export {
  getExpiration,
  isEventExpired,
  onExpire,
  waitForExpire
};
