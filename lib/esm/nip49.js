// nip49.ts
import { scrypt } from "@noble/hashes/scrypt";
import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { concatBytes as concatBytes2, randomBytes } from "@noble/hashes/utils";

// nip19.ts
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import { bech32 } from "@scure/base";
var Bech32MaxSize = 5e3;
function encodeBech32(prefix, data) {
  let words = bech32.toWords(data);
  return bech32.encode(prefix, words, Bech32MaxSize);
}
function encodeBytes(prefix, bytes) {
  return encodeBech32(prefix, bytes);
}

// nip49.ts
import { bech32 as bech322 } from "@scure/base";
function encrypt(sec, password, logn = 16, ksb = 2) {
  let salt = randomBytes(16);
  let n = 2 ** logn;
  let key = scrypt(password.normalize("NFKC"), salt, { N: n, r: 8, p: 1, dkLen: 32 });
  let nonce = randomBytes(24);
  let aad = Uint8Array.from([ksb]);
  let xc2p1 = xchacha20poly1305(key, nonce, aad);
  let ciphertext = xc2p1.encrypt(sec);
  let b = concatBytes2(Uint8Array.from([2]), Uint8Array.from([logn]), salt, nonce, aad, ciphertext);
  return encodeBytes("ncryptsec", b);
}
function decrypt(ncryptsec, password) {
  let { prefix, words } = bech322.decode(ncryptsec, Bech32MaxSize);
  if (prefix !== "ncryptsec") {
    throw new Error(`invalid prefix ${prefix}, expected 'ncryptsec'`);
  }
  let b = new Uint8Array(bech322.fromWords(words));
  let version = b[0];
  if (version !== 2) {
    throw new Error(`invalid version ${version}, expected 0x02`);
  }
  let logn = b[1];
  let n = 2 ** logn;
  let salt = b.slice(2, 2 + 16);
  let nonce = b.slice(2 + 16, 2 + 16 + 24);
  let ksb = b[2 + 16 + 24];
  let aad = Uint8Array.from([ksb]);
  let ciphertext = b.slice(2 + 16 + 24 + 1);
  let key = scrypt(password.normalize("NFKC"), salt, { N: n, r: 8, p: 1, dkLen: 32 });
  let xc2p1 = xchacha20poly1305(key, nonce, aad);
  let sec = xc2p1.decrypt(ciphertext);
  return sec;
}
export {
  decrypt,
  encrypt
};
