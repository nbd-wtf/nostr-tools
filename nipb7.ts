import { sha256 } from '@noble/hashes/sha256'
import { EventTemplate } from './core.ts'
import { Signer } from './signer.ts'
import { bytesToHex } from './utils.ts'

export type BlobDescriptor = {
  url: string
  sha256: string
  size: number
  type: string
  uploaded: number
}

export class BlossomClient {
  private mediaserver: string
  private signer: Signer

  constructor(mediaserver: string, signer: Signer) {
    if (!mediaserver.startsWith('http')) {
      mediaserver = 'https://' + mediaserver
    }
    this.mediaserver = mediaserver.replace(/\/$/, '') + '/'
    this.signer = signer
  }

  private async httpCall(
    method: string,
    url: string,
    contentType?: string,
    addAuthorization?: () => Promise<string>,
    body?: File | Blob,
    result?: any,
  ): Promise<any> {
    const headers: { [_: string]: string } = {}

    if (contentType) {
      headers['Content-Type'] = contentType
    }

    if (addAuthorization) {
      const auth = await addAuthorization()
      if (auth) {
        headers['Authorization'] = auth
      }
    }

    const response = await fetch(this.mediaserver + url, {
      method,
      headers,
      body,
    })

    if (response.status >= 300) {
      const reason = response.headers.get('X-Reason') || response.statusText
      throw new Error(`${url} returned an error (${response.status}): ${reason}`)
    }

    if (result !== null && response.headers.get('content-type')?.includes('application/json')) {
      return await response.json()
    }

    return response
  }

  private async authorizationHeader(modify?: (event: EventTemplate) => void): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const event: EventTemplate = {
      created_at: now,
      kind: 24242,
      content: 'blossom stuff',
      tags: [['expiration', String(now + 60)]],
    }

    if (modify) {
      modify(event)
    }

    try {
      const signedEvent = await this.signer.signEvent(event)
      const eventJson = JSON.stringify(signedEvent)
      return 'Nostr ' + btoa(eventJson)
    } catch (error) {
      return ''
    }
  }

  private isValid32ByteHex(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash)
  }

  async check(hash: string): Promise<void> {
    if (!this.isValid32ByteHex(hash)) {
      throw new Error(`${hash} is not a valid 32-byte hex string`)
    }

    try {
      await this.httpCall('HEAD', hash)
    } catch (error) {
      throw new Error(`failed to check for ${hash}: ${error}`)
    }
  }

  async uploadBlob(file: File | Blob, contentType?: string): Promise<BlobDescriptor> {
    const hash = bytesToHex(sha256(new Uint8Array(await file.arrayBuffer())))
    const actualContentType = contentType || file.type || 'application/octet-stream'

    const bd = await this.httpCall(
      'PUT',
      'upload',
      actualContentType,
      () =>
        this.authorizationHeader(evt => {
          evt.tags.push(['t', 'upload'])
          evt.tags.push(['x', hash])
        }),
      file,
      {},
    )

    return bd
  }

  async uploadFile(file: File): Promise<BlobDescriptor> {
    return this.uploadBlob(file, file.type)
  }

  async download(hash: string): Promise<ArrayBuffer> {
    if (!this.isValid32ByteHex(hash)) {
      throw new Error(`${hash} is not a valid 32-byte hex string`)
    }

    const authHeader = await this.authorizationHeader(evt => {
      evt.tags.push(['t', 'get'])
      evt.tags.push(['x', hash])
    })

    const response = await fetch(this.mediaserver + hash, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    })

    if (response.status >= 300) {
      throw new Error(`${hash} is not present in ${this.mediaserver}: ${response.status}`)
    }

    return await response.arrayBuffer()
  }

  async downloadAsBlob(hash: string): Promise<Blob> {
    const arrayBuffer = await this.download(hash)
    return new Blob([arrayBuffer])
  }

  async list(): Promise<BlobDescriptor[]> {
    const pubkey = await this.signer.getPublicKey()

    if (!this.isValid32ByteHex(pubkey)) {
      throw new Error(`pubkey ${pubkey} is not valid`)
    }

    try {
      const bds = await this.httpCall(
        'GET',
        `list/${pubkey}`,
        undefined,
        () =>
          this.authorizationHeader(evt => {
            evt.tags.push(['t', 'list'])
          }),
        undefined,
        [],
      )
      return bds
    } catch (error) {
      throw new Error(`failed to list blobs: ${error}`)
    }
  }

  async delete(hash: string): Promise<void> {
    if (!this.isValid32ByteHex(hash)) {
      throw new Error(`${hash} is not a valid 32-byte hex string`)
    }

    try {
      await this.httpCall(
        'DELETE',
        hash,
        undefined,
        () =>
          this.authorizationHeader(evt => {
            evt.tags.push(['t', 'delete'])
            evt.tags.push(['x', hash])
          }),
        undefined,
        null,
      )
    } catch (error) {
      throw new Error(`failed to delete ${hash}: ${error}`)
    }
  }
}
