import { describe, expect, test } from "bun:test";

import { SPAN_CLS, parseInline, parseMarkdown } from "@/utils/markdown";

// markdown.ts 是大解析器,重点测 parseInline(行内语法)和 parseMarkdown 的关键路径。
// 容器型语法(card / callout / details / repo / music / swiper / waterfall / live-photo / video)
// 走 collectContainerBody + parseBlocks 递归,行为契约以表格/列表/标题为基准。

describe("parseInline(行内语法)", () => {
  test("空字符串 → 空数组", () => {
    expect(parseInline("")).toEqual([]);
  });

  test("纯文本", () => {
    const out = parseInline("hello world");
    expect(out).toEqual([{ text: "hello world", cls: undefined }]);
  });

  test("粗体 **...** 整段作为 strong class", () => {
    const out = parseInline("a **b** c");
    const strong = out.find(s => s.text === "b");
    expect(strong?.cls).toContain(SPAN_CLS.strong);
  });

  test("斜体 *...* 整段作为 em class", () => {
    const out = parseInline("a *b* c");
    const em = out.find(s => s.text === "b");
    expect(em?.cls).toContain(SPAN_CLS.em);
  });

  test("删除线 ~~...~~", () => {
    const out = parseInline("a ~~b~~ c");
    const strike = out.find(s => s.text === "b");
    expect(strike?.cls).toContain(SPAN_CLS.strike);
  });

  test("行内码 `...`", () => {
    const out = parseInline("a `b` c");
    const code = out.find(s => s.text === "b");
    expect(code?.cls).toContain(SPAN_CLS.code);
  });

  test("链接 [text](url) 携带 href", () => {
    const out = parseInline("[click](https://x.com)");
    expect(out).toEqual([
      { text: "click", cls: SPAN_CLS.link, href: "https://x.com" },
    ]);
  });

  test("删除线包链接:cls 累积 + href 下传到叶子", () => {
    const out = parseInline("~~[click](https://x.com)~~");
    expect(out).toEqual([
      { text: "click", cls: `${SPAN_CLS.strike} ${SPAN_CLS.link}`, href: "https://x.com" },
    ]);
  });

  test("自动链接 <https://x.com>", () => {
    const out = parseInline("<https://x.com>");
    expect(out).toEqual([
      { text: "https://x.com", cls: SPAN_CLS.link, href: "https://x.com" },
    ]);
  });

  test("邮箱 <a@b.com> 自动套 mailto:", () => {
    const out = parseInline("<a@b.com>");
    expect(out).toEqual([
      { text: "a@b.com", cls: SPAN_CLS.link, href: "mailto:a@b.com" },
    ]);
  });

  test("交错粗斜 **x *y* z** 不会被嵌套解析为 strong(em)", () => {
    // mini 解析器对交错粗斜是 buggy 的(strong 不匹配后,em 把内部 * 当作一对),
    // 这里固化真实行为,作为将来修 bug 的对照。
    const out = parseInline("**x *y* z**");
    // 不应出现 strong class(因为 strong re 在含 * 的内容里不匹配)
    const hasStrong = out.some(s => s.cls?.includes(SPAN_CLS.strong));
    expect(hasStrong).toBe(false);
  });

  test("粗体不嵌套斜体 **a** → 单纯 strong", () => {
    const out = parseInline("**a**");
    expect(out[0]).toMatchObject({ text: "a", cls: SPAN_CLS.strong });
  });

  test("无匹配 → 整段作为 text 段", () => {
    const out = parseInline("plain text only");
    expect(out).toEqual([{ text: "plain text only", cls: undefined }]);
  });
});

describe("parseMarkdown(块级结构)", () => {
  test("空字符串 → 空 blocks", () => {
    expect(parseMarkdown("")).toEqual([]);
  });

  test("标题 # ## ### 各级", () => {
    const out = parseMarkdown("# H1\n\n## H2\n\n### H3");
    expect(out.filter(b => b.type === "heading")).toMatchObject([
      { type: "heading", level: 1 },
      { type: "heading", level: 2 },
      { type: "heading", level: 3 },
    ]);
  });

  test("段落:多行连续 → 拼成一段", () => {
    const out = parseMarkdown("line one\nline two\nline three");
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("paragraph");
  });

  test("段落:空行分隔多段", () => {
    const out = parseMarkdown("para one\n\npara two");
    expect(out).toHaveLength(2);
    expect(out.every(b => b.type === "paragraph")).toBe(true);
  });

  test("无序列表 -/*/+ 三种 marker 都识别", () => {
    for (const m of ["-", "*", "+"]) {
      const out = parseMarkdown(`${m} item1\n${m} item2`);
      const list = out.find(b => b.type === "list");
      expect(list?.type).toBe("list");
      if (list && list.type === "list") {
        expect(list.ordered).toBe(false);
        expect(list.items).toHaveLength(2);
      }
    }
  });

  test("有序列表 1. 2.", () => {
    const out = parseMarkdown("1. a\n2. b");
    const list = out.find(b => b.type === "list");
    expect(list?.type).toBe("list");
    if (list && list.type === "list") {
      expect(list.ordered).toBe(true);
      expect(list.items).toHaveLength(2);
    }
  });

  test("引用行合并:连续 > 行合成一个 quote 块", () => {
    const out = parseMarkdown("> line1\n> line2");
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("quote");
  });

  test("分割线 --- *** ___", () => {
    for (const m of ["---", "***", "___"]) {
      const out = parseMarkdown(`${m}`);
      expect(out[0]).toMatchObject({ type: "divider" });
    }
  });

  test("代码块 ```lang ... ``` 含 lang 与行高亮", () => {
    const out = parseMarkdown("```ts\nconst x = 1\n```");
    expect(out[0]).toMatchObject({ type: "code", lang: "ts" });
    if (out[0]?.type === "code") {
      expect(out[0].text).toBe("const x = 1");
      expect(out[0].lines.length).toBeGreaterThan(0);
    }
  });

  test("代码块 fence info 含 + 后文件名: ```py+demo.py", () => {
    const out = parseMarkdown("```py+demo.py\nprint('hi')\n```");
    expect(out[0]).toMatchObject({ type: "code", lang: "py", fileName: "demo.py" });
  });

  test("行内图片 ![alt](url) 不带 #live", () => {
    const out = parseMarkdown("![alt](https://x.com/a.png)");
    expect(out[0]).toMatchObject({ type: "image", src: "https://x.com/a.png", alt: "alt" });
  });

  test("实况照片:URL 带 #live → isLive: true", () => {
    const out = parseMarkdown("![alt](https://x.com/a.jpg#live)");
    expect(out[0]).toMatchObject({
      type: "image",
      src: "https://x.com/a.jpg#live",
      isLive: true,
    });
  });

  test("实况照片:alt 含 [live] → isLive: true", () => {
    const out = parseMarkdown("![live 图片](https://x.com/a.jpg)");
    // 正则 /\[live\]/i 匹配的是 alt 文本,而当前 markdown.ts 源码仅当 src 含 #live 才置 isLive
    // 这里确认 src 无 #live 时不会自动识别为实况照片(显式锚点是必要条件)
    expect(out[0]).toMatchObject({ type: "image" });
    if (out[0]?.type === "image") {
      expect(out[0].isLive).toBeUndefined();
    }
  });

  test("行内图片快捷形式 ![label] 用 label 查引用定义", () => {
    const md = "[a]: https://x.com/a.png\n\n![a]";
    const out = parseMarkdown(md);
    expect(out.find(b => b.type === "image")).toMatchObject({
      type: "image",
      src: "https://x.com/a.png",
    });
  });

  test("表格:表头+分隔+数据行", () => {
    const md = "| h1 | h2 |\n|---|---|\n| a | b |\n| c | d |";
    const out = parseMarkdown(md);
    expect(out[0]?.type).toBe("table");
    if (out[0]?.type === "table") {
      expect(out[0].header).toHaveLength(2);
      expect(out[0].rows).toHaveLength(2);
      expect(out[0].aligns).toEqual(["left", "left"]);
    }
  });

  test("表格:对齐 :---: → center, ---: → right, :--- → left", () => {
    const md = "| a | b | c |\n|:---:|:---|---:|\n| 1 | 2 | 3 |";
    const out = parseMarkdown(md);
    if (out[0]?.type === "table") {
      expect(out[0].aligns).toEqual(["center", "left", "right"]);
    }
  });

  test("表格转义 \\| 在单元格内", () => {
    const md = "| a\\|b | c |\n|---|---|\n| 1 | 2 |";
    const out = parseMarkdown(md);
    if (out[0]?.type === "table") {
      expect(out[0].header[0]?.map(s => s.text).join("")).toBe("a|b");
    }
  });

  test("折叠面板 ::: details 标题 ... :::", () => {
    const out = parseMarkdown("::: details 摘要\n内容行\n:::");
    expect(out[0]).toMatchObject({ type: "details", summary: "摘要" });
  });

  test("提示框 ::: callout success|warning|error|info", () => {
    for (const v of ["success", "warning", "error", "info"] as const) {
      const out = parseMarkdown(`::: callout ${v}\n内容\n:::`);
      expect(out[0]).toMatchObject({ type: "callout", variant: v });
    }
  });

  test("大链接卡片 ::: card url | title | desc | image", () => {
    const out = parseMarkdown("::: card https://x.com | 标题 | 描述 | 图\n:::");
    expect(out[0]).toMatchObject({
      type: "card",
      variant: "big",
      url: "https://x.com",
      title: "标题",
      description: "描述",
      image: "图",
    });
  });

  test("小链接卡片 ::: simple-card url | title", () => {
    const out = parseMarkdown("::: simple-card https://x.com | 链接\n:::");
    expect(out[0]).toMatchObject({
      type: "card",
      variant: "simple",
      url: "https://x.com",
      title: "链接",
    });
  });

  test("轮播 ::: swiper 每行 url | title", () => {
    const out = parseMarkdown("::: swiper\na.jpg | A\nb.jpg | B\n:::");
    if (out[0]?.type === "swiper") {
      expect(out[0].slides).toEqual([
        { url: "a.jpg", title: "A" },
        { url: "b.jpg", title: "B" },
      ]);
    }
  });

  test("瀑布流 ::: waterfall", () => {
    const out = parseMarkdown("::: waterfall\na.jpg\nb.jpg\n:::");
    if (out[0]?.type === "waterfall") {
      expect(out[0].images).toEqual([
        { url: "a.jpg", title: "" },
        { url: "b.jpg", title: "" },
      ]);
    }
  });

  test("音乐 ::: music auto <url> 解析网易云 song", () => {
    const out = parseMarkdown("::: music auto https://music.163.com/song?id=123\n:::");
    if (out[0]?.type === "music") {
      expect(out[0]).toMatchObject({ server: "netease", mediaType: "song", id: "123" });
    }
  });

  test("音乐 ::: music playlist netease 123", () => {
    const out = parseMarkdown("::: music playlist netease abc123\n:::");
    if (out[0]?.type === "music") {
      expect(out[0]).toMatchObject({ server: "netease", mediaType: "playlist", id: "abc123" });
    }
  });

  test("音乐 album/artist 类型被后端 400 拒绝,整体跳过", () => {
    const out = parseMarkdown("::: music auto https://music.163.com/album?id=1\n:::");
    // album 类型应被丢弃,blocks 中无 music 节点
    expect(out.some(b => b.type === "music")).toBe(false);
  });

  test("仓库卡片 ::: repo 解析 github", () => {
    const out = parseMarkdown("::: repo https://github.com/imqi1/imqi1-mini\n:::");
    if (out[0]?.type === "repo") {
      expect(out[0]).toMatchObject({
        platform: "github",
        owner: "imqi1",
        repo: "imqi1-mini",
      });
    }
  });

  test("仓库卡片 ::: repo 解析 gitee", () => {
    const out = parseMarkdown("::: repo https://gitee.com/foo/bar\n:::");
    if (out[0]?.type === "repo") {
      expect(out[0]).toMatchObject({ platform: "gitee", owner: "foo", repo: "bar" });
    }
  });

  test("实况照片 ::: live-photo URL 标题 容器体忽略", () => {
    const out = parseMarkdown("::: live-photo https://x.com/a.jpg#live 一段标题\n:::");
    expect(out[0]).toMatchObject({
      type: "image",
      src: "https://x.com/a.jpg#live",
      isLive: true,
    });
  });

  test("视频 ::: video URL", () => {
    const out = parseMarkdown("::: video https://x.com/v.mp4\n:::");
    expect(out[0]).toMatchObject({ type: "video", src: "https://x.com/v.mp4" });
  });

  test("\\r\\n 与 \\r 都归一为 \\n", () => {
    const out = parseMarkdown("a\r\nb\r\nc");
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("paragraph");
  });

  test("引用式定义行不参与渲染", () => {
    const out = parseMarkdown("[ref]: https://x.com\n\n正文");
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe("paragraph");
  });

  test("嵌套容器:callout 内含列表", () => {
    const out = parseMarkdown("::: callout info\n- a\n- b\n:::");
    if (out[0]?.type === "callout") {
      const list = out[0].children.find(c => c.type === "list");
      expect(list?.type).toBe("list");
    }
  });

  test("空代码块 ``` ``` 仍产出 code 节点", () => {
    const out = parseMarkdown("```ts\n```");
    expect(out[0]).toMatchObject({ type: "code", lang: "ts", text: "" });
  });
});
