const { nip04, Path, getEventHash, signEvent, generatePrivateKey, getPublicKey } = require('./lib/nostr.cjs')

const privkey = generatePrivateKey()
const pubkey = getPublicKey(privkey)
const created_at = Math.floor(Date.now() / 1000)
const publish = async (incompleteEvent) => {
  const event = Object.assign({ pubkey, created_at }, incompleteEvent)
  event.id = getEventHash(event)
  event.sig = signEvent(event, privkey)
  return event
}
const subscribe = jest.fn()
const unsubscribe = jest.fn()

const encrypt = async (data) => {
  const encrypted = await nip04.encrypt(privkey, pubkey, data)
  console.log('encrypted', encrypted)
  return encrypted
}
const decrypt = async (data) => {
  const decrypted = await nip04.decrypt(privkey, pubkey, data)
  console.log('decrypted', decrypted)
  return decrypted
}

const createCallback = (done) => (value, path, event) => {
  expect(value).toEqual('world')
  expect(path).toEqual('hello')
  expect(event.pubkey).toEqual(pubkey)
  expect(event.created_at).toEqual(created_at)
  done()
}

test('first set, then get', (done) => {
  const path = new Path(publish, subscribe, unsubscribe, { authors: [pubkey] })
  path.set('hello', 'world')
  path.get('hello', createCallback(done))

})

test('first get, then set', (done) => {
  const path = new Path(publish, subscribe, unsubscribe, { authors: [pubkey] })
  path.get('hello', createCallback(done))
  path.set('hello', 'world')
})

test('encrypted set & get', (done) => {
  const path = new Path(publish, subscribe, unsubscribe, { authors: [pubkey] }, encrypt, decrypt)
  path.set('hello', 'world')
  path.get('hello', createCallback(done))
})