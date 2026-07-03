<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchLinks } from '@/api/link'
import type { LinkItem } from '@/types/link'

const links = ref<LinkItem[]>([])
const loading = ref(true)
const linkCount = computed(() => links.value.length)

onLoad(async () => {
  try {
    links.value = await fetchLinks()
  }
  catch (error) {
    console.error(error)
    uni.showToast({ title: '链接加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
})

// 小程序无法直接打开外部网页，点击复制网址。
function copyUrl(item: LinkItem) {
  uni.setClipboardData({
    data: item.url,
    success: () => uni.showToast({ title: '网址已复制', icon: 'none' }),
  })
}

// 无头像时的兜底文字：取昵称首字
function markOf(item: LinkItem) {
  return item.name.trim().charAt(0) || '#'
}
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="title-bar">
      <text class="title-bar__text">
        链接
      </text>
      <text class="title-bar__sub">
        共 {{ linkCount }} 个
      </text>
    </view>

    <!-- 空态 -->
    <view
      v-if="!loading && !links.length"
      class="empty"
    >
      还没有链接
    </view>

    <!-- 两列链接 -->
    <view class="link-grid">
      <view
        v-for="item in links"
        :key="item.key"
        class="link-card"
        @tap="copyUrl(item)"
      >
        <view class="link-card__avatar">
          <wd-img
            v-if="item.avatar"
            :src="item.avatar"
            width="88rpx"
            height="88rpx"
            mode="aspectFill"
            custom-class="link-card__img"
          />
          <text
            v-else
            class="link-card__avatar-text"
          >
            {{ markOf(item) }}
          </text>
        </view>
        <text class="link-card__name">
          {{ item.name }}
        </text>
        <text class="link-card__url">
          {{ item.url }}
        </text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 标题 ===== */
.title-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 40rpx 40rpx 8rpx;
}

.title-bar__text {
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.title-bar__sub {
  padding-bottom: 10rpx;
  font-size: 24rpx;
  color: var(--muted);
}

/* ===== 空态 ===== */
.empty {
  padding: 120rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 两列网格 ===== */
.link-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 40rpx 16rpx 0;
}

.link-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 50%;
  padding: 8rpx;
}

.link-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
}

.link-card__avatar-text {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}

:deep(.link-card__img) {
  display: block;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}

.link-card__name {
  max-width: 100%;
  margin-top: 16rpx;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-card__url {
  max-width: 100%;
  margin-top: 6rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
