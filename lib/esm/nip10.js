// nip10.ts
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
export {
  parse
};
