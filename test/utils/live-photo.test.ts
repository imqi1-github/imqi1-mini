import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  cleanLivePhotoUrl,
  extractLivePhotoMedia,
  isLivePhoto,
} from "@/utils/live-photo";

// helpers/uni-stubs.ts 已为 globalThis.uni 提供 .request / .getFileSystemManager。
// 这里测试接管 .request 模拟服务端响应。

function makeJpegWithMotionVideo(jpegBody: Uint8Array, mp4Body: Uint8Array): Uint8Array {
  const jpeg = new Uint8Array(jpegBody);
  const mp4 = new Uint8Array(mp4Body);
  const out = new Uint8Array(jpeg.length + mp4.length);
  out.set(jpeg, 0);
  out.set(mp4, jpeg.length);
  return out;
}

function fakeMp4Box(size: number, type: string, payload?: Uint8Array): Uint8Array {
  // size(4 BE) + type(4 ASCII) + payload;默认 payload 长度 = size - 8
  const pl = payload ?? new Uint8Array(Math.max(0, size - 8));
  const out = new Uint8Array(8 + pl.length);
  out[0] = (size >>> 24) & 0xff;
  out[1] = (size >>> 16) & 0xff;
  out[2] = (size >>> 8) & 0xff;
  out[3] = size & 0xff;
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(pl, 8);
  return out;
}

describe("isLivePhoto(URL 锚点判断)", () => {
  test("URL 末尾 #live → true", () => {
    expect(isLivePhoto("https://x.com/a.jpg#live")).toBe(true);
  });

  test("URL 不含 #live → false", () => {
    expect(isLivePhoto("https://x.com/a.jpg")).toBe(false);
  });

  test("空字符串/undefined/null → false", () => {
    expect(isLivePhoto("")).toBe(false);
    expect(isLivePhoto(undefined)).toBe(false);
    expect(isLivePhoto(null)).toBe(false);
  });

  test("URL 含字面 #live 子串(即使后面还有其他字符)→ true(includes 字面匹配)", () => {
    // source 是 url.includes("#live"),只要字面含 #live 子串就 true
    // 这是宽松判定;cleanLivePhotoUrl 才用 endsWith + /i 严格剥锚点
    expect(isLivePhoto("https://x.com/a.jpg#live-extra")).toBe(true);
    expect(isLivePhoto("https://x.com/live#hash")).toBe(false); // 字面没 #live
  });
});

describe("cleanLivePhotoUrl(清理锚点)", () => {
  test("剥掉末尾 #live", () => {
    expect(cleanLivePhotoUrl("https://x.com/a.jpg#live")).toBe("https://x.com/a.jpg");
  });

  test("大小写不敏感(/i 标志)", () => {
    expect(cleanLivePhotoUrl("https://x.com/a.jpg#LIVE")).toBe("https://x.com/a.jpg");
  });

  test("无 #live → 原样返回", () => {
    expect(cleanLivePhotoUrl("https://x.com/a.jpg")).toBe("https://x.com/a.jpg");
  });

  test("非字符串(undefined/null)→ 空字符串", () => {
    expect(cleanLivePhotoUrl(undefined)).toBe("");
    expect(cleanLivePhotoUrl(null)).toBe("");
  });
});

describe("extractLivePhotoMedia(主流程)", () => {
  let origRequest: (opts: unknown) => void;
  let origCreate: ((b: Blob) => string) | undefined;
  let origRevoke: ((url: string) => void) | undefined;
  let lastBlob: Blob | undefined;

  beforeEach(() => {
    lastBlob = undefined;
    const u = globalThis as unknown as {
      uni: { request: (o: unknown) => void, getFileSystemManager: () => unknown },
    };
    origRequest = u.uni.request;
    origCreate = globalThis.URL.createObjectURL;
    origRevoke = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = ((b: Blob) => {
      lastBlob = b;
      return "blob:fake://video";
    }) as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
    u.uni.getFileSystemManager = () => ({
      writeFile: (opts: { filePath: string, success: () => void, fail: (e: { errMsg: string }) => void }) => {
        setTimeout(() => opts.success(), 0);
      },
      unlink: () => {},
    });
  });

  afterEach(() => {
    (globalThis as unknown as { uni: { request: (o: unknown) => void } }).uni.request = origRequest;
    globalThis.URL.createObjectURL = origCreate as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = origRevoke as typeof URL.revokeObjectURL;
  });

  test("JPEG 内含 MP4 box:返回 imageSrc + videoSrc", async () => {
    const mp4 = fakeMp4Box(24, "ftyp");
    const jpegPart = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const full = makeJpegWithMotionVideo(jpegPart, mp4);
    const buffer = full.buffer.slice(full.byteOffset, full.byteOffset + full.byteLength) as ArrayBuffer;

    (globalThis as unknown as { uni: { request: (o: { success: (r: { statusCode: number, data: ArrayBuffer }) => void }) => void } }).uni.request = (opts) => {
      const o = opts as { success: (r: { statusCode: number, data: ArrayBuffer }) => void };
      o.success({ statusCode: 200, data: buffer });
    };

    const result = await extractLivePhotoMedia("https://x.com/a.jpg#live");
    expect(result.imageSrc).toBe("https://x.com/a.jpg");
    expect(result.videoSrc).toBeTruthy();
    expect(lastBlob).toBeDefined();
    expect(lastBlob!.type).toBe("video/mp4");
  });

  test("非实况照片:无 ftyp box → videoSrc = null,降级普通图片", async () => {
    // 纯 JPEG 无 MP4 box
    const jpegOnly = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
    const buffer = jpegOnly.buffer as ArrayBuffer;

    (globalThis as unknown as { uni: { request: (o: { success: (r: { statusCode: number, data: ArrayBuffer }) => void }) => void } }).uni.request = (opts) => {
      const o = opts as { success: (r: { statusCode: number, data: ArrayBuffer }) => void };
      o.success({ statusCode: 200, data: buffer });
    };

    const result = await extractLivePhotoMedia("https://x.com/a.jpg#live");
    expect(result.imageSrc).toBe("https://x.com/a.jpg");
    expect(result.videoSrc).toBeNull();
  });

  test("JPEG 含 'ftyp' 字节巧合但 size 越界 → 视作无 ftyp", async () => {
    // 手工构造:在 JPEG 噪声中放一组 'ftyp',但 size 字段远超文件长度
    const noise = new Uint8Array([
      0xff, 0xd8,
      0x00, 0x10, 0x00, 0x00, // size=0x00100000=1MB,远超
      0x66, 0x74, 0x79, 0x70, // ftyp
      0x00, 0x00, 0x00, 0x00,
    ]);
    const buffer = noise.buffer as ArrayBuffer;

    (globalThis as unknown as { uni: { request: (o: { success: (r: { statusCode: number, data: ArrayBuffer }) => void }) => void } }).uni.request = (opts) => {
      const o = opts as { success: (r: { statusCode: number, data: ArrayBuffer }) => void };
      o.success({ statusCode: 200, data: buffer });
    };

    const result = await extractLivePhotoMedia("https://x.com/a.jpg#live");
    expect(result.videoSrc).toBeNull();
  });

  test("HTTP 状态码非 2xx → reject,extract 兜底返回 imageSrc + videoSrc=null", async () => {
    (globalThis as unknown as { uni: { request: (o: { fail: (e: { errMsg: string }) => void }) => void } }).uni.request = (opts) => {
      const o = opts as { fail: (e: { errMsg: string }) => void };
      o.fail({ errMsg: "status 404" });
    };

    const result = await extractLivePhotoMedia("https://x.com/a.jpg#live");
    expect(result.imageSrc).toBe("https://x.com/a.jpg");
    expect(result.videoSrc).toBeNull();
  });

  test("uni.request fail(errMsg) → 兜底返回 imageSrc + videoSrc=null", async () => {
    (globalThis as unknown as { uni: { request: (o: { fail: (e: { errMsg: string }) => void }) => void } }).uni.request = (opts) => {
      const o = opts as { fail: (e: { errMsg: string }) => void };
      o.fail({ errMsg: "domain not whitelisted" });
    };

    const result = await extractLivePhotoMedia("https://x.com/a.jpg#live");
    expect(result.imageSrc).toBe("https://x.com/a.jpg");
    expect(result.videoSrc).toBeNull();
  });
});
