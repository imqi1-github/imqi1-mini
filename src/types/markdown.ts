// 极简 Markdown 解析结果类型：块级节点 + 行内片段
// 仅覆盖最基础语法，供小程序用原生 view/text 渲染

/** 行内片段：普通文本 / 粗体 / 斜体 / 行内代码 / 链接 */
export interface InlineSpan {
  type: 'text' | 'strong' | 'em' | 'code' | 'link'
  text: string
  /** 仅 link 有值 */
  href?: string
}

/** 标题块 */
export interface HeadingBlock {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  spans: InlineSpan[]
}

/** 段落块 */
export interface ParagraphBlock {
  type: 'paragraph'
  spans: InlineSpan[]
}

/** 列表块（有序 / 无序），每项由行内片段组成 */
export interface ListBlock {
  type: 'list'
  ordered: boolean
  items: InlineSpan[][]
}

/** 引用块 */
export interface QuoteBlock {
  type: 'quote'
  spans: InlineSpan[]
}

/** 代码高亮片段类型 */
export type CodeTokenType
  = | 'plain'
    | 'keyword'
    | 'string'
    | 'comment'
    | 'number'
    | 'function'
    | 'punctuation'

/** 一段带高亮类型的代码片段 */
export interface CodeToken {
  type: CodeTokenType
  text: string
}

/** 一行代码，由若干高亮片段组成 */
export type CodeLine = CodeToken[]

/** 代码块 */
export interface CodeBlock {
  type: 'code'
  /** 语言标识，如 py、ts，未指定为空字符串 */
  lang: string
  /** 文件名标注，如 ```py+demo.py 中的 demo.py，无则为空字符串 */
  fileName: string
  /** 原始代码文本 */
  text: string
  /** 已高亮的按行片段，供原生 text 渲染 */
  lines: CodeLine[]
}

/** 图片块（整行仅一张图片时） */
export interface ImageBlock {
  type: 'image'
  src: string
  alt: string
}

/** 分割线 */
export interface DividerBlock {
  type: 'divider'
}

/** 表格列对齐方式 */
export type TableAlign = 'left' | 'center' | 'right'

/** 表格块（GFM 管道表格），单元格由行内片段组成 */
export interface TableBlock {
  type: 'table'
  /** 表头单元格 */
  header: InlineSpan[][]
  /** 数据行，每行是若干单元格 */
  rows: InlineSpan[][][]
  /** 每列对齐方式，长度与列数一致 */
  aligns: TableAlign[]
}

/** 折叠面板块（::: details 标题 ... :::），内容可含任意块级节点 */
export interface DetailsBlock {
  type: 'details'
  /** 折叠面板标题 */
  summary: string
  /** 面板内的块级节点 */
  children: MarkdownBlock[]
}

/** 提示框类型（与主站 markdown-it-container callout 保持一致） */
export type CalloutType = 'success' | 'warning' | 'error' | 'info'

/** 提示框块（::: callout success|warning|error|info ... :::），内容可含任意块级节点 */
export interface CalloutBlock {
  type: 'callout'
  /** 提示框类型，决定配色与图标 */
  variant: CalloutType
  /** 框内的块级节点 */
  children: MarkdownBlock[]
}

/**
 * 外链卡片块。
 * - big（::: card url | title | description | image）：带封面 / 描述的大卡片
 * - simple（::: simple-card url | title）：仅标题 + 链接的小卡片
 */
export interface CardBlock {
  type: 'card'
  variant: 'big' | 'simple'
  /** 链接地址 */
  url: string
  /** 标题 */
  title: string
  /** 描述，simple 恒为空 */
  description: string
  /** 封面图，simple 或未提供时为空 */
  image: string
}

/** 轮播图一张幻灯片 */
export interface SwiperSlide {
  /** 图片地址 */
  url: string
  /** 图片标题 / 说明，无则为空字符串 */
  title: string
}

/** 轮播图块（::: swiper，每行 url | title） */
export interface SwiperBlock {
  type: 'swiper'
  slides: SwiperSlide[]
}

/** 瀑布流一张图片 */
export interface WaterfallImage {
  /** 图片地址 */
  url: string
  /** 图片标题 / 说明，无则为空字符串 */
  title: string
}

/** 瀑布流图片块（::: waterfall，每行 url | title） */
export interface WaterfallBlock {
  type: 'waterfall'
  images: WaterfallImage[]
}

/**
 * 音乐播放器块（::: music）。
 * 定位歌曲用 server/mediaType/id 三元组，交给后端 /api/mini/music 取音频数据；
 * 端上只渲染单个播放器（歌单也只播首曲）。
 */
export interface MusicBlock {
  type: 'music'
  /** 音乐平台：netease / tencent / kuwo / kugou 等 */
  server: string
  /** 资源类型：playlist / song / album 等 */
  mediaType: string
  /** 平台内资源 id */
  id: string
}

/**
 * 仓库卡片块（::: repo <github/gitee URL>）。
 * 具体的 star/fork/描述等信息由后端 /api/mini/repo 代理拉取。
 */
export interface RepoBlock {
  type: 'repo'
  /** 平台：github / gitee */
  platform: 'github' | 'gitee'
  /** 仓库所有者 */
  owner: string
  /** 仓库名 */
  repo: string
  /** 原始仓库地址，点击跳转用 */
  url: string
}

export type MarkdownBlock
  = | HeadingBlock
    | ParagraphBlock
    | ListBlock
    | QuoteBlock
    | CodeBlock
    | ImageBlock
    | DividerBlock
    | TableBlock
    | DetailsBlock
    | CalloutBlock
    | CardBlock
    | SwiperBlock
    | WaterfallBlock
    | MusicBlock
    | RepoBlock
