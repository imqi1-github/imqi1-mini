/** 站点配置类型定义 */

/** 代码块 Nerd 图标字体配置 */
export interface CodeFontConfig {
  /** `uni.loadFontFace` 注册的家族名 */
  family: string
  /** 字体文件下载地址（woff2 / ttf / etc.）。`ensureCodeFont` 按需 loadFontFace。 */
  url: string
}

/**
 * 修改此处字段会同步触发所有引用处的 TypeScript 类型检查，
 * 字段上的 JSDoc 会在 IDE 悬浮提示中展示。
 */
export interface SiteConfig {
  /** 站点名称，用于首页品牌名、分享标题等站点级展示文案 */
  siteName: string
  /**
   * 网页版站点地址（协议 + 域名，无尾斜杠）。
   *
   * 与根目录 `site.config.ts` 的 `siteUrl` 保持一致。
   * 用于首页「浏览文章」跳转网页版，以及正文 markdown 中以 / 开头的
   * 根相对链接补全为完整地址。
   */
  siteUrl: string
  /** 首页展示配置 */
  home: HomeConfig
  /** 分类页展示配置 */
  category: CategoryConfig
  /** 代码块字体配置（见 {@link CodeFontConfig}） */
  codeFont: CodeFontConfig
}

/** 分类页展示配置 */
export interface CategoryConfig {
  /** 分类详情页每页展示的文章数量 */
  pageSize: number
  /**
   * 图片分类的 slug 列表。
   *
   * 命中此列表的分类会以双列封面瀑布流展示，否则走普通标题列表。
   * 与后端解耦：图片分类的判定完全由小程序自行配置。
   */
  photoCategorySlugs: string[]
}

/** 首页展示配置 */
export interface HomeConfig {
  /** 英文小标题，展示在首页主标题上方 */
  eyebrow: string
  /** 首页主标题，数组中的每一项渲染为一行 */
  titleLines: string[]
  /** 首页主标题下方的描述文案 */
  description: string
  /** 首页主按钮 */
  primaryButton: HomeButtonConfig
  /** 首页次按钮 */
  secondaryButton: HomeButtonConfig
}

/** 首页按钮配置 */
export interface HomeButtonConfig {
  /** 按钮展示文案 */
  label: string
}
