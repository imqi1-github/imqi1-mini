import type {
  CalloutType,
  ImageBlock,
  InlineSpan,
  ListBlock,
  MarkdownBlock,
  TableAlign,
  TableBlock,
} from '@/types/markdown'
import { highlightCode } from '@/utils/highlight'

// 极简 Markdown 解析器：把原文按行解析成块级节点，供小程序原生组件渲染。
// 有意只支持最基础语法（标题 / 段落 / 列表 / 引用 / 代码块 / 图片 / 分割线，
// 行内支持 粗体 / 斜体 / 行内码 / 链接），复杂语法（表格、嵌套列表、HTML 等）
// 暂不处理，后续按需扩展。

const HEADING_RE = /^(#{1,6})\s+(.*)$/
const UNORDERED_RE = /^[-*+]\s+(.*)$/
const ORDERED_RE = /^\d+\.\s+(.*)$/
const QUOTE_RE = /^>\s?(.*)$/
const DIVIDER_RE = /^(-{3,}|\*{3,}|_{3,})$/
const FENCE_RE = /^```(.*)$/

// 图片三种形态：内联、引用（含折叠 ![alt][]）、快捷 ![label]
const IMAGE_INLINE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/
const IMAGE_REF_RE = /^!\[([^\]]*)\]\[([^\]]*)\]$/
const IMAGE_SHORTCUT_RE = /^!\[([^\]]+)\]$/

// 引用式定义：[label]: url "可选标题"
const REF_DEF_RE = /^\s*\[([^\]]+)\]:\s*(\S+)(?:\s+.*)?$/

// 表格：行需含 |，分隔行形如 |---|:--:|---: 或 ---|---（每列由 - 与可选 : 组成）
const TABLE_ROW_RE = /\|/
const TABLE_SEP_RE = /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/

// 折叠面板容器（markdown-it-container 语法）：::: details 标题 ... :::
const DETAILS_OPEN_RE = /^:::\s*details\s*(.*)$/
// 提示框容器：::: callout success|warning|error|info ... :::
const CALLOUT_OPEN_RE = /^:::\s*callout\s+(success|warning|error|info)\s*$/
// 外链卡片：::: card url | title | description | image  与  ::: simple-card url | title
const CARD_OPEN_RE = /^:::\s*card\s+(.+)$/
const SIMPLE_CARD_OPEN_RE = /^:::\s*simple-card\s+(.+)$/
// 轮播图：::: swiper（容器体每行 url | title）
const SWIPER_OPEN_RE = /^:::\s*swiper\s*$/
// 瀑布流：::: waterfall（容器体每行 url | title）
const WATERFALL_OPEN_RE = /^:::\s*waterfall\s*$/
// 音乐播放器：::: music auto <url> 或 ::: music <type> <server> <id>
const MUSIC_OPEN_RE = /^:::\s*music\s+(.+)$/
// 仓库卡片：::: repo <github/gitee URL>
const REPO_OPEN_RE = /^:::\s*repo\s+(https:\/\/(?:github|gitee)\.com\/\S+)\s*$/
// 实况照片：::: live-photo URL 标题（不做实况交互，抽出图片当普通图片显示）
const LIVE_PHOTO_OPEN_RE = /^:::\s*live-photo\s+(.+)$/
// 视频：::: video <URL>（用原生 <video> 播放）
const VIDEO_OPEN_RE = /^:::\s*video\s+(\S+)\s*$/
const CONTAINER_CLOSE_RE = /^:::\s*$/

/** 收集全文的引用式链接/图片定义，label 统一小写便于查找 */
function collectReferences(lines: string[]): Map<string, string> {
  const refs = new Map<string, string>()
  for (const line of lines) {
    const m = REF_DEF_RE.exec(line)
    if (m) {
      refs.set(m[1].trim().toLowerCase(), m[2])
    }
  }
  return refs
}

/**
 * 归一化图片块：识别实况照片标记（src 尾部 #live 或 alt 内 [live]）。
 * 实况照片保留 src 的 #live 锚点并置 isLive，交给 live-photo 组件做点击播放；
 * 普通图片剥掉 alt 内可能残留的 [live] 标记后原样返回。
 */
function normalizeImage(alt: string, src: string): ImageBlock {
  const isLive = /#live$/i.test(src) || /\[live\]/i.test(alt)
  return {
    type: 'image',
    // 实况照片保留 #live（组件据此拉取内嵌视频）；普通图片无 #live，replace 不影响
    src,
    alt: alt.replace(/\[live\]/gi, '').trim(),
    ...(isLive ? { isLive: true } : {}),
  }
}

/** 尝试把整行解析为图片块（内联 / 引用 / 快捷），无法解析或引用缺失时返回 null */
function matchImage(line: string, refs: Map<string, string>): ImageBlock | null {
  const inline = IMAGE_INLINE_RE.exec(line)
  if (inline) {
    return normalizeImage(inline[1], inline[2])
  }

  const ref = IMAGE_REF_RE.exec(line)
  if (ref) {
    const alt = ref[1]
    // 折叠形式 ![alt][] 用 alt 作为 label
    const label = (ref[2].trim() || alt).trim().toLowerCase()
    const src = refs.get(label)
    return src ? normalizeImage(alt, src) : null
  }

  const shortcut = IMAGE_SHORTCUT_RE.exec(line)
  if (shortcut) {
    const alt = shortcut[1]
    const src = refs.get(alt.trim().toLowerCase())
    return src ? normalizeImage(alt, src) : null
  }

  return null
}

/** 解析行内片段：粗体、斜体、行内码、链接，其余为纯文本 */
export function parseInline(input: string): InlineSpan[] {
  const spans: InlineSpan[] = []
  let rest = input

  // 依次尝试匹配最靠前的一个标记，切出前缀文本，再处理标记本身
  const patterns: { type: InlineSpan['type'], re: RegExp }[] = [
    { type: 'code', re: /`([^`]+)`/ },
    { type: 'strong', re: /\*\*([^*]+)\*\*/ },
    { type: 'em', re: /\*([^*]+)\*/ },
    { type: 'link', re: /\[([^\]]+)\]\(([^)]+)\)/ },
  ]

  while (rest.length > 0) {
    let best: { index: number, len: number, span: InlineSpan } | null = null

    for (const { type, re } of patterns) {
      const m = re.exec(rest)
      if (!m) continue
      if (best && m.index >= best.index) continue

      const span: InlineSpan = type === 'link'
        ? { type, text: m[1], href: m[2] }
        : { type, text: m[1] }

      best = { index: m.index, len: m[0].length, span }
    }

    if (!best) {
      spans.push({ type: 'text', text: rest })
      break
    }

    if (best.index > 0) {
      spans.push({ type: 'text', text: rest.slice(0, best.index) })
    }
    spans.push(best.span)
    rest = rest.slice(best.index + best.len)
  }

  return spans
}

/** 拆分表格一行为若干单元格，去掉首尾的 | 并处理转义的 \| */
function splitTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)

  const cells: string[] = []
  let current = ''
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '|'
      i += 1
      continue
    }
    if (ch === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

/** 由分隔行解析每列对齐方式 */
function parseAligns(sepLine: string): TableAlign[] {
  return splitTableRow(sepLine).map(cell => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    if (left) return 'left'
    return 'left'
  })
}

/** 判断从 index 起是否为表格（当前行含 |，且下一行是分隔行） */
function isTableStart(lines: string[], index: number): boolean {
  const header = lines[index]
  const sep = lines[index + 1]
  if (!header || !sep) return false
  return TABLE_ROW_RE.test(header) && TABLE_SEP_RE.test(sep.trim())
}

/**
 * 从容器开标记的下一行（start）起收集容器体，支持嵌套容器。
 * 返回内容行数组与结束标记后的下标（跳过结束的 :::）。
 */
function collectContainerBody(
  lines: string[],
  start: number,
): { body: string[], next: number } {
  const body: string[] = []
  let depth = 1
  let i = start
  while (i < lines.length) {
    const t = lines[i].trim()
    // 记录嵌套的容器开闭，只有回到 0 层才是本容器的结束标记
    if (/^:::\s*\S/.test(t)) {
      depth += 1
    }
    else if (CONTAINER_CLOSE_RE.test(t)) {
      depth -= 1
      if (depth === 0) {
        i += 1
        break
      }
    }
    body.push(lines[i])
    i += 1
  }
  return { body, next: i }
}

/** 拆分卡片参数：按 | 分段并去空白，如 "url | title | desc | img" */
function splitCardParams(params: string): string[] {
  return params.split('|').map(p => p.trim())
}

/**
 * 解析 :::music 参数为 { server, type, id }，与主站规则一致：
 * - auto <url>：从网易/QQ/酷我/酷狗链接中提取 server/type/id
 * - <type> <server> <id>：直接取三段
 * 无法解析出 id 时返回 null（调用方据此跳过，不产出空播放器）。
 */
function parseMusicParams(params: string): { server: string, mediaType: string, id: string } | null {
  const parts = params.split(/\s+/).filter(Boolean)
  if (!parts.length) return null

  let server = 'netease'
  let mediaType = 'playlist'
  let id = ''

  if (parts[0] === 'auto' && parts.length >= 2) {
    const url = parts[1]
    // 小程序无 URL 构造器保证，但 H5/新基础库均支持；用正则兜底提取 host/path/id
    const hostMatch = /^https?:\/\/([^/]+)/i.exec(url)
    const host = hostMatch ? hostMatch[1] : ''
    const idMatch = /[?&]id=([^&]+)/.exec(url)
    const typeMatch = /\/(playlist|song|album|artist)\b/.exec(url)

    if (host.includes('music.163.com')) {
      server = 'netease'
      if (typeMatch) mediaType = typeMatch[1]
      id = idMatch ? idMatch[1] : ''
    }
    else if (host.includes('y.qq.com')) {
      server = 'tencent'
      const tMatch = /\/(playlist|songDetail|albumDetail)\b/.exec(url)
      if (tMatch) mediaType = tMatch[1].replace('Detail', '')
      const tailMatch = /\/([^/?#]+)(?:[?#]|$)/.exec(url)
      id = tailMatch ? tailMatch[1] : ''
    }
    else if (host.includes('kuwo.cn')) {
      server = 'kuwo'
      if (typeMatch) mediaType = typeMatch[1]
      const tailMatch = /\/([^/?#]+)(?:[?#]|$)/.exec(url)
      id = tailMatch ? tailMatch[1] : ''
    }
    else if (host.includes('kugou.com')) {
      server = 'kugou'
      if (typeMatch) mediaType = typeMatch[1]
      const tailMatch = /\/([^/?#]+)\.html/.exec(url)
      id = tailMatch ? tailMatch[1] : ''
    }
  }
  else if (parts.length >= 3) {
    // <type> <server> <id>
    mediaType = parts[0]
    server = parts[1]
    id = parts[2]
  }

  return id ? { server, mediaType, id } : null
}

/**
 * 解析 :::repo 的仓库 URL 为 { platform, owner, repo }。
 * 支持 github.com / gitee.com；无法解析出 owner/repo 时返回 null。
 */
function parseRepoUrl(url: string): { platform: 'github' | 'gitee', owner: string, repo: string } | null {
  let platform: 'github' | 'gitee' | null = null
  if (url.includes('github.com')) platform = 'github'
  else if (url.includes('gitee.com')) platform = 'gitee'
  if (!platform) return null

  const m = new RegExp(`${platform}\\.com/([^/\\s]+)/([^/\\s]+)`).exec(url)
  if (!m) return null
  const owner = m[1]
  const repo = m[2].replace(/\.git$/, '')
  return owner && repo ? { platform, owner, repo } : null
}

/** 把 Markdown 原文解析为块级节点数组 */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  // 引用式定义在全文范围收集，供内联/图片查找
  const refs = collectReferences(lines)
  return parseBlocks(lines, refs)
}

/** 解析一组行为块级节点数组（可被折叠面板等容器递归调用） */
function parseBlocks(lines: string[], refs: Map<string, string>): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []

  let i = 0
  let paragraph: string[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join(' ').trim()
    if (text) {
      blocks.push({ type: 'paragraph', spans: parseInline(text) })
    }
    paragraph = []
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // 空行：结束当前段落
    if (!trimmed) {
      flushParagraph()
      i += 1
      continue
    }

    // 引用式定义行：仅用于收集，不参与渲染，直接跳过
    if (REF_DEF_RE.test(line)) {
      i += 1
      continue
    }

    // 折叠面板：::: details 标题 ... :::（内容递归解析，支持嵌套容器）
    const detailsOpen = DETAILS_OPEN_RE.exec(trimmed)
    if (detailsOpen) {
      flushParagraph()
      const summary = detailsOpen[1].trim() || '展开'
      const { body, next } = collectContainerBody(lines, i + 1)
      i = next
      blocks.push({
        type: 'details',
        summary,
        children: parseBlocks(body, refs),
      })
      continue
    }

    // 提示框：::: callout success|warning|error|info ...:::（内容递归解析）
    const calloutOpen = CALLOUT_OPEN_RE.exec(trimmed)
    if (calloutOpen) {
      flushParagraph()
      const variant = calloutOpen[1] as CalloutType
      const { body, next } = collectContainerBody(lines, i + 1)
      i = next
      blocks.push({
        type: 'callout',
        variant,
        children: parseBlocks(body, refs),
      })
      continue
    }

    // 大链接卡片：::: card url | title | description | image（容器体忽略）
    const cardOpen = CARD_OPEN_RE.exec(trimmed)
    if (cardOpen && !SIMPLE_CARD_OPEN_RE.test(trimmed)) {
      flushParagraph()
      const [url = '', title = '标题', description = '', image = ''] = splitCardParams(cardOpen[1])
      i = collectContainerBody(lines, i + 1).next
      blocks.push({ type: 'card', variant: 'big', url, title, description, image })
      continue
    }

    // 小链接卡片：::: simple-card url | title（容器体忽略）
    const simpleCardOpen = SIMPLE_CARD_OPEN_RE.exec(trimmed)
    if (simpleCardOpen) {
      flushParagraph()
      const [url = '', title = '链接标题'] = splitCardParams(simpleCardOpen[1])
      i = collectContainerBody(lines, i + 1).next
      blocks.push({ type: 'card', variant: 'simple', url, title, description: '', image: '' })
      continue
    }

    // 轮播图：::: swiper（容器体每行 url | title，空行忽略）
    if (SWIPER_OPEN_RE.test(trimmed)) {
      flushParagraph()
      const { body, next } = collectContainerBody(lines, i + 1)
      i = next
      const slides = body
        .map(l => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [url = '', title = ''] = splitCardParams(l)
          return { url, title }
        })
        .filter(slide => slide.url)
      // 无有效图片则整体跳过，不产出空轮播
      if (slides.length) {
        blocks.push({ type: 'swiper', slides })
      }
      continue
    }

    // 瀑布流：::: waterfall（容器体每行 url | title，空行忽略）
    if (WATERFALL_OPEN_RE.test(trimmed)) {
      flushParagraph()
      const { body, next } = collectContainerBody(lines, i + 1)
      i = next
      const images = body
        .map(l => l.trim())
        .filter(Boolean)
        .map((l) => {
          const [url = '', title = ''] = splitCardParams(l)
          return { url, title }
        })
        .filter(img => img.url)
      // 无有效图片则整体跳过，不产出空瀑布流
      if (images.length) {
        blocks.push({ type: 'waterfall', images })
      }
      continue
    }

    // 音乐播放器：::: music auto <url> 或 ::: music <type> <server> <id>（容器体忽略）
    const musicOpen = MUSIC_OPEN_RE.exec(trimmed)
    if (musicOpen) {
      flushParagraph()
      i = collectContainerBody(lines, i + 1).next
      const parsed = parseMusicParams(musicOpen[1].trim())
      // 解析不出 id 则整体跳过，不产出无效播放器
      if (parsed) {
        blocks.push({ type: 'music', ...parsed })
      }
      continue
    }

    // 仓库卡片：::: repo <github/gitee URL>（容器体忽略）
    const repoOpen = REPO_OPEN_RE.exec(trimmed)
    if (repoOpen) {
      flushParagraph()
      i = collectContainerBody(lines, i + 1).next
      const parsedRepo = parseRepoUrl(repoOpen[1].trim())
      // 解析不出 owner/repo 则整体跳过，不产出无效卡片
      if (parsedRepo) {
        blocks.push({ type: 'repo', url: repoOpen[1].trim(), ...parsedRepo })
      }
      continue
    }

    // 实况照片：::: live-photo URL 标题（保留实况标记，交给 live-photo 组件点击播放）
    const livePhotoOpen = LIVE_PHOTO_OPEN_RE.exec(trimmed)
    if (livePhotoOpen) {
      flushParagraph()
      i = collectContainerBody(lines, i + 1).next
      const [src = '', ...captionParts] = livePhotoOpen[1].trim().split(/\s+/)
      if (src) {
        blocks.push({ type: 'image', src, alt: captionParts.join(' ').trim(), isLive: true })
      }
      continue
    }

    // 视频：::: video <URL>（容器体忽略，用原生 <video> 播放）
    const videoOpen = VIDEO_OPEN_RE.exec(trimmed)
    if (videoOpen) {
      flushParagraph()
      i = collectContainerBody(lines, i + 1).next
      const src = videoOpen[1].trim()
      if (src) {
        blocks.push({ type: 'video', src })
      }
      continue
    }

    // 代码块：```lang 到下一个 ```
    // fence info 支持 ```py 与 ```py+demo.py（+ 后为文件名标注）两种写法
    const fence = FENCE_RE.exec(trimmed)
    if (fence) {
      flushParagraph()
      const info = fence[1].trim()
      const plusIndex = info.indexOf('+')
      const lang = (plusIndex >= 0 ? info.slice(0, plusIndex) : info).trim()
      const fileName = plusIndex >= 0 ? info.slice(plusIndex + 1).trim() : ''
      const codeLines: string[] = []
      i += 1
      while (i < lines.length && !FENCE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i += 1
      }
      i += 1 // 跳过结束的 ```
      const text = codeLines.join('\n')
      blocks.push({
        type: 'code',
        lang,
        fileName,
        text,
        lines: highlightCode(text, lang),
      })
      continue
    }

    // 分割线
    if (DIVIDER_RE.test(trimmed)) {
      flushParagraph()
      blocks.push({ type: 'divider' })
      i += 1
      continue
    }

    // 标题
    const heading = HEADING_RE.exec(trimmed)
    if (heading) {
      flushParagraph()
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        spans: parseInline(heading[2].trim()),
      })
      i += 1
      continue
    }

    // 整行图片（内联 / 引用 / 快捷）
    const image = matchImage(trimmed, refs)
    if (image) {
      flushParagraph()
      blocks.push(image)
      i += 1
      continue
    }

    // 表格（表头行 + 分隔行 + 若干数据行）
    if (isTableStart(lines, i)) {
      flushParagraph()
      const header = splitTableRow(lines[i]).map(cell => parseInline(cell))
      const aligns = parseAligns(lines[i + 1])
      i += 2

      const rows: InlineSpan[][][] = []
      while (i < lines.length && lines[i].trim() && TABLE_ROW_RE.test(lines[i])) {
        rows.push(splitTableRow(lines[i]).map(cell => parseInline(cell)))
        i += 1
      }

      const table: TableBlock = { type: 'table', header, rows, aligns }
      blocks.push(table)
      continue
    }

    // 引用（连续 > 行合并为一块）
    if (QUOTE_RE.test(trimmed)) {
      flushParagraph()
      const quoteLines: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i].trim())) {
        quoteLines.push(QUOTE_RE.exec(lines[i].trim())![1])
        i += 1
      }
      blocks.push({ type: 'quote', spans: parseInline(quoteLines.join(' ').trim()) })
      continue
    }

    // 列表（连续同类行合并为一块）
    const isUnordered = UNORDERED_RE.test(trimmed)
    const isOrdered = ORDERED_RE.test(trimmed)
    if (isUnordered || isOrdered) {
      flushParagraph()
      const ordered = isOrdered
      const items: InlineSpan[][] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        const m = ordered ? ORDERED_RE.exec(t) : UNORDERED_RE.exec(t)
        if (!m) break
        items.push(parseInline(m[1].trim()))
        i += 1
      }
      const block: ListBlock = { type: 'list', ordered, items }
      blocks.push(block)
      continue
    }

    // 其余：累积到段落
    paragraph.push(trimmed)
    i += 1
  }

  flushParagraph()
  return blocks
}
