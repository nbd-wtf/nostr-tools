/**
 * Node-only companion to `nostr-tools/nip05namecoin`.
 *
 * The core module is isomorphic (browser + Node) and zero-dep, but in
 * browsers it can't currently reach the two public Namecoin
 * ElectrumX operators: both serve self-signed TLS certificates, which
 * no browser TLS stack will accept. This module is the practical
 * Node experience: it uses the optional `ws` peer dependency plus
 * `node:tls` to open a WebSocket-over-TLS connection that trusts the
 * pinned ElectrumX certificates, and nothing else.
 *
 * Typical usage — import `queryProfile` / `isValid` from this module
 * (not the core) so they pick up the pinned-cert transport:
 *
 *   import { queryProfile, install } from 'nostr-tools/nip05namecoin-node'
 *
 *   await install() // once at startup
 *   const profile = await queryProfile('testls.bit')
 *
 * Importing this module in a browser is a programming error and will
 * throw a clear error as soon as {@link installPinnedWebSocket} is
 * called. The `ws` dependency is a *peer* dep on purpose — if you do
 * not plan to use this file, you don't need to install it.
 *
 * # Pinning policy
 *
 * Trust is established by SHA-256 fingerprint pinning of the peer
 * certificate, matching the Kotlin reference in Amethyst and the
 * Swift port in Nostur. Hostname verification is disabled because
 * one of the three shipped endpoints is an IP literal
 * (`46.229.238.187`) for which no public cert would ever validate;
 * the fingerprint check is stronger than hostname verification
 * anyway, and is the real gate.
 *
 * # Rotating pinned certificates
 *
 * Refresh the pinned fingerprints (and re-ship) with:
 *
 *   openssl s_client -connect HOST:PORT -servername HOST < /dev/null \
 *     2>/dev/null | openssl x509 -noout -fingerprint -sha256 \
 *     | tr -d : | awk -F= '{print tolower($2)}'
 */

import {
  useWebSocketImplementation,
  queryProfile as coreQueryProfile,
  isValid as coreIsValid,
  DEFAULT_ELECTRUMX_SERVERS,
  type ElectrumXServer,
} from './nip05namecoin.ts'
import type { ProfilePointer } from './nip19.ts'

/**
 * Node-bound version of {@link coreQueryProfile}. Uses the pinned
 * WebSocket transport installed by this module, regardless of whether
 * the caller's own copy of `nip05namecoin` has a WebSocket configured.
 *
 * Note: `install()` or `installPinnedWebSocket()` must be called
 * before the first invocation. They are idempotent and cheap.
 */
export function queryProfile(
  identifier: string,
  servers?: ElectrumXServer[],
): Promise<ProfilePointer | null> {
  return coreQueryProfile(identifier, servers)
}

/**
 * Node-bound version of {@link coreIsValid}. See {@link queryProfile}
 * for the install-first requirement.
 */
export function isValid(pubkey: string, identifier: string): Promise<boolean> {
  return coreIsValid(pubkey, identifier)
}

// Re-export identifier predicates and the server list so callers that
// want `.bit`-aware routing can do it all through this module.
export {
  isValidIdentifier,
  isDotBit,
  extractNostrFromValue,
  DEFAULT_ELECTRUMX_SERVERS,
  type ElectrumXServer,
} from './nip05namecoin.ts'

/**
 * SHA-256 fingerprints (hex, lowercase, no separators) of the
 * certificates served by the three endpoints in
 * {@link DEFAULT_ELECTRUMX_SERVERS}. Anything presented by the server
 * that isn't in this list is rejected.
 *
 * To refresh, see the module-level docblock.
 */
export const PINNED_SHA256_FINGERPRINTS: readonly string[] = Object.freeze([
  // electrumx.testls.space:50002/50004 — expires 2027-05-04
  '5365d5bb2619f5401cd88efcaffba5b2a0ea7a992df70f057e9bcd5036c7799c',
  // nmc2.bitcoins.sk:57002/57004 and 46.229.238.187:57002/57004 — expires 2030-10-22
  '8241aeaf153ed52af84087da27c4327a409e60d555267483b80ccfcb94574aae',
])

/**
 * PEM-encoded certificates of the pinned ElectrumX servers. Added to
 * the Node TLS trust store for the duration of the handshake so the
 * self-signed chain validates. The SHA-256 fingerprint check in
 * {@link verifyFingerprint} is the authoritative gate.
 */
export const PINNED_CERTIFICATES_PEM: readonly string[] = Object.freeze([
  // electrumx.testls.space:50002/50004 — expires 2027-05-04
  `-----BEGIN CERTIFICATE-----
MIIDwzCCAqsCFGGKT5mjh7oN98aNyjOCiqafL8VyMA0GCSqGSIb3DQEBCwUAMIGd
MQswCQYDVQQGEwJVUzEQMA4GA1UECAwHQ2hpY2FnbzEQMA4GA1UEBwwHQ2hpY2Fn
bzESMBAGA1UECgwJSW50ZXJuZXRzMQ8wDQYDVQQLDAZJbnRlcncxHjAcBgNVBAMM
FWVsZWN0cnVtLnRlc3Rscy5zcGFjZTElMCMGCSqGSIb3DQEJARYWbWpfZ2lsbF84
OUBob3RtYWlsLmNvbTAeFw0yMjA1MDUwNjIzNDFaFw0yNzA1MDQwNjIzNDFaMIGd
MQswCQYDVQQGEwJVUzEQMA4GA1UECAwHQ2hpY2FnbzEQMA4GA1UEBwwHQ2hpY2Fn
bzESMBAGA1UECgwJSW50ZXJuZXRzMQ8wDQYDVQQLDAZJbnRlcncxHjAcBgNVBAMM
FWVsZWN0cnVtLnRlc3Rscy5zcGFjZTElMCMGCSqGSIb3DQEJARYWbWpfZ2lsbF84
OUBob3RtYWlsLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAO4H
+PKCdiiz3jNOA77aAmS2YaU7eOQ8ZGliEVr/PlLcgF5gmthb2DI6iK4KhC1ad34G
1n9IhkXPhkVJ94i8wB3uoTBlA7mI5h59m01yhzSkJAoYoU/i6DM9ipbakqWFCTEp
P+yE216NTU5MbYwThZdRSAIIABe9RyIliMSidyrwHvKBLfnJPFScghW6rhBWN7PG
PA8k0MFGzf+HXbpnV/jAvz08ZC34qiBIjkJrTgh49JweyoZKdppyJcH4UbkslJ2t
YUJR3oURBvrPj+D7TwLVRbX36ul7r4+dP3IjgmljsSAHDK4N/PfWrCBdlj9Pc1Cp
yX+ZDh8X2NrL4ukHoVMCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAeVj6VZNmY/Vb
nhzrC7xBSHqVWQ1wkLOClLsdvgKP8cFFJuUoCMQU5bPMi7nWnkfvvsIKH4Eibk5K
fqiA9jVsY0FHvQ8gP3KMk1LVuUf/sTcRe5itp3guBOSk/zXZUD5tUz/oRk3k+rdc
MsInqhomjNy/dqYmD6Wm4DNPjZh6fWy+AVQKVNOI2t4koaVdpoi8Uv8h4gFGPbdI
sVmtoGiIGkKNIWum+6mnF6PfynNrLk+ztH4TrdacVNeoJUPYEAxOuesWXFy3H4r+
HKBqA4xAzyjgKLPqoWnjSu7gxj1GIjBhnDxkM6wUOnDq8A0EqxR+A17OcXW9sZ2O
2ZIVwmtnyA==
-----END CERTIFICATE-----`,
  // nmc2.bitcoins.sk:57002/57004 and 46.229.238.187:57002/57004 — expires 2030-10-22
  `-----BEGIN CERTIFICATE-----
MIID+TCCAuGgAwIBAgIUdmJGukmfPvqmAYpTfuGcjRoYHJ8wDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlNLMREwDwYDVQQIDAhTbG92YWtpYTETMBEGA1UEBwwK
QnJhdGlzbGF2YTEUMBIGA1UECgwLYml0Y29pbnMuc2sxGTAXBgNVBAMMEG5tYzIu
Yml0Y29pbnMuc2sxIzAhBgkqhkiG9w0BCQEWFGRlYWZib3lAY2ljb2xpbmEub3Jn
MB4XDTIwMTAyNDE5MjQzOVoXDTMwMTAyMjE5MjQzOVowgYsxCzAJBgNVBAYTAlNL
MREwDwYDVQQIDAhTbG92YWtpYTETMBEGA1UEBwwKQnJhdGlzbGF2YTEUMBIGA1UE
CgwLYml0Y29pbnMuc2sxGTAXBgNVBAMMEG5tYzIuYml0Y29pbnMuc2sxIzAhBgkq
hkiG9w0BCQEWFGRlYWZib3lAY2ljb2xpbmEub3JnMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAzBUkZNDfaz7kc28l5tDKohJjekWmz1ynzfGx3ZLsqOZE
c+kNfcMaWU+zT/j0mV6pX6KSH7G9pPAku+8PRdKRq+d63wiJDEjGSaFztQWKW6L1
vTxgCK5gu+Eir3BkTagJObsrLKS+T6qH610/3+btGgoR3lunB5TzCgB/9oQanjDW
zjg2CwmxgR5Iw1Eqfenx7zkSK33FSXSF2SvbUs1Atj2oPU4DLivyrx0RaUmaPemn
cmcpnax+py4pQeB6dJWU1INhzXt3hTJRyoqsSGY3vCECIKIBIkh8GsYjAX4z+Y9y
6pJx0da2b88qPWdsoxaIMvrQiuWknDrSJwAyw2Yd8QIDAQABo1MwUTAdBgNVHQ4E
FgQUT2J83B2/9jxGGdFeWrxMohTzHNwwHwYDVR0jBBgwFoAUT2J83B2/9jxGGdFe
WrxMohTzHNwwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAsbxX
wN8tZaXOybImMZCQS7zfxmKl2IAcqu+R01KPfnIfrFqXPsGDDl3rYLkwh1O4/hYQ
NKNW9KTxoJxuBmAkm7EXQQh1XUUzajdEDqDBVRyvR0Z2MdMYnMSAiiMXMl2wUZnc
QXYftBo0HbtfsaJjImQdDjmlmRPSzE/RW6iUe+1cesKBC7e8nVf69Yu/fxO4m083
VWwAstlWJfk1GyU7jzVc8svealg/oIiDoOMe6CFSLx1BDv2FeHSpRdqd3fn+AC73
bK2N2smrHUOQnFijuiFw3WOrjERi0eMhjVNfVu9W9ZYa/Wd6SdIzV55LbG+NpmSf
5W7ix41hRvdT6cTAJA==
-----END CERTIFICATE-----`,
])

/**
 * List of hostnames (exact match, case-insensitive) whose certificate
 * fingerprint will be checked against {@link PINNED_SHA256_FINGERPRINTS}.
 * Connections to anywhere else are rejected at install time by the
 * wrapper class. This prevents accidental use of the pinned-cert
 * WebSocket to reach unrelated services.
 *
 * Mutable on purpose so advanced callers can plug in a private
 * ElectrumX server — append to this list and to
 * {@link PINNED_SHA256_FINGERPRINTS} together.
 */
export const ALLOWED_HOSTNAMES: Set<string> = new Set(
  DEFAULT_ELECTRUMX_SERVERS.map((s: ElectrumXServer) => s.host.toLowerCase()),
)

class BrowserEnvironmentError extends Error {
  constructor() {
    super(
      'nostr-tools/nip05namecoin-node is a Node-only module. Import `nostr-tools/nip05namecoin` directly in the browser and supply a WebSocket implementation via `useWebSocketImplementation`.',
    )
    this.name = 'BrowserEnvironmentError'
  }
}

class MissingWsDependencyError extends Error {
  constructor(cause?: unknown) {
    super(
      'nostr-tools/nip05namecoin-node requires the optional peer dependency `ws`. Install it with `npm install ws` (or `bun add ws`). Underlying error: ' +
        (cause instanceof Error ? cause.message : String(cause)),
    )
    this.name = 'MissingWsDependencyError'
  }
}

function isNodeLike(): boolean {
  // Node and Bun expose `process.versions.node`. Browsers do not.
  return (
    typeof process !== 'undefined' &&
    typeof (process as unknown as { versions?: Record<string, string> }).versions === 'object' &&
    typeof (process as unknown as { versions: Record<string, string> }).versions.node === 'string'
  )
}

/**
 * Build the WebSocket wrapper class around the loaded `ws` module.
 *
 * Trust policy:
 *  - The pinned PEMs are added to the TLS trust store for this
 *    handshake (so the self-signed chain validates).
 *  - `rejectUnauthorized: true` is the default and kept on, so chain
 *    validation runs normally.
 *  - `checkServerIdentity` is overridden to (a) skip hostname
 *    matching (one of the pinned endpoints is an IP literal) and
 *    (b) assert that the peer's SHA-256 fingerprint is one of
 *    {@link PINNED_SHA256_FINGERPRINTS}. This is the real gate.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPinnedWebSocketClass(WS: any) {
  const PEM_BUNDLE = PINNED_CERTIFICATES_PEM.join('\n')
  return class PinnedWebSocket extends WS {
    constructor(url: string | URL, protocols?: string | string[]) {
      const parsed = typeof url === 'string' ? new URL(url) : url
      const host = parsed.hostname.toLowerCase()
      if (!ALLOWED_HOSTNAMES.has(host)) {
        throw new Error(
          `nip05namecoin-node: refusing to connect to non-pinned host ${host}. Add it to ALLOWED_HOSTNAMES and PINNED_SHA256_FINGERPRINTS to allow it.`,
        )
      }
      super(parsed.toString(), protocols, {
        ca: PEM_BUNDLE,
        // Force chain validation against the pinned CA bundle.
        rejectUnauthorized: true,
        // Skip hostname validation (one of the pinned endpoints is an
        // IP literal and none of the certs carry IP SANs). Instead we
        // verify the peer's SHA-256 fingerprint is in the pinned set,
        // which is a stronger gate than hostname matching.
        checkServerIdentity: (
          _servername: string,
          cert: { raw?: Uint8Array; fingerprint256?: string },
        ) => {
          return verifyFingerprint(cert)
            ? undefined
            : new Error('nip05namecoin-node: pinned fingerprint mismatch')
        },
      })
    }
  }
}

/**
 * Install a pinned-cert `WebSocket` implementation as the transport
 * used by this module's {@link queryProfile}. Async because it
 * dynamically imports the optional `ws` peer dependency. Safe to
 * call multiple times; subsequent calls replace the previous
 * installation.
 *
 * Throws in non-Node environments or when `ws` is not installed.
 */
export async function install(): Promise<void> {
  if (!isNodeLike()) throw new BrowserEnvironmentError()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let WS: any
  try {
    const mod = await import('ws')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    WS = (mod as any).default ?? mod
  } catch (err) {
    throw new MissingWsDependencyError(err)
  }

  useWebSocketImplementation(buildPinnedWebSocketClass(WS))
}

/**
 * Synchronous alias for {@link install} that works under CommonJS
 * runtimes where `require('ws')` is available synchronously. In pure
 * ESM runtimes this throws {@link MissingWsDependencyError} — use
 * {@link install} instead.
 */
export function installPinnedWebSocket(): void {
  if (!isNodeLike()) throw new BrowserEnvironmentError()

  let WS: unknown
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req: any = getCreateRequire()
    if (!req) throw new Error('createRequire is unavailable in this runtime (use install() instead in pure ESM)')
    WS = req('ws')
  } catch (err) {
    throw new MissingWsDependencyError(err)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WSCtor: any = (WS as any).default ?? WS
  useWebSocketImplementation(buildPinnedWebSocketClass(WSCtor))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCreateRequire(): any {
  try {
    // Eval-shielded require so esbuild's ESM build doesn't inline a
    // "Dynamic require of ... is not supported" shim here.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval,no-new-func
    const nodeRequire = new Function('return require')()
    if (typeof nodeRequire !== 'function') return null
    const mod = nodeRequire('node:module') as typeof import('node:module')
    return mod.createRequire(import.meta.url)
  } catch {
    return null
  }
}

/**
 * Exposed for tests / advanced callers. Given a Node.js
 * `tls.PeerCertificate`-shaped object (needs either `fingerprint256`
 * or `raw`), returns `true` iff its SHA-256 fingerprint is one of
 * the pinned values.
 */
export function verifyFingerprint(cert: { raw?: Uint8Array; fingerprint256?: string }): boolean {
  const fp = normalizeFingerprint(cert)
  if (!fp) return false
  return PINNED_SHA256_FINGERPRINTS.includes(fp)
}

function normalizeFingerprint(cert: { raw?: Uint8Array; fingerprint256?: string }): string | null {
  if (cert && typeof cert.fingerprint256 === 'string' && cert.fingerprint256.length > 0) {
    return cert.fingerprint256.replace(/:/g, '').toLowerCase()
  }
  if (cert && cert.raw instanceof Uint8Array && cert.raw.length > 0) {
    try {
      // Lazy so this file can stay importable under bundlers that
      // strip node:crypto out.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createHash } = require('node:crypto') as typeof import('node:crypto')
      return createHash('sha256').update(cert.raw).digest('hex').toLowerCase()
    } catch {
      return null
    }
  }
  return null
}
