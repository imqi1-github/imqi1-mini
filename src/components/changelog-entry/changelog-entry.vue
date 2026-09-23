<script setup lang="ts">
import { siteConfig } from '@/site.config'
import InlineSpan from '@/components/inline-span/inline-span.vue'
import type { EntryBlock } from '@/types/changelog'

// 递归渲染更新日志变更内容的块级节点（文本 / 列表，列表可嵌套）。
// 子列表通过自引用本组件渲染 item.children，靠 name 解析递归。
defineOptions({ name: 'ChangelogEntry' })

defineProps<{
  /** 待渲染的块级节点数组 */
  blocks: EntryBlock[]
}>()

// 以 / 开头的根相对链接补全为完整站点地址后复制（小程序无法直接打开外链）
function resolveHref(href: string) {
  if (href.startsWith('/') && !href.startsWith('//') && siteConfig.siteUrl) {
    return siteConfig.siteUrl + href
  }
  return href
}

function openLink(href: string) {
  uni.setClipboardData({
    data: resolveHref(href),
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
}
</script>

<template>
  <block
    v-for="(block, bi) in blocks"
    :key="bi"
  >
    <!-- 文本 -->
    <view
      v-if="block.type === 'text'"
      class="entry-text"
    >
      <inline-span
        :spans="block.spans"
        @open-link="openLink"
      />
    </view>

    <!-- 列表 -->
    <view
      v-else-if="block.type === 'list'"
      class="entry-list"
    >
      <view
        v-for="(item, ii) in block.items"
        :key="ii"
        class="entry-list__item"
      >
        <text class="entry-list__marker">
          {{ block.ordered ? `${ii + 1}.` : '•' }}
        </text>
        <view class="entry-list__body">
          <view class="entry-list__line">
            <inline-span
              :spans="item.spans"
              @open-link="openLink"
            />
          </view>
          <!-- 嵌套子块（子列表 / 文本），递归渲染 -->
          <changelog-entry
            v-if="item.children.length"
            :blocks="item.children"
          />
        </view>
      </view>
    </view>
  </block>
</template>

<style lang="scss" scoped>
/* ===== 文本块 ===== */
.entry-text:not(:last-child) {
  margin-bottom: 10rpx;
}

/* ===== 列表 ===== */
.entry-list__item {
  display: flex;
  align-items: flex-start;
}

.entry-list__item:not(:last-child) {
  margin-bottom: 8rpx;
}

.entry-list__marker {
  flex-shrink: 0;
  min-width: 28rpx;
  margin-right: 28rpx;
  font-size: 27rpx;
  line-height: 1.6;
  color: var(--brand);
}

.entry-list__body {
  flex: 1;
  min-width: 0;
}

/* 子列表相对父项缩进 */
.entry-list__body .entry-list {
  margin-top: 8rpx;
}
</style>