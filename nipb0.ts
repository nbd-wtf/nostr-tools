import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import type { EventTemplate } from './core.ts'
import type { Signer } from './signer.ts'
import { kinds } from './index.ts'

export type BlobDescriptor = {
  url: string
  sha256: string
  size: number
  type: string
  uploaded: number
}

export type UploadType = Blob | File | Buffer

export type SignedEvent = EventTemplate & {
  id: string
  sig: string
  pubkey: string
}

export type AuthEventOptions = {
  blobs?: string | string[]
  servers?: string | string[]
  message?: string
  expiration?: number
}

export function isSha256(str: string): boolean {
  return /^[0-9a-f]{64}$/i.test(str)
}

export function getBlobSize(blob: UploadType): number {
  if ((typeof File !== 'undefined' && blob instanceof File) || blob instanceof Blob) {
    return blob.size
  }
  return (blob as Buffer).length
}

export function getBlobType(blob: UploadType): string | undefined {
  if ((typeof File !== 'undefined' && blob instanceof File) || blob instanceof Blob) {
    return blob.type || undefined
  }
  return undefined
}

export async function computeBlobSha256(blob: UploadType): Promise<string> {
  let buffer: ArrayBuffer | Uint8Array

  if ((typeof File !== 'undefined' && blob instanceof File) || blob instanceof Blob) {
    buffer = await blob.arrayBuffer()
  } else {
    buffer = blob
  }

  const hash = sha256.create().update(new Uint8Array(buffer)).digest()
  return bytesToHex(hash)
}

// auth

export function encodeAuthorizationHeader(event: SignedEvent): string {
  const json = JSON.stringify(event)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return 'Nostr ' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function now(): number {
  return Math.floor(Date.now() / 1000)
}

export function oneHour(): number {
  return now() + 3600
}

export function getAuthTagValues(auth: SignedEvent, tagName: string): string[] {
  return auth.tags.filter(tag => tag[0] === tagName).map(tag => tag[1])
}

export function getAuthExpiration(auth: SignedEvent): number | undefined {
  const expiration = auth.tags.find(tag => tag[0] === 'expiration')?.[1]
  if (!expiration) return undefined
  const timestamp = Number(expiration)
  if (!Number.isFinite(timestamp)) return undefined
  return timestamp
}

export function isAuthExpired(auth: SignedEvent, timestamp: number = now()): boolean {
  const expiration = getAuthExpiration(auth)
  return expiration !== undefined && expiration <= timestamp
}

export function normalizeServerTag(server: string | URL): string {
  if (server instanceof URL) return server.hostname.toLowerCase()
  if (URL.canParse(server)) return new URL(server).hostname.toLowerCase()
  return server.toLowerCase()
}

export function areServersEqual(a: string | URL, b: string | URL): boolean {
  return normalizeServerTag(a) === normalizeServerTag(b)
}

function normalizeServers(servers: string | string[]): string[] {
  const values = Array.isArray(servers) ? servers : [servers]
  return [...new Set(values.map(normalizeServerTag))]
}

export async function createAuthEvent(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  type: 'upload' | 'list' | 'delete' | 'get' | 'media',
  options?: AuthEventOptions,
): Promise<SignedEvent> {
  const draft: EventTemplate = {
    created_at: now(),
    kind: kinds.BlobsAuth,
    content: options?.message ?? '',
    tags: [
      ['t', type],
      ['expiration', String(options?.expiration ?? oneHour())],
    ],
  }

  if (options?.blobs) {
    const blobList = Array.isArray(options.blobs) ? options.blobs : [options.blobs]
    const seen = new Set<string>()
    for (const blob of blobList) {
      const hash = typeof blob === 'string' ? blob : await computeBlobSha256(blob)
      if (!seen.has(hash)) {
        draft.tags.push(['x', hash])
        seen.add(hash)
      }
    }
  }

  if (options?.servers) {
    for (const server of normalizeServers(options.servers)) {
      draft.tags.push(['server', server])
    }
  }

  return signer(draft)
}

export type UploadAuthOptions = Omit<AuthEventOptions, 'blobs'> & { type?: 'upload' | 'media' }

export async function createUploadAuth(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  blobs: string | string[],
  options?: UploadAuthOptions,
): Promise<SignedEvent> {
  return createAuthEvent(signer, options?.type ?? 'upload', { message: 'Upload Blob', ...options, blobs })
}

export type DownloadAuthOptions = Omit<AuthEventOptions, 'blobs' | 'servers'>

export async function createDownloadAuth(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  hash: string,
  options?: DownloadAuthOptions,
): Promise<SignedEvent> {
  return createAuthEvent(signer, 'get', { message: 'Download Blob', ...options, blobs: [hash] })
}

export type MirrorAuthOptions = Omit<AuthEventOptions, 'blobs'>

export async function createMirrorAuth(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  hash: string,
  options?: MirrorAuthOptions,
): Promise<SignedEvent> {
  return createAuthEvent(signer, 'upload', { message: 'Mirror Blob', ...options, blobs: [hash] })
}

export type ListAuthOptions = Omit<AuthEventOptions, 'blobs'>

export async function createListAuth(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  options?: ListAuthOptions,
): Promise<SignedEvent> {
  return createAuthEvent(signer, 'list', { message: 'List Blobs', ...options })
}

export type DeleteAuthOptions = Omit<AuthEventOptions, 'blobs'>

export async function createDeleteAuth(
  signer: (draft: EventTemplate) => Promise<SignedEvent>,
  hash: string,
  options?: DeleteAuthOptions,
): Promise<SignedEvent> {
  return createAuthEvent(signer, 'delete', { message: 'Delete Blob', ...options, blobs: [hash] })
}

// blossom URI

export type BlossomURI = {
  sha256: string
  ext: string
  servers: string[]
  authors: string[]
  size?: number
}

export function parseBlossomURI(uri: string): BlossomURI {
  if (!uri.startsWith('blossom:')) throw new Error('Invalid blossom URI: missing blossom: scheme')
  const body = uri.slice('blossom:'.length)
  const queryIndex = body.indexOf('?')
  const path = queryIndex === -1 ? body : body.slice(0, queryIndex)
  const query = queryIndex === -1 ? '' : body.slice(queryIndex + 1)
  const dotIndex = path.indexOf('.')
  if (dotIndex === -1) throw new Error('Invalid blossom URI: missing file extension')
  const sha256 = path.slice(0, dotIndex)
  const ext = path.slice(dotIndex + 1)
  if (!isSha256(sha256)) throw new Error('Invalid blossom URI: invalid sha256 hash')
  if (!ext) throw new Error('Invalid blossom URI: empty file extension')
  const params = new URLSearchParams(query)
  const servers = params.getAll('xs')
  const authors = params.getAll('as')
  const szValue = params.get('sz')
  let size: number | undefined
  if (szValue !== null) {
    size = Number(szValue)
    if (!Number.isFinite(size) || size <= 0 || Math.floor(size) !== size) {
      throw new Error('Invalid blossom URI: sz must be a positive integer')
    }
  }
  return { sha256, ext, servers, authors, size }
}

export function buildBlossomURI(options: BlossomURI): string {
  const params = new URLSearchParams()
  for (const server of options.servers) params.append('xs', server)
  for (const author of options.authors) params.append('as', author)
  if (options.size !== undefined) params.append('sz', String(options.size))
  const query = params.toString()
  return `blossom:${options.sha256}.${options.ext}${query ? '?' + query : ''}`
}

export function blossomURIToURL(uri: string | BlossomURI): URL {
  const str = typeof uri === 'string' ? uri : buildBlossomURI(uri)
  return new URL(str)
}

export function blossomURIFromURL(url: URL): BlossomURI {
  if (url.protocol !== 'blossom:') throw new Error('Invalid blossom URL: expected blossom: protocol')
  const path = url.pathname
  const dotIndex = path.indexOf('.')
  if (dotIndex === -1) throw new Error('Invalid blossom URL: missing file extension')
  const sha256 = path.slice(0, dotIndex)
  const ext = path.slice(dotIndex + 1)
  if (!isSha256(sha256)) throw new Error('Invalid blossom URL: invalid sha256 hash')
  if (!ext) throw new Error('Invalid blossom URL: empty file extension')
  const servers = url.searchParams.getAll('xs')
  const authors = url.searchParams.getAll('as')
  const szValue = url.searchParams.get('sz')
  let size: number | undefined
  if (szValue !== null) {
    size = Number(szValue)
    if (!Number.isFinite(size) || size <= 0 || Math.floor(size) !== size) {
      throw new Error('Invalid blossom URL: sz must be a positive integer')
    }
  }
  return { sha256, ext, servers, authors, size }
}

const commonMimeExtensions: Record<string, string> = {
  'application/json': '.json',
  'application/pdf': '.pdf',
  'application/vnd.android.package-archive': '.apk',
  'application/vnd.sqlite3': '.sqlite3',
  'application/xml': '.xml',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  'audio/midi': '.midi',
  'audio/mp3': '.mp3',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.weba',
  'audio/x-aiff': '.aiff',
  'audio/x-m4a': '.m4a',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
  'text/css': '.css',
  'text/csv': '.csv',
  'text/html': '.html',
  'text/javascript': '.js',
  'text/markdown': '.md',
  'text/plain': '.txt',
  'text/xml': '.xml',
  'video/mp2t': '.ts',
  'video/mp4': '.mp4',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-matroska': '.mkv',
}

const commonExtensionMimes: Record<string, string> = {
  '.aac': 'audio/aac',
  '.aiff': 'audio/x-aiff',
  '.apk': 'application/vnd.android.package-archive',
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.flac': 'audio/flac',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
  '.md': 'text/markdown; charset=utf-8',
  '.midi': 'audio/midi',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.ogv': 'video/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.sqlite3': 'application/vnd.sqlite3',
  '.svg': 'image/svg+xml',
  '.ts': 'video/mp2t',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.weba': 'audio/webm',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
}

function normalizeMIMEType(mimetype: string): string {
  const idx = mimetype.indexOf(';')
  return idx >= 0 ? mimetype.slice(0, idx).trim().toLowerCase() : mimetype.trim().toLowerCase()
}

export function getExtension(mimetype: string): string {
  const normalized = normalizeMIMEType(mimetype)
  if (!normalized) return ''
  return commonMimeExtensions[normalized] ?? ''
}

export function getMIMEType(ext: string): string {
  if (!ext) return ''
  ext = ext.trim().toLowerCase()
  if (ext[0] !== '.') ext = '.' + ext
  return commonExtensionMimes[ext] ?? ''
}

export function getServersFromServerListEvent(event: { tags: string[][] }): URL[] {
  const servers: URL[] = []
  for (const tag of event.tags) {
    if (tag[0] === 'server' && tag[1]) {
      try {
        const url = new URL(tag[1])
        url.pathname = '/'
        servers.push(url)
      } catch {}
    }
  }
  return servers
}

export function getHashFromURL(url: string | URL): string | null {
  try {
    if (typeof url === 'string') url = new URL(url)
    const hashes = Array.from(url.pathname.matchAll(/[0-9a-f]{64}/gi))
    return hashes.length > 0 ? hashes[hashes.length - 1][0] : null
  } catch (_err) {
    return null
  }
}

export type UploadOptions = {
  signal?: AbortSignal
  auth?: SignedEvent | boolean
  timeout?: number
  onAuth?: (server: string, sha256: string) => Promise<SignedEvent>
}

export async function uploadBlob(server: string, blob: Blob | File, opts?: UploadOptions): Promise<BlobDescriptor> {
  const url = new URL('/upload', server).toString()
  const sha256 = await computeBlobSha256(blob)

  const headers: Record<string, string> = {
    'X-SHA-256': sha256,
    'Content-Type': getBlobType(blob) || 'application/octet-stream',
  }

  if (opts?.auth) {
    const authEvent = typeof opts.auth === 'boolean' ? await opts.onAuth?.(server, sha256) : opts.auth
    if (authEvent) headers['Authorization'] = encodeAuthorizationHeader(authEvent)
  }

  const res = await fetch(url, {
    method: 'PUT',
    body: blob,
    headers,
    signal: opts?.signal,
  })

  if (res.status >= 300) {
    const reason = res.headers.get('X-Reason') || res.statusText
    throw new Error(`upload returned error (${res.status}): ${reason}`)
  }

  return res.json()
}

export type DownloadOptions = {
  signal?: AbortSignal
  auth?: SignedEvent | boolean
  timeout?: number
  onAuth?: (server: string, sha256: string) => Promise<SignedEvent>
}

export async function downloadBlob(server: string, hash: string, opts?: DownloadOptions): Promise<Response> {
  const url = new URL('/' + hash, server).toString()
  const headers: Record<string, string> = {}

  if (opts?.auth) {
    const authEvent = typeof opts.auth === 'boolean' ? await opts.onAuth?.(server, hash) : opts.auth
    if (authEvent) headers['Authorization'] = encodeAuthorizationHeader(authEvent)
  }

  const res = await fetch(url, { headers, signal: opts?.signal })

  if (res.status >= 300) {
    const reason = res.headers.get('X-Reason') || res.statusText
    throw new Error(`${hash} download error (${res.status}): ${reason}`)
  }

  return res
}

export type ListOptions = {
  signal?: AbortSignal
  auth?: SignedEvent | boolean
  timeout?: number
  onAuth?: (server: string) => Promise<SignedEvent>
  cursor?: string
  limit?: number
  since?: number
  until?: number
}

export async function listBlobs(server: string, pubkey: string, opts?: ListOptions): Promise<BlobDescriptor[]> {
  const url = new URL('/list/' + pubkey, server)
  if (opts?.cursor) url.searchParams.append('cursor', opts.cursor)
  if (opts?.limit) url.searchParams.append('limit', String(opts.limit))
  if (opts?.since) url.searchParams.append('since', String(opts.since))
  if (opts?.until) url.searchParams.append('until', String(opts.until))

  const headers: Record<string, string> = {}

  if (opts?.auth) {
    const authEvent = typeof opts.auth === 'boolean' ? await opts.onAuth?.(server) : opts.auth
    if (authEvent) headers['Authorization'] = encodeAuthorizationHeader(authEvent)
  }

  const res = await fetch(url.toString(), { headers, signal: opts?.signal })

  if (res.status >= 300) {
    const reason = res.headers.get('X-Reason') || res.statusText
    throw new Error(`list error (${res.status}): ${reason}`)
  }

  return res.json()
}

export async function* iterateBlobs(
  server: string,
  pubkey: string,
  opts?: ListOptions,
): AsyncGenerator<BlobDescriptor[], void, void> {
  let cursor = opts?.cursor
  while (true) {
    const page = await listBlobs(server, pubkey, { ...opts, cursor })
    if (page.length === 0) return
    yield page
    if (opts?.limit && page.length < opts.limit) return
    cursor = page[page.length - 1]?.sha256
    if (!cursor) return
  }
}

export type DeleteOptions = {
  signal?: AbortSignal
  auth?: SignedEvent | boolean
  timeout?: number
  onAuth?: (server: string, sha256: string) => Promise<SignedEvent>
}

export async function deleteBlob(server: string, hash: string, opts?: DeleteOptions): Promise<boolean> {
  const url = new URL('/' + hash, server).toString()
  const headers: Record<string, string> = {}

  if (opts?.auth) {
    const authEvent = typeof opts.auth === 'boolean' ? await opts.onAuth?.(server, hash) : opts.auth
    if (authEvent) headers['Authorization'] = encodeAuthorizationHeader(authEvent)
  }

  const res = await fetch(url, { method: 'DELETE', headers, signal: opts?.signal })

  if (res.status >= 300) {
    const reason = res.headers.get('X-Reason') || res.statusText
    throw new Error(`delete error (${res.status}): ${reason}`)
  }

  return res.ok
}

export type HasBlobOptions = {
  signal?: AbortSignal
  timeout?: number
}

export async function hasBlob(server: string, hash: string, opts?: HasBlobOptions): Promise<boolean> {
  const url = new URL('/' + hash, server)
  try {
    const res = await fetch(url.toString(), { method: 'HEAD', signal: opts?.signal })
    return res.status !== 404
  } catch {
    return false
  }
}

export type MirrorOptions = {
  signal?: AbortSignal
  auth?: SignedEvent | boolean
  timeout?: number
  onAuth?: (server: string, sha256: string) => Promise<SignedEvent>
}

export async function mirrorBlob(server: string, blob: BlobDescriptor, opts?: MirrorOptions): Promise<BlobDescriptor> {
  const url = new URL('/mirror', server).toString()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-SHA-256': blob.sha256,
  }

  if (opts?.auth) {
    const authEvent = typeof opts.auth === 'boolean' ? await opts.onAuth?.(server, blob.sha256) : opts.auth
    if (authEvent) headers['Authorization'] = encodeAuthorizationHeader(authEvent)
  }

  const res = await fetch(url, {
    method: 'PUT',
    body: JSON.stringify({ url: blob.url }),
    headers,
    signal: opts?.signal,
  })

  if (res.status >= 300) {
    const reason = res.headers.get('X-Reason') || res.statusText
    throw new Error(`mirror error (${res.status}): ${reason}`)
  }

  return res.json()
}

export type ReportOptions = {
  signal?: AbortSignal
  timeout?: number
  onError?: (server: string, error: Error) => void
}

export async function reportBlobs(
  servers: Iterable<string>,
  report: SignedEvent,
  opts?: ReportOptions,
): Promise<Map<string, boolean>> {
  if (report.kind !== 1984 || !report.tags.some(tag => tag[0] === 'x' && !!tag[1])) {
    throw new Error('Invalid blob report event: must be kind 1984 with x tag')
  }

  const results = new Map<string, boolean>()
  const body = JSON.stringify(report)

  for (const server of servers) {
    try {
      const res = await fetch(new URL('/report', server).toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: opts?.signal,
      })
      if (res.status >= 300) {
        const reason = res.headers.get('X-Reason') || res.statusText
        throw new Error(`report error (${res.status}): ${reason}`)
      }
      results.set(server, true)
    } catch (error) {
      if (opts?.onError && error instanceof Error) opts.onError(server, error)
    }
  }

  return results
}

export class BlossomClient {
  private mediaserver: string

  constructor(
    mediaserver: string,
    private signer: Signer,
  ) {
    if (!mediaserver.startsWith('http')) {
      mediaserver = 'https://' + mediaserver
    }
    this.mediaserver = mediaserver.replace(/\/$/, '') + '/'
  }

  getMediaServer(): string {
    return this.mediaserver
  }

  private async authorizationHeader(modify?: (event: EventTemplate) => void): Promise<string> {
    const event = {
      created_at: now(),
      kind: kinds.BlobsAuth,
      content: 'blossom stuff',
      tags: [['expiration', String(now() + 60)]],
    }

    modify?.(event)

    try {
      const signedEvent = await this.signer.signEvent(event)
      const json = JSON.stringify(signedEvent)
      return 'Nostr ' + btoa(json)
    } catch {
      return ''
    }
  }

  private async httpCall(
    method: string,
    url: string,
    contentType?: string,
    addAuthorization?: () => Promise<string>,
    body?: File | Blob | string,
  ): Promise<any> {
    const headers: Record<string, string> = {}

    if (contentType) headers['Content-Type'] = contentType
    if (addAuthorization) {
      const auth = await addAuthorization()
      if (auth) headers['Authorization'] = auth
    }

    const res = await fetch(this.mediaserver + url, { method, headers, body })

    if (res.status >= 300) {
      const reason = res.headers.get('X-Reason') || res.statusText
      throw new Error(`${url} returned error (${res.status}): ${reason}`)
    }

    if (res.headers.get('content-type')?.includes('application/json')) {
      return res.json()
    }

    return res
  }

  async uploadBlob(file: Blob | File, contentType?: string): Promise<BlobDescriptor> {
    const hash = bytesToHex(sha256(new Uint8Array(await file.arrayBuffer())))
    const actualContentType = contentType || getBlobType(file) || 'application/octet-stream'

    return this.httpCall(
      'PUT',
      'upload',
      actualContentType,
      () =>
        this.authorizationHeader(evt => {
          evt.tags.push(['t', 'upload'], ['x', hash])
        }),
      file,
    )
  }

  async download(hash: string): Promise<ArrayBuffer> {
    const authHeader = await this.authorizationHeader(evt => {
      evt.tags.push(['t', 'get'], ['x', hash])
    })

    const res = await fetch(this.mediaserver + hash, {
      method: 'GET',
      headers: { Authorization: authHeader },
    })

    if (res.status >= 300) {
      throw new Error(`${hash} not present on ${this.mediaserver}: ${res.status}`)
    }

    return res.arrayBuffer()
  }

  async downloadAsBlob(hash: string): Promise<Blob> {
    return new Blob([await this.download(hash)])
  }

  async list(): Promise<BlobDescriptor[]> {
    const pubkey = await this.signer.getPublicKey()
    return this.httpCall('GET', `list/${pubkey}`, undefined, () =>
      this.authorizationHeader(evt => {
        evt.tags.push(['t', 'list'])
      }),
    )
  }

  async delete(hash: string): Promise<void> {
    await this.httpCall('DELETE', hash, undefined, () =>
      this.authorizationHeader(evt => {
        evt.tags.push(['t', 'delete'], ['x', hash])
      }),
    )
  }

  async check(hash: string): Promise<void> {
    if (!isSha256(hash)) throw new Error(`${hash} is not valid 32-byte hex`)
    await this.httpCall('HEAD', hash)
  }

  async mirror(remoteBlobURL: string): Promise<BlobDescriptor> {
    const hash = remoteBlobURL.split('/').pop()?.split('.')[0] || ''
    return this.httpCall(
      'PUT',
      'mirror',
      'application/json',
      () =>
        this.authorizationHeader(evt => {
          evt.tags.push(['t', 'upload'], ['x', hash])
        }),
      JSON.stringify({ url: remoteBlobURL }),
    )
  }
}
