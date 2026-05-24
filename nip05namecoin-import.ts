/**
 * ifa-0001 `import` chain resolution for Namecoin Domain Name Objects.
 *
 * Used by `./nip05namecoin.ts` to merge values from imported names into
 * the importing object before extracting record-specific fields like
 * `nostr`. Without this step, any `.bit` record that uses the
 * `"import"` shorthand resolves to `null` even when there's a valid
 * `nostr` pubkey one hop away.
 *
 * Spec: https://github.com/namecoin/proposals/blob/master/ifa-0001.md
 *
 * Behavioural parity with the Kotlin reference impl at
 * `quartz/src/commonMain/kotlin/com/vitorpamplona/quartz/nip05DnsIdentifiers/namecoin/NamecoinImportResolver.kt`
 * in `vitorpamplona/amethyst` — same import shapes, same selector
 * semantics, same recursion / cycle / merge rules.
 *
 * Transport-free: the caller passes in a `fetcher` that maps a
 * Namecoin name (e.g. `d/foo`) to its raw value JSON string, or
 * `null` if the name does not exist / could not be fetched. Failures
 * are absorbed — a failed import contributes nothing and the
 * importing record's own items still apply.
 */

/**
 * Async name lookup callback. Returns the raw value JSON string of
 * the named record, or `null` if the name does not exist / is
 * expired / could not be fetched.
 *
 * Called once per `import` target (deduplicated within a single
 * recursive expansion path).
 */
export type NameValueFetcher = (namecoinName: string) => Promise<string | null>

/**
 * The minimum recursion depth ifa-0001 requires implementations to
 * support. We default to this; deeper chains are silently truncated.
 */
export const DEFAULT_MAX_DEPTH = 4

type ImportOp = {
  name: string
  /** DNS dotted, may be empty. Preserved as written. */
  selector: string
}

type JsonObject = Record<string, unknown>

/**
 * Expand all `import` items in `root` (and recursively in imported
 * objects) up to `maxDepth` levels deep, returning a single merged
 * object with no `import` key.
 *
 * The merged object preserves the importing object's items unchanged;
 * imported items only fill in keys the importing object did not declare
 * (including keys whose value is `null` — those remain suppressed per
 * ifa-0001).
 *
 * If `root` has no `import` key, it is returned unchanged (no fetcher
 * calls are made).
 */
export async function expandImports(
  root: JsonObject,
  fetcher: NameValueFetcher,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): Promise<JsonObject> {
  return expandRecursive(root, fetcher, maxDepth, new Set<string>())
}

async function expandRecursive(
  obj: JsonObject,
  fetcher: NameValueFetcher,
  budgetRemaining: number,
  visited: Set<string>,
): Promise<JsonObject> {
  if (!Object.prototype.hasOwnProperty.call(obj, 'import')) return obj
  const operations = parseImportItem(obj['import'])
  if (operations === null) return removeImportKey(obj)
  if (operations.length === 0 || budgetRemaining <= 0) return removeImportKey(obj)

  // Walk imports left-to-right. Spec is silent on multiple-import
  // precedence; we follow the common-sense rule that LATER imports
  // override EARLIER ones in the same array (otherwise listing two
  // libraries would silently ignore the second). The whole accumulator
  // still loses to the importing object on top of all of it.
  let accumulator: JsonObject = {}
  for (const op of operations) {
    const visitKey = `${op.name}|${op.selector}`
    if (visited.has(visitKey)) continue // cycle / duplicate within this chain
    visited.add(visitKey)
    try {
      const importedRaw = await fetcher(op.name)
      if (importedRaw === null || importedRaw === undefined) continue
      const importedRoot = tryParseObject(importedRaw)
      if (importedRoot === null) continue
      const selectorView = applySelector(importedRoot, op.selector)
      if (selectorView === null) continue
      const expanded = await expandRecursive(selectorView, fetcher, budgetRemaining - 1, visited)
      accumulator = mergeImporterWins(expanded, accumulator)
    } finally {
      visited.delete(visitKey)
    }
  }

  const withoutImport = removeImportKey(obj)
  return mergeImporterWins(withoutImport, accumulator)
}

/**
 * Merge two objects with importer-wins semantics: every key in
 * `importer` stays as-is (including `null` values, which suppress the
 * imported counterpart per ifa-0001); keys present only in `imported`
 * are added.
 */
function mergeImporterWins(importer: JsonObject, imported: JsonObject): JsonObject {
  const importerKeys = Object.keys(importer)
  const importedKeys = Object.keys(imported)
  if (importedKeys.length === 0) return importer
  if (importerKeys.length === 0) return imported
  // Imported first so we can overwrite with importer. Object spread
  // preserves insertion order (imported first, importer last); keys
  // in both end up in the imported position with the importer value,
  // matching the Kotlin LinkedHashMap behaviour.
  const out: JsonObject = {}
  for (const k of importedKeys) out[k] = imported[k]
  for (const k of importerKeys) out[k] = importer[k]
  return out
}

/**
 * Walk the imported object's `map` tree to the node addressed by
 * `selector` (DNS dotted, e.g. `relay`, `a.b.c`). Empty selector
 * returns `root` unchanged.
 *
 * Resolution rules per ifa-0001 §"map":
 *   - Exact label match wins.
 *   - Wildcard `*` matches any single label.
 *   - Empty key `""` is the default for the current level when no
 *     other match applies.
 *   - A non-object child terminates the walk with `null`.
 */
function applySelector(root: JsonObject, selector: string): JsonObject | null {
  if (selector.length === 0) return root
  // Selector is DNS-dotted: leftmost label is the most-specific. The
  // `map` tree is rooted at the parent and nests inwards toward the
  // leaf, so we walk labels right-to-left (the rightmost label is the
  // immediate child of the parent's `map`).
  const labels = selector
    .split('.')
    .filter(s => s.length > 0)
    .reverse()
  if (labels.length === 0) return root

  let current: JsonObject = root
  for (const label of labels) {
    const map = current['map']
    if (!isPlainObject(map)) return null
    const exact = (map as JsonObject)[label]
    const wildcard = (map as JsonObject)['*']
    const defaultChild = (map as JsonObject)['']
    const child = pickFirstObject(exact, wildcard, defaultChild)
    if (child === null) return null
    current = child
  }
  return current
}

function pickFirstObject(...candidates: unknown[]): JsonObject | null {
  for (const c of candidates) {
    if (isPlainObject(c)) return c as JsonObject
  }
  return null
}

function tryParseObject(rawJson: string): JsonObject | null {
  try {
    const parsed = JSON.parse(rawJson) as unknown
    return isPlainObject(parsed) ? (parsed as JsonObject) : null
  } catch {
    return null
  }
}

function removeImportKey(obj: JsonObject): JsonObject {
  if (!Object.prototype.hasOwnProperty.call(obj, 'import')) return obj
  const out: JsonObject = {}
  for (const k of Object.keys(obj)) {
    if (k !== 'import') out[k] = obj[k]
  }
  return out
}

/**
 * Parse the value of an `import` item into a flat list of {@link ImportOp}
 * descriptors. Returns `null` if the value is malformed.
 *
 * Accepted shapes (in order of preference):
 *   - canonical: `[ ["d/foo"], ["d/bar","sub"] ]`
 *   - shorthand string: `"d/foo"` → one op with no selector
 *   - shorthand single-array: `["d/foo"]` → one op with no selector
 *   - shorthand pair-array: `["d/foo","sub"]` → one op with selector
 *
 * Anything else is treated as malformed and the import is skipped.
 */
function parseImportItem(item: unknown): ImportOp[] | null {
  // Shorthand: bare string.
  if (typeof item === 'string') {
    const trimmed = item.trim()
    if (trimmed.length === 0) return null
    return [{ name: trimmed, selector: '' }]
  }

  if (!Array.isArray(item)) return null
  if (item.length === 0) return []

  // Distinguish: array-of-arrays (canonical) vs array-of-strings (shorthand).
  if (Array.isArray(item[0])) {
    const ops: ImportOp[] = []
    for (const entry of item) {
      if (!Array.isArray(entry)) continue
      const op = opFromArray(entry)
      if (op !== null) ops.push(op)
    }
    return ops
  }

  // Shorthand: ["name"] or ["name","selector"].
  const op = opFromArray(item)
  return op === null ? [] : [op]
}

function opFromArray(arr: unknown[]): ImportOp | null {
  if (arr.length === 0) return null
  const rawName = arr[0]
  if (typeof rawName !== 'string') return null
  const name = rawName.trim()
  if (name.length === 0) return null
  let selector = ''
  if (arr.length >= 2) {
    const rawSelector = arr[1]
    if (typeof rawSelector !== 'string') return null
    selector = rawSelector.trim()
  }
  // Trailing dot is forbidden by ifa-0001; treat as malformed → skip.
  if (selector.endsWith('.')) return null
  return { name, selector }
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
