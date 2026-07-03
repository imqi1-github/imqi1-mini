import type { MiniMusic } from '@/types/music'
import { request } from '@/utils/request'

/**
 * 拉取音乐播放数据。后端 /api/mini/music 已解析出真实音频/封面地址，
 * 歌单/单曲只返回第一首，端上拿到即可直接播放。
 */
export function fetchMusic(server: string, mediaType: string, id: string) {
  const query = `server=${encodeURIComponent(server)}&type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(id)}`
  return request<MiniMusic>(`/music?${query}`)
}
