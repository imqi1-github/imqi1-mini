<script setup lang="ts">
import { computed, inject } from 'vue'
import { commentFormKey } from '@/components/comment-node/context'
import CommentForm from '@/components/comment-form/comment-form.vue'
import type { CommentNode } from '@/types/comment'

// 递归评论节点：自身在模板里再引用 <comment-node> 渲染 children。
// 自引用靠下方 defineOptions 的 name（CommentNode → kebab: comment-node）解析，
// 是 Vue 内建的递归组件机制，不依赖 easycom autoscan（父页面则需显式 import 本组件）。
defineOptions({ name: 'CommentNode' })

const props = defineProps<{
  /** 当前评论节点 */
  comment: CommentNode
  /** 嵌套层级，0 为根评论；用于控制缩进，超过阈值后不再加深 */
  depth?: number
}>()

// 表单共享上下文（页面 provide）：点「回复」把表单移动到本节点上方。
const ctx = inject(commentFormKey)!

// 表单是否应挂在本节点上方：当前回复目标正是本条评论。
const showFormHere = computed(() => ctx.replyTo.value?.id === props.comment.id)
</script>

<template>
  <view class="comment">
    <view class="comment__main">
      <image
        v-if="comment.avatar"
        class="comment__avatar"
        :src="comment.avatar"
        mode="aspectFill"
      />
      <view
        v-else
        class="comment__avatar comment__avatar--fallback"
      >
        <text class="comment__avatar-text">
          {{ comment.name.charAt(0) || '匿' }}
        </text>
      </view>

      <view class="comment__body">
        <view class="comment__head">
          <text class="comment__name">
            {{ comment.name }}
          </text>
          <text
            v-if="comment.parentName"
            class="comment__reply"
          >
            回复 @{{ comment.parentName }}
          </text>
          <text class="comment__time">
            {{ comment.publishedAt }}
          </text>
          <text
            class="comment__action"
            @tap="ctx.startReply(comment)"
          >
            回复
          </text>
        </view>
        <text class="comment__content">
          {{ comment.content }}
        </text>
      </view>
    </view>

    <!-- 回复本条评论时，表单跟随到该评论下方 -->
    <comment-form v-if="showFormHere" />

    <!-- 子评论：递归渲染，层级 +1 -->
    <view
      v-if="comment.children.length"
      class="comment__children"
    >
      <comment-node
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :depth="(depth ?? 0) + 1"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.comment {
  &__main {
    display: flex;
    gap: 20rpx;
    padding: 20rpx 0;
  }

  &__avatar {
    flex-shrink: 0;
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: var(--line);
  }

  &__avatar--fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--brand), var(--brand-2));
  }

  &__avatar-text {
    font-size: 28rpx;
    font-weight: 700;
    color: #fff;
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 12rpx;
  }

  &__name {
    font-size: 28rpx;
    font-weight: 700;
    color: var(--ink);
  }

  &__reply {
    font-size: 22rpx;
    color: var(--brand);
  }

  &__time {
    margin-left: auto;
    font-size: 22rpx;
    color: var(--muted);
  }

  &__content {
    display: block;
    font-size: 28rpx;
    line-height: 1.7;
    color: var(--ink);
    word-break: break-word;
    white-space: pre-wrap;
  }

  &__action {
    font-size: 22rpx;
    color: var(--muted);

    &:active {
      color: var(--brand);
    }
  }

  // 子评论区：左侧描边 + 缩进，形成层级感
  &__children {
    padding-left: 24rpx;
    margin-left: 8rpx;
  }
}
</style>
