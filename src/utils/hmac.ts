// 自包含的 HMAC-SHA256 实现（纯 TS，无外部依赖）。
//
// 用途：给 /api/mini/* 请求生成签名头，与后端 server/utils/mini-auth.ts 的算法保持一致。
// 为什么手写：小程序（微信 / 支付宝）无可靠的原生 crypto / TextEncoder，且不想引入 crypto 库，
// 这里用 UTF-8 手工编码 + 标准 SHA-256 / HMAC，保证 H5 与各小程序平台行为一致。

// ---- SHA-256 ----

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

function rotr(x: number, n: number) {
  return (x >>> n) | (x << (32 - n))
}

/** 对字节数组做 SHA-256，返回 32 字节摘要。 */
function sha256Bytes(bytes: number[]): number[] {
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]

  // padding
  const l = bytes.length
  const bitLenHi = Math.floor((l * 8) / 0x100000000)
  const bitLenLo = (l * 8) >>> 0
  const padded = bytes.slice()
  padded.push(0x80)
  while (padded.length % 64 !== 56) {
    padded.push(0)
  }
  padded.push((bitLenHi >>> 24) & 0xff, (bitLenHi >>> 16) & 0xff, (bitLenHi >>> 8) & 0xff, bitLenHi & 0xff)
  padded.push((bitLenLo >>> 24) & 0xff, (bitLenLo >>> 16) & 0xff, (bitLenLo >>> 8) & 0xff, bitLenLo & 0xff)

  const w = new Array<number>(64)
  for (let i = 0; i < padded.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      w[t] = (padded[i + t * 4] << 24) | (padded[i + t * 4 + 1] << 16)
        | (padded[i + t * 4 + 2] << 8) | padded[i + t * 4 + 3]
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10)
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0
    }

    let [a, b, c, d, e, f, g, hh] = h
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (hh + S1 + ch + K[t] + w[t]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) | 0
      hh = g
      g = f
      f = e
      e = (d + temp1) | 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) | 0
    }

    h[0] = (h[0] + a) | 0
    h[1] = (h[1] + b) | 0
    h[2] = (h[2] + c) | 0
    h[3] = (h[3] + d) | 0
    h[4] = (h[4] + e) | 0
    h[5] = (h[5] + f) | 0
    h[6] = (h[6] + g) | 0
    h[7] = (h[7] + hh) | 0
  }

  const out: number[] = []
  for (let i = 0; i < 8; i++) {
    out.push((h[i] >>> 24) & 0xff, (h[i] >>> 16) & 0xff, (h[i] >>> 8) & 0xff, h[i] & 0xff)
  }
  return out
}

/** 将字符串按 UTF-8 编码为字节数组（不依赖 TextEncoder）。 */
function utf8Bytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    }
    else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    }
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      // 代理对 → 组合成完整码点
      const next = str.charCodeAt(i + 1)
      code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
      i++
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
    else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function toHex(bytes: number[]): string {
  let s = ''
  for (const b of bytes) {
    s += b.toString(16).padStart(2, '0')
  }
  return s
}

/**
 * 计算 HMAC-SHA256，返回小写 hex 字符串。
 * @param key 密钥（UTF-8）
 * @param message 待签名内容（UTF-8）
 */
export function hmacSha256Hex(key: string, message: string): string {
  const blockSize = 64
  let keyBytes = utf8Bytes(key)
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes)
  }
  while (keyBytes.length < blockSize) {
    keyBytes.push(0)
  }

  const oKeyPad: number[] = []
  const iKeyPad: number[] = []
  for (let i = 0; i < blockSize; i++) {
    oKeyPad.push(keyBytes[i] ^ 0x5c)
    iKeyPad.push(keyBytes[i] ^ 0x36)
  }

  const inner = sha256Bytes(iKeyPad.concat(utf8Bytes(message)))
  return toHex(sha256Bytes(oKeyPad.concat(inner)))
}
