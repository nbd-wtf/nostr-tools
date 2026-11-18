/**
 * Normalizes a wiki article name into a `d` tag, following the NIP-54 rules:
 * letters are lowercased, whitespace becomes `-`, punctuation and symbols are
 * removed, repeated `-` are collapsed and leading/trailing `-` are removed.
 * Letters from any script (with their combining marks) and numbers are kept.
 */
export function normalizeIdentifier(name: string): string {
  return (
    name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g, '-')
      // also drop marks and joiners attached to a removed symbol, like emoji variation selectors
      .replace(/(?!-)[\p{P}\p{S}][\p{M}‍]*/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  )
}
