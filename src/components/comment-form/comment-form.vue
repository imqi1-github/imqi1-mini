<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { commentFormKey } from '@/components/comment-node/context'

// 评论输入表单：所有状态来自页面 provide 的共享上下文，
// 因此本组件在「评论区顶端」与「被回复评论上方」之间移动时不会丢失已输入内容。
const ctx = inject(commentFormKey)!
const { form, submitting, requireMail, requireLink, replyTo, cancelReply, submit } = ctx

// 原生 <textarea> 首帧按默认窄几何渲染，占位符会逐字竖排、下一帧才横排。
// 故首帧占位符置空（无竖排可闪），下一帧再填——仍是直连 textarea，无占位 view。
const placeholderReady = ref(false)
onMounted(() => {
  setTimeout(() => { placeholderReady.value = true }, 0)
})

// 原生 <textarea>：直接渲染（不再用「占位 view + 延迟挂载」；稳定态高度由 CSS 固定收敛）
// 占位文案：普通态/回复态跟随 replyTo，与 textarea 的 :placeholder 保持一致。
const placeholderText = computed(() => replyTo.value ? `回复 @${replyTo.value.name}…` : '写下你的评论…')
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

    <!-- 原生 <textarea>：直接渲染（不再用占位 view / 延迟挂载；稳定态高度由 CSS 固定收敛） -->
    <textarea
      v-model="form.content"
      class="comment-form__textarea"
      :placeholder="placeholderReady ? placeholderText : ''"
      placeholder-class="comment-form__ph"
      :maxlength="5000"
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
  margin-block: 12rpx;
  margin-top: 24rpx;
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
  height: 180rpx; /* 固定高度：微信 textarea 的 auto-height 在初始无内容时会把高度撑得畸形高、占位符竖排（闪烁），改固定高度避免 */
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
  /* nowrap：原生 textarea 首帧按默认窄几何渲染时，占位符会逐字换行成竖排，下一帧才横排；
     nowrap 让其保持单行（首帧截断），避免「先竖排后横排」的跳变 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
