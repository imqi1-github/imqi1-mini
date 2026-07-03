import type { CategoryItem, CategoryPostsData } from '@/types/category'
import { request } from '@/utils/request'

/** 获取全部分类 */
export function fetchCategories() {
  return request<CategoryItem[]>('/categories')
}

/** 获取某个分类下的文章（分页） */
export function fetchCategoryPosts(slug: string, page: number, pageSize: number) {
  const query = `page=${page}&pageSize=${pageSize}`
  return request<CategoryPostsData>(`/category/${encodeURIComponent(slug)}/posts?${query}`)
}
