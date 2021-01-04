import BigInteger from 'bigi'
import ecurve from 'ecurve'

const curve = ecurve.getCurveByName('secp256k1')
const G = curve.G

export function pubkeyFromPrivate(privateHex) {
  const privKey = BigInteger.fromHex(privateHex)
  return G.multiply(privKey).getEncoded(true).slice(1).toString('hex')
}
