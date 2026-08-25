// 实况照片（Motion Photo）工具：与主站 useLivePhoto 同源思路。
// 所谓实况照片是一张 JPEG 文件尾部拼接了一段 MP4，靠 URL 尾部 #live 锚点标记。
// 端上流程：拉取整包二进制 → 扫描 ftyp 定位 MP4 起点 → 切出视频段 →
// 交给 <video> 播放。图片本体直接用原始 URL（<image>/JPEG 解码器会忽略尾部 MP4）。
//
// 平台差异：
// - H5：视频段用 Blob + URL.createObjectURL 生成可播放地址。
// - 小程序（微信/支付宝）：<video> 不能播 blob，需把视频段写入本地临时文件，用文件路径播放。

/** 提取结果：图片地址恒为清理后的原始 URL；视频地址提取失败时为 null */
export interface LivePhotoMedia {
  /** 静态图地址（原始 URL，去掉 #live 锚点） */
  imageSrc: string
  /** 可播放的视频地址（H5 为 blob URL，小程序为本地临时文件路径），无内嵌视频时为 null */
  videoSrc: string | null
}

/** 判断 URL 是否为实况照片（尾部带 #live 锚点） */
export function isLivePhoto(url: string | undefined | null): boolean {
  return typeof url === 'string' && url.includes('#live')
}

/** 清理 URL，移除尾部 #live 锚点 */
export function cleanLivePhotoUrl(url: string | undefined | null): string {
  return typeof url === 'string' ? url.replace(/#live$/i, '') : ''
}

/**
 * 在字节流中查找内嵌 MP4 的起点。
 * MP4 以 box 结构起始，前 8 字节为 [size(4)] [type(4)]，实况照片首个 box 类型为 "ftyp"。
 * ftyp 的十六进制是 0x66 0x74 0x79 0x70，位于 box 起点 +4 处。
 * 返回该 box 的起点下标（即 size 字段处），未找到返回 -1。
 */
function findMotionVideoStart(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length - 8; i++) {
    if (
      bytes[i + 4] === 0x66 // f
      && bytes[i + 5] === 0x74 // t
      && bytes[i + 6] === 0x79 // y
      && bytes[i + 7] === 0x70 // p
    ) {
      // 校验 box 的 size 字段（前 4 字节大端 u32）：必须 >= 8 且落在文件有效范围内。
      // 否则是 JPEG 压缩数据里偶然出现 "ftyp" 的误命中——真 MP4 box 的 size 一定是合理值。
      const size = (
        ((bytes[i] ?? 0) << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)
      ) >>> 0
      if (size >= 8 && i + size <= bytes.length) {
        return i
      }
    }
  }
  return -1
}

/** 拉取实况照片整包二进制。失败（含域名未加白名单）时 reject。 */
function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => {
        const status = res.statusCode ?? 0
        if (status < 200 || status >= 300) {
          reject(new Error(`实况照片请求失败：${status}`))
          return
        }
        resolve(res.data as ArrayBuffer)
      },
      fail: err => reject(new Error(err.errMsg || '实况照片请求失败')),
    })
  })
}

// 平台标记：H5 与小程序对「可播放视频地址」的生成方式不同。
// 用条件编译只在 H5 端把该常量置真；vue-tsc 检查原始源码（两分支都可见），
// 故用运行时 if/else 分流而非双 return，避免 no-unreachable / 重复声明报错。
let IS_H5 = false
// #ifdef H5
IS_H5 = true
// #endif

/** 小程序可写目录：优先用基础库提供的 USER_DATA_PATH，取不到时兜底到 tmp。 */
function userDataPath(): string {
  // uni.env 在多数基础库可用；取不到时用微信/支付宝的约定路径兜底。
  const env = (uni as unknown as { env?: { USER_DATA_PATH?: string } }).env
  return env?.USER_DATA_PATH || 'wxfile://usr'
}

/** 把视频段字节写入本地临时文件，返回可供 <video> 播放的文件路径（小程序端）。 */
function writeVideoTempFile(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    // 文件名带时间戳 + 随机串，避免并发/复用冲突
    const name = `livephoto_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.mp4`
    const filePath = `${userDataPath()}/${name}`
    fs.writeFile({
      filePath,
      data: buffer,
      success: () => resolve(filePath),
      fail: err => reject(new Error(err.errMsg || '实况视频写入失败')),
    })
  })
}

/**
 * 提取实况媒体：拉取整包 → 定位并切出内嵌 MP4 → 按平台生成可播放视频地址。
 * 无内嵌视频时 videoSrc 为 null（此时退化为普通图片，仍可正常显示）。
 */
export async function extractLivePhotoMedia(url: string): Promise<LivePhotoMedia> {
  const imageSrc = cleanLivePhotoUrl(url)
  try {
    const buffer = await fetchArrayBuffer(imageSrc)
    const bytes = new Uint8Array(buffer)
    const start = findMotionVideoStart(bytes)
    if (start === -1) {
      return { imageSrc, videoSrc: null }
    }

    const videoBuffer = bytes.slice(start).buffer

    if (IS_H5) {
      // H5：视频段用 Blob + createObjectURL 生成可播放地址
      const blob = new Blob([videoBuffer], { type: 'video/mp4' })
      return { imageSrc, videoSrc: URL.createObjectURL(blob) }
    }

    // 小程序：<video> 不能播 blob，写入本地临时文件用路径播放
    const filePath = await writeVideoTempFile(videoBuffer)
    return { imageSrc, videoSrc: filePath }
  }
  catch (e) {
    console.error('[live-photo] 提取实况媒体失败:', e)
    return { imageSrc, videoSrc: null }
  }
}

/** 释放已生成的视频地址：H5 撤销 blob URL，小程序删除临时文件。 */
export function releaseLivePhotoVideo(videoSrc: string | null): void {
  if (!videoSrc) return

  if (IS_H5) {
    if (videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc)
    }
    return
  }

  try {
    uni.getFileSystemManager().unlink({ filePath: videoSrc, fail: () => {} })
  }
  catch {}
}
