<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { fetchCategoryPosts } from '@/api/category'
import { siteConfig } from '@/site.config'
import type { CategoryPost } from '@/types/category'

const slug = ref('')
const title = ref('分类')
const posts = ref<CategoryPost[]>([])
const total = ref(0)
const page = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const finished = computed(() => page.value >= totalPages.value)

// 是否图片分类：由小程序自行配置的 slug 列表判定，与后端解耦
const isPhoto = computed(() => siteConfig.category.photoCategorySlugs.includes(slug.value))

// 双列瀑布流：按累计高度把文章分到较矮的一列，减少两列落差
const columns = computed(() => {
  const left: CategoryPost[] = []
  const right: CategoryPost[] = []
  let leftH = 0
  let rightH = 0

  for (const post of posts.value) {
    // 用封面宽高比估算相对高度，缺失时按 3:4 竖图估
    const ratio = post.coverWidth && post.coverHeight
      ? post.coverHeight / post.coverWidth
      : 4 / 3

    if (leftH <= rightH) {
      left.push(post)
      leftH += ratio
    }
    else {
      right.push(post)
      rightH += ratio
    }
  }

  return [left, right]
})

async function loadMore() {
  if (loading.value || finished.value) return

  loading.value = true
  try {
    const next = page.value + 1
    const data = await fetchCategoryPosts(slug.value, next, siteConfig.category.pageSize)

    posts.value.push(...data.posts)
    page.value = data.pagination.page
    totalPages.value = data.pagination.totalPages
    total.value = data.pagination.total
  }
  catch (error) {
    console.error(error)
    uni.showToast({ title: '文章加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

onLoad((query) => {
  slug.value = query?.slug ? decodeURIComponent(query.slug) : ''
  if (query?.name) {
    title.value = decodeURIComponent(query.name)
    uni.setNavigationBarTitle({ title: title.value })
  }

  if (!slug.value) {
    uni.showToast({ title: '分类不存在', icon: 'none' })
    return
  }

  loadMore()
})

onReachBottom(() => {
  loadMore()
})

function goArticle(item: CategoryPost) {
  // 图片分类进入时带 photo=1，详情页据此切换为「大图在上、信息在下」的图片版式
  const url = isPhoto.value
    ? `/pages/post/detail?id=${item.id}&photo=1`
    : `/pages/post/detail?id=${item.id}`
  uni.navigateTo({ url })
}

function coverFallback(text: string) {
  return text.trim().charAt(0) || '?'
}

// 加载前的占位高度：以百分比 padding-top 撑起（高/宽），小程序兼容性优于 aspect-ratio。
// 缺失宽高时按 1:1 占位。
function coverRatio(item: CategoryPost) {
  if (item.coverWidth && item.coverHeight) {
    const ratio = (item.coverHeight / item.coverWidth) * 100
    return `${ratio.toFixed(2)}%`
  }
  return '100%'
}
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="title-bar">
      <text class="title-bar__text">
        {{ title }}
      </text>
      <text class="title-bar__sub">
        共 {{ total }} 篇文章
      </text>
    </view>

    <!-- 图片分类：双列封面瀑布流 -->
    <view
      v-if="isPhoto"
      class="waterfall"
    >
      <view
        v-for="(col, ci) in columns"
        :key="ci"
        class="waterfall__col"
      >
        <view
          v-for="item in col"
          :key="item.id"
          class="photo-card"
          @tap="goArticle(item)"
        >
          <view
            v-if="item.cover"
            class="photo-card__frame"
            :style="`padding-top:${coverRatio(item)};`"
          >
            <image
              :src="item.cover"
              mode="aspectFill"
              class="photo-card__img"
            />
          </view>
          <view
            v-else
            class="photo-card__fallback"
          >
            <text class="photo-card__char">
              {{ coverFallback(item.title) }}
            </text>
          </view>

          <!-- 多图角标 -->
          <view
            v-if="item.coverCount > 1"
            class="photo-card__count"
          >
            <wd-icon
              name="picture"
              custom-class="photo-card__count-icon"
            />
            <text class="photo-card__count-text">
              {{ item.coverCount }}
            </text>
          </view>

          <!-- 标题浮层：图片内部下方 -->
          <view class="photo-card__overlay">
            <text class="photo-card__title">
              {{ item.title }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 普通分类：标题列表 -->
    <view
      v-else
      class="post-list"
    >
      <view
        v-for="item in posts"
        :key="item.id"
        class="post-item"
        @tap="goArticle(item)"
      >
        <wd-img
          v-if="item.cover"
          :src="item.cover"
          width="96rpx"
          height="96rpx"
          mode="aspectFill"
          custom-class="post-item__cover"
        />
        <view class="post-item__body">
          <text class="post-item__title">
            {{ item.title }}
          </text>
          <text class="post-item__time">
            {{ item.publishedAt }}
          </text>
        </view>
        <wd-icon
          name="arrow-right"
          size="28rpx"
        />
      </view>
    </view>

    <!-- 加载状态 -->
    <view class="loadmore">
      <text v-if="loading">
        加载中…
      </text>
      <text v-else-if="finished && total > 0">
        没有更多了
      </text>
      <text v-else-if="finished && total === 0">
        该分类暂无文章
      </text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 40rpx;
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

/* ===== 图片分类：瀑布流 ===== */
.waterfall {
  display: flex;
  padding: 32rpx 16rpx 0;
  gap: 20rpx;
}

.waterfall__col {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 20rpx;
}

.photo-card {
  position: relative;
  overflow: hidden;
  border-radius: 22rpx;
  background: var(--card);
  box-shadow: 0 8rpx 24rpx rgb(15 23 42 / 6%);

  &:active {
    opacity: 0.9;
  }
}

/* 图片占位框：用 padding-top 百分比撑出封面比例，加载中为纯色块，不塌陷 */
.photo-card__frame {
  position: relative;
  width: 100%;
  height: 0;
  background: var(--line);
}

.photo-card__img {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.photo-card__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 240rpx;
  background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
}

.photo-card__char {
  font-size: 64rpx;
  font-weight: 800;
  color: #fff;
}

/* 多图角标 */
.photo-card__count {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  display: flex;
  align-items: center;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4rpx);
}

.photo-card__count-text {
  margin-left: 6rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1;
  color: #fff;
}

:deep(.photo-card__count-icon) {
  font-size: 22rpx;
  color: #fff;
}

/* 标题浮层：贴在图片内部底部 */
.photo-card__overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 40rpx 22rpx 20rpx;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.6) 100%);
}

.photo-card__title {
  display: block;
  width: 100%;
  overflow: hidden;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1.4;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 普通分类：标题列表 ===== */
.post-list {
  margin: 32rpx 24rpx 0;
  overflow: hidden;
  border-radius: 22rpx;
  background: var(--card);
  box-shadow: 0 8rpx 24rpx rgb(15 23 42 / 6%);
}

.post-item {
  display: flex;
  align-items: center;
  padding: 28rpx;
  color: var(--muted);

  &:not(:last-child) {
    border-bottom: 1rpx solid var(--line);
  }

  &:active {
    background: var(--line);
  }
}

.post-item__body {
  flex: 1;
  min-width: 0;
}

:deep(.post-item__cover) {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  margin-right: 22rpx;
  overflow: hidden;
  border-radius: 12rpx;
  background: var(--line);
}

.post-item__title {
  display: block;
  overflow: hidden;
  font-size: 29rpx;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-item__time {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--muted);
}

/* ===== 加载状态 ===== */
.loadmore {
  padding: 36rpx 0 16rpx;
  font-size: 24rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 其他 ===== */
.wd-icon-picture {
  font-size: 22rpx;
  color: #fff;
}
</style>
