// 小程序仓库卡片数据：后端 /api/mini/repo 已代理 GitHub/Gitee 并归一化
export interface MiniRepo {
  /** 平台：github / gitee */
  platform: 'github' | 'gitee'
  /** 完整仓库名（owner/repo） */
  fullName: string
  /** 仓库描述，无则为空串 */
  description: string
  /** 主语言，无则为空串 */
  language: string
  /** star 数 */
  stars: number
  /** fork 数 */
  forks: number
  /** 是否私有仓库 */
  isPrivate: boolean
  /** 仓库地址，点击跳转用 */
  url: string
}
