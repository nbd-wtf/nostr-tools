import * as secp256k1 from '@noble/secp256k1'

/** Get POW difficulty from a Nostr hex ID. */
export function getPow(id: string): number {
  return getLeadingZeroBits(secp256k1.utils.hexToBytes(id))
}

/**
 * Get number of leading 0 bits. Adapted from nostream.
 * https://github.com/Cameri/nostream/blob/fb6948fd83ca87ce552f39f9b5eb780ea07e272e/src/utils/proof-of-work.ts
 */
function getLeadingZeroBits(hash: Uint8Array): number {
  let total: number, i: number, bits: number

  for (i = 0, total = 0; i < hash.length; i++) {
    bits = msb(hash[i])
    total += bits
    if (bits !== 8) {
      break
    }
  }
  return total
}

/**
 * Adapted from nostream.
 * https://github.com/Cameri/nostream/blob/fb6948fd83ca87ce552f39f9b5eb780ea07e272e/src/utils/proof-of-work.ts
 */
function msb(b: number) {
  let n = 0

  if (b === 0) {
    return 8
  }

  // eslint-disable-next-line no-cond-assign
  while (b >>= 1) {
    n++
  }

  return 7 - n
}
