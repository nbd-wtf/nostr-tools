import { describe, test, expect } from 'bun:test'
import { normalizeIdentifier } from './nip54.ts'

describe('normalizeIdentifier', () => {
  test('converts to lowercase', () => {
    expect(normalizeIdentifier('HELLO')).toBe('hello')
    expect(normalizeIdentifier('MixedCase')).toBe('mixedcase')
  })

  test('trims whitespace', () => {
    expect(normalizeIdentifier('  hello  ')).toBe('hello')
    expect(normalizeIdentifier('\thello\n')).toBe('hello')
  })

  test('normalizes Unicode to NFKC form', () => {
    // é can be represented as single char é (U+00E9) or e + ´ (U+0065 U+0301)
    expect(normalizeIdentifier('café')).toBe('café')
    expect(normalizeIdentifier('cafe\u0301')).toBe('café')
  })

  test('replaces non-alphanumeric characters with hyphens', () => {
    expect(normalizeIdentifier('hello world')).toBe('hello-world')
    expect(normalizeIdentifier('user@example.com')).toBe('user-example-com')
    expect(normalizeIdentifier('$special#chars!')).toBe('-special-chars-')
  })

  test('preserves numbers', () => {
    expect(normalizeIdentifier('user123')).toBe('user123')
    expect(normalizeIdentifier('2fast4you')).toBe('2fast4you')
  })

  test('handles multiple consecutive special characters', () => {
    expect(normalizeIdentifier('hello!!!world')).toBe('hello---world')
    expect(normalizeIdentifier('multiple   spaces')).toBe('multiple---spaces')
  })

  test('handles Unicode letters from different scripts', () => {
    expect(normalizeIdentifier('привет')).toBe('привет')
    expect(normalizeIdentifier('こんにちは')).toBe('こんにちは')
    expect(normalizeIdentifier('مرحبا')).toBe('مرحبا')
  })
})
