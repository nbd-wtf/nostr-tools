// nip13.ts
import { bytesToHex } from "@noble/hashes/utils";
import { sha256 } from "@noble/hashes/sha256";

// utils.ts
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();

// nip13.ts
function getPow(hex) {
  let count = 0;
  for (let i = 0; i < 64; i += 8) {
    const nibble = parseInt(hex.substring(i, i + 8), 16);
    if (nibble === 0) {
      count += 32;
    } else {
      count += Math.clz32(nibble);
      break;
    }
  }
  return count;
}
function minePow(unsigned, difficulty) {
  let count = 0;
  const event = unsigned;
  const tag = ["nonce", count.toString(), difficulty.toString()];
  event.tags.push(tag);
  while (true) {
    const now = Math.floor(new Date().getTime() / 1e3);
    if (now !== event.created_at) {
      count = 0;
      event.created_at = now;
    }
    tag[1] = (++count).toString();
    event.id = fastEventHash(event);
    if (getPow(event.id) >= difficulty) {
      break;
    }
  }
  return event;
}
function fastEventHash(evt) {
  return bytesToHex(
    sha256(utf8Encoder.encode(JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content])))
  );
}
export {
  fastEventHash,
  getPow,
  minePow
};
