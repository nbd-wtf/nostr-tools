import {Buffer} from 'buffer'
import dnsPacket from 'dns-packet'

const dohProviders = [
  'cloudflare-dns.com',
  'fi.doh.dns.snopyta.org',
  'basic.bravedns.com',
  'hydra.plan9-ns1.com',
  'doh.pl.ahadns.net',
  'dns.flatuslifir.is',
  'doh.dns.sb',
  'doh.li'
]

let counter = 0

export async function keyFromDomain(domain) {
  let host = dohProviders[counter % dohProviders.length]

  let buf = dnsPacket.encode({
    type: 'query',
    id: Math.floor(Math.random() * 65534),
    flags: dnsPacket.RECURSION_DESIRED,
    questions: [
      {
        type: 'TXT',
        name: `_nostrkey.${domain}`
      }
    ]
  })

  let fetching = fetch(`https://${host}/dns-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/dns-message',
      'Content-Length': Buffer.byteLength(buf)
    },
    body: buf
  })

  counter++

  try {
    let response = Buffer.from(await (await fetching).arrayBuffer())
    let {answers} = dnsPacket.decode(response)
    if (answers.length === 0) return null
    return Buffer.from(answers[0].data[0]).toString()
  } catch (err) {
    console.log(`error querying DNS for ${domain} on ${host}`, err)
    return null
  }
}
