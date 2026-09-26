/**
 * bun:test preload: 为所有测试 stub uni 全局对象与 import.meta.env。
 *
 * mini 源码在多处直接调用 `uni.xxx` / `import.meta.env.VITE_*`,
 * bun:test 默认不提供这俩对象,模块顶层就会 ReferenceError。
 * 这里在测试运行前装好最小替身,真实逻辑由各测试 beforeEach 替换。
 */
import type { BunPlugin } from "bun";

// 替身类型仅占位,真实形态由源码消费方决定;只保证调用不抛 ReferenceError。
const uniStub = {
  // 同步存储(可读写)
  storage: new Map<string, unknown>(),
  // 文件系统方法(按需 stub,默认抛 "not stubbed" 引导测试显式接管)
  fsStubbed: false,
  request: (_opts: {
    url: string,
    method?: string,
    header?: Record<string, string>,
    data?: unknown,
    responseType?: string,
    success?: (res: { statusCode: number, data: unknown }) => void,
    fail?: (err: { errMsg: string }) => void,
  }) => {
    throw new Error("[uni-stubs] uni.request 未被 stub,请在测试中接管 globalThis.uni.request");
  },
  loadFontFace: (_opts: {
    family: string,
    source: string,
    global?: boolean,
    success?: () => void,
    fail?: (err: unknown) => void,
  }) => {
    throw new Error("[uni-stubs] uni.loadFontFace 未被 stub,请在测试中接管");
  },
  getStorageSync(key: string): unknown {
    return this.storage.get(key) ?? "";
  },
  setStorageSync(key: string, value: unknown): void {
    this.storage.set(key, value);
  },
  removeStorageSync(key: string): void {
    this.storage.delete(key);
  },
  getFileSystemManager: () => ({
    writeFile: () => {
      throw new Error("[uni-stubs] fs.writeFile 未被 stub");
    },
    unlink: () => {},
  }),
  env: {} as Record<string, string | undefined>,
};

// 装到 globalThis:模块顶层 uni.xxx 调用经 TS 类型断言后走这里。
(globalThis as Record<string, unknown>).uni = uniStub;

// import.meta.env 在 build 时被 Vite 替换;bun:test 没有 Vite,需要显式给值。
// VITE_API_BASE_URL 与 VITE_MINI_API_SECRET 是请求模块必填,这里给一个 dev 默认。
const envDefaults: Record<string, string> = {
  VITE_API_BASE_URL: "https://imqi1.com/api/mini",
  VITE_MINI_API_SECRET: "test-secret",
};

// bun 1.3+ 在 ESM 顶层 import.meta.env 是 frozen 对象,改不了。改用 Bun.plugin 拦截。
const plugin: BunPlugin = {
  name: "mini-test-env-injection",
  setup(_build) {
    // 不拦:让测试代码能 import.meta.env.* 读到我们塞的值。
  },
};

// 通过 globalThis 给 import.meta.env 一个代理(Bun 支持改写 import.meta.env 的属性)。
// 实际可行性:bun 1.3+ import.meta.env 是只读,但 Bun 在测试模式下允许通过 process.env 间接设。
// 这里采用更稳的方式:在每个依赖 env 的模块测试入口前,显式 import 一个 env-fixture 文件。
// 真正起作用的是这条 globalThis.__MINI_TEST_ENV__ 兜底,测试可在 beforeEach 改写。
(globalThis as Record<string, unknown>).__MINI_TEST_ENV__ = envDefaults;
process.env.VITE_API_BASE_URL = envDefaults.VITE_API_BASE_URL;
process.env.VITE_MINI_API_SECRET = envDefaults.VITE_MINI_API_SECRET;

// Bun.plugin 注册是 noop 兼容,真正注入在测试文件层处理。
Bun.plugin(plugin);

export {};
