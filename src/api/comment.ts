import type { CommentCreatePayload, CommentCreateResult, CommentListResult, CommentNode } from '@/types/comment'
import { post, requestFull } from '@/utils/request'

interface CommentsEnvelope {
  success: boolean
  message?: string
  data: CommentNode[]
  requireMail: boolean
  requireLink: boolean
  commentEnabled: boolean
}

/** 获取某篇文章的评论树及表单必填项设置（仅审核通过的评论，后端已构建为嵌套结构） */
export async function fetchPostComments(cid: number): Promise<CommentListResult> {
  const res = await requestFull<CommentsEnvelope>(`/comments?cid=${cid}`)
  return {
    data: res.data,
    requireMail: res.requireMail,
    requireLink: res.requireLink,
    commentEnabled: res.commentEnabled,
  }
}

/** 提交评论（顶级或回复）；needModeration 为 true 表示进入待审核、暂不展示 */
export function submitComment(payload: CommentCreatePayload) {
  return post<CommentCreateResult>('/comments', payload)
}
