'use strict'
const mcl = require('./mcl.js')
const assert = require('assert')
const { performance } = require('perf_hooks')

const curveTest = (curveType, name) => {
  mcl.init(curveType)
    .then(() => {
      try {
        console.log(`name=${name}`)
        FrTest()
        G1Test()
        G2Test()
        GTTest()
        FpTest()
        Fp2Test()
        serializeTest()
        IDbasedEncryptionTest()
        PairingTest()
        PairingCapiTest()
        console.log('all ok')
        benchAll()
      } catch (e) {
        console.log(`TEST FAIL ${e}`)
        assert(false)
      }
    })
}

const stdCurveTest = (curveType, name) => {
  mcl.init(curveType)
    .then(() => {
      try {
        console.log(`name=${name}`)
        arithTest()
    } catch (e) {
        console.log(`TEST FAIL ${e}`)
        assert(false)
    }
  })
}

function arithTest () {
  const P = mcl.getBasePointG1()
  console.log(`basePoint=${P.getStr(16)}`)
  let Q = mcl.add(P, P) // x2
  Q = mcl.add(Q, Q) // x4
  Q = mcl.add(Q, Q) // x8
  Q = mcl.add(Q, P) // x9
  const r = new mcl.Fr()
  r.setStr('9')
  const R = mcl.mul(P, r)
  assert(R.isEqual(Q))
}

async function curveTestAll () {
  // can't parallel
  await curveTest(mcl.BN254, 'BN254')
  await curveTest(mcl.BN381_1, 'BN381_1')
  await curveTest(mcl.BLS12_381, 'BLS12_381')
  await curveTest(mcl.BN462, 'BN462')

  await stdCurveTest(mcl.SECP224K1, 'secp224k1')
  await stdCurveTest(mcl.SECP256K1, 'secp256k1')
  await stdCurveTest(mcl.SECP384R1, 'secp384r1')
  await stdCurveTest(mcl.NIST_P192, 'NIST_P192')
  await stdCurveTest(mcl.NIST_P256, 'NIST_P256')
}

curveTestAll()

function FrTest () {
  const a = new mcl.Fr()
  a.setInt(5)
  assert.equal(a.getStr(), '5')
  a.setStr('65535')
  assert.equal(a.getStr(), '65535')
  assert.equal(a.getStr(16), 'ffff')
  a.setStr('ff', 16)
  assert.equal(a.getStr(), '255')
  a.setStr('0x10')
  assert.equal(a.getStr(), '16')
  assert.equal(a.getStr(16), '10')
  const b = new mcl.Fr()
  a.setByCSPRNG()
  b.deserialize(a.serialize())
  assert.deepEqual(a.serialize(), b.serialize())
  a.setStr('1000000000020')
  b.setInt(-15)
  assert.equal(mcl.add(a, b).getStr(), '1000000000005')
  assert.equal(mcl.sub(a, b).getStr(), '1000000000035')
  a.setInt(200)
  b.setInt(20)
  assert.equal(mcl.mul(a, b).getStr(), '4000')
  assert.equal(mcl.div(a, b).getStr(), '10')
  assert.equal(mcl.mul(mcl.div(b, a), a).getStr(), '20')
  a.setInt(-123)
  assert.equal(mcl.neg(a).getStr(), '123')
  assert.equal(mcl.mul(a, mcl.inv(a)).getStr(), '1')
  a.setInt(123459)
  assert(mcl.mul(a, a).isEqual(mcl.sqr(a)))

  a.setInt(3)
  assert(!a.isZero())
  assert(!a.isOne())
  a.setInt(1)
  assert(!a.isZero())
  assert(a.isOne())
  a.setInt(0)
  assert(a.isZero())
  assert(!a.isOne())
  a.setInt(5)
  b.setInt(3)
  assert(!a.isEqual(b))
  b.setInt(5)
  assert(a.isEqual(b))

  a.setHashOf('abc')
  a.dump()
  b.setHashOf([97, 98, 99])
  assert(a.isEqual(b))
}

function FpTest () {
  const a = new mcl.Fp()
  a.setHashOf('abc')
  serializeSubTest(mcl.Fp, a, mcl.deserializeHexStrToFp)
  const b = new Uint8Array(a.serialize().length)
  for (let i = 0; i < b.length; i++) {
    b[i] = i
  }
  a.setLittleEndian(b)
  const c = a.serialize()
  // b[b.length - 1] may be masked
  for (let i = 0; i < b.length - 1; i++) {
    assert(b[i] === c[i])
  }
  const P1 = mcl.hashAndMapToG1('abc')
  a.setHashOf('abc')
  const P2 = a.mapToG1()
  assert(P1.isEqual(P2))
}

function Fp2Test () {
  const x = new mcl.Fp2()
  let xs = x.serialize()
  for (let i = 0; i < xs.length; i++) {
    assert(xs[i] === 0)
  }
  const a = new mcl.Fp()
  const b = new mcl.Fp()
  a.setHashOf('abc')
  b.setHashOf('123')
  x.set_a(a)
  x.set_b(b)
  serializeSubTest(mcl.Fp2, x, mcl.deserializeHexStrToFp2)
  xs = x.serialize()
  const as = a.serialize()
  const bs = b.serialize()
  for (let i = 0; i < as.length; i++) {
    assert(xs[i] === as[i])
  }
  const n = xs.length / 2
  for (let i = 0; i < bs.length; i++) {
    assert(xs[n + i] === bs[i])
  }

  /*
    hashAndMapToG2(msg) = [setHashOf(msg), 0].mapToG2()
  */
  const Q1 = mcl.hashAndMapToG2('xyz')
  a.setHashOf('xyz')
  b.clear()
  x.set_a(a)
  x.set_b(b)
  const Q2 = x.mapToG2()
  assert(Q1.isEqual(Q2))
}

function G1Test () {
  const P = new mcl.G1()
  assert(P.isZero())
  P.clear()
  assert(P.isZero())
  P.setHashOf('abc')
  const Q = new mcl.G1()
  Q.setHashOf('abc')
  assert(P.isEqual(Q))
  Q.setHashOf('abcd')
  assert(!P.isEqual(Q))
  let R1 = mcl.add(P, Q)
  let R2 = mcl.add(Q, P)
  assert(R1.isEqual(R2))
  R1 = mcl.sub(R1, R2)
  assert(R1.isZero())
  R1 = mcl.add(P, P) // 3P
  R1 = mcl.add(R1, P)
  const r = new mcl.Fr()
  r.setInt(3)
  R2 = mcl.mul(P, r) // 3P
  assert(R1.isEqual(R2))
  R1 = mcl.dbl(P)
  R2 = mcl.add(P, P)
  assert(R1.isEqual(R2))
  const R3 = mcl.normalize(R1)
  assert(R1.isEqual(R3))
}

function G2Test () {
  const P = new mcl.G2()
  assert(P.isZero())
  P.clear()
  assert(P.isZero())
  P.setHashOf('abc')
  const Q = new mcl.G2()
  Q.setHashOf('abc')
  assert(P.isEqual(Q))
  Q.setHashOf('abcd')
  assert(!P.isEqual(Q))
  let R1 = mcl.add(P, Q)
  let R2 = mcl.add(Q, P)
  assert(R1.isEqual(R2))
  R1 = mcl.sub(R1, R2)
  assert(R1.isZero())
  R1 = mcl.add(P, P) // 3P
  R1 = mcl.add(R1, P)
  const r = new mcl.Fr()
  r.setInt(3)
  R2 = mcl.mul(P, r) // 3P
  assert(R1.isEqual(R2))
  R1 = mcl.dbl(P)
  R2 = mcl.add(P, P)
  assert(R1.isEqual(R2))
  const R3 = mcl.normalize(R1)
  assert(R1.isEqual(R3))
}

function GTTest () {
  const x = new mcl.GT()
  const y = new mcl.Fr()
  x.setInt(2)
  y.setInt(100)
  const z = mcl.pow(x, y)
  assert.equal(z.getStr(), '1267650600228229401496703205376 0 0 0 0 0 0 0 0 0 0 0')
  assert(mcl.sqr(z).isEqual(mcl.mul(z, z)))
}

function PairingTest () {
  const a = new mcl.Fr()
  const b = new mcl.Fr()

  a.setStr('123')
  b.setStr('456')
  const ab = mcl.mul(a, b)
  assert.equal(ab.getStr(), 123 * 456)

  const P = mcl.hashAndMapToG1('aaa')
  const Q = mcl.hashAndMapToG2('bbb')
  const aP = mcl.mul(P, a)
  const bQ = mcl.mul(Q, b)

  const ePQ = mcl.pairing(P, Q)
  {
    const e2 = mcl.pairing(aP, bQ)
    assert(mcl.pow(ePQ, ab).isEqual(e2))
  }

  // pairing = millerLoop + finalExp
  {
    const e2 = mcl.millerLoop(P, Q)
    const e3 = mcl.finalExp(e2)
    assert(ePQ.isEqual(e3))
  }
  // precompute Q for fixed G2 point
  {
    const Qcoeff = new mcl.PrecomputedG2(Q)
    const e2 = mcl.precomputedMillerLoop(P, Qcoeff)
    const e3 = mcl.finalExp(e2)
    assert(ePQ.isEqual(e3))
    Qcoeff.destroy() // call this function to avoid memory leak
  }
}

// Enc(m) = [r P, m + h(e(r mpk, H(id)))]
function IDenc (id, P, mpk, m) {
  const r = new mcl.Fr()
  r.setByCSPRNG()
  const Q = mcl.hashAndMapToG2(id)
  const e = mcl.pairing(mcl.mul(mpk, r), Q)
  return [mcl.mul(P, r), mcl.add(m, mcl.hashToFr(e.serialize()))]
}

// Dec([U, v]) = v - h(e(U, sk))
function IDdec (c, sk) {
  const [U, v] = c
  const e = mcl.pairing(U, sk)
  return mcl.sub(v, mcl.hashToFr(e.serialize()))
}

function IDbasedEncryptionTest () {
  // system parameter
  const P = mcl.hashAndMapToG1('1')
  /*
    KeyGen
    msk in Fr ; master secret key
    mpk = msk P in G1 ; master public key
  */
  const msk = new mcl.Fr()
  msk.setByCSPRNG()
  const mpk = mcl.mul(P, msk)

  /*
    user KeyGen
    sk = msk H(id) in G2 ; secret key
  */
  const id = '@herumi'
  const sk = mcl.mul(mcl.hashAndMapToG2(id), msk)

  // encrypt
  const m = new mcl.Fr()
  m.setInt(123)
  const c = IDenc(id, P, mpk, m)
  // decrypt
  const d = IDdec(c, sk)
  assert(d.isEqual(m))
}

function PairingCapiTest () {
  const mod = mcl.mod
  const a = mod.mclBnFr_malloc()
  const b = mod.mclBnFr_malloc()
  const ab = mod.mclBnFr_malloc()
  const P = mod.mclBnG1_malloc()
  const aP = mod.mclBnG1_malloc()
  const Q = mod.mclBnG2_malloc()
  const bQ = mod.mclBnG2_malloc()
  const e1 = mod.mclBnGT_malloc()
  const e2 = mod.mclBnGT_malloc()

  mod.mclBnFr_setStr(a, '123')
  mod.mclBnFr_setStr(b, '456')
  mod._mclBnFr_mul(ab, a, b)
  assert.equal(mod.mclBnFr_getStr(ab), 123 * 456)

  mod.mclBnG1_hashAndMapTo(P, 'aaa')
  mod.mclBnG2_hashAndMapTo(Q, 'bbb')
  mod._mclBnG1_mul(aP, P, a)
  mod._mclBnG2_mul(bQ, Q, b)

  mod._mclBn_pairing(e1, P, Q)
  mod._mclBn_pairing(e2, aP, bQ)
  mod._mclBnGT_pow(e1, e1, ab)
  assert(mod._mclBnGT_isEqual(e1, e2), 'e(aP, bQ) == e(P, Q)^ab')

  mcl.free(e2)
  mcl.free(e1)
  mcl.free(bQ)
  mcl.free(Q)
  mcl.free(aP)
  mcl.free(P)
  mcl.free(ab)
  mcl.free(b)
  mcl.free(a)
}

function serializeSubTest (Cstr, x, newDeserializeHexStr) {
  const y = new Cstr()
  y.deserialize(x.serialize())
  assert(y.isEqual(x))
  y.clear()
  const s = x.serializeToHexStr()
  y.deserializeHexStr(s)
  assert(y.isEqual(x))
  const z = newDeserializeHexStr(s)
  assert(z.isEqual(x))
}

function serializeTest () {
  const a = new mcl.Fr()
  a.setStr('12345678')
  serializeSubTest(mcl.Fr, a, mcl.deserializeHexStrToFr)
  const P = mcl.hashAndMapToG1('abc')
  serializeSubTest(mcl.G1, P, mcl.deserializeHexStrToG1)
  const Q = mcl.hashAndMapToG2('abc')
  serializeSubTest(mcl.G2, Q, mcl.deserializeHexStrToG2)
  const e = mcl.pairing(P, Q)
  serializeSubTest(mcl.GT, e, mcl.deserializeHexStrToGT)
}

function bench (label, count, func) {
  const start = performance.now()
  for (let i = 0; i < count; i++) {
    func()
  }
  const end = performance.now()
  const t = (end - start) / count
  const roundTime = (Math.round(t * 1000)) / 1000
  console.log(label + ' ' + roundTime)
}

function benchAll () {
  const a = new mcl.Fr()

  const msg = 'hello wasm'

  a.setByCSPRNG()
  let P = mcl.hashAndMapToG1('abc')
  let Q = mcl.hashAndMapToG2('abc')
  const P2 = mcl.hashAndMapToG1('abce')
  const Q2 = mcl.hashAndMapToG2('abce')
  const Qcoeff = new mcl.PrecomputedG2(Q)
  const e = mcl.pairing(P, Q)

  console.log('benchmark')
  const C = 100
  const C2 = 1000
  bench('T_Fr::setByCSPRNG', C, () => a.setByCSPRNG())
  bench('T_pairing', C, () => mcl.pairing(P, Q))
  bench('T_millerLoop', C, () => mcl.millerLoop(P, Q))
  bench('T_finalExp', C, () => mcl.finalExp(e))
  bench('T_precomputedMillerLoop', C, () => mcl.precomputedMillerLoop(P, Qcoeff))
  bench('T_G1::add', C2, () => { P = mcl.add(P, P2) })
  bench('T_G1::dbl', C2, () => { P = mcl.dbl(P) })
  bench('T_G1::mul', C, () => { P = mcl.mul(P, a) })
  bench('T_G2::add', C2, () => { Q = mcl.add(Q, Q2) })
  bench('T_G2::dbl', C2, () => { Q = mcl.dbl(Q) })
  bench('T_G2::mul', C, () => { Q = mcl.mul(Q, a) })
  bench('T_hashAndMapToG1', C, () => mcl.hashAndMapToG1(msg))
  bench('T_hashAndMapToG2', C, () => mcl.hashAndMapToG2(msg))

  let b = new mcl.Fr()
  b.setByCSPRNG()
  bench('T_Fr::add', C2, () => { b = mcl.add(b, a) })
  bench('T_Fr::mul', C2, () => { b = mcl.mul(b, a) })
  bench('T_Fr::sqr', C2, () => { b = mcl.sqr(b) })
  bench('T_Fr::inv', C2, () => { b = mcl.inv(b) })

  let e2 = mcl.pairing(P, Q)
  bench('T_GT::add', C2, () => { e2 = mcl.add(e2, e) })
  bench('T_GT::mul', C2, () => { e2 = mcl.mul(e2, e) })
  bench('T_GT::sqr', C2, () => { e2 = mcl.sqr(e2) })
  bench('T_GT::inv', C, () => { e2 = mcl.inv(e2) })

  Qcoeff.destroy()
}

/*
function benchPairingCapi () {
  console.log('c api')
  const mod = mcl.mod
  const a = mod.mclBnFr_malloc()
  const P = mod.mclBnG1_malloc()
  const Q = mod.mclBnG2_malloc()
  const e = mod.mclBnGT_malloc()

  const msg = 'hello wasm'

  mod._mclBnFr_setByCSPRNG(a)
  mod.mclBnG1_hashAndMapTo(P, 'abc')
  mod.mclBnG2_hashAndMapTo(Q, 'abc')
  bench('time_pairing', 50, () => mod._mclBn_pairing(e, P, Q))
  bench('time_g1mul', 50, () => mod._mclBnG1_mulCT(P, P, a))
  bench('time_g2mul', 50, () => mod._mclBnG2_mulCT(Q, Q, a))
  bench('time_mapToG1', 50, () => mod.mclBnG1_hashAndMapTo(P, msg))

  mcl.free(e)
  mcl.free(Q)
  mcl.free(P)
}
*/
