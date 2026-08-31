<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { commentFormKey } from '@/components/comment-node/context'

// 评论输入表单：所有状态来自页面 provide 的共享上下文，
// 因此本组件在「评论区顶端」与「被回复评论上方」之间移动时不会丢失已输入内容。
const ctx = inject(commentFormKey)!
const { form, submitting, requireMail, requireLink, replyTo, cancelReply, submit } = ctx

// 原生 <textarea> 是微信原生组件：与父级在同一帧插入时，WebView 还没提交最终布局几何，
// 原生层会先按「默认尺寸 + 未定稿宽度」首帧渲染——表现为输入框被拉高、占位符逐字换行（竖排），
// 下一帧布局生效才跳回正常。固定 height 只收敛了稳定态高度，挡不住首帧本身。
// 故把 textarea 延后到本组件挂载后的下一个宏任务再创建（此时父级已排好版），
// 挂载前用同尺寸占位 view 顶住布局，避免「空一瞬再弹入」的跳变感。
const textareaReady = ref(false)
onMounted(() => {
  setTimeout(() => { textareaReady.value = true }, 0)
})

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

    <!-- 原生 <textarea> 延迟挂载：就绪前用同尺寸占位 view 顶住布局，
         消掉原生组件在 WebView 提交布局前首帧「拉高 + 占位符竖排」的闪现 -->
    <view
      v-if="!textareaReady"
      class="comment-form__textarea comment-form__textarea--ph"
    >
      <text
        v-if="form.content"
        class="comment-form__text"
      >
        {{ form.content }}
      </text>
      <text
        v-else
        class="comment-form__ph"
      />
    </view>
    <textarea
      v-else
      v-model="form.content"
      class="comment-form__textarea"
      :placeholder="placeholderText"
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

/* 占位 view：复用 .comment-form__textarea 的尺寸/边框/底色，只在原生 textarea 未就绪的一瞬顶位 */
.comment-form__textarea--ph {
  overflow: hidden;
}

.comment-form__text {
  color: var(--ink);
  white-space: pre-wrap;
  word-break: break-word;
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
