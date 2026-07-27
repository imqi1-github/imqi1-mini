// 评论区表情解析（小程序端）。
//
// 把评论文本里的 :[key] 占位符切成 text/emoji token 数组，供 comment-node 用原生
// <text>/<image> 分段渲染——小程序无 v-html，<text> 又不能嵌套 <image>，只能拆段。
//
// 与 app/utils/emoji.ts 同源约定：占位符 :[heo-微笑] 的括号内容恒等于 emoji key 本身，
// 无需按 `-` 拆前缀，直接用括号内容查 key 即可。
//
// 数据源：@/assets/emojis.json 由 app/assets/emojis.json 同步复制（mini 无跨项目 import
// 能力，tsconfig 仅 include src/；与 mini changelog.ts 手动同步主站常量的惯例一致）。
// 注意 capoo 分类为 .gif、Heo/Cat 为 .png，扩展名不统一，故 path 必须查表而非从 key 推导。

import emojisData from '@/assets/emojis.json'
import { siteConfig } from '@/site.config'
import type { CommentEmojiToken, CommentToken } from '@/types/emoji'

// 表情分类配置（与 shared/emoji-categories 保持一致）。
// dataKey 对应 emojis.json 顶层 key；prefix 既是 key 前缀，也是占位符前缀。
interface EmojiCategoryMeta {
  dataKey: string
  prefix: string
}

const EMOJI_CATEGORIES: EmojiCategoryMeta[] = [
  { dataKey: 'Heo-Sticker', prefix: 'heo-' },
  { dataKey: 'capoo', prefix: '猫猫虫-' },
  { dataKey: 'Cat', prefix: 'cat-' },
]

type EmojiDict = Record<string, string>

function getEmojiDict(dataKey: string): EmojiDict | undefined {
  return (emojisData as Record<string, EmojiDict>)[dataKey]
}

// 扁平查找表：emoji key -> 原始 path（如 /emojis/heo-sticker/微笑.png）。启动时一次性构建。
const EMOJI_PATH_MAP = new Map<string, string>()
for (const cat of EMOJI_CATEGORIES) {
  const dict = getEmojiDict(cat.dataKey)
  if (!dict) continue
  for (const [key, path] of Object.entries(dict)) {
    EMOJI_PATH_MAP.set(key, path)
  }
}

// 去掉 emoji key 的分类前缀，得到显示名（替代脆弱的 String.replace）。
function stripEmojiPrefix(key: string): string {
  for (const cat of EMOJI_CATEGORIES) {
    if (key.startsWith(cat.prefix)) return key.slice(cat.prefix.length)
  }
  return key
}

const ABSOLUTE_RE = /^(https?:)?\/\//i

// 站点根相对路径补全为完整 URL：小程序域名非网站域名，/emojis/... 必须拼上 siteUrl
// 才能加载（与 app/utils/asset publicAsset 语义一致；绝对地址原样返回）。
function resolveAssetUrl(path: string): string {
  if (!path) return ''
  if (ABSOLUTE_RE.test(path)) return path
  if (!path.startsWith('/')) return path
  return `${siteConfig.siteUrl.replace(/\/$/, '')}${path}`
}

const EMOJI_PLACEHOLDER_RE = /:\[([^\]]+)\]/g

/**
 * 把评论文本切成 text/emoji token 数组。
 * 未命中表情表的占位符原样并入文本段（与 app 端「未识别保留 match」一致，绝不丢字）。
 */
export function parseCommentContent(text: string): CommentToken[] {
  if (!text) return []
  // 绝大多数评论不含表情，提前跳过正则，整段返回。
  if (!text.includes(':[')) {
    return [{ type: 'text', value: text }]
  }

  const tokens: CommentToken[] = []
  let last = 0
  for (const match of text.matchAll(EMOJI_PLACEHOLDER_RE)) {
    const key = match[1]
    const start = match.index ?? 0
    // 占位符之前的纯文本段
    if (start > last) {
      tokens.push({ type: 'text', value: text.slice(last, start) })
    }
    const path = EMOJI_PATH_MAP.get(key)
    if (path) {
      const emoji: CommentEmojiToken = {
        type: 'emoji',
        url: resolveAssetUrl(path),
        name: stripEmojiPrefix(key),
      }
      tokens.push(emoji)
    }
    else {
      // 未命中：原样保留占位符文本，绝不丢字
      tokens.push({ type: 'text', value: match[0] })
    }
    last = start + match[0].length
  }
  // 尾部剩余文本
  if (last < text.length) {
    tokens.push({ type: 'text', value: text.slice(last) })
  }
  return tokens
}
