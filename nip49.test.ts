import { test, expect } from 'bun:test'
import { decrypt, encrypt } from './nip49.ts'
import { hexToBytes } from '@noble/hashes/utils'

test('encrypt and decrypt', () => {
  for (let i = 0; i < vectors.length; i++) {
    let [password, secret, logn, ksb, ncryptsec] = vectors[i]
    let sec = hexToBytes(secret)
    let there = encrypt(sec, password, logn, ksb)
    let back = decrypt(there, password)
    let again = decrypt(ncryptsec, password)
    expect(back).toEqual(again)
    expect(again).toEqual(sec)
  }
})

const vectors: [string, string, number, 0x00 | 0x01 | 0x02, string][] = [
  [
    '.ksjabdk.aselqwe',
    '14c226dbdd865d5e1645e72c7470fd0a17feb42cc87b750bab6538171b3a3f8a',
    1,
    0x00,
    'ncryptsec1qgqeya6cggg2chdaf48s9evsr0czq3dw059t2khf5nvmq03yeckywqmspcc037l9ajjsq2p08480afuc5hq2zq3rtt454c2epjqxcxll0eff3u7ln2t349t7rc04029q63u28mkeuj4tdazsqqk6p5ky',
  ],
  [
    'skjdaklrnçurbç l',
    'f7f2f77f98890885462764afb15b68eb5f69979c8046ecb08cad7c4ae6b221ab',
    2,
    0x01,
    'ncryptsec1qgp86t7az0u5w0wp8nrjnxu9xhullqt39wvfsljz8289gyxg0thrlzv3k40dsqu32vcqza3m7srzm27mkg929gmv6hv5ctay59jf0h8vsj5pjmylvupkdtvy7fy88et3fhe6m3d84t9m8j2umq0j75lw',
  ],
  [
    '777z7z7z7z7z7z7z',
    '11b25a101667dd9208db93c0827c6bdad66729a5b521156a7e9d3b22b3ae8944',
    3,
    0x02,
    'ncryptsec1qgpc7jmmzmds376r8slazywlagrm5eerlrx7njnjenweggq2atjl0h9vmpk8f9gad0tqy3pwch8e49kyj5qtehp4mjwpzlshx5f5cce8feukst08w52zf4a7gssdqvt3eselup7x4zzezlme3ydxpjaf',
  ],
  [
    '.ksjabdk.aselqwe',
    '14c226dbdd865d5e1645e72c7470fd0a17feb42cc87b750bab6538171b3a3f8a',
    7,
    0x00,
    'ncryptsec1qgrss6ycqptee05e5anq33x2vz6ljr0rqunsy9xj5gypkp0lucatdf8yhexrztqcy76sqweuzk8yqzep9mugp988vznz5df8urnyrmaa7l7fvvskp4t0ydjtz0zeajtumul8cnsjcksp68xhxggmy4dz',
  ],
  [
    'skjdaklrnçurbç l',
    'f7f2f77f98890885462764afb15b68eb5f69979c8046ecb08cad7c4ae6b221ab',
    8,
    0x01,
    'ncryptsec1qgy0gg98z4wvl35eqlraxf7cyxhfs4968teq59vm97e94gpycmcy6znsc8z82dy5rk8sz0r499ue7xfmd0yuyvzxagtfyxtnwcrcsjavkch8lfseejukwdq7mdcpm43znffngw7texdc5pdujywszhrr',
  ],
  [
    '777z7z7z7z7z7z7z',
    '11b25a101667dd9208db93c0827c6bdad66729a5b521156a7e9d3b22b3ae8944',
    9,
    0x02,
    'ncryptsec1qgyskhh7mpr0zspg95kv4eefm8233hyz46xyr6s52s6qvan906c2u24gl3dc5f7wytzq9njx7sqksd7snagce3kqth7tv4ug4avlxd5su4vthsh54vk62m88whkazavyc6yefnegf4tx473afssxw4p9',
  ],
  [
    '',
    'f7f2f77f98890885462764afb15b68eb5f69979c8046ecb08cad7c4ae6b221ab',
    4,
    0x00,
    'ncryptsec1qgzv73a9ktnwmgyvv24x2xtr6grup2v6an96xgs64z3pmh5etg2k4yryachtlu3tpqwqphhm0pjnq9zmftr0qf4p5lmah4rlz02ucjkawr2s9quau67p3jq3d7yp3kreghs0wdcqpf6pkc8jcgsqrn5l',
  ],
  [
    '',
    '11b25a101667dd9208db93c0827c6bdad66729a5b521156a7e9d3b22b3ae8944',
    5,
    0x01,
    'ncryptsec1qgzs50vjjhewdrxnm0z4y77w7juycf6crny9q0kzeg7vxv3erw77qpauthaf7sfwsgnszjzcqh7zql74m8yxnhcj07dry3v5fgr5x42mpzxvfl76gpuayccvk2nczc7ner3q842rj9v033nykvja6cql',
  ],
  [
    '',
    'f7f2f77f98890885462764afb15b68eb5f69979c8046ecb08cad7c4ae6b221ab',
    1,
    0x00,
    'ncryptsec1qgqnx59n7duv6ec3hhrvn33q25u2qfd7m69vv6plsg7spnw6d4r9hq0ayjsnlw99eghqqzj8ps7vfwx40nqp9gpw7yzyy09jmwkq3a3z8q0ph5jahs2hap5k6h2wfrme7w2nuek4jnwpzfht4q3u79ra',
  ],
  [
    'ÅΩẛ̣',
    '11b25a101667dd9208db93c0827c6bdad66729a5b521156a7e9d3b22b3ae8944',
    9,
    0x01,
    'ncryptsec1qgy5kwr5v8p206vwaflp4g6r083kwts6q5sh8m4d0q56edpxwhrly78ema2z7jpdeldsz7u5wpxpyhs6m0405skdsep9n37uncw7xlc8q8meyw6d6ky47vcl0guhqpt5dx8ejxc8hvzf6y2gwsl5s0nw',
  ],
  [
    'ÅΩṩ',
    '11b25a101667dd9208db93c0827c6bdad66729a5b521156a7e9d3b22b3ae8944',
    9,
    0x01,
    'ncryptsec1qgy5f4lcx873yarkfpngaudarxfj4wj939xn4azmd66j6jrwcml6av87d6vnelzn70kszgkg4lj9rsdjlqz0wn7m7456sr2q5yjpy72ykgkdwckevl857hpcfnwzswj9lajxtln0tsr9h7xdwqm6pqzf',
  ],
]
