<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchMessagesConfig } from '@/api/messages'
import CommentSection from '@/components/comment-section/comment-section.vue'

// 留言板绑定的文章 id：<=0 表示未配置或加载中，评论区不加载。
const postId = ref(0)
const loading = ref(true)
const error = ref('')
// 小程序评论总开关关闭时，留言页视为不存在（展示 404）
const notFound = ref(false)

onLoad(async () => {
  try {
    const config = await fetchMessagesConfig()
    // 小程序评论关闭：留言页整体下线，按 404 处理
    if (!config.commentEnabled) {
      notFound.value = true
      return
    }
    if (config.postId && config.postId > 0) {
      postId.value = config.postId
    }
    else {
      error.value = '留言板未配置'
    }
  }
  catch (e) {
    console.error(e)
    error.value = e instanceof Error ? e.message : '留言板加载失败'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- 主站关闭评论：留言页不存在 -->
  <view
    v-if="notFound"
    class="notfound"
  >
    <text class="notfound__code">
      404
    </text>
    <text class="notfound__text">
      页面不存在
    </text>
  </view>

  <view
    v-else
    class="page"
  >
    <view class="intro">
      <text class="intro__title">
        留言板
      </text>
      <text class="intro__desc">
        有什么想说的，都可以在这里留言
      </text>
    </view>

    <view
      v-if="loading"
      class="state"
    >
      加载中…
    </view>
    <view
      v-else-if="error"
      class="state"
    >
      {{ error }}
    </view>

    <!-- 评论区与文章详情页完全一致 -->
    <comment-section
      v-else
      :cid="postId"
      title="留言"
    />
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.intro {
  padding: 40rpx 40rpx 24rpx;
  background: var(--card);
  border-bottom: 1rpx solid var(--line);
}

.intro__title {
  display: block;
  font-size: 46rpx;
  font-weight: 800;
  color: var(--ink);
}

.intro__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--muted);
}

.state {
  padding: 120rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 404 ===== */
.notfound {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg);
}

.notfound__code {
  font-size: 140rpx;
  font-weight: 800;
  line-height: 1;
  color: var(--line);
}

.notfound__text {
  margin-top: 20rpx;
  font-size: 30rpx;
  color: var(--muted);
}
</style>
