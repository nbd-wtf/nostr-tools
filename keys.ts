export async function generatePrivateKey(): Promise<string> {
  const [{ schnorr }, { bytesToHex }] = await Promise.all([
    import('@noble/curves/secp256k1'),
    import('@noble/hashes/utils')
  ])

  return bytesToHex(schnorr.utils.randomPrivateKey())
}

export async function getPublicKey(privateKey: string): Promise<string> {
  const [{ schnorr }, { bytesToHex }] = await Promise.all([
    import('@noble/curves/secp256k1'),
    import('@noble/hashes/utils')
  ])

  return bytesToHex(schnorr.getPublicKey(privateKey))
}
