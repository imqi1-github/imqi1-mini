import type { CommentIdentity } from '@/types/comment'

// 小程序评论身份信息本地存储：仅在「通过小程序成功评论」后写入，
// 下次进入评论表单时自动带出昵称/邮箱/链接，免去重复填写。
const IDENTITY_KEY = 'comment_identity'

/** 读取上次留存的评论身份；从未评论过则返回空信息。 */
export function loadCommentIdentity(): CommentIdentity {
  const empty: CommentIdentity = { name: '', mail: '', link: '' }

  try {
    const saved = uni.getStorageSync(IDENTITY_KEY) as Partial<CommentIdentity> | ''
    if (!saved || typeof saved !== 'object') return empty

    return {
      name: saved.name ?? '',
      mail: saved.mail ?? '',
      link: saved.link ?? '',
    }
  }
  catch {
    return empty
  }
}

/** 保存本次评论的身份信息，供下次自动带出。 */
export function saveCommentIdentity(identity: CommentIdentity) {
  try {
    uni.setStorageSync(IDENTITY_KEY, identity)
  }
  catch {
    // 存储失败（如超额）不影响评论主流程，静默忽略。
  }
}
