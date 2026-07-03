import type { ArchiveMonthGroup } from '@/types/archive'
import { request } from '@/utils/request'

export function fetchArchiveGroups() {
  return request<ArchiveMonthGroup[]>('/archive')
}
