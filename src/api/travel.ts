import type { TravelItem } from '@/types/travel'
import { request } from '@/utils/request'

/** 获取全部足迹（去过的地方及其关联文章） */
export function fetchTravels() {
  return request<TravelItem[]>('/travels')
}
