import type { PostDetail } from '@/types/post'
import { request } from '@/utils/request'

/** 获取文章详情（content 为 Markdown 原文） */
export function fetchPostDetail(id: number) {
  return request<PostDetail>(`/post/${id}`)
}
