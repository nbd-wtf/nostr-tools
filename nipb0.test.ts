import { describe, expect, it } from 'bun:test'
import { getHashFromURL } from './nipb0.ts'

const VALID_HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

describe('getHashFromURL', () => {
  it('extracts hash from plain URL string', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with extension', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}.jpg`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with query string', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}?foo=bar`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with fragment', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}#section`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL with query and fragment', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH}?foo=bar#section`)).toBe(VALID_HASH)
  })

  it('extracts hash from URL object', () => {
    expect(getHashFromURL(new URL(`https://example.com/${VALID_HASH}`))).toBe(VALID_HASH)
  })

  it('extracts hash from URL object with pathname', () => {
    const url = new URL(`https://example.com/${VALID_HASH}.png`)
    expect(getHashFromURL(url)).toBe(VALID_HASH)
  })

  it('returns null when segment is too short', () => {
    expect(getHashFromURL('https://example.com/abc')).toBeNull()
  })

  it('returns null when segment has non-hex characters', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH.slice(0, 63)}x`)).toBeNull()
  })

  it('returns null when extension is not at position 64', () => {
    expect(getHashFromURL('https://example.com/short.jpg')).toBeNull()
  })

  it('returns null when uppercase hex chars are used', () => {
    expect(getHashFromURL(`https://example.com/${VALID_HASH.toUpperCase()}`)).toBeNull()
  })

  it('returns null for URL without hash in path', () => {
    expect(getHashFromURL('https://example.com/')).toBeNull()
  })

  it('handles localhost URL with hash', () => {
    expect(getHashFromURL(`http://localhost:3000/${VALID_HASH}`)).toBe(VALID_HASH)
  })

  it('returns hash from nested path', () => {
    expect(getHashFromURL(`https://example.com/files/${VALID_HASH}.jpg`)).toBe(VALID_HASH)
  })

  it('returns null for plain string without slash', () => {
    expect(getHashFromURL('not-a-url')).toBeNull()
  })
})
