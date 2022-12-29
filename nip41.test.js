/* eslint-env jest */

const secp256k1 = require('@noble/secp256k1')
const {
  getPublicKey,
  validateEvent,
  verifySignature,
  generatePrivateKey,
  nip41
} = require('./lib/nostr.cjs')

test('sanity', () => {
  let sk = generatePrivateKey()

  expect(getPublicKey(sk)).toEqual(secp256k1.Point.fromPrivateKey(sk).toHexX())
})

test('key arithmetics', () => {
  expect(
    secp256k1.utils.mod(secp256k1.CURVE.n + 1n, secp256k1.CURVE.n)
  ).toEqual(1n)

  let veryHighPoint = secp256k1.Point.fromPrivateKey(
    (secp256k1.CURVE.n - 1n).toString(16).padStart(64, '0')
  )
  let pointAt2 = secp256k1.Point.fromPrivateKey(
    2n.toString(16).padStart(64, '0')
  )
  let pointAt1 = secp256k1.Point.fromPrivateKey(
    1n.toString(16).padStart(64, '0')
  )
  expect(veryHighPoint.add(pointAt2)).toEqual(pointAt1)

  expect(
    secp256k1.getPublicKey(1n.toString(16).padStart(64, '0'), true)
  ).toEqual(pointAt1.toRawBytes(true))
})

test('testing getting child keys compatibility', () => {
  let sk = '2222222222222222222222222222222222222222222222222222222222222222'
  let pk = secp256k1.getPublicKey(sk, true)
  let hsk = '3333333333333333333333333333333333333333333333333333333333333333'
  let hpk = secp256k1.getPublicKey(hsk, true)

  expect(secp256k1.utils.bytesToHex(nip41.getChildPublicKey(pk, hpk))).toEqual(
    secp256k1.utils.bytesToHex(
      secp256k1.getPublicKey(nip41.getChildPrivateKey(sk, hsk), true)
    )
  )
})

test('more testing child key derivation', () => {
  ;[
    {
      sk: '448aedc74f93b71af69ed7c6860d95f148d796355517779c7631fdb64a085b26',
      hsk: '00ee15a0a117e818073b92d7f3360029f6e091035534348f713a23d440bd8f58',
      pk: '02e3990b0eb40452a8ffbd9fe99037deb7beeb6ab26020e8c0e8284f3009a56d0c',
      hpk: '029e9cb07f3a3b8abcad629920d4a5460aefb6b7c08704b7f1ced8648b007ef65f'
    },
    {
      sk: '778aedc74f93b71af69ed7c6860d95f148d796355517779c7631fdb64a085b26',
      hsk: '99ee15a0a117e818073b92d7f3360029f6e091035534348f713a23d440bd8f58',
      pk: '020d09894e321f53a7ac8bc003cb1563a4857d57ea69c39ab7189e2cccedc17d1b',
      hpk: '0358fe19e14c78c4a8c0037a2b9d3e3a714717f2a2d8dd54a5e88d283440dcb28a'
    },
    {
      sk: '2eb5edc74f93b71af69ed7c6860d95f148d796355517779c7631fdb64a085b26',
      hsk: '65d515a0a117e818073b92d7f3360029f6e091035534348f713a23d440bd8f58',
      pk: '03dd651a07dc6c9a54b596f6492c9623a595cb48e31af04f8c322d4ce81accb2b0',
      hpk: '03b8c98d920141a1e168d21e9315cf933a601872ebf57751b30797fb98526c2f4f'
    }
  ].forEach(({pk, hpk, sk, hsk}) => {
    expect(
      secp256k1.utils.bytesToHex(secp256k1.getPublicKey(sk, true))
    ).toEqual(pk)
    expect(
      secp256k1.utils.bytesToHex(secp256k1.getPublicKey(hsk, true))
    ).toEqual(hpk)

    expect(
      secp256k1.utils.bytesToHex(
        nip41.getChildPublicKey(
          secp256k1.utils.hexToBytes(pk),
          secp256k1.utils.hexToBytes(hpk)
        )
      )
    ).toEqual(
      secp256k1.utils.bytesToHex(
        secp256k1.getPublicKey(nip41.getChildPrivateKey(sk, hsk), true)
      )
    )
  })
})

test('generating a revocation event and validating it', () => {
  const mnemonic =
    'air property excess weird rare rival fade intact brave office mirror wait'

  const firstKey = nip41.getPrivateKeyAtIndex(mnemonic, 9)
  // expect(firstKey).toEqual(
  //   '8495ba55f56485d378aa275604a45e76abbcae177e374fa06af5770c3b8e24af'
  // )
  const firstPubkey = getPublicKey(firstKey)
  // expect(firstPubkey).toEqual(
  //   '35246813a0dd45e74ce22ecdf052cca8ed47759c8f8d412c281dc2755110956f'
  // )

  // first key is compromised, revoke it
  let {parentPrivateKey, event} = nip41.buildRevocationEvent(
    mnemonic,
    firstPubkey
  )

  const secondKey = nip41.getPrivateKeyAtIndex(mnemonic, 8)
  expect(parentPrivateKey).toEqual(secondKey)
  expect(secondKey).toEqual(
    '1b311655ef73bed3bbebc83d0cb3eef42c6aff45f944e3a0c263eb6fdf98c617'
  )

  expect(event).toHaveProperty('kind', 13)
  expect(event.tags).toHaveLength(2)
  expect(event.tags[0]).toHaveLength(2)
  expect(event.tags[1]).toHaveLength(2)
  expect(event.tags[0][0]).toEqual('p')
  expect(event.tags[1][0]).toEqual('hidden-key')

  let hiddenKey = secp256k1.utils.hexToBytes(event.tags[1][1])

  let pubkeyAlt1 = secp256k1.utils
    .bytesToHex(
      nip41.getChildPublicKey(
        secp256k1.utils.hexToBytes('02' + event.pubkey),
        hiddenKey
      )
    )
    .slice(2)
  let pubkeyAlt2 = secp256k1.utils
    .bytesToHex(
      nip41.getChildPublicKey(
        secp256k1.utils.hexToBytes('03' + event.pubkey),
        hiddenKey
      )
    )
    .slice(2)

  expect([pubkeyAlt1, pubkeyAlt2]).toContain(event.tags[0][1])

  // receiver of revocation event can validate it
  let secondPubkey = getPublicKey(secondKey)
  expect(event.pubkey).toEqual(secondPubkey)
  expect(validateEvent(event)).toBeTruthy()
  expect(verifySignature(event)).toBeTruthy()
  expect(nip41.validateRevocation(event)).toBeTruthy()
})
