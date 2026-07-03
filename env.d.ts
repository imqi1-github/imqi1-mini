/// <reference types='@dcloudio/types' />
/// <reference types='vite/client' />

declare module 'uno.css'

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

interface ImportMetaEnv {
  /** 后端 API 基址（dev 读 .env.development，prod 读 .env.production） */
  readonly VITE_API_BASE_URL: string
  /** 小程序 API 签名密钥，须与后端 MINI_API_SECRET 一致；留空则不加签名头 */
  readonly VITE_MINI_API_SECRET: string
}
