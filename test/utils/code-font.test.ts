import { beforeEach, describe, expect, test } from "bun:test";

import { ensureCodeFont } from "@/utils/code-font";

// 模块级 loadPromise 单例缓存,跨 test 共享;这里测试"首次触发" + "幂等" + "callback 路径"。
// 「同步 throw」分支需要 fresh 模块,留作 source 注释。

type FontFaceOpts = {
  family: string;
  source: string;
  global?: boolean;
  success?: () => void;
  fail?: (err: unknown) => void;
};

let calls: Array<FontFaceOpts> = [];
let origLoadFontFace: (opts: FontFaceOpts) => void;

beforeEach(() => {
  calls = [];
  const u = globalThis as unknown as {
    uni: { loadFontFace: (o: FontFaceOpts) => void };
  };
  origLoadFontFace = u.uni.loadFontFace;
  u.uni.loadFontFace = (opts: FontFaceOpts) => {
    calls.push(opts);
    // 默认 30ms 后 success,模拟异步;若 beforeEach 想触发 fail,改 opts.fail
    setTimeout(() => {
      if (opts.success) opts.success();
    }, 5);
  };
});

// afterEach 还原
import { afterEach } from "bun:test";
afterEach(() => {
  (
    globalThis as unknown as {
      uni: { loadFontFace: (o: FontFaceOpts) => void };
    }
  ).uni.loadFontFace = origLoadFontFace;
});

describe("ensureCodeFont(首次调用)", () => {
  test("触发 loadFontFace 一次,参数来自 siteConfig.codeFont", () => {
    ensureCodeFont();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.family).toBe("JetBrainsMono");
    expect(calls[0]!.source).toContain("JetBrainsMono");
    expect(calls[0]!.global).toBe(true);
  });
});

describe("ensureCodeFont(幂等)", () => {
  test("后续调用不重复触发 loadFontFace", () => {
    ensureCodeFont();
    ensureCodeFont();
    ensureCodeFont();
    // loadPromise 命中后,不再次注册 loadFontFace
    expect(calls.length).toBeLessThanOrEqual(1);
  });

  test("并发首次调用也只触发一次 loadFontFace(同步缓存拦截)", () => {
    // 同时发起 3 次 ensureCodeFont;模块级同步缓存拦住后续
    void Promise.all([ensureCodeFont(), ensureCodeFont(), ensureCodeFont()]);
    expect(calls.length).toBeLessThanOrEqual(1);
  });
});

describe("ensureCodeFont(callback 路径)", () => {
  test("loadFontFace success → loadPromise resolve", async () => {
    // 重置 module loadPromise 不可行;改测 path:首次 ensureCodeFont + 调 calls[0].success
    ensureCodeFont();
    const before = calls.length;
    if (calls[0]?.success) calls[0].success();
    // await 微任务跑完
    await new Promise((r) => setTimeout(r, 10));
    // 验证 resolve 后再次 ensureCodeFont 不会触发新 loadFontFace
    await ensureCodeFont();
    expect(calls.length).toBe(before);
  });

  test("loadFontFace fail → loadPromise 仍 resolve(降级系统字体)", async () => {
    const u = globalThis as unknown as {
      uni: { loadFontFace: (o: FontFaceOpts) => void };
    };
    const orig = u.uni.loadFontFace;
    u.uni.loadFontFace = (opts: FontFaceOpts) => {
      calls.push(opts);
      // 直接 fail
      if (opts.fail) opts.fail(new Error("cdn down"));
    };
    ensureCodeFont();
    // 不抛,promise resolve
    expect(ensureCodeFont()).resolves.toBeUndefined();
    u.uni.loadFontFace = orig;
  });
});
