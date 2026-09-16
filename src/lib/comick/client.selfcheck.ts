// Runnable self-check for Comick client URL builders. Run: npx tsx src/lib/comick/client.selfcheck.ts
import assert from 'node:assert'
import { comickCoverUrl, comickCoverFrom } from './client'

// Cover URL: direct meo.comick.pictures (CORS *), no proxy.
assert.strictEqual(comickCoverUrl('GXm1jl.jpg'), 'https://meo.comick.pictures/GXm1jl.jpg')
assert.strictEqual(comickCoverUrl(null), null)
assert.strictEqual(comickCoverUrl(undefined), null)

// comickCoverFrom picks the first cover's b2key.
assert.strictEqual(comickCoverFrom([{ b2key: 'a.jpg' }, { b2key: 'b.jpg' }]), 'https://meo.comick.pictures/a.jpg')
assert.strictEqual(comickCoverFrom([]), null)
assert.strictEqual(comickCoverFrom(undefined), null)

console.log('comick client self-check passed')
