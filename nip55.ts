type BaseParams = {
  callbackUrl?: string
  returnType?: 'signature' | 'event'
  compressionType?: 'none' | 'gzip'
}

type PermissionsParams = BaseParams & {
  permissions?: { type: string; kind?: number }[]
}

type EventUriParams = BaseParams & {
  eventJson: Record<string, unknown>
  id?: string
  currentUser?: string
}

type EncryptDecryptParams = BaseParams & {
  pubKey: string
  content: string
  id?: string
  currentUser?: string
}

type UriParams = BaseParams & {
  base: string
  type: string
  id?: string
  currentUser?: string
  permissions?: { type: string; kind?: number }[]
  pubKey?: string
  plainText?: string
  encryptedText?: string
  appName?: string
}

function encodeParams(params: Record<string, unknown>): string {
  return new URLSearchParams(params as Record<string, string>).toString()
}

function filterUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T
}

function buildUri({
  base,
  type,
  callbackUrl,
  returnType = 'signature',
  compressionType = 'none',
  ...params
}: UriParams): string {
  const baseParams = {
    type,
    compressionType,
    returnType,
    callbackUrl,
    id: params.id,
    current_user: params.currentUser,
    permissions:
      params.permissions && params.permissions.length > 0
        ? encodeURIComponent(JSON.stringify(params.permissions))
        : undefined,
    pubKey: params.pubKey,
    plainText: params.plainText,
    encryptedText: params.encryptedText,
    appName: params.appName,
  }

  const filteredParams = filterUndefined(baseParams)
  return `${base}?${encodeParams(filteredParams)}`
}

function buildDefaultUri(type: string, params: Partial<UriParams>): string {
  return buildUri({
    base: 'nostrsigner:',
    type,
    ...params,
  })
}

export function getPublicKeyUri({ permissions = [], ...params }: PermissionsParams): string {
  return buildDefaultUri('get_public_key', { permissions, ...params })
}

export function signEventUri({ eventJson, ...params }: EventUriParams): string {
  return buildUri({
    base: `nostrsigner:${encodeURIComponent(JSON.stringify(eventJson))}`,
    type: 'sign_event',
    ...params,
  })
}

function encryptUri(type: 'nip44_encrypt' | 'nip04_encrypt', params: EncryptDecryptParams): string {
  return buildDefaultUri(type, { ...params, plainText: params.content })
}

function decryptUri(type: 'nip44_decrypt' | 'nip04_decrypt', params: EncryptDecryptParams): string {
  return buildDefaultUri(type, { ...params, encryptedText: params.content })
}

export function encryptNip04Uri(params: EncryptDecryptParams): string {
  return encryptUri('nip04_encrypt', params)
}

export function decryptNip04Uri(params: EncryptDecryptParams): string {
  return decryptUri('nip04_decrypt', params)
}

export function encryptNip44Uri(params: EncryptDecryptParams): string {
  return encryptUri('nip44_encrypt', params)
}

export function decryptNip44Uri(params: EncryptDecryptParams): string {
  return decryptUri('nip44_decrypt', params)
}

export function decryptZapEventUri({ eventJson, ...params }: EventUriParams): string {
  return buildUri({
    base: `nostrsigner:${encodeURIComponent(JSON.stringify(eventJson))}`,
    type: 'decrypt_zap_event',
    ...params,
  })
}
