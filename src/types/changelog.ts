// 更新日志展示用类型（数据来自主站 /api/mini/changelogs）

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
