<script setup lang="ts">
import { inject } from 'vue'
import { commentFormKey } from '@/components/comment-node/context'

// 评论输入表单：所有状态来自页面 provide 的共享上下文，
// 因此本组件在「评论区顶端」与「被回复评论上方」之间移动时不会丢失已输入内容。
const ctx = inject(commentFormKey)!
const { form, submitting, requireMail, requireLink, replyTo, cancelReply, submit } = ctx
</script>

<template>
  <view class="comment-form">
    <view
      v-if="replyTo"
      class="comment-form__reply-tip"
    >
      <text class="comment-form__reply-text">
        回复 @{{ replyTo.name }}
      </text>
      <text
        class="comment-form__reply-cancel"
        @tap="cancelReply"
      >
        取消
      </text>
    </view>

    <view class="comment-form__row">
      <input
        v-model="form.name"
        class="comment-form__input"
        placeholder="昵称（必填）"
        placeholder-class="comment-form__ph"
        :maxlength="50"
      >
      <input
        v-model="form.mail"
        class="comment-form__input"
        :placeholder="requireMail ? '邮箱（必填，用于头像）' : '邮箱（选填，用于头像）'"
        placeholder-class="comment-form__ph"
        type="text"
      >
    </view>

    <input
      v-model="form.link"
      class="comment-form__input comment-form__input--block"
      :placeholder="requireLink ? '网址（必填）' : '网址（选填）'"
      placeholder-class="comment-form__ph"
      type="text"
    >

    <textarea
      v-model="form.content"
      class="comment-form__textarea"
      :placeholder="replyTo ? `回复 @${replyTo.name}…` : '写下你的评论…'"
      placeholder-class="comment-form__ph"
      :maxlength="5000"
      auto-height
    />

    <button
      class="comment-form__submit"
      :class="{ 'comment-form__submit--disabled': submitting }"
      :loading="submitting"
      :disabled="submitting"
      @tap="submit"
    >
      {{ submitting ? '提交中…' : '发表评论' }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
.comment-form {
  padding-top: 24rpx;
  margin-top: 24rpx;
  border-top: 1rpx solid var(--line);
}

.comment-form__reply-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 20rpx;
  margin-bottom: 16rpx;
  background: var(--line);
  border-radius: 10rpx;
}

.comment-form__reply-text {
  font-size: 24rpx;
  color: var(--brand);
}

.comment-form__reply-cancel {
  font-size: 24rpx;
  color: var(--muted);
}

.comment-form__row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.comment-form__input {
  flex: 1;
  min-width: 0;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: var(--ink);
  background: var(--bg);
  border: 1rpx solid var(--line);
  border-radius: 10rpx;
}

.comment-form__input--block {
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin-bottom: 16rpx;
}

.comment-form__textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: var(--ink);
  background: var(--bg);
  border: 1rpx solid var(--line);
  border-radius: 10rpx;
}

.comment-form__ph {
  color: var(--muted);
}

.comment-form__submit {
  margin-top: 20rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: var(--brand);
  border-radius: 12rpx;

  &::after {
    border: none;
  }

  &--disabled {
    opacity: 0.6;
  }
}
</style>
