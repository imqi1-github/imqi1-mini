// 首页展示用的内容类型（与后端字段命名保持一致）

/** 首页文章卡片：仅展示封面、标题、发布时间 */
export interface ArticleCard {
  /** 文章唯一 id，用作列表 key */
  id: number
  /** 文章标题 */
  title: string
  /** 封面图地址 */
  cover: string
  /** 已格式化好的发布时间文本，如 "3 天前" */
  publishedAt: string
  /** 原始发布时间 ISO 字符串，便于后续扩展 */
  created: string
}

/** 文章所属分类 */
export interface ContentCategory {
  mid: number
  name: string
  /** 分类 slug，用于跳转分类详情页 */
  slug: string
}

/** 文章封面项：图片地址 + 标题，标题无则为空字符串 */
export interface ContentCover {
  url: string
  title: string
}

/** 文章详情（来自 /mini/content/[id]），content 为 Markdown 原文 */
export interface ContentDetail {
  /** 文章唯一 id */
  id: number
  /** 文章标题 */
  title: string
  /** 文章描述 / 摘要，无则为空字符串 */
  description: string
  /** Markdown 原文，交给端上解析器渲染 */
  content: string
  /** 首张封面绝对地址，无封面时为空字符串 */
  cover: string
  /** 全部封面（含标题），可能为空数组 */
  covers: ContentCover[]
  /** 文章所属分类，可能为空数组 */
  categories: ContentCategory[]
  /** 已格式化好的发布时间文本，如 "3 天前" */
  publishedAt: string
  /** 原始发布时间 ISO 字符串 */
  created: string
}
