import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { loadCommentIdentity, saveCommentIdentity } from "@/utils/comment-identity";

// 复用 helpers/uni-stubs.ts preload 装的 globalThis.uni。
// 这里测试直接走 globalThis.uni 的 storage Map,验证函数对 uni 的调用契约。

beforeEach(() => {
  (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.clear();
});

afterEach(() => {
  (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.clear();
});

describe("loadCommentIdentity(读取)", () => {
  test("从未评论过 → 空信息(name/mail/link 都为空串)", () => {
    expect(loadCommentIdentity()).toEqual({ name: "", mail: "", link: "" });
  });

  test("存了完整身份 → 读出", () => {
    (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.set(
      "comment_identity",
      { name: "小明", mail: "x@y.com", link: "https://x.com" },
    );
    expect(loadCommentIdentity()).toEqual({
      name: "小明",
      mail: "x@y.com",
      link: "https://x.com",
    });
  });

  test("缺字段 → ?? 兜底为空串", () => {
    (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.set(
      "comment_identity",
      { name: "小明" },
    );
    expect(loadCommentIdentity()).toEqual({
      name: "小明",
      mail: "",
      link: "",
    });
  });

  test("存的是字符串空串(uni 默认空字符串)→ 空信息", () => {
    (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.set(
      "comment_identity",
      "",
    );
    expect(loadCommentIdentity()).toEqual({ name: "", mail: "", link: "" });
  });

  test("存的是非对象(数字)→ 空信息(短路 typeof !== 'object')", () => {
    (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.set(
      "comment_identity",
      42,
    );
    expect(loadCommentIdentity()).toEqual({ name: "", mail: "", link: "" });
  });

  test("存的是 null → 空信息", () => {
    (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.set(
      "comment_identity",
      null,
    );
    expect(loadCommentIdentity()).toEqual({ name: "", mail: "", link: "" });
  });
});

describe("saveCommentIdentity(写入)", () => {
  test("写入后 globalThis.uni.storage 有对应 key", () => {
    saveCommentIdentity({ name: "a", mail: "b@c", link: "https://d" });
    const stored = (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.get("comment_identity");
    expect(stored).toEqual({ name: "a", mail: "b@c", link: "https://d" });
  });

  test("覆盖:第二次写入覆盖第一次", () => {
    saveCommentIdentity({ name: "first", mail: "a@b", link: "" });
    saveCommentIdentity({ name: "second", mail: "", link: "https://x" });
    const stored = (globalThis as unknown as { uni: { storage: Map<string, unknown> } }).uni.storage.get("comment_identity");
    expect(stored).toEqual({ name: "second", mail: "", link: "https://x" });
  });

  test("写入抛异常 → 静默吞掉(不向外抛)", () => {
    const uni = globalThis as unknown as { uni: { setStorageSync: (k: string, v: unknown) => void } };
    const orig = uni.uni.setStorageSync;
    uni.uni.setStorageSync = () => {
      throw new Error("storage full");
    };
    expect(() => saveCommentIdentity({ name: "x", mail: "", link: "" })).not.toThrow();
    uni.uni.setStorageSync = orig;
  });

  test("读取抛异常 → 静默吞掉返回空信息", () => {
    const uni = globalThis as unknown as { uni: { getStorageSync: (k: string) => unknown } };
    const orig = uni.uni.getStorageSync;
    uni.uni.getStorageSync = () => {
      throw new Error("storage broken");
    };
    expect(loadCommentIdentity()).toEqual({ name: "", mail: "", link: "" });
    uni.uni.getStorageSync = orig;
  });
});
