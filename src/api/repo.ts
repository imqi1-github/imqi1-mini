import type { MiniRepo } from '@/types/repo'
import { request } from '@/utils/request'

/**
 * 拉取仓库卡片信息。后端 /api/mini/repo 代理 GitHub/Gitee API 并归一化，
 * 小程序只需传 platform/owner/repo。
 */
export function fetchRepo(platform: string, owner: string, repo: string) {
  const query = `platform=${encodeURIComponent(platform)}&owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`
  return request<MiniRepo>(`/repo?${query}`)
}
