import type { ChangelogGroup } from '@/types/changelog'
import { request } from '@/utils/request'

/** 获取更新日志（按月份分组，最新在前），数据源与主站一致 */
export function fetchChangelogs() {
  return request<ChangelogGroup[]>('/changelogs')
}
