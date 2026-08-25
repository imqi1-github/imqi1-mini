// 后端 API 基址，统一包含 /api/mini
// Vite 按 mode 自动加载对应文件：dev → .env.development，prod → .env.production
// 消费方统一从此处导入，勿直接读 import.meta.env
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

// 后端站点源（协议 + 域名 + 端口），由 apiBaseUrl 截取路径前部分得到。
// 用于把正文里以 / 开头的根相对链接补全为完整地址（小程序无 <base>，需手动拼接）。
export const siteOrigin = (() => {
  const match = /^(https?:\/\/[^/]+)/i.exec(apiBaseUrl ?? '')
  return match ? match[1] : ''
})()

// 小程序 API 签名密钥，须与后端 MINI_API_SECRET 一致。
// 留空则请求不带签名头（后端未配置密钥时也不校验，二者需同步开关）。
// 注意：经 VITE_ 前缀在构建期烘焙进客户端包，可被反编译提取——
// 它只是「防批量脚本」的轻门槛，不是认证边界；真正防线在后端限流+验证码（见 server/utils/mini-auth.ts）。
export const miniApiSecret = import.meta.env.VITE_MINI_API_SECRET ?? ''

// 代码块等宽字体：复用主站 Nerd Font 化的 JetBrains Mono（含终端图标 PUA 字形），
// 系统等宽字体缺这些图标会显示豆腐块。字体托管在 CDN，靠 uni.loadFontFace 按需加载。
// 注：CDN 有 Referer 防盗链，微信小程序请求自带 servicewechat.com referer，已在白名单内；
// 但 cdn.imqi1.com 需加入微信「downloadFile 合法域名」，否则真机加载失败。
export const codeFontFamily = 'JetBrainsMono'
export const codeFontUrl = 'https://cdn.imqi1.com/fonts/JetBrainsMono-Rest.woff2'


