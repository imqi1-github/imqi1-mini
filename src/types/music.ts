// 小程序音乐播放数据：后端已解析为真实可播放地址（歌单/单曲只取第一首）
export interface MiniMusic {
  /** 歌曲名 */
  name: string
  /** 艺术家，多位以 / 连接 */
  artist: string
  /** 音频真实地址，innerAudioContext 可直接播放 */
  url: string
  /** 封面真实地址，无则为空串 */
  pic: string
  /** 歌词文本（LRC 原文），无则为空串 */
  lrc: string
}
