import { siteConfig } from '@/site.config'

// 代码块图标字体（Nerd Font 化的 JetBrains Mono）按需加载。
// 系统等宽字体缺终端图标（PUA 区）字形，显示为豆腐块；加载此字体后代码块能正常显示图标。
// 全局只加载一次：多篇文章 / 多个代码块共用同一 Promise，避免重复 loadFontFace。
//
// 家族名 / URL 均来自 site.config 的 codeFont 字段，避免分散硬编码。
// fork 用户改字体只动 site.config.ts 这一处。

let loadPromise: Promise<void> | null = null

/**
 * 确保代码块字体已加载（幂等）。
 * 用 global: true 让字体在所有页面生效；失败时静默降级到系统等宽字体（不 reject 阻断渲染）。
 */
export function ensureCodeFont(): Promise<void> {
  if (loadPromise) return loadPromise

  const { family, url } = siteConfig.codeFont

  loadPromise = new Promise<void>((resolve) => {
    // uni.loadFontFace 在部分平台（如支付宝）签名不同，用 try 兜底
    try {
      uni.loadFontFace({
        family,
        source: `url("${url}")`,
        global: true,
        success: () => resolve(),
        fail: (err) => {
          // 加载失败（域名未配 / 网络问题）不阻断：降级系统字体
          console.warn('[code-font] loadFontFace failed:', err)
          resolve()
        },
      })
    }
    catch (err) {
      console.warn('[code-font] loadFontFace threw:', err)
      resolve()
    }
  })

  return loadPromise
}
