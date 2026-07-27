// 评论文本解析后的 token 类型（小程序端）。
//
// 小程序无法 v-html，comment-node 把 :[key] 占位符切成有序的 text/emoji 段，
// 用原生 <text>/<image> 分段渲染（见 @/utils/emoji 的 parseCommentContent）。

/** 表情段：命中 :[key] 占位符，渲染为图片 */
export interface CommentEmojiToken {
  /** 区分文本/表情段 */
  type: 'emoji'
  /** 表情图片完整 URL（已用 siteConfig.siteUrl 补全站点根相对路径） */
  url: string
  /** 表情显示名（去分类前缀，如 heo-微笑 → 微笑），仅作语义留存，小程序 image 无 alt 不渲染 */
  name: string
}

/** 文本段：占位符之间的纯文本，或未命中表情表的占位符原样文本 */
export interface CommentTextToken {
  /** 区分文本/表情段 */
  type: 'text'
  /** 原文本段 */
  value: string
}

/** 评论解析结果：有序的文本/表情段数组 */
export type CommentToken = CommentTextToken | CommentEmojiToken
