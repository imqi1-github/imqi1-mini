import { describe, expect, test } from "bun:test";

import { highlightCode } from "@/utils/highlight";

// highlight.ts 是纯函数 tokenize,无 uni/Vite 依赖。
// 注意:CodeLine = CodeToken[],每一行就是 token 数组本身,没有 .tokens 字段。

describe("highlightCode(语言解析)", () => {
  test("空字符串 → 返回 1 行空 token", () => {
    const lines = highlightCode("", "ts");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toEqual([]);
  });

  test("多行按 \\n 切分", () => {
    const lines = highlightCode("a\nb\nc", "ts");
    expect(lines).toHaveLength(3);
    expect(lines.map(l => l.map(t => t.text).join(""))).toEqual(["a", "b", "c"]);
  });

  test("语言别名归一:ts → typescript", () => {
    const [line] = highlightCode("const x = 1", "ts");
    // const 应被识别为关键字
    expect(line!.find(t => t.type === "keyword")?.text).toBe("const");
  });

  test("语言别名归一:py → python", () => {
    const [line] = highlightCode("def foo():", "py");
    expect(line!.find(t => t.type === "keyword")?.text).toBe("def");
    // 函数名 foo 后面紧跟 ( → 标记为 function
    expect(line!.find(t => t.type === "function")?.text).toBe("foo");
  });

  test("未知语言:无关键字着色(回落空 keywords)", () => {
    // 未知语言 KEYWORDS[resolved] 是 undefined,fallback [] → if 不被识别为 keyword
    const [line] = highlightCode("if x: pass", "未知语言");
    expect(line!.find(t => t.type === "keyword")).toBeUndefined();
    // 但 plain token 仍产出
    expect(line!.length).toBeGreaterThan(0);
  });

  test("空字符串 lang:等同于未知语言,无 keyword", () => {
    const [line] = highlightCode("if x", "");
    expect(line!.find(t => t.type === "keyword")).toBeUndefined();
  });
});

describe("highlightCode(token 类型)", () => {
  test("数字识别", () => {
    const [line] = highlightCode("x = 42", "ts");
    expect(line!.find(t => t.type === "number")?.text).toBe("42");
  });

  test("十六进制数字识别(扩展到 a-fA-FxX)", () => {
    const [line] = highlightCode("0x1F", "ts");
    expect(line!.find(t => t.type === "number")?.text).toBe("0x1F");
  });

  test("双引号字符串识别(含转义)", () => {
    const [line] = highlightCode('msg = "hello \\"x\\""', "ts");
    const str = line!.find(t => t.type === "string");
    expect(str?.text).toBe('"hello \\"x\\""');
  });

  test("单引号字符串识别", () => {
    const [line] = highlightCode("'abc'", "ts");
    const str = line!.find(t => t.type === "string");
    expect(str?.text).toBe("'abc'");
  });

  test("反引号字符串识别", () => {
    const [line] = highlightCode("`tmpl`", "ts");
    expect(line!.find(t => t.type === "string")?.text).toBe("`tmpl`");
  });

  test("函数名:标识符后紧跟 ( → function", () => {
    const [line] = highlightCode("foo()", "ts");
    expect(line!.find(t => t.type === "function")?.text).toBe("foo");
  });

  test("非函数调用:标识符后是空格+普通 token → plain", () => {
    const [line] = highlightCode("foo bar", "ts");
    expect(line!.find(t => t.type === "function")).toBeUndefined();
    expect(line!.filter(t => t.type === "plain").map(t => t.text).join("")).toBe("foo bar");
  });
});

describe("highlightCode(注释)", () => {
  test("TypeScript/JavaScript 行注释 // 到行尾", () => {
    const [line] = highlightCode("x // 注释内容", "ts");
    expect(line!.find(t => t.type === "comment")?.text).toBe("// 注释内容");
  });

  test("Python 行注释 # 到行尾", () => {
    const [line] = highlightCode("x = 1  # 注释", "py");
    expect(line!.find(t => t.type === "comment")?.text).toBe("# 注释");
  });

  test("Bash 行注释 # 到行尾", () => {
    const [line] = highlightCode("echo x # comment", "bash");
    expect(line!.find(t => t.type === "comment")?.text).toBe("# comment");
  });
});

describe("highlightCode(相邻同类 token 合并)", () => {
  test("两个相邻字符串 token 不直接合并(中间有 plain 隔开)", () => {
    // push 只在相邻同类型时合并;\"a\" 与 \"b\" 中间是普通空格,会推一个 plain 段。
    // 这里验证两个 string 仍各自独立。
    const [line] = highlightCode('"a" "b"', "ts");
    const strs = line!.filter(t => t.type === "string");
    expect(strs).toHaveLength(2);
    expect(strs.map(s => s.text)).toEqual(['"a"', '"b"']);
  });

  test("无间隔两个字符串 token 合并:连续 \"a\"\"b\"", () => {
    // 没有空格隔开时,push 会合并相邻同类型
    const [line] = highlightCode('"a""b"', "ts");
    const strs = line!.filter(t => t.type === "string");
    expect(strs).toHaveLength(1);
    expect(strs[0]!.text).toBe('"a""b"');
  });

  test("空字符串 token 不入栈(push 函数守门)", () => {
    const [line] = highlightCode("(", "ts");
    // 只产生一个标点 token
    expect(line!).toHaveLength(1);
    expect(line![0]!.type).toBe("punctuation");
  });
});
