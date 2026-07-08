import type { ContentDetail } from '@/types/content'
import { request } from '@/utils/request'

/** 获取文章详情（content 为 Markdown 原文） */
export function fetchContentDetail(id: number) {
  return request<ContentDetail>(`/content/${id}`)
}
