<script setup lang="ts">
import type { InlineSpan } from '@/types/markdown'

// 递归渲染行内片段数组。
// 与 utils/markdown.ts 配套：容器型片段（strong / em / strike / link）通过 children 字段
// 嵌套子片段，对应「删除线内嵌链接」「链接内嵌粗体」等主站 markdown-it 支持的语法。
//
// 链接点击通过 open-link 事件抛出；父组件负责实际处理（小程序不能直接打开外链，
// 一般是复制到剪贴板）。
//
// 自引用：靠 defineOptions.name 让编译器在 template 里解析 <inline-span>。
// 父组件 import 后也可直接用 <inline-span :spans="..." @open-link="..." />。
defineOptions({ name: 'InlineSpan' })

defineProps<{
  /** 待渲染的片段数组 */
  spans: InlineSpan[]
}>()

const emit = defineEmits<{
  /** 用户点击链接时触发；参数是 href 原串（未根相对补全） */
  'open-link': [href: string]
}>()

function onLinkTap(href: string) {
  emit('open-link', href)
}
</script>

<template>
  <block
    v-for="(span, si) in spans"
    :key="si"
  >
    <!-- 普通文本：直接渲染 -->
    <text
      v-if="span.type === 'text'"
      class="md-inline md-inline--text"
    >{{ span.text }}</text>

    <!-- 行内代码：保留文本字段，无嵌套 -->
    <text
      v-else-if="span.type === 'code'"
      class="md-inline md-inline--code"
    >{{ span.text }}</text>

    <!-- 粗体：children 递归 -->
    <text
      v-else-if="span.type === 'strong'"
      class="md-inline md-inline--strong"
    >
      <block
        v-for="(child, ci) in span.children"
        :key="ci"
      >
        <inline-span
          :spans="[child]"
          @open-link="onLinkTap"
        />
      </block>
    </text>

    <!-- 斜体：children 递归 -->
    <text
      v-else-if="span.type === 'em'"
      class="md-inline md-inline--em"
    >
      <block
        v-for="(child, ci) in span.children"
        :key="ci"
      >
        <inline-span
          :spans="[child]"
          @open-link="onLinkTap"
        />
      </block>
    </text>

    <!-- 删除线：children 递归（与主站 markdown-it 一致，删除线内嵌链接可点击） -->
    <text
      v-else-if="span.type === 'strike'"
      class="md-inline md-inline--strike"
    >
      <block
        v-for="(child, ci) in span.children"
        :key="ci"
      >
        <inline-span
          :spans="[child]"
          @open-link="onLinkTap"
        />
      </block>
    </text>

    <!-- 链接：children 递归渲染，点击链接本身时复制 href -->
    <text
      v-else-if="span.type === 'link'"
      class="md-inline md-inline--link"
      @tap="onLinkTap(span.href)"
    >
      <block
        v-for="(child, ci) in span.children"
        :key="ci"
      >
        <inline-span
          :spans="[child]"
          @open-link="onLinkTap"
        />
      </block>
    </text>
  </block>
</template>

<style lang="scss">
/* 与主站 markdown-it 渲染出的 HTML 类名对齐，方便样式沿用；
   字号 / 行高由父级 view 决定，本组件不写死，遵循父级节奏。 */

.md-inline {
  word-break: break-word;
}

.md-inline--code {
  padding: 2rpx 10rpx;
  margin: 0 4rpx;
  font-family: var(--code-font-family);
  font-size: 26rpx;
  color: var(--brand-2);
  background: var(--line);
  border-radius: 8rpx;
}

.md-inline--strong {
  font-weight: 700;
}

.md-inline--em {
  font-style: italic;
}

.md-inline--strike {
  text-decoration: line-through;
}

.md-inline--link {
  color: var(--brand);
  text-decoration: underline;
}
</style>