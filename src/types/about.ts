// 关于页展示用的内容类型（与后端字段命名保持一致，便于后续替换为真实接口）

/** 关于页：信息条目（标签 + 值，用于博客信息/联系方式列表） */
export interface AboutInfo {
  /** 标签，如「站点名称」「邮箱」 */
  label: string
  /** 值，如「ImQi1」「imqi1@qq.com」 */
  value: string
  /** 图标名（Remix Icon，不含 ri- 前缀，如 window-fill），配合 wd-icon class-prefix="ri" */
  icon: string
  /** 点击行为：copy 复制值到剪贴板；不填则仅展示 */
  action?: 'copy'
}

/** 关于页：技术栈条目（名称 + 品牌 logo） */
export interface TechStackItem {
  /** 技术栈名称，如「Vue 3」 */
  name: string
  /** 品牌 logo 路径（/static/tech/*.svg），用 image 引用以跨端（含 mp-weixin） */
  logo: string
}
