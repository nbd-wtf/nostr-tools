import { bytesToHex, hexToBytes } from '@noble/ciphers/utils'
import { Filter } from './filter.ts'
import { AbstractRelay, Subscription } from './relay.ts'
import { sha256 } from '@noble/hashes/sha256'

// Negentropy implementation by Doug Hoyte
const PROTOCOL_VERSION = 0x61 // Version 1
const ID_SIZE = 32
const FINGERPRINT_SIZE = 16

const Mode = {
  Skip: 0,
  Fingerprint: 1,
  IdList: 2,
}

class WrappedBuffer {
  _raw: Uint8Array
  length: number

  constructor(buffer?: Uint8Array | number) {
    if (typeof buffer === 'number') {
      this._raw = new Uint8Array(buffer)
      this.length = 0
    } else if (buffer instanceof Uint8Array) {
      this._raw = new Uint8Array(buffer)
      this.length = buffer.length
    } else {
      this._raw = new Uint8Array(512)
      this.length = 0
    }
  }

  unwrap(): Uint8Array {
    return this._raw.subarray(0, this.length)
  }

  get capacity(): number {
    return this._raw.byteLength
  }

  extend(buf: Uint8Array | WrappedBuffer): void {
    if (buf instanceof WrappedBuffer) buf = buf.unwrap()
    if (typeof buf.length !== 'number') throw Error('bad length')
    const targetSize = buf.length + this.length
    if (this.capacity < targetSize) {
      const oldRaw = this._raw
      const newCapacity = Math.max(this.capacity * 2, targetSize)
      this._raw = new Uint8Array(newCapacity)
      this._raw.set(oldRaw)
    }

    this._raw.set(buf, this.length)
    this.length += buf.length
  }

  shift(): number {
    const first = this._raw[0]
    this._raw = this._raw.subarray(1)
    this.length--
    return first
  }

  shiftN(n: number = 1): Uint8Array {
    const firstSubarray = this._raw.subarray(0, n)
    this._raw = this._raw.subarray(n)
    this.length -= n
    return firstSubarray
  }
}

function decodeVarInt(buf: WrappedBuffer): number {
  let res = 0

  while (1) {
    if (buf.length === 0) throw Error('parse ends prematurely')
    let byte = buf.shift()
    res = (res << 7) | (byte & 127)
    if ((byte & 128) === 0) break
  }

  return res
}

function encodeVarInt(n: number): WrappedBuffer {
  if (n === 0) return new WrappedBuffer(new Uint8Array([0]))

  let o: number[] = []

  while (n !== 0) {
    o.push(n & 127)
    n >>>= 7
  }

  o.reverse()

  for (let i = 0; i < o.length - 1; i++) o[i] |= 128

  return new WrappedBuffer(new Uint8Array(o))
}

function getByte(buf: WrappedBuffer): number {
  return getBytes(buf, 1)[0]
}

function getBytes(buf: WrappedBuffer, n: number): Uint8Array {
  if (buf.length < n) throw Error('parse ends prematurely')
  return buf.shiftN(n)
}

class Accumulator {
  buf!: Uint8Array

  constructor() {
    this.setToZero()
  }

  setToZero(): void {
    this.buf = new Uint8Array(ID_SIZE)
  }

  add(otherBuf: Uint8Array): void {
    let currCarry = 0,
      nextCarry = 0
    let p = new DataView(this.buf.buffer)
    let po = new DataView(otherBuf.buffer)

    for (let i = 0; i < 8; i++) {
      let offset = i * 4
      let orig = p.getUint32(offset, true)
      let otherV = po.getUint32(offset, true)

      let next = orig

      next += currCarry
      next += otherV
      if (next > 0xffffffff) nextCarry = 1

      p.setUint32(offset, next & 0xffffffff, true)
      currCarry = nextCarry
      nextCarry = 0
    }
  }

  negate(): void {
    let p = new DataView(this.buf.buffer)

    for (let i = 0; i < 8; i++) {
      let offset = i * 4
      p.setUint32(offset, ~p.getUint32(offset, true))
    }

    let one = new Uint8Array(ID_SIZE)
    one[0] = 1
    this.add(one)
  }

  getFingerprint(n: number): Uint8Array {
    let input = new WrappedBuffer()
    input.extend(this.buf)
    input.extend(encodeVarInt(n))

    let hash = sha256(input.unwrap())
    return hash.subarray(0, FINGERPRINT_SIZE)
  }
}

export class NegentropyStorageVector {
  items: { timestamp: number; id: Uint8Array }[]
  sealed: boolean

  constructor() {
    this.items = []
    this.sealed = false
  }

  insert(timestamp: number, id: string): void {
    if (this.sealed) throw Error('already sealed')
    const idb = hexToBytes(id)
    if (idb.byteLength !== ID_SIZE) throw Error('bad id size for added item')
    this.items.push({ timestamp, id: idb })
  }

  seal(): void {
    if (this.sealed) throw Error('already sealed')
    this.sealed = true

    this.items.sort(itemCompare)

    for (let i = 1; i < this.items.length; i++) {
      if (itemCompare(this.items[i - 1], this.items[i]) === 0) throw Error('duplicate item inserted')
    }
  }

  unseal(): void {
    this.sealed = false
  }

  size(): number {
    this._checkSealed()
    return this.items.length
  }

  getItem(i: number): { timestamp: number; id: Uint8Array } {
    this._checkSealed()
    if (i >= this.items.length) throw Error('out of range')
    return this.items[i]
  }

  iterate(begin: number, end: number, cb: (item: { timestamp: number; id: Uint8Array }, i: number) => boolean): void {
    this._checkSealed()
    this._checkBounds(begin, end)

    for (let i = begin; i < end; ++i) {
      if (!cb(this.items[i], i)) break
    }
  }

  findLowerBound(begin: number, end: number, bound: { timestamp: number; id: Uint8Array }): number {
    this._checkSealed()
    this._checkBounds(begin, end)

    return this._binarySearch(this.items, begin, end, a => itemCompare(a, bound) < 0)
  }

  fingerprint(begin: number, end: number): Uint8Array {
    let out = new Accumulator()
    out.setToZero()

    this.iterate(begin, end, item => {
      out.add(item.id)
      return true
    })

    return out.getFingerprint(end - begin)
  }

  _checkSealed(): void {
    if (!this.sealed) throw Error('not sealed')
  }

  _checkBounds(begin: number, end: number): void {
    if (begin > end || end > this.items.length) throw Error('bad range')
  }

  _binarySearch(
    arr: { timestamp: number; id: Uint8Array }[],
    first: number,
    last: number,
    cmp: (a: { timestamp: number; id: Uint8Array }) => boolean,
  ): number {
    let count = last - first

    while (count > 0) {
      let it = first
      let step = Math.floor(count / 2)
      it += step

      if (cmp(arr[it])) {
        first = ++it
        count -= step + 1
      } else {
        count = step
      }
    }

    return first
  }
}

export class Negentropy {
  storage: NegentropyStorageVector
  frameSizeLimit: number
  lastTimestampIn: number
  lastTimestampOut: number

  constructor(storage: NegentropyStorageVector, frameSizeLimit: number = 60_000) {
    if (frameSizeLimit < 4096) throw Error('frameSizeLimit too small')

    this.storage = storage
    this.frameSizeLimit = frameSizeLimit

    this.lastTimestampIn = 0
    this.lastTimestampOut = 0
  }

  _bound(timestamp: number, id?: Uint8Array): { timestamp: number; id: Uint8Array } {
    return { timestamp, id: id || new Uint8Array(0) }
  }

  initiate(): string {
    let output = new WrappedBuffer()
    output.extend(new Uint8Array([PROTOCOL_VERSION]))
    this.splitRange(0, this.storage.size(), this._bound(Number.MAX_VALUE), output)
    return bytesToHex(output.unwrap())
  }

  reconcile(queryMsg: string, onhave?: (id: string) => void, onneed?: (id: string) => void): string | null {
    const query = new WrappedBuffer(hexToBytes(queryMsg))

    this.lastTimestampIn = this.lastTimestampOut = 0 // reset for each message

    let fullOutput = new WrappedBuffer()
    fullOutput.extend(new Uint8Array([PROTOCOL_VERSION]))

    let protocolVersion = getByte(query)
    if (protocolVersion < 0x60 || protocolVersion > 0x6f) throw Error('invalid negentropy protocol version byte')
    if (protocolVersion !== PROTOCOL_VERSION) {
      throw Error('unsupported negentropy protocol version requested: ' + (protocolVersion - 0x60))
    }

    let storageSize = this.storage.size()
    let prevBound = this._bound(0)
    let prevIndex = 0
    let skip = false

    while (query.length !== 0) {
      let o = new WrappedBuffer()

      let doSkip = () => {
        if (skip) {
          skip = false
          o.extend(this.encodeBound(prevBound))
          o.extend(encodeVarInt(Mode.Skip))
        }
      }

      let currBound = this.decodeBound(query)
      let mode = decodeVarInt(query)

      let lower = prevIndex
      let upper = this.storage.findLowerBound(prevIndex, storageSize, currBound)

      if (mode === Mode.Skip) {
        skip = true
      } else if (mode === Mode.Fingerprint) {
        let theirFingerprint = getBytes(query, FINGERPRINT_SIZE)
        let ourFingerprint = this.storage.fingerprint(lower, upper)

        if (compareUint8Array(theirFingerprint, ourFingerprint) !== 0) {
          doSkip()
          this.splitRange(lower, upper, currBound, o)
        } else {
          skip = true
        }
      } else if (mode === Mode.IdList) {
        let numIds = decodeVarInt(query)

        let theirElems: { [key: string]: Uint8Array } = {} // stringified Uint8Array -> original Uint8Array (or hex)
        for (let i = 0; i < numIds; i++) {
          let e = getBytes(query, ID_SIZE)
          theirElems[bytesToHex(e)] = e
        }

        skip = true
        this.storage.iterate(lower, upper, item => {
          let k = item.id
          const id = bytesToHex(k)

          if (!theirElems[id]) {
            // ID exists on our side, but not their side
            onhave?.(id)
          } else {
            // ID exists on both sides
            delete theirElems[bytesToHex(k)]
          }

          return true
        })

        if (onneed) {
          for (let v of Object.values(theirElems)) {
            // ID exists on their side, but not our side
            onneed(bytesToHex(v))
          }
        }
      } else {
        throw Error('unexpected mode')
      }

      if (this.exceededFrameSizeLimit(fullOutput.length + o.length)) {
        // frameSizeLimit exceeded: stop range processing and return a fingerprint for the remaining range
        let remainingFingerprint = this.storage.fingerprint(upper, storageSize)

        fullOutput.extend(this.encodeBound(this._bound(Number.MAX_VALUE)))
        fullOutput.extend(encodeVarInt(Mode.Fingerprint))
        fullOutput.extend(remainingFingerprint)
        break
      } else {
        fullOutput.extend(o)
      }

      prevIndex = upper
      prevBound = currBound
    }

    return fullOutput.length === 1 ? null : bytesToHex(fullOutput.unwrap())
  }

  splitRange(lower: number, upper: number, upperBound: { timestamp: number; id: Uint8Array }, o: WrappedBuffer) {
    let numElems = upper - lower
    let buckets = 16

    if (numElems < buckets * 2) {
      o.extend(this.encodeBound(upperBound))
      o.extend(encodeVarInt(Mode.IdList))

      o.extend(encodeVarInt(numElems))
      this.storage.iterate(lower, upper, item => {
        o.extend(item.id)
        return true
      })
    } else {
      let itemsPerBucket = Math.floor(numElems / buckets)
      let bucketsWithExtra = numElems % buckets
      let curr = lower

      for (let i = 0; i < buckets; i++) {
        let bucketSize = itemsPerBucket + (i < bucketsWithExtra ? 1 : 0)
        let ourFingerprint = this.storage.fingerprint(curr, curr + bucketSize)
        curr += bucketSize

        let nextBound: { timestamp: number; id: Uint8Array }

        if (curr === upper) {
          nextBound = upperBound
        } else {
          let prevItem: { timestamp: number; id: Uint8Array } | undefined
          let currItem: { timestamp: number; id: Uint8Array } | undefined

          this.storage.iterate(curr - 1, curr + 1, (item, index) => {
            if (index === curr - 1) prevItem = item
            else currItem = item
            return true
          })

          nextBound = this.getMinimalBound(prevItem!, currItem!)
        }

        o.extend(this.encodeBound(nextBound))
        o.extend(encodeVarInt(Mode.Fingerprint))
        o.extend(ourFingerprint)
      }
    }
  }

  exceededFrameSizeLimit(n: number): boolean {
    return n > this.frameSizeLimit - 200
  }

  // Decoding
  decodeTimestampIn(encoded: WrappedBuffer): number {
    let timestamp = decodeVarInt(encoded)
    timestamp = timestamp === 0 ? Number.MAX_VALUE : timestamp - 1
    if (this.lastTimestampIn === Number.MAX_VALUE || timestamp === Number.MAX_VALUE) {
      this.lastTimestampIn = Number.MAX_VALUE
      return Number.MAX_VALUE
    }
    timestamp += this.lastTimestampIn
    this.lastTimestampIn = timestamp
    return timestamp
  }

  decodeBound(encoded: WrappedBuffer): { timestamp: number; id: Uint8Array } {
    let timestamp = this.decodeTimestampIn(encoded)
    let len = decodeVarInt(encoded)
    if (len > ID_SIZE) throw Error('bound key too long')
    let id = getBytes(encoded, len)
    return { timestamp, id }
  }

  // Encoding
  encodeTimestampOut(timestamp: number): WrappedBuffer {
    if (timestamp === Number.MAX_VALUE) {
      this.lastTimestampOut = Number.MAX_VALUE
      return encodeVarInt(0)
    }

    let temp = timestamp
    timestamp -= this.lastTimestampOut
    this.lastTimestampOut = temp
    return encodeVarInt(timestamp + 1)
  }

  encodeBound(key: { timestamp: number; id: Uint8Array }): WrappedBuffer {
    let output = new WrappedBuffer()

    output.extend(this.encodeTimestampOut(key.timestamp))
    output.extend(encodeVarInt(key.id.length))
    output.extend(key.id)

    return output
  }

  getMinimalBound(
    prev: { timestamp: number; id: Uint8Array },
    curr: { timestamp: number; id: Uint8Array },
  ): { timestamp: number; id: Uint8Array } {
    if (curr.timestamp !== prev.timestamp) {
      return this._bound(curr.timestamp)
    } else {
      let sharedPrefixBytes = 0
      let currKey = curr.id
      let prevKey = prev.id

      for (let i = 0; i < ID_SIZE; i++) {
        if (currKey[i] !== prevKey[i]) break
        sharedPrefixBytes++
      }

      return this._bound(curr.timestamp, curr.id.subarray(0, sharedPrefixBytes + 1))
    }
  }
}

function compareUint8Array(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }

  if (a.byteLength > b.byteLength) return 1
  if (a.byteLength < b.byteLength) return -1

  return 0
}

function itemCompare(a: { timestamp: number; id: Uint8Array }, b: { timestamp: number; id: Uint8Array }): number {
  if (a.timestamp === b.timestamp) {
    return compareUint8Array(a.id, b.id)
  }

  return a.timestamp - b.timestamp
}

export class NegentropySync {
  relay: AbstractRelay
  storage: NegentropyStorageVector
  private neg: Negentropy
  private subscription: Subscription
  private onhave?: (id: string) => void
  private onneed?: (id: string) => void

  constructor(
    relay: AbstractRelay,
    storage: NegentropyStorageVector,
    filter: Filter,
    params: {
      label?: string
      onhave?: (id: string) => void
      onneed?: (id: string) => void
      onclose?: (errReason?: string) => void
    } = {},
  ) {
    this.relay = relay
    this.storage = storage
    this.neg = new Negentropy(storage)
    this.onhave = params.onhave
    this.onneed = params.onneed

    this.subscription = this.relay.prepareSubscription([filter], { label: params.label || 'negentropy' })
    this.subscription.oncustom = (data: string[]) => {
      switch (data[0]) {
        case 'NEG-MSG': {
          if (data.length < 3) {
            console.warn(`got invalid NEG-MSG from ${this.relay.url}: ${data}`)
          }
          try {
            const response = this.neg.reconcile(data[2], this.onhave, this.onneed)
            if (response) {
              this.relay.send(`["NEG-MSG", "${this.subscription.id}", "${response}"]`)
            }
          } catch (error) {
            console.error('negentropy reconcile error:', error)
            params?.onclose?.(`reconcile error: ${error}`)
          }
          break
        }
        case 'NEG-CLOSE': {
          const reason = data[2]
          console.warn('negentropy error:', reason)
          params.onclose?.(reason)
          break
        }
        case 'NEG-ERR': {
          params.onclose?.()
        }
      }
    }
  }

  async start(): Promise<void> {
    const initMsg = this.neg.initiate()
    if (initMsg) {
      this.relay.send(`["NEG-OPEN","${this.subscription.id}",${initMsg}]`)
    }
  }

  close(): void {
    this.relay.send(`["NEG-CLOSE","${this.subscription.id}"]`)
    this.subscription.close()
  }
}
