/** Events are **regular**, which means they're all expected to be stored by relays. */
function isRegularKind(kind: number) {
  return (1000 <= kind && kind < 10000) || [1, 2, 4, 5, 6, 7, 8, 16, 40, 41, 42, 43, 44].includes(kind)
}

/** Events are **replaceable**, which means that, for each combination of `pubkey` and `kind`, only the latest event is expected to (SHOULD) be stored by relays, older versions are expected to be discarded. */
function isReplaceableKind(kind: number) {
  return (10000 <= kind && kind < 20000) || [0, 3].includes(kind)
}

/** Events are **ephemeral**, which means they are not expected to be stored by relays. */
function isEphemeralKind(kind: number) {
  return 20000 <= kind && kind < 30000
}

/** Events are **parameterized replaceable**, which means that, for each combination of `pubkey`, `kind` and the `d` tag, only the latest event is expected to be stored by relays, older versions are expected to be discarded. */
function isParameterizedReplaceableKind(kind: number) {
  return 30000 <= kind && kind < 40000
}

/** Classification of the event kind. */
type KindClassification = 'regular' | 'replaceable' | 'ephemeral' | 'parameterized' | 'unknown'

/** Determine the classification of this kind of event if known, or `unknown`. */
function classifyKind(kind: number): KindClassification {
  if (isRegularKind(kind)) return 'regular'
  if (isReplaceableKind(kind)) return 'replaceable'
  if (isEphemeralKind(kind)) return 'ephemeral'
  if (isParameterizedReplaceableKind(kind)) return 'parameterized'
  return 'unknown'
}

export {
  classifyKind,
  isEphemeralKind,
  isParameterizedReplaceableKind,
  isRegularKind,
  isReplaceableKind,
  type KindClassification,
}
