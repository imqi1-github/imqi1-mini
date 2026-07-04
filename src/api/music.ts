import type { MiniMusicResponse } from '@/types/music'
import { requestFull } from '@/utils/request'

/**
 * 拉取音乐播放数据。后端 /api/mini/music 已解析出每首歌的真实音频/封面/歌词地址，
 * 返回完整歌单（list）；单曲时 list 仅含一首。端上拿到即可直接播放。
 */
export function fetchMusic(server: string, mediaType: string, id: string) {
  const query = `server=${encodeURIComponent(server)}&type=${encodeURIComponent(mediaType)}&id=${encodeURIComponent(id)}`
  return requestFull<MiniMusicResponse>(`/music?${query}`)
}
