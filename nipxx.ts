import * as secp256k1 from '@noble/secp256k1'

import {
  hkdf
} from '@noble/hashes/hkdf'
import {
  sha256
} from '@noble/hashes/sha256'

import {
  queryProfile
} from './nip05'
import {
  getPublicKey
} from './keys'
import {
  ProfilePointer
} from './nip19'

export async function privateKeyFromX(
  username: string,
  caip10: string,
  sig: string,
  password: string | undefined,
): Promise < string > {
  if(sig.length < 64)
    throw new Error("Signature too short");
  let inputKey = await sha256(secp256k1.utils.hexToBytes(sig.toLowerCase().startsWith("0x")?sig.slice(2):sig))
  let info = `${caip10}:${username}`
  let salt = await sha256(`${info}:${password?password:""}:${sig.slice(-64)}`)
  let hashKey = await hkdf(sha256, inputKey, salt, info, 42)
  return secp256k1.utils.bytesToHex(secp256k1.utils.hashToPrivateKey(hashKey))
}

export async function signInWithX (
  username: string,
  password: string,
  caip10: string,
  sig: string
): Promise < {
  username: string,
  profile: ProfilePointer | null,
  privkey: string
}> {
  let profile = null
  if (username.includes(".")) {
    profile = await queryProfile(username)
  }
  let pubkey = profile?.pubkey
  let privkey = await privateKeyFromX(username, password, caip10, sig)
  if (pubkey != getPublicKey(privkey)) {
    //return null; //??
  }
  // WIP
  return {
    username,
    profile,
    privkey
  }
}

export let loginWithX = signInWithX

export async function registerWithX (
  username: string,
  password: string,
  caip10: string,
  sig: string
): Promise < {
  username: string,
  profile: ProfilePointer | null,
  privkey: string
} | null > {
  let profile = null
  if (username.includes(".")) {
    profile = await queryProfile(username)
  }
  let pubkey = profile?.pubkey
  let privkey = await privateKeyFromX(username, password, caip10, sig)
  if (pubkey != getPublicKey(privkey)) {
    return null; //??
  }

  return {
    username,
    profile,
    privkey
  }
}