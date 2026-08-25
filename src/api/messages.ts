import { request } from '@/utils/request'
import type { MessagesConfig } from '@/types/messages'

/** 获取留言板配置（绑定文章 id 与评论开关），留言区即该文章的评论区 */
export function fetchMessagesConfig() {
  return request<MessagesConfig>('/messages-config')
}
