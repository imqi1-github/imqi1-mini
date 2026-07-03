// 小程序链接类型（与后端 server/types/apis/mini.d.ts 的 MiniLink 对齐）

/** 链接项：友链与订阅统一展示为链接 */
export interface LinkItem {
  /** 稳定 key：来源 + 原始 id */
  key: string
  /** 来源：友链 / 订阅 */
  source: 'link' | 'subscribe'
  /** 昵称 / 站点名 */
  name: string
  /** 站点地址 */
  url: string
  /** 头像地址，无则为空串 */
  avatar: string
}
