import type { LinkItem } from '@/types/link'
import { request } from '@/utils/request'

/** 获取友链与订阅合并后的链接列表（按域名去重，友链优先） */
export function fetchLinks() {
  return request<LinkItem[]>('/links')
}
