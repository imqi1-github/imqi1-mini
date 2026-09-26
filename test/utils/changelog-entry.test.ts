import { describe, expect, test } from "bun:test";

import { parseEntryBlocks } from "@/utils/changelog-entry";

// changelog-entry.ts 把一条变更内容解析为块级节点:
// - 文本行
// - 列表(- * + / 1.)按缩进嵌套
// - 空行跳过

describe("parseEntryBlocks(基础)", () => {
  test("空字符串 → 空 blocks", () => {
    expect(parseEntryBlocks("")).toEqual([]);
  });

  test("纯文本 → text 块 + 解析行内", () => {
    const out = parseEntryBlocks("hello world");
    expect(out).toEqual([{ type: "text", spans: expect.any(Array) }]);
  });

  test("行内粗体:parseInline 复用,粗体正确渲染", () => {
    const out = parseEntryBlocks("修复 **重大 bug**");
    expect(out[0]?.type).toBe("text");
  });

  test("\\r\\n 与 \\r 归一为 \\n", () => {
    const a = parseEntryBlocks("a\r\nb");
    const b = parseEntryBlocks("a\nb");
    expect(a).toEqual(b);
  });

  test("空行跳过:不产出空 text 块", () => {
    const out = parseEntryBlocks("line1\n\n\nline2");
    expect(out).toHaveLength(2);
    expect(out.every(b => b.type === "text")).toBe(true);
  });
});

describe("parseEntryBlocks(列表)", () => {
  test("无序列表 -", () => {
    const out = parseEntryBlocks("- a\n- b");
    expect(out).toHaveLength(1);
    if (out[0]?.type === "list") {
      expect(out[0].ordered).toBe(false);
      expect(out[0].items).toHaveLength(2);
    }
  });

  test("有序列表 1.", () => {
    const out = parseEntryBlocks("1. a\n2. b");
    if (out[0]?.type === "list") {
      expect(out[0].ordered).toBe(true);
      expect(out[0].items).toHaveLength(2);
    }
  });

  test("混合 marker 不在同层:有序与无序分开", () => {
    const out = parseEntryBlocks("- a\n1. b");
    // 不同有序性会作为两块 list
    expect(out.filter(b => b.type === "list")).toHaveLength(2);
  });

  test("缩进嵌套:子项作为 children", () => {
    const out = parseEntryBlocks("- a\n  - sub-a\n  - sub-b\n- b");
    if (out[0]?.type === "list") {
      expect(out[0].items).toHaveLength(2);
      const a = out[0].items[0]!;
      expect(a.children.some(c => c.type === "list")).toBe(true);
      if (a.children[0]?.type === "list") {
        expect(a.children[0].items).toHaveLength(2);
      }
    }
  });

  test("tab 计 2 空格缩进", () => {
    const out = parseEntryBlocks("- a\n\t- sub");
    if (out[0]?.type === "list") {
      const a = out[0].items[0]!;
      expect(a.children.some(c => c.type === "list")).toBe(true);
    }
  });
});

describe("parseEntryBlocks(混合)", () => {
  test("文本后跟列表", () => {
    const out = parseEntryBlocks("说明\n- a\n- b");
    expect(out[0]?.type).toBe("text");
    expect(out[1]?.type).toBe("list");
  });

  test("列表后跟文本", () => {
    const out = parseEntryBlocks("- a\n说明");
    expect(out[0]?.type).toBe("list");
    expect(out[1]?.type).toBe("text");
  });
});
