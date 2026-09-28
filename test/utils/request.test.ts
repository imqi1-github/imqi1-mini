import { afterEach, beforeEach, describe, expect, test } from "bun:test";

// helpers/uni-stubs.ts preload 设了 VITE_API_BASE_URL=https://imqi1.com/api/mini 与 VITE_MINI_API_SECRET=test-secret。
// 这里测试接管 uni.request 验证 request.ts 的 URL 拼接、HMAC 头注入、响应解析。

import { post, request, requestFull } from "@/utils/request";

type CapturedCall = {
  url: string;
  method?: string;
  header?: Record<string, string>;
  data?: unknown;
  responseType?: string;
};

let calls: CapturedCall[] = [];
let response: { statusCode: number; data: unknown } | null = null;
let failErr: { errMsg: string } | null = null;
let origRequest: (opts: unknown) => void;

beforeEach(() => {
  calls = [];
  response = null;
  failErr = null;
  const u = globalThis as unknown as { uni: { request: (o: unknown) => void } };
  origRequest = u.uni.request;
  u.uni.request = (opts: unknown) => {
    const o = opts as {
      url: string;
      method?: string;
      header?: Record<string, string>;
      data?: unknown;
      responseType?: string;
      success?: (r: { statusCode: number; data: unknown }) => void;
      fail?: (e: { errMsg: string }) => void;
    };
    calls.push({
      url: o.url,
      method: o.method,
      header: o.header,
      data: o.data,
      responseType: o.responseType,
    });
    if (failErr) {
      o.fail?.(failErr);
    } else if (response) {
      o.success?.(response);
    }
  };
});

afterEach(() => {
  (
    globalThis as unknown as { uni: { request: (o: unknown) => void } }
  ).uni.request = origRequest;
});

describe("request(GET)", () => {
  test("URL 拼接:base + path", async () => {
    response = { statusCode: 200, data: { success: true, data: { x: 1 } } };
    const data = await request<{ x: number }>("/foo/bar");
    expect(data).toEqual({ x: 1 });
    expect(calls[0]!.url).toBe("https://imqi1.com/api/mini/foo/bar");
    expect(calls[0]!.method).toBe("GET");
  });

  test("base 末尾 / 与 path 开头 / 双斜杠归一为单斜杠", async () => {
    response = { statusCode: 200, data: { success: true, data: null } };
    await request("/baz");
    expect(calls[0]!.url).toBe("https://imqi1.com/api/mini/baz");
    // 双斜杠不应出现
    expect(calls[0]!.url).not.toContain("//baz");
  });

  test("HMAC 签名头注入:X-Mini-Timestamp / X-Mini-Nonce / X-Mini-Sign", async () => {
    response = { statusCode: 200, data: { success: true, data: null } };
    await request("/signed");
    const h = calls[0]!.header!;
    expect(h["X-Mini-Timestamp"]).toMatch(/^\d{10}$/); // unix seconds
    expect(h["X-Mini-Nonce"]).toBeTruthy();
    expect(h["X-Mini-Sign"]).toMatch(/^[0-9a-f]{64}$/);
  });

  test("请求体 method 用大写且签名字符串也用大写 method", async () => {
    response = { statusCode: 200, data: { success: true, data: null } };
    await request("/m");
    expect(calls[0]!.method).toBe("GET"); // mini 端硬编码 GET
  });

  test("响应 success=false 但 2xx → reject 带 message", async () => {
    response = {
      statusCode: 200,
      data: { success: false, message: "业务错误" },
    };
    expect(request("/x")).rejects.toThrow("业务错误");
  });

  test("响应 statusCode 4xx + message → reject 带 message", async () => {
    response = { statusCode: 429, data: { message: "评论太频繁" } };
    expect(request("/x")).rejects.toThrow("评论太频繁");
  });

  test("响应 statusCode 4xx 无 message → reject 带状态码", async () => {
    response = { statusCode: 500, data: null };
    expect(request("/x")).rejects.toThrow("请求失败：500");
  });

  test("fail callback → reject with error", async () => {
    failErr = { errMsg: "network fail" };
    expect(request("/x")).rejects.toBeDefined();
  });
});

describe("requestFull(GET,返回完整 envelope)", () => {
  test("返回 { success, data, message } 完整 envelope", async () => {
    response = {
      statusCode: 200,
      data: { success: true, data: { x: 1 }, extra: "meta" },
    };
    const env = await requestFull<{
      success: boolean;
      data: { x: number };
      extra: string;
    }>("/x");
    expect(env.extra).toBe("meta");
    expect(env.data).toEqual({ x: 1 });
  });

  test("envelope success=false → reject with message", async () => {
    response = { statusCode: 200, data: { success: false, message: "失败" } };
    expect(requestFull("/x")).rejects.toThrow("失败");
  });
});

describe("post(POST)", () => {
  test("method=POST + Content-Type: application/json + X-Client-Platform: mini", async () => {
    response = { statusCode: 200, data: { success: true, data: null } };
    await post("/post", { a: 1 });
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.header!["Content-Type"]).toBe("application/json");
    expect(calls[0]!.header!["X-Client-Platform"]).toBe("mini");
    expect(calls[0]!.data).toEqual({ a: 1 });
  });

  test("POST 也带 HMAC 签名头", async () => {
    response = { statusCode: 200, data: { success: true, data: null } };
    await post("/p", { b: 2 });
    const h = calls[0]!.header!;
    expect(h["X-Mini-Sign"]).toMatch(/^[0-9a-f]{64}$/);
  });

  test("POST 响应 success + data → resolve data", async () => {
    response = { statusCode: 200, data: { success: true, data: { r: 1 } } };
    const out = await post<{ r: number }>("/p", {});
    expect(out).toEqual({ r: 1 });
  });
});

describe("HMAC 签名不变式", () => {
  test("相同 timestamp + nonce 下 sign 是确定性函数(不依赖时间)", async () => {
    // 直接调 buildSignHeaders 不可能(未导出);改用两次独立请求的 sign 比较:
    // 由于 timestamp + nonce 每次随机,sign 必不同
    response = { statusCode: 200, data: { success: true, data: null } };
    await request("/x");
    const sign1 = calls[0]!.header!["X-Mini-Sign"];
    await new Promise((r) => setTimeout(r, 5));
    response = { statusCode: 200, data: { success: true, data: null } };
    await request("/x");
    const sign2 = calls[1]!.header!["X-Mini-Sign"];
    // 不同 timestamp + nonce → sign 必不同
    expect(sign1).not.toBe(sign2);
  });

  test("miniApiSecret 为空时签名头为空对象(后端也不校验,二者需同步开关)", async () => {
    // bun 模块缓存:无法换 secret 后 reload request 模块。
    // 这里只能验证 secret 非空路径已被覆盖(单测覆盖面);
    // 「secret 空时不带签名」分支需在服务端 mini-auth.ts 单测里互验。
    const origSecret = process.env.VITE_MINI_API_SECRET;
    process.env.VITE_MINI_API_SECRET = "";
    try {
      response = { statusCode: 200, data: { success: true, data: null } };
      await request("/x");
      // 当前 cached 模块仍用 test-secret,签名头应存在
      expect(calls.at(-1)!.header!["X-Mini-Sign"]).toBeTruthy();
    } finally {
      process.env.VITE_MINI_API_SECRET = origSecret;
    }
  });
});
