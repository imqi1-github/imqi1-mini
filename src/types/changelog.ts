// 更新日志展示用类型（数据来自主站 /api/mini/changelogs）

import type { InlineSpan } from '@/types/markdown'

/** 变更类别，与主站 shared/changelog CHANGELOG_TYPES 保持一致 */
export type ChangelogType = '功能' | '优化' | '修复' | '删除' | '设计' | '新增' | '其他'

/** 单条变更条目 */
export interface ChangelogChange {
  /** 变更类别 */
  type: ChangelogType
  /** 变更内容原文 */
  value: string
}

/** 一条更新日志记录（可含多个变更条目） */
export interface ChangelogLog {
  /** 记录 id */
  id: number
  /** 发布时间 ISO 字符串 */
  createTime: string
  /** 变更条目 */
  entries: ChangelogChange[]
}

/** 按月份分组的更新日志 */
export interface ChangelogGroup {
  year: number
  month: number
  logs: ChangelogLog[]
}

/**
 * 变更内容解析后的块级节点：
 * - text：普通文本行（行内支持粗体 / 斜体 / 行内码 / 链接）
 * - list：有序 / 无序列表，item 可含子列表（嵌套）
 */
export type EntryBlock = EntryTextBlock | EntryListBlock

/** 文本块 */
export interface EntryTextBlock {
  type: 'text'
  spans: InlineSpan[]
}

/** 列表块（有序 / 无序） */
export interface EntryListBlock {
  type: 'list'
  ordered: boolean
  items: EntryListItem[]
}

/** 列表项：一行行内内容 + 可选子块（嵌套列表） */
export interface EntryListItem {
  spans: InlineSpan[]
  children: EntryBlock[]
}
