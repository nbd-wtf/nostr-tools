import * as secp256k1 from '@noble/secp256k1'

import {hkdf} from '@noble/hashes/hkdf'

import {sha256} from '@noble/hashes/sha256'

import {queryProfile} from './nip05'

import {getPublicKey} from './keys'
import {ProfilePointer} from './nip19'

/**
 * 
 * @param username nip02/nip05 identifier
 * @param caip10 CAIP identifier for the blockchain account
 * @param sig Deterministic signature from X-wallet provider
 * @param password Optional password
 * @returns Deterministic private key as hex string
 */
export async function privateKeyFromX(
  username: string,
  caip10: string,
  sig: string,
  password: string | undefined
): Promise < string > {
  if (sig.length < 64)
    throw new Error("Signature too short");
  let inputKey = await sha256(secp256k1.utils.hexToBytes(sig.toLowerCase().startsWith("0x") ? sig.slice(2) : sig))
  let info = `${caip10}:${username}`
  let salt = await sha256(`${info}:${password?password:""}:${sig.slice(-64)}`)
  let hashKey = await hkdf(sha256, inputKey, salt, info, 42)
  return secp256k1.utils.bytesToHex(secp256k1.utils.hashToPrivateKey(hashKey))
}

export let registerWithX = privateKeyFromX // alias
//export let signupWithX = privateKeyFromX // alias
export let loginWithX = signInWithX // alias

/**
 * 
 * @param username nip02/nip05 identifier
 * @param caip10 CAIP identifier for the blockchain account
 * @param sig Deterministic signature from X-wallet provider
 * @param password Optional password
 * @returns 
 */
export async function signInWithX(
  username: string,
  caip10: string,
  sig: string,
  password: string | undefined
): Promise < {
  petname: string,
  profile: ProfilePointer | null,
  privkey: string
} > {
  let profile = null
  let petname = username
  if (username.includes(".")) {
    try {
      profile = await queryProfile(username)
    } catch (e) {
      console.log(e)
      throw new Error("Nostr Profile Not Found")
    }
    if(profile == null){
      throw new Error("Nostr Profile Not Found")
    } 
    petname = (username.split("@").length == 2) ? username.split("@")[0] : username.split(".")[0]
  }
  let privkey = await privateKeyFromX(username, caip10, sig, password)
  let pubkey = getPublicKey(privkey)
  if (profile?.pubkey && pubkey !== profile.pubkey) {
    throw new Error("Invalid Signature/Password")
  }
  return {
    petname,
    profile,
    privkey
  }
}
