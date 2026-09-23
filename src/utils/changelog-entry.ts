import type { EntryBlock, EntryListItem } from '@/types/changelog'
import { parseInline } from '@/utils/markdown'

// 更新日志单条变更内容的块级解析：把多行文本解析成「文本 / 列表」块，
// 列表支持有序（1. 2.）、无序（- * +）与按缩进的嵌套。
// 复用 utils/markdown 的 parseInline 处理行内语法（粗体 / 斜体 / 删除线 / 行内码 / 链接）。

const UNORDERED_RE = /^[-*+]\s+(.*)$/
const ORDERED_RE = /^\d+\.\s+(.*)$/

/** 一行的解析结果：缩进宽度 + 是否列表项 + 内容 */
interface ParsedLine {
  /** 缩进宽度（tab 记 2 空格），非列表行为该行前导空白宽度 */
  indent: number
  /** 列表项才有值：有序 / 无序 */
  ordered: boolean | null
  /** 行内容（列表项去掉标记后的正文；文本行为整行 trim 后文本） */
  content: string
}

/** 计算前导空白宽度，tab 记为 2 */
function leadingWidth(line: string): number {
  let width = 0
  for (const ch of line) {
    if (ch === ' ') width += 1
    else if (ch === '\t') width += 2
    else break
  }
  return width
}

/** 解析单行为 ParsedLine（区分列表项与普通文本行） */
function parseLine(line: string): ParsedLine {
  const indent = leadingWidth(line)
  const trimmed = line.trim()

  const unordered = UNORDERED_RE.exec(trimmed)
  if (unordered) {
    return { indent, ordered: false, content: unordered[1].trim() }
  }
  const ordered = ORDERED_RE.exec(trimmed)
  if (ordered) {
    return { indent, ordered: true, content: ordered[1].trim() }
  }
  return { indent, ordered: null, content: trimmed }
}

/**
 * 从 lines[start] 起构建缩进 >= minIndent 的块级节点，遇到更浅缩进即停止。
 * 返回块数组与消费到的下标。列表项后跟随的更深缩进行递归为其子块（嵌套列表）。
 */
function buildBlocks(
  lines: ParsedLine[],
  start: number,
  minIndent: number,
): { blocks: EntryBlock[], next: number } {
  const blocks: EntryBlock[] = []
  let i = start

  while (i < lines.length) {
    const line = lines[i]

    // 空行跳过（不产出空文本块）
    if (!line.content) {
      i += 1
      continue
    }

    // 缩进比当前层浅：交回上层处理
    if (line.indent < minIndent) break

    // 普通文本行
    if (line.ordered === null) {
      blocks.push({ type: 'text', spans: parseInline(line.content) })
      i += 1
      continue
    }

    // 列表：收集同层（同缩进、同有序性）的连续列表项，深缩进行递归为子块
    const listIndent = line.indent
    const ordered = line.ordered
    const items: EntryListItem[] = []

    while (i < lines.length) {
      const cur = lines[i]
      if (!cur.content) {
        i += 1
        continue
      }
      // 非本层列表项（缩进不同或有序性不同）→ 结束本列表
      if (cur.indent !== listIndent || cur.ordered !== ordered) break

      const spans = parseInline(cur.content)
      i += 1
      // 该项之后更深缩进的行归为其子块（可含嵌套列表 / 文本）
      const { blocks: children, next } = buildBlocks(lines, i, listIndent + 1)
      i = next
      items.push({ spans, children })
    }

    blocks.push({ type: 'list', ordered, items })
  }

  return { blocks, next: i }
}

/** 把一条变更内容解析为块级节点数组 */
export function parseEntryBlocks(value: string): EntryBlock[] {
  const rawLines = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const lines = rawLines.map(parseLine)
  return buildBlocks(lines, 0, 0).blocks
}
