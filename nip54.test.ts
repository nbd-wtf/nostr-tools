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
    expect(normalizeIdentifier('café')).toBe('café')
    expect(normalizeIdentifier('Ａ')).toBe('a')
  })

  test('turns whitespace into hyphens', () => {
    expect(normalizeIdentifier('hello world')).toBe('hello-world')
    expect(normalizeIdentifier('tab\tand\nnewline')).toBe('tab-and-newline')
  })

  test('removes punctuation and symbols', () => {
    expect(normalizeIdentifier('user@example.com')).toBe('userexamplecom')
    expect(normalizeIdentifier('$special#chars!')).toBe('specialchars')
    expect(normalizeIdentifier('hello!!!world')).toBe('helloworld')
    expect(normalizeIdentifier('C++ & C#')).toBe('c-c')
    expect(normalizeIdentifier('snake_case')).toBe('snakecase')
  })

  test('removes emoji with their variation selectors and joiners', () => {
    expect(normalizeIdentifier('😀 smile')).toBe('smile')
    expect(normalizeIdentifier('love ❤️')).toBe('love')
    expect(normalizeIdentifier('family 👨‍👩‍👧 trip')).toBe('family-trip')
    expect(normalizeIdentifier('👍🏽 ok')).toBe('ok')
  })

  test('keeps hyphens that are already there', () => {
    expect(normalizeIdentifier('wiki-article')).toBe('wiki-article')
    expect(normalizeIdentifier('wiki - article')).toBe('wiki-article')
  })

  test('collapses repeated hyphens and trims them at the ends', () => {
    expect(normalizeIdentifier('multiple   spaces')).toBe('multiple-spaces')
    expect(normalizeIdentifier('-- dashes --')).toBe('dashes')
    expect(normalizeIdentifier('a -- b')).toBe('a-b')
  })

  test('preserves numbers', () => {
    expect(normalizeIdentifier('user123')).toBe('user123')
    expect(normalizeIdentifier('2fast4you')).toBe('2fast4you')
  })

  test('handles Unicode letters from different scripts', () => {
    expect(normalizeIdentifier('привет')).toBe('привет')
    expect(normalizeIdentifier('こんにちは')).toBe('こんにちは')
    expect(normalizeIdentifier('مرحبا')).toBe('مرحبا')
  })

  test('keeps combining marks that are part of a letter', () => {
    expect(normalizeIdentifier('हिन्दी')).toBe('हिन्दी')
    expect(normalizeIdentifier('বাংলা')).toBe('বাংলা')
    expect(normalizeIdentifier('தமிழ்')).toBe('தமிழ்')
    expect(normalizeIdentifier('İstanbul')).toBe('i̇stanbul')
  })

  test('matches the examples in NIP-54', () => {
    expect(normalizeIdentifier('Wiki Article')).toBe('wiki-article')
    expect(normalizeIdentifier("What's Up?")).toBe('whats-up')
    expect(normalizeIdentifier('  Hello  World  ')).toBe('hello-world')
    expect(normalizeIdentifier('Article 1')).toBe('article-1')
    expect(normalizeIdentifier('ウィキペディア')).toBe('ウィキペディア')
    expect(normalizeIdentifier('Ñoño')).toBe('ñoño')
    expect(normalizeIdentifier('Москва')).toBe('москва')
    expect(normalizeIdentifier('日本語 Article')).toBe('日本語-article')
    expect(normalizeIdentifier('lightning network')).toBe('lightning-network')
    expect(normalizeIdentifier('日本語 記事')).toBe('日本語-記事')
    expect(normalizeIdentifier('Биткойн')).toBe('биткойн')
  })
})
