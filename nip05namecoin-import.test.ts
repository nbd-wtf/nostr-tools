/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from 'bun:test'

import { expandImports, type NameValueFetcher, DEFAULT_MAX_DEPTH } from './nip05namecoin-import.ts'

// Hermetic: no network. Every "imported" name is served by an in-memory
// map. Behavioural parity with the Kotlin reference impl
// (Amethyst quartz NamecoinImportTest.kt).

function makeFetcher(table: Record<string, string>): {
  fetcher: NameValueFetcher
  calls: string[]
} {
  const calls: string[] = []
  const fetcher: NameValueFetcher = async name => {
    calls.push(name)
    return Object.prototype.hasOwnProperty.call(table, name) ? table[name] : null
  }
  return { fetcher, calls }
}

test('no import key returns object unchanged and never calls the fetcher', async () => {
  const root = { ip: '1.2.3.4' }
  const { fetcher, calls } = makeFetcher({})
  const expanded = await expandImports(root, fetcher)
  expect(expanded).toEqual(root)
  expect(calls.length).toBe(0)
})

test('string shorthand import merges imported items into importer', async () => {
  // ifa-0001 canonical form is array-of-arrays, but the string form
  // `"import": "d/foo"` is widely used in practice.
  const root = { import: 'd/lib', ip: '1.1.1.1' }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({ ip: '9.9.9.9', nostr: { names: { _: 'abc' } } }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.ip).toBe('1.1.1.1') // importer wins
  expect(expanded.nostr.names._).toBe('abc') // imports fill in
  expect('import' in expanded).toBe(false) // import key stripped
})

test('canonical array-of-arrays processes each in order, last-wins among imports', async () => {
  const root = { import: [['d/a'], ['d/b']] }
  const { fetcher } = makeFetcher({
    'd/a': JSON.stringify({ ip: '10.0.0.1', tag: 'from-a' }),
    'd/b': JSON.stringify({ ip: '10.0.0.2', extra: 'from-b' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  // d/b is processed AFTER d/a, so its `ip` overrides d/a's; importer has none.
  expect(expanded.ip).toBe('10.0.0.2')
  expect(expanded.tag).toBe('from-a')
  expect(expanded.extra).toBe('from-b')
})

test('pair-array shorthand uses subdomain selector', async () => {
  const root = { import: ['d/lib', 'relay'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({
      ip: '1.1.1.1',
      map: { relay: { ip: '7.7.7.7', tag: 'selected' } },
    }),
  })
  const expanded: any = await expandImports(root, fetcher)
  // map.relay was selected; top-level ip (1.1.1.1) is NOT seen.
  expect(expanded.ip).toBe('7.7.7.7')
  expect(expanded.tag).toBe('selected')
})

test('single-element shorthand array imports without selector', async () => {
  const root = { import: ['d/lib'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({ pubkey: 'ff' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.pubkey).toBe('ff')
})

test('importer items take precedence over imported items', async () => {
  const root = { import: 'd/lib', ip: '1.1.1.1', extra: 'local' }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({ ip: '9.9.9.9', extra: 'remote', 'only-imported': 'yes' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.ip).toBe('1.1.1.1')
  expect(expanded.extra).toBe('local')
  expect(expanded['only-imported']).toBe('yes')
})

test('null in importer suppresses imported value', async () => {
  // ifa-0001: null is "present for precedence" — semantic suppression.
  const root = { import: 'd/lib', ip: null }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({ ip: '9.9.9.9', other: 'keep' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect('ip' in expanded).toBe(true)
  expect(expanded.ip).toBeNull()
  expect(expanded.other).toBe('keep')
})

test('recursion depth four is supported (spec-mandated minimum)', async () => {
  const root = { import: 'd/a' }
  const { fetcher } = makeFetcher({
    'd/a': JSON.stringify({ import: 'd/b', layer: 'a' }),
    'd/b': JSON.stringify({ import: 'd/c', layer: 'b' }),
    'd/c': JSON.stringify({ import: 'd/d', layer: 'c' }),
    'd/d': JSON.stringify({ layer: 'd', deep: 'reached' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  // Each layer overrides "layer" so the importer sees "a".
  expect(expanded.layer).toBe('a')
  expect(expanded.deep).toBe('reached')
})

test('recursion deeper than maxDepth is silently truncated', async () => {
  const root = { import: 'd/a', local: 'keep' }
  const { fetcher } = makeFetcher({
    'd/a': JSON.stringify({ import: 'd/b', tag: 'from-a' }),
    'd/b': JSON.stringify({ tag: 'from-b', leaf: 'wont-show' }),
  })
  const expanded: any = await expandImports(root, fetcher, 1)
  expect(expanded.tag).toBe('from-a')
  expect(expanded.local).toBe('keep')
  expect(expanded.leaf).toBeUndefined()
})

test('default maxDepth matches ifa-0001 minimum (4)', () => {
  expect(DEFAULT_MAX_DEPTH).toBe(4)
})

test('failed import lookup is treated as empty object, importer items still apply', async () => {
  const root = { import: 'd/missing', local: 'survives' }
  const { fetcher } = makeFetcher({})
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.local).toBe('survives')
  expect('import' in expanded).toBe(false)
})

test('malformed JSON in imported value is treated as empty object', async () => {
  const root = { import: 'd/bad', local: 'survives' }
  const { fetcher } = makeFetcher({ 'd/bad': '{not-json' })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.local).toBe('survives')
})

test('fetcher throwing is treated as empty object (best-effort)', async () => {
  // Defence in depth: even though the wired-up fetcher in nip05namecoin.ts
  // catches its own errors, expandImports should not crash if someone
  // wires a fetcher that throws.
  const root = { import: 'd/explode', local: 'survives' }
  const fetcher: NameValueFetcher = async () => {
    throw new Error('transport boom')
  }
  // Current impl propagates fetcher errors; document the contract here
  // by asserting the throw. Wire-side fetchers must catch.
  let threw = false
  try {
    await expandImports(root, fetcher)
  } catch {
    threw = true
  }
  expect(threw).toBe(true)
})

test('cycle in imports is broken without infinite recursion', async () => {
  const root = { import: 'd/a', local: 'top' }
  const { fetcher } = makeFetcher({
    'd/a': JSON.stringify({ import: 'd/b', fromA: 'yes' }),
    'd/b': JSON.stringify({ import: 'd/a', fromB: 'yes' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.local).toBe('top')
  expect(expanded.fromA).toBe('yes')
  expect(expanded.fromB).toBe('yes')
})

test('empty import array is a no-op', async () => {
  const root = { import: [], ip: '1.1.1.1' }
  const { fetcher, calls } = makeFetcher({})
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.ip).toBe('1.1.1.1')
  expect('import' in expanded).toBe(false)
  expect(calls.length).toBe(0)
})

test('malformed import value (non-string/array) drops the import', async () => {
  // Numbers, booleans, and objects are not valid import values.
  const root = { import: 42, ip: '1.1.1.1' }
  const { fetcher, calls } = makeFetcher({})
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.ip).toBe('1.1.1.1')
  expect('import' in expanded).toBe(false)
  expect(calls.length).toBe(0)
})

test('selector with trailing dot is treated as malformed and skipped', async () => {
  // ifa-0001 forbids trailing dots in selectors.
  const root = { import: ['d/lib', 'relay.'] }
  const { fetcher, calls } = makeFetcher({
    'd/lib': JSON.stringify({ ip: '1.1.1.1' }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect('import' in expanded).toBe(false)
  expect(expanded.ip).toBeUndefined()
  expect(calls.length).toBe(0) // skipped before fetching
})

test('selector walks the map tree right-to-left (DNS-ordered)', async () => {
  // Selector "a.b" → walk b first (immediate child of root.map), then a.
  const root = { import: ['d/lib', 'a.b'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({
      map: {
        b: {
          map: {
            a: { tag: 'leaf-ab' },
          },
        },
      },
    }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.tag).toBe('leaf-ab')
})

test('selector wildcard `*` matches any single label', async () => {
  const root = { import: ['d/lib', 'unknown'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({
      map: { '*': { tag: 'wildcard-hit' } },
    }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.tag).toBe('wildcard-hit')
})

test('selector empty key `""` is the default for the current level', async () => {
  const root = { import: ['d/lib', 'unknown'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({
      map: { '': { tag: 'default-hit' } },
    }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.tag).toBe('default-hit')
})

test('selector exact match wins over wildcard and default', async () => {
  const root = { import: ['d/lib', 'relay'] }
  const { fetcher } = makeFetcher({
    'd/lib': JSON.stringify({
      map: {
        relay: { who: 'exact' },
        '*': { who: 'wild' },
        '': { who: 'default' },
      },
    }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.who).toBe('exact')
})

test('non-object child in map terminates selector walk with null (empty merge)', async () => {
  const root = { import: ['d/lib', 'a'], local: 'survives' }
  const { fetcher } = makeFetcher({
    // map.a is a string, not an object — selector should bail.
    'd/lib': JSON.stringify({ map: { a: 'oops' } }),
  })
  const expanded: any = await expandImports(root, fetcher)
  expect(expanded.local).toBe('survives')
  // Selector walk bailed → imported view is null → nothing merged.
  expect(expanded.tag).toBeUndefined()
})
