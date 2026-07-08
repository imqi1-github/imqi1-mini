import type { ArticleCard } from '@/types/content'
import { request } from '@/utils/request'

export function fetchLatestContents() {
  return request<ArticleCard[]>('/latest-contents')
}
