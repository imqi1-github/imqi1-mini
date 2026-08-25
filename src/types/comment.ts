// 小程序评论树节点类型（与后端 server/types/apis/mini.d.ts 的 MiniComment 对齐）

/** 评论树节点，children 递归嵌套子评论 */
export interface CommentNode {
  /** 评论唯一 id */
  id: number
  /** 评论者昵称 */
  name: string
  /** 评论正文（纯文本，直接展示不解析） */
  content: string
  /** 评论者头像 URL（由 mail 生成的 Gravatar/镜像地址），无邮箱时为空串 */
  avatar: string
  /** 已格式化好的发布时间文本，如 "3 天前" */
  publishedAt: string
  /** 原始发布时间 ISO 字符串 */
  created: string
  /** 父评论作者名，根评论为 null，用作「回复 @某人」展示 */
  parentName: string | null
  /** 子评论，递归结构 */
  children: CommentNode[]
}

/** 提交评论的入参 */
export interface CommentCreatePayload {
  /** 目标文章 id */
  cid: number
  /** 评论者昵称 */
  name: string
  /** 评论正文 */
  content: string
  /** 邮箱（选填，用于头像与回复通知） */
  mail?: string
  /** 个人网址（选填） */
  link?: string
  /** 回复的父评论 id（顶级评论不传） */
  parent_id?: number
}

/** 评论列表响应（含表单必填项设置，跟随主站） */
export interface CommentListResult {
  /** 评论树 */
  data: CommentNode[]
  /** 是否必填邮箱 */
  requireMail: boolean
  /** 是否必填链接 */
  requireLink: boolean
  /** 小程序评论总开关；false 时整个评论区（含输入框）不展示 */
  commentEnabled: boolean
}

/** 提交评论的响应 */
export interface CommentCreateResult {
  /** 是否进入待审核（true 时评论暂不展示，需站长过审） */
  needModeration: boolean
}

/** 上次通过小程序评论时留存的身份信息（本地持久化，用于表单自动带出） */
export interface CommentIdentity {
  /** 昵称 */
  name: string
  /** 邮箱 */
  mail: string
  /** 链接 */
  link: string
}

/**
 * 评论表单共享上下文（页面 provide、表单/评论节点 inject）。
 *
 * 表单需在「评论区顶端」与「被回复评论上方」两处之间移动，若把输入状态放在
 * 表单组件内部，移动时组件卸载/重挂会丢失已输入内容；故状态统一由页面持有并共享。
 */
export interface CommentFormContext {
  /** 表单双向绑定的数据（昵称/邮箱/链接/正文） */
  form: import('vue').Ref<{ name: string, mail: string, link: string, content: string }>
  /** 是否提交中 */
  submitting: import('vue').Ref<boolean>
  /** 是否必填邮箱（跟随主站设置） */
  requireMail: import('vue').Ref<boolean>
  /** 是否必填链接（跟随主站设置） */
  requireLink: import('vue').Ref<boolean>
  /** 当前回复目标；null 表示发表顶级评论（表单挂在评论区顶端） */
  replyTo: import('vue').Ref<CommentNode | null>
  /** 点击某条评论的「回复」，将表单移动到其上方 */
  startReply: (comment: CommentNode) => void
  /** 取消回复，表单回到评论区顶端 */
  cancelReply: () => void
  /** 提交评论 */
  submit: () => void
}

/** 评论区接口的完整响应信封（/mini/comments 原始响应体，含表单必填项与评论开关） */
export interface CommentsEnvelope {
  success: boolean
  message?: string
  data: CommentNode[]
  requireMail: boolean
  requireLink: boolean
  commentEnabled: boolean
}
