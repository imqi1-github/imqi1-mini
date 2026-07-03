import type { InjectionKey } from 'vue'
import type { CommentFormContext } from '@/types/comment'

// 评论表单共享上下文的注入键：页面 provide，comment-form / comment-node 消费。
export const commentFormKey: InjectionKey<CommentFormContext> = Symbol('commentForm')
