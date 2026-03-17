import { test, expect } from 'bun:test'
import * as nip55 from './nip55.js'

// Function to parse the NostrSigner URI
function parseNostrSignerUri(uri: string) {
  const [base, query] = uri.split('?')
  const basePart = base.replace('nostrsigner:', '')

  let jsonObject = null
  if (basePart) {
    try {
      jsonObject = JSON.parse(decodeURIComponent(basePart))
    } catch (e) {
      console.warn('Failed to parse base JSON:', e)
    }
  }

  const urlSearchParams = new URLSearchParams(query)
  const queryParams = Object.fromEntries(urlSearchParams.entries())
  if (queryParams.permissions) {
    queryParams.permissions = JSON.parse(decodeURIComponent(queryParams.permissions))
  }

  return {
    base: jsonObject,
    ...queryParams,
  }
}

// Test cases
test('Get Public Key URI', () => {
  const permissions = [{ type: 'sign_event', kind: 22242 }, { type: 'nip44_decrypt' }]
  const callbackUrl = 'https://example.com/?event='

  const uri = nip55.getPublicKeyUri({
    permissions,
    callbackUrl,
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'get_public_key')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('callbackUrl', 'https://example.com/?event=')
  expect(jsonObject).toHaveProperty('permissions[0].type', 'sign_event')
  expect(jsonObject).toHaveProperty('permissions[0].kind', 22242)
  expect(jsonObject).toHaveProperty('permissions[1].type', 'nip44_decrypt')
})

test('Sign Event URI', () => {
  const eventJson = { kind: 1, content: 'test' }

  const uri = nip55.signEventUri({
    eventJson,
    id: 'some_id',
    currentUser: 'hex_pub_key',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('base.kind', 1)
  expect(jsonObject).toHaveProperty('base.content', 'test')
  expect(jsonObject).toHaveProperty('type', 'sign_event')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('id', 'some_id')
  expect(jsonObject).toHaveProperty('current_user', 'hex_pub_key')
})

test('Encrypt NIP-04 URI', () => {
  const callbackUrl = 'https://example.com/?event='

  const uri = nip55.encryptNip04Uri({
    callbackUrl,
    pubKey: 'hex_pub_key',
    content: 'plainText',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'nip04_encrypt')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('callbackUrl', callbackUrl)
  expect(jsonObject).toHaveProperty('pubKey', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('plainText', 'plainText')
})

test('Decrypt NIP-04 URI', () => {
  const uri = nip55.decryptNip04Uri({
    id: 'some_id',
    currentUser: 'hex_pub_key',
    pubKey: 'hex_pub_key',
    content: 'encryptedText',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'nip04_decrypt')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('id', 'some_id')
  expect(jsonObject).toHaveProperty('current_user', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('pubKey', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('encryptedText', 'encryptedText')
})

test('Encrypt NIP-44 URI', () => {
  const uri = nip55.encryptNip44Uri({
    id: 'some_id',
    currentUser: 'hex_pub_key',
    pubKey: 'hex_pub_key',
    content: 'plainText',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'nip44_encrypt')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('id', 'some_id')
  expect(jsonObject).toHaveProperty('current_user', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('pubKey', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('plainText', 'plainText')
})

test('Decrypt NIP-44 URI', () => {
  const uri = nip55.decryptNip44Uri({
    id: 'some_id',
    currentUser: 'hex_pub_key',
    pubKey: 'hex_pub_key',
    content: 'encryptedText',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'nip44_decrypt')
  expect(jsonObject).toHaveProperty('compressionType', 'none')
  expect(jsonObject).toHaveProperty('returnType', 'signature')
  expect(jsonObject).toHaveProperty('id', 'some_id')
  expect(jsonObject).toHaveProperty('current_user', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('pubKey', 'hex_pub_key')
  expect(jsonObject).toHaveProperty('encryptedText', 'encryptedText')
})

test('Decrypt Zap Event URI', () => {
  const eventJson = { kind: 1, content: 'test' }

  const uri = nip55.decryptZapEventUri({
    eventJson,
    id: 'some_id',
    currentUser: 'hex_pub_key',
    returnType: 'event',
    compressionType: 'gzip',
  })

  const jsonObject = parseNostrSignerUri(uri)

  expect(jsonObject).toHaveProperty('type', 'decrypt_zap_event')
  expect(jsonObject).toHaveProperty('compressionType', 'gzip')
  expect(jsonObject).toHaveProperty('returnType', 'event')
  expect(jsonObject).toHaveProperty('base.kind', 1)
  expect(jsonObject).toHaveProperty('id', 'some_id')
  expect(jsonObject).toHaveProperty('current_user', 'hex_pub_key')
})
