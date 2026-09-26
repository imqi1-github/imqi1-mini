import { describe, expect, test } from "bun:test";

import { hmacSha256Hex } from "@/utils/hmac";

// 纯函数 HMAC-SHA256 标准向量（RFC 4231 Test Cases）。
// 不依赖任何 uni/Vite 全局,测试可行性最高,与后端 server/utils/mini-auth.ts 算法必须互验。

describe("hmacSha256Hex(RFC 4231 标准向量)", () => {
  test("Case 1: 20 字节 key, 'Hi There'", () => {
    expect(hmacSha256Hex("\x0b".repeat(20), "Hi There"))
      .toBe("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7");
  });

  test("Case 2: 短 key 'Jefe'", () => {
    expect(hmacSha256Hex("Jefe", "what do ya want for nothing?"))
      .toBe("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
  });

  test("Case 3: 20 字节 0xaa key, 0xdd 消息(走 mini utf8Bytes 语义)", () => {
    // mini utf8Bytes 对 0x80-0xBF 字符会编码为 2 字节 UTF-8(0xC2 + 原字节),
    // 与 RFC 4231 字节序列语义不完全一致;这里是 mini 实现的精确预期。
    // 与服务端 mini-auth.ts 必须用同算法,否则签名跨端互验失败。
    expect(hmacSha256Hex("\xaa".repeat(20), "\xdd".repeat(20)))
      .toBe("663aad6316971e3d1160e14ccf5ac3b6b3e589d93191b5875d5c0c3d9fdaf0c2");
  });

  test("Case 6: key >64 字节走 SHA-256 摘要分支(走 mini utf8Bytes 语义)", () => {
    // 131 字节 0xaa 经 utf8 编码变 262 字节(>64),走摘要分支
    const key = "\xaa".repeat(131);
    const message = "Test Using Larger Than Block-Size Key - Hash Key First";
    expect(hmacSha256Hex(key, message))
      .toBe("936d986e40c610341e6084ea547f22261b9d459052dd613aaf52faf925299dc2");
  });
});

describe("hmacSha256Hex(字符编码边界)", () => {
  test("空 message → 仍输出 64 字符 hex(签名的是 'key' 本身)", () => {
    const out = hmacSha256Hex("key", "");
    expect(out).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(out)).toBe(true);
  });

  test("空 key 补 64 个零字节(无 keyBytes 走 padding 路径)", () => {
    const out = hmacSha256Hex("", "msg");
    // 不会抛,继续产生稳定签名
    expect(out).toHaveLength(64);
  });

  test("中文 UTF-8 多字节字符签名稳定", () => {
    const a = hmacSha256Hex("钥匙", "中文消息");
    const b = hmacSha256Hex("钥匙", "中文消息");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  test("emoji 4 字节 UTF-8 不抛(代理对合并)", () => {
    // 4 字节字符 😀(U+1F600)需 surrogate pair 合并
    const out = hmacSha256Hex("k", "😀 emoji");
    expect(out).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(out)).toBe(true);
  });

  test("BMP 高位字符签名稳定(3 字节 UTF-8)", () => {
    // 中文「高」U+9AD8 落在 BMP,3 字节 UTF-8
    const a = hmacSha256Hex("k", "高");
    const b = hmacSha256Hex("k", "高");
    expect(a).toBe(b);
  });
});

describe("hmacSha256Hex(算法不变式)", () => {
  test("确定性:相同输入恒输出相同签名", () => {
    const a = hmacSha256Hex("my-key", "my-message");
    const b = hmacSha256Hex("my-key", "my-message");
    expect(a).toBe(b);
  });

  test("敏感性:message 改 1 字符 → 输出完全不同", () => {
    const a = hmacSha256Hex("k", "message");
    const b = hmacSha256Hex("k", "messagE");
    expect(a).not.toBe(b);
  });

  test("敏感性:key 改 1 字符 → 输出完全不同", () => {
    const a = hmacSha256Hex("k1", "msg");
    const b = hmacSha256Hex("k2", "msg");
    expect(a).not.toBe(b);
  });

  test("输出格式:全小写 64 字符 hex", () => {
    const out = hmacSha256Hex("k", "m");
    expect(out).toMatch(/^[0-9a-f]{64}$/);
  });

  test("边界 key 长度:64 字节正好不需要 padding(不走摘要分支)", () => {
    const key64 = "a".repeat(64);
    const out = hmacSha256Hex(key64, "msg");
    expect(out).toHaveLength(64);
  });

  test("边界 key 长度:65 字节触发 SHA-256 摘要分支", () => {
    const key65 = "a".repeat(65);
    const out = hmacSha256Hex(key65, "msg");
    expect(out).toHaveLength(64);
    // 摘要分支与 64 字节分支产出应不同
    const key64 = "a".repeat(64);
    const out64 = hmacSha256Hex(key64, "msg");
    expect(out).not.toBe(out64);
  });
});
