<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchTravels } from '@/api/travel'
import type { TravelItem, TravelPost } from '@/types/travel'

const travels = ref<TravelItem[]>([])
const loading = ref(true)
const travelCount = computed(() => travels.value.length)

onLoad(async () => {
  try {
    travels.value = await fetchTravels()
  }
  catch (error) {
    console.error(error)
    uni.showToast({ title: '足迹加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
})

function goPost(post: TravelPost) {
  // 图片文章带 photo=1，详情页据此切换为图片版式，与图片分类进入一致
  const url = post.photo
    ? `/pages/post/detail?id=${post.id}&photo=1`
    : `/pages/post/detail?id=${post.id}`
  uni.navigateTo({ url })
}

// 无封面时的兜底文字：取地点名首字
function markOf(item: TravelItem) {
  return item.name.trim().charAt(0) || '📍'
}
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="title-bar">
      <text class="title-bar__text">
        足迹
      </text>
      <text
        v-if="!loading"
        class="title-bar__sub"
      >
        去过 {{ travelCount }} 个地方
      </text>
    </view>

    <!-- 空态 -->
    <view
      v-if="!loading && !travels.length"
      class="empty"
    >
      还没有足迹记录
    </view>

    <!-- 足迹列表 -->
    <view class="travel-list">
      <view
        v-for="item in travels"
        :key="item.id"
        class="travel-card"
      >
        <view class="travel-card__head">
          <view class="travel-card__mark">
            <wd-img
              v-if="item.cover"
              :src="item.cover"
              width="104rpx"
              height="104rpx"
              mode="aspectFill"
              custom-class="travel-card__cover"
            />
            <text
              v-else
              class="travel-card__mark-text"
            >
              {{ markOf(item) }}
            </text>
          </view>
          <view class="travel-card__body">
            <text class="travel-card__title">
              {{ item.name }}
            </text>
            <text
              v-if="item.desc"
              class="travel-card__desc"
            >
              {{ item.desc }}
            </text>
          </view>
        </view>

        <!-- 关联文章 -->
        <view
          v-if="item.posts.length"
          class="travel-card__posts"
        >
          <view
            v-for="post in item.posts"
            :key="post.id"
            class="travel-post"
            @tap="goPost(post)"
          >
            <wd-icon
              class-prefix="ri"
              :name="post.photo ? 'image-line' : 'file-text-line'"
              custom-class="travel-post__icon"
            />
            <text class="travel-post__title">
              {{ post.title }}
            </text>
            <text class="travel-post__arrow">
              ›
            </text>
          </view>
        </view>
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
  padding: 40rpx 24rpx 8rpx;
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

/* ===== 足迹列表 ===== */
.travel-list {
  padding: 40rpx 24rpx 0;
}

.travel-card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  border-radius: 22rpx;
  background: var(--card);
  box-shadow: 0 8rpx 24rpx rgb(15 23 42 / 6%);
}

.travel-card__head {
  display: flex;
  align-items: center;
}

.travel-card__mark {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  margin-right: 24rpx;
  overflow: hidden;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
  box-shadow: 0 10rpx 22rpx rgb(37 99 235 / 22%);
  flex-shrink: 0;
}

.travel-card__mark-text {
  font-size: 40rpx;
  font-weight: 800;
  color: #fff;
}

:deep(.travel-card__cover) {
  display: block;
  width: 104rpx;
  height: 104rpx;
}

.travel-card__body {
  flex: 1;
  min-width: 0;
}

.travel-card__title {
  display: block;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.travel-card__desc {
  display: block;
  overflow: hidden;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 关联文章 ===== */
.travel-card__posts {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid var(--line);
}

.travel-post {
  display: flex;
  align-items: center;
  padding: 16rpx 0;

  &:active {
    opacity: 0.6;
  }
}

:deep(.travel-post__icon) {
  margin-right: 12rpx;
  font-size: 30rpx;
  color: var(--muted);
  flex-shrink: 0;
}

.travel-post__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 27rpx;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.travel-post__arrow {
  margin-left: 12rpx;
  font-size: 32rpx;
  color: var(--muted);
  flex-shrink: 0;
}
</style>
