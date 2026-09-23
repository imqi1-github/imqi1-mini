<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'

import { siteConfig } from '@/site.config'

// CSS 变量注入点：把 siteConfig.codeFont.stack 绑到 page 元素的 --code-font-family，
// 全局 .md-inline--code / .md-code__token 都引用这个变量。fork 用户改字体只改 site.config.ts。
const codeFontStack = siteConfig.codeFont.stack

onLaunch(() => {
  // 小程序启动
})
onShow(() => {
  // 切入前台
})
onHide(() => {
  // 切入后台
})
</script>

<style lang="scss">
/* Remix Icon 子集（base64 内联，供 wd-icon class-prefix="ri" 使用）。
   小程序真机不能用相对路径加载本地字体，故内联；新增图标改 scripts/subset-remixicon.py 后重跑。 */
@import '@/static/icon/remixicon-subset.css';

/* 全局样式：每个页面公共 css */
page {
  /* wot-design-uni 主题色覆盖：现代蓝 */
  --wot-color-theme: #3b82f6;

  /* 现代设计 token（浅色） */
  --bg: #f5f7fa; /* 冷调浅灰页面底 */
  --ink: #0f172a; /* 近黑正文 */
  --muted: #94a3b8; /* 次要文字 */
  --line: #eef1f6; /* 分割线 / 封面占位底 */
  --brand: #3b82f6; /* 主蓝 */
  --brand-2: #2563eb; /* 深蓝（渐变终点） */
  --card: #ffffff;
  --code-bg: #0f172a; /* 代码块深底 */
  --code-ink: #e2e8f0; /* 代码块浅字 */
  /* 代码字体栈：值来自 site.config.ts 的 codeFont.stack；loadFontFace 按同字段
     codeFont.family 注册。改字体只需改 site.config.ts 一处（family / stack / url 三者配套）。
     例外：markdown-nodes.vue 的 .md-code__lang / .md-code__file 故意直接写
     'SFMono-Regular' 紧凑系统等宽字体栈——这两处是代码块头部的「语言标签」
     与「文件名」装饰，与代码正文混用 Nerd Font 字距偏宽、视觉臃肿。 */
  --code-font-family: v-bind(codeFontStack);

  background-color: var(--bg);
  color: var(--ink);
}

/* 宽屏/平板适配：给各页面根容器限宽居中。
   用逻辑 px（非 rpx，避免 rpx 在宽屏随屏幕等比放大）做上限——只有当屏幕逻辑宽 >750px 时
   max-width 才生效，手机（<750）保持全宽不受影响；宽屏时内容收敛到合理阅读宽并居中、两侧留白，
   避免 rpx 放大后内容铺满整屏、行幅/列幅过宽。 */
.page {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
}

/* 暗色模式：跟随系统。仅覆盖设计 token，走 var() 的表面色自动适配。 */
@media (prefers-color-scheme: dark) {
  page {
    --bg: #0f1115; /* 深页面底 */
    --ink: #e5e7eb; /* 浅正文 */
    --muted: #7c8899; /* 次要文字（略提亮以保可读） */
    --line: #232833; /* 分割线 / 封面占位底 */
    --brand: #60a5fa; /* 主蓝（暗底提亮） */
    --brand-2: #3b82f6;
    --card: #171a21; /* 卡片，略高于页面底 */
    --code-bg: #05070b; /* 代码块比页面底更深，保留层次 */
    --code-ink: #e2e8f0;
  }
}
</style>
