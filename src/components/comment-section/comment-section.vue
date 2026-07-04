<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { fetchPostComments, submitComment } from '@/api/comment'
import { commentFormKey } from '@/components/comment-node/context'
import CommentForm from '@/components/comment-form/comment-form.vue'
import CommentNodeItem from '@/components/comment-node/comment-node.vue'
import type { CommentNode } from '@/types/comment'
import { loadCommentIdentity, saveCommentIdentity } from '@/utils/comment-identity'

const props = withDefaults(defineProps<{
  /** 评论所属文章 id；<=0 时不加载（等待父级传入有效值） */
  cid: number
  /** 区块标题 */
  title?: string
}>(), {
  title: '评论',
})

const comments = ref<CommentNode[]>([])
const commentsLoading = ref(false)
// 评论总开关（features.miniComment）：false 时整个评论区（含输入框）不渲染。
// 初始 false，避免进页面先渲染输入框、请求返回关闭后再撤掉造成布局偏移/闪现；
// 确认允许评论后才展示。拉取失败保持 false（宁可不显示，也不闪现）。
const commentEnabled = ref(false)

// ===== 评论表单状态 =====
// 昵称/邮箱/链接本地留存：上次通过小程序成功评论后写入，进入时自动带出。
const savedIdentity = loadCommentIdentity()
const form = ref({
  name: savedIdentity.name,
  mail: savedIdentity.mail,
  link: savedIdentity.link,
  content: '',
})
const submitting = ref(false)
// 表单必填项，跟随主站设置（由评论列表接口返回）
const requireMail = ref(true)
const requireLink = ref(false)
// 当前回复目标：null 为发表顶级评论
const replyTo = ref<CommentNode | null>(null)

// 评论总数（含所有层级子评论），递归累加 children
function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countComments(node.children), 0)
}

const commentTotal = computed(() => countComments(comments.value))

// 评论独立加载：失败静默留空，不打断页面其余内容。
async function loadComments(id: number) {
  if (!id || id <= 0) return
  commentsLoading.value = true
  try {
    const result = await fetchPostComments(id)
    comments.value = result.data
    requireMail.value = result.requireMail
    requireLink.value = result.requireLink
    commentEnabled.value = result.commentEnabled
  }
  catch (e) {
    console.error(e)
    comments.value = []
  }
  finally {
    commentsLoading.value = false
  }
}

// cid 就绪或变化时加载（immediate 覆盖父级同步传入的场景）
watch(() => props.cid, id => loadComments(id), { immediate: true })

// 点「回复」：记录目标评论，表单跟随移动到该评论上方。
function onReply(comment: CommentNode) {
  replyTo.value = comment
}

function cancelReply() {
  replyTo.value = null
}

async function onSubmit() {
  const name = form.value.name.trim()
  const content = form.value.content.trim()
  const mail = form.value.mail.trim()
  const link = form.value.link.trim()

  if (!name) {
    uni.showToast({ title: '请填写昵称', icon: 'none' })
    return
  }
  if (requireMail.value && !mail) {
    uni.showToast({ title: '请填写邮箱', icon: 'none' })
    return
  }
  if (requireLink.value && !link) {
    uni.showToast({ title: '请填写链接', icon: 'none' })
    return
  }
  if (!content) {
    uni.showToast({ title: '请填写评论内容', icon: 'none' })
    return
  }
  if (submitting.value) return

  submitting.value = true
  try {
    const result = await submitComment({
      cid: props.cid,
      name,
      content,
      mail: mail || undefined,
      link: link || undefined,
      parent_id: replyTo.value?.id,
    })

    // 昵称/邮箱/链接留存，下次自动带出
    saveCommentIdentity({ name, mail, link })

    // 清空正文并退出回复态（表单回到评论区顶端）
    form.value.content = ''
    replyTo.value = null

    if (result.needModeration) {
      uni.showToast({ title: '已提交，待审核后展示', icon: 'none' })
    }
    else {
      uni.showToast({ title: '评论成功', icon: 'success' })
      // 已发布评论立即刷新列表
      loadComments(props.cid)
    }
  }
  catch (e) {
    console.error(e)
    uni.showToast({
      title: e instanceof Error ? e.message : '评论失败',
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

// 把表单状态与操作 provide 给 comment-form / comment-node，
// 使表单能在评论区顶端与被回复评论上方之间移动而不丢失输入。
provide(commentFormKey, {
  form,
  submitting,
  requireMail,
  requireLink,
  replyTo,
  startReply: onReply,
  cancelReply,
  submit: onSubmit,
})
</script>

<template>
  <view
    v-if="commentEnabled"
    class="comments"
  >
    <view class="comments__title">
      <text class="comments__title-text">
        {{ title }}
      </text>
      <text
        v-if="commentTotal"
        class="comments__count"
      >
        {{ commentTotal }}
      </text>
    </view>

    <!-- 默认：表单固定在评论区顶端；回复时移动到目标评论上方 -->
    <comment-form v-if="!replyTo" />

    <view
      v-if="commentsLoading"
      class="comments__state"
    >
      评论加载中…
    </view>
    <view
      v-else-if="!comments.length"
      class="comments__state"
    >
      还没有评论，来说两句吧
    </view>
    <view
      v-else
      class="comments__list"
    >
      <comment-node-item
        v-for="item in comments"
        :key="item.id"
        :comment="item"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.comments {
  padding: 32rpx 40rpx;
  margin-top: 20rpx;
  background: var(--card);
}

.comments__title {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.comments__title-text {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
}

.comments__count {
  font-size: 24rpx;
  color: var(--muted);
}

.comments__state {
  padding: 48rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

.comments__list {
  margin-top: 8rpx;
}
</style>
