/* eslint-env jest */

const {nip26, getPublicKey, generatePrivateKey} = require('./lib/nostr.cjs')

test('parse good delegation from NIP', async () => {
  expect(
    nip26.getDelegator({
      id: 'a080fd288b60ac2225ff2e2d815291bd730911e583e177302cc949a15dc2b2dc',
      pubkey:
        '62903b1ff41559daf9ee98ef1ae67cc52f301bb5ce26d14baba3052f649c3f49',
      created_at: 1660896109,
      kind: 1,
      tags: [
        [
          'delegation',
          '86f0689bd48dcd19c67a19d994f938ee34f251d8c39976290955ff585f2db42e',
          'kind=1&created_at>1640995200',
          'c33c88ba78ec3c760e49db591ac5f7b129e3887c8af7729795e85a0588007e5ac89b46549232d8f918eefd73e726cb450135314bfda419c030d0b6affe401ec1'
        ]
      ],
      content: 'Hello world',
      sig: 'cd4a3cd20dc61dcbc98324de561a07fd23b3d9702115920c0814b5fb822cc5b7c5bcdaf3fa326d24ed50c5b9c8214d66c75bae34e3a84c25e4d122afccb66eb6'
    })
  ).toEqual('86f0689bd48dcd19c67a19d994f938ee34f251d8c39976290955ff585f2db42e')
})

test('parse bad delegations', async () => {
  expect(
    nip26.getDelegator({
      id: 'a080fd288b60ac2225ff2e2d815291bd730911e583e177302cc949a15dc2b2dc',
      pubkey:
        '62903b1ff41559daf9ee98ef1ae67cc52f301bb5ce26d14baba3052f649c3f49',
      created_at: 1660896109,
      kind: 1,
      tags: [
        [
          'delegation',
          '86f0689bd48dcd19c67a19d994f938ee34f251d8c39976290955ff585f2db42f',
          'kind=1&created_at>1640995200',
          'c33c88ba78ec3c760e49db591ac5f7b129e3887c8af7729795e85a0588007e5ac89b46549232d8f918eefd73e726cb450135314bfda419c030d0b6affe401ec1'
        ]
      ],
      content: 'Hello world',
      sig: 'cd4a3cd20dc61dcbc98324de561a07fd23b3d9702115920c0814b5fb822cc5b7c5bcdaf3fa326d24ed50c5b9c8214d66c75bae34e3a84c25e4d122afccb66eb6'
    })
  ).toEqual(null)

  expect(
    nip26.getDelegator({
      id: 'a080fd288b60ac2225ff2e2d815291bd730911e583e177302cc949a15dc2b2dc',
      pubkey:
        '62903b1ff41559daf9ee98ef1ae67cc52f301bb5ce26d14baba3052f649c3f49',
      created_at: 1660896109,
      kind: 1,
      tags: [
        [
          'delegation',
          '86f0689bd48dcd19c67a19d994f938ee34f251d8c39976290955ff585f2db42e',
          'kind=1&created_at>1740995200',
          'c33c88ba78ec3c760e49db591ac5f7b129e3887c8af7729795e85a0588007e5ac89b46549232d8f918eefd73e726cb450135314bfda419c030d0b6affe401ec1'
        ]
      ],
      content: 'Hello world',
      sig: 'cd4a3cd20dc61dcbc98324de561a07fd23b3d9702115920c0814b5fb822cc5b7c5bcdaf3fa326d24ed50c5b9c8214d66c75bae34e3a84c25e4d122afccb66eb6'
    })
  ).toEqual(null)

  expect(
    nip26.getDelegator({
      id: 'a080fd288b60ac2225ff2e2d815291bd730911e583e177302cc949a15dc2b2dc',
      pubkey:
        '62903b1ff41559daf9ee98ef1ae67c152f301bb5ce26d14baba3052f649c3f49',
      created_at: 1660896109,
      kind: 1,
      tags: [
        [
          'delegation',
          '86f0689bd48dcd19c67a19d994f938ee34f251d8c39976290955ff585f2db42e',
          'kind=1&created_at>1640995200',
          'c33c88ba78ec3c760e49db591ac5f7b129e3887c8af7729795e85a0588007e5ac89b46549232d8f918eefd73e726cb450135314bfda419c030d0b6affe401ec1'
        ]
      ],
      content: 'Hello world',
      sig: 'cd4a3cd20dc61dcbc98324de561a07fd23b3d9702115920c0814b5fb822cc5b7c5bcdaf3fa326d24ed50c5b9c8214d66c75bae34e3a84c25e4d122afccb66eb6'
    })
  ).toEqual(null)
})

test('create and verify delegation', async () => {
  let sk1 = generatePrivateKey()
  let pk1 = getPublicKey(sk1)
  let sk2 = generatePrivateKey()
  let pk2 = getPublicKey(sk2)
  let delegation = nip26.createDelegation(sk1, {pubkey: pk2, kind: 1})
  expect(delegation).toHaveProperty('from', pk1)
  expect(delegation).toHaveProperty('to', pk2)
  expect(delegation).toHaveProperty('cond', 'kind=1')

  let event = {
    kind: 1,
    tags: [['delegation', delegation.from, delegation.cond, delegation.sig]],
    pubkey: pk2
  }
  expect(nip26.getDelegator(event)).toEqual(pk1)
})
