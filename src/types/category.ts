// 分类页相关类型

/** 分类列表条目（来自 /mini/categories） */
export interface CategoryItem {
  /** 分类唯一 id（metas.mid），用作列表 key */
  mid: number
  /** 分类名称 */
  name: string
  /** 分类 slug，用于跳转详情页 */
  slug: string
  /** 分类说明，可能为空 */
  desc: string | null
  /** 该分类文章数量 */
  contentCount: number
  /** 最新一篇文章的封面（已转绝对地址），无封面时为空串 */
  cover: string
  /** 最新一篇文章标题，封面缺失时用作图标文字兜底 */
  latestTitle: string
}

/** 分类详情页文章条目（来自 /mini/category/[slug]/contents） */
export interface CategoryContent {
  /** 文章唯一 id，用作列表 key */
  id: number
  /** 文章标题 */
  title: string
  /** 首图地址（已转绝对地址，可能为空） */
  cover: string
  /** 封面图数量，多于 1 张时右上角展示角标 */
  coverCount: number
  /** 首图宽度，用于瀑布流占位，可能为空 */
  coverWidth: number | null
  /** 首图高度，用于瀑布流占位，可能为空 */
  coverHeight: number | null
  /** 已格式化好的发布时间文本，如 "3 天前" */
  publishedAt: string
  /** 原始发布时间 ISO 字符串 */
  created: string
}

/** 分页信息 */
export interface CategoryPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** 分类详情页响应数据 */
export interface CategoryContentsData {
  category: {
    mid: number
    name: string
    slug: string
    desc: string | null
  }
  contents: CategoryContent[]
  pagination: CategoryPagination
}
