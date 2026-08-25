/** 留言板配置：绑定文章 id + 主站评论总开关 */
export interface MessagesConfig {
  /** 留言区绑定的文章 id，未配置时为 null */
  contentId: number | null
  /** 小程序评论总开关（features.miniComment），关闭时留言页与入口都不展示 */
  commentEnabled: boolean
}
