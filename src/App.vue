<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'

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

  background-color: var(--bg);
  color: var(--ink);
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
