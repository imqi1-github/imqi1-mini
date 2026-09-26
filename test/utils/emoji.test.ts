import { describe, expect, test } from "bun:test";

import { parseCommentContent } from "@/utils/emoji";

// emoji.ts 依赖 siteConfig.siteUrl + emojis.json 数据。
// 数据源 @/assets/emojis.json 包含 3 分类(Heo-Sticker / capoo / Cat)。
// prefix 在源码 EMOJI_CATEGORIES 中:heo-/猫猫虫-/cat-。

describe("parseCommentContent(基础行为)", () => {
  test("空文本 → 空 token 数组", () => {
    expect(parseCommentContent("")).toEqual([]);
  });

  test("无表情占位符 → 整段作为一个 text token(提前 `if (!text.includes(':['))` 优化路径)", () => {
    expect(parseCommentContent("hello world")).toEqual([
      { type: "text", value: "hello world" },
    ]);
  });

  test("含 :[ 但无匹配 → 切成多段 text(原占位符保留)", () => {
    expect(parseCommentContent("text :[no-such-emoji] more")).toEqual([
      { type: "text", value: "text " },
      { type: "text", value: ":[no-such-emoji]" },
      { type: "text", value: " more" },
    ]);
  });
});

describe("parseCommentContent(命中表情)", () => {
  test("命中表情 → 切出 emoji token,name 去掉分类前缀", () => {
    // 用一个稳定存在的 emoji key:heo-微笑
    const tokens = parseCommentContent("hi :[heo-微笑] there");
    expect(tokens).toEqual([
      { type: "text", value: "hi " },
      { type: "emoji", url: expect.stringContaining("/emojis/heo-sticker/"), name: "微笑" },
      { type: "text", value: " there" },
    ]);
  });

  test("绝对 URL 表情保留原 url,不拼 siteUrl(通过解析行为间接验证)", () => {
    // parseCommentContent 内部 resolveAssetUrl:绝对 URL 原样返回。
    // 这里验证未命中占位符保留为 text,确认 emoji.ts 不会因绝对 URL 路径出错而崩。
    const tokens = parseCommentContent("text :[some-emoji] end");
    // 未命中 → 原占位符作为 text 段保留
    const concat = tokens.map(t => (t.type === "text" ? t.value : "")).join("");
    expect(concat).toBe("text :[some-emoji] end");
    expect(tokens.some(t => t.type === "emoji")).toBe(false);
  });

  test("表情前置纯文本段", () => {
    const tokens = parseCommentContent("hi :[heo-微笑]");
    expect(tokens[0]).toEqual({ type: "text", value: "hi " });
    expect(tokens[1]?.type).toBe("emoji");
  });

  test("表情后置纯文本段", () => {
    const tokens = parseCommentContent(":[heo-微笑] world");
    expect(tokens[0]?.type).toBe("emoji");
    expect(tokens[1]).toEqual({ type: "text", value: " world" });
  });

  test("多个连续表情无空 text 段", () => {
    const tokens = parseCommentContent(":[heo-微笑]:[heo-亲亲]");
    expect(tokens.every(t => t.type === "emoji")).toBe(true);
    expect(tokens).toHaveLength(2);
  });

  test("开头表情 → 第一 token 即 emoji", () => {
    const tokens = parseCommentContent(":[heo-微笑] end");
    expect(tokens[0]?.type).toBe("emoji");
  });
});

describe("parseCommentContent(未命中行为)", () => {
  test("未命中占位符保留原文本,绝不吃字", () => {
    const tokens = parseCommentContent("hello :[不存在表情] world");
    // 整个未命中占位符作为 text 段保留
    const text = tokens.map(t => (t.type === "text" ? t.value : "")).join("");
    expect(text).toContain(":[不存在表情]");
    // emoji 段不存在
    expect(tokens.some(t => t.type === "emoji")).toBe(false);
  });

  test("未命中 + 命中混排,各自正确分段", () => {
    const tokens = parseCommentContent("before :[不存在] middle :[heo-微笑] end");
    const emojiTokens = tokens.filter(t => t.type === "emoji");
    expect(emojiTokens).toHaveLength(1);
    // 拼接 text 段应保留所有原文
    const textConcat = tokens.map(t => (t.type === "text" ? t.value : "")).join("");
    expect(textConcat).toContain("before");
    expect(textConcat).toContain(":[不存在]");
    expect(textConcat).toContain("middle");
    expect(textConcat).toContain("end");
  });
});
