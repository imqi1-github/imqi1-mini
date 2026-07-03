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
export const miniApiSecret = import.meta.env.VITE_MINI_API_SECRET ?? ''

