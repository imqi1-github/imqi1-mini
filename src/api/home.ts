import type { ArticleCard } from '@/types/post'
import { request } from '@/utils/request'

export function fetchLatestPosts() {
  return request<ArticleCard[]>('/latest-posts')
}
