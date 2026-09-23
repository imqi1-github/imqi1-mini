// 后端 API 基址，统一包含 /api/mini
// Vite 按 mode 自动加载对应文件：dev → .env.development，prod → .env.production
// 消费方统一从此处导入，勿直接读 import.meta.env
//
// 启动期校验：开发与生产构建都会跑此模块的顶层代码，所以缺失或格式错误的
// VITE_API_BASE_URL 会在这里直接抛错，比放到请求发起处才发现更早、更明确。
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL
if (!rawApiBaseUrl || typeof rawApiBaseUrl !== 'string') {
  throw new Error(
    '[env] 缺少 VITE_API_BASE_URL。请在 mini/.env.development 与 mini/.env.production 中填写完整的接口地址（如 https://example.com/api/mini）。',
  )
}
const trimmedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')
if (!/\/api\/mini$/i.test(trimmedApiBaseUrl)) {
  throw new Error(
    `[env] VITE_API_BASE_URL="${rawApiBaseUrl}" 必须以 /api/mini 结尾，否则接口签名与服务端路径对不上。`,
  )
}
export const apiBaseUrl = trimmedApiBaseUrl

// 小程序 API 签名密钥，须与后端 MINI_API_SECRET 一致。
// 留空则请求不带签名头（后端未配置密钥时也不校验，二者需同步开关）。
// 注意：经 VITE_ 前缀在构建期烘焙进客户端包，可被反编译提取——
// 它只是「防批量脚本」的轻门槛，不是认证边界；真正防线在后端限流+验证码（见 server/utils/mini-auth.ts）。
export const miniApiSecret = import.meta.env.VITE_MINI_API_SECRET ?? ''