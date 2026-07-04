<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchCategories } from '@/api/category'
import { fetchMessagesConfig } from '@/api/messages'
import type { CategoryItem } from '@/types/category'

const categories = ref<CategoryItem[]>([])
const loading = ref(true)
const categoryCount = computed(() => categories.value.length)
// 小程序评论总开关（features.miniComment）：关闭时隐藏「留言」入口。
// 初始 false，避免进页面先显示留言入口、请求返回关闭后再移除造成闪烁；
// 确认允许后才展示，拉取失败保持 false（宁可不显示，也不闪现）。
const commentEnabled = ref(false)

onLoad(async () => {
  try {
    categories.value = await fetchCategories()
  }
  catch (error) {
    console.error(error)
    uni.showToast({ title: '分类加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }

  // 单独拉评论开关，失败不影响分类展示
  try {
    const config = await fetchMessagesConfig()
    commentEnabled.value = config.commentEnabled
  }
  catch (error) {
    console.error(error)
  }
})

// 无 slug 的分类无法进入详情页，仅提示
function goCategory(item: CategoryItem) {
  if (!item.slug) {
    uni.showToast({ title: '该分类暂不可访问', icon: 'none' })
    return
  }

  uni.navigateTo({
    url: `/pages/category/detail?slug=${encodeURIComponent(item.slug)}&name=${encodeURIComponent(item.name)}`,
  })
}

// 无封面时的兜底文字：取最新一篇文章标题首字，无文章则退回分类名首字
function markOf(item: CategoryItem) {
  const source = item.latestTitle.trim() || item.name.trim()
  return source.charAt(0) || '#'
}

// 分类之外的独立页面入口（当前仅足迹/链接，后续可扩展）
const extraPages = [
  { key: 'travel', title: '足迹', icon: 'location', url: '/pages/travel/index' },
  { key: 'link', title: '链接', icon: 'link', url: '/pages/link/index' },
  { key: 'messages', title: '留言', icon: 'chat', url: '/pages/messages/index' },
  { key: 'changelog', title: '更新日志', icon: 'note', url: '/pages/changelog/index' },
]

// 主站关闭评论时移除「留言」入口
const visiblePages = computed(() =>
  commentEnabled.value ? extraPages : extraPages.filter(p => p.key !== 'messages'),
)

function goPage(url: string) {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="title-bar">
      <text class="title-bar__text">
        分类
      </text>
      <text class="title-bar__sub">
        共 {{ categoryCount }} 个分类
      </text>
    </view>

    <!-- 加载中占位：避免分类返回前下方内容跳动 -->
    <view
      v-if="loading"
      class="state"
    >
      加载中…
    </view>

    <template v-else>
      <!-- 分类列表 -->
      <view class="category-list">
        <view
          v-for="item in categories"
          :key="item.mid"
          class="category-card"
          @tap="goCategory(item)"
        >
          <view class="category-card__mark">
            <wd-img
              v-if="item.cover"
              :src="item.cover"
              width="104rpx"
              height="104rpx"
              mode="aspectFill"
              custom-class="category-card__cover"
            />
            <text
              v-else
              class="category-card__mark-text"
            >
              {{ markOf(item) }}
            </text>
          </view>
          <view class="category-card__body">
            <view class="category-card__head">
              <text class="category-card__title">
                {{ item.name }}
              </text>
              <text class="category-card__count">
                {{ item.postCount }} 篇
              </text>
            </view>
            <text
              v-if="item.desc"
              class="category-card__desc"
            >
              {{ item.desc }}
            </text>
          </view>
        </view>
      </view>

      <!-- 页面入口（分类之外的独立页面，如足迹）：小型卡片 -->
      <view class="section-bar">
        <text class="section-bar__text">
          页面
        </text>
      </view>
      <view class="page-grid">
        <view
          v-for="page in visiblePages"
          :key="page.key"
          class="page-chip"
          @tap="goPage(page.url)"
        >
          <wd-icon
            :name="page.icon"
            custom-class="page-chip__icon"
          />
          <text class="page-chip__title">
            {{ page.title }}
          </text>
        </view>
      </view>
    </template>
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

/* 加载中占位 */
.state {
  padding: 120rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 分类列表 ===== */
.category-list {
  padding: 40rpx 24rpx 0;
}

/* ===== 分节标题（页面入口） ===== */
.section-bar {
  padding: 32rpx 40rpx 0;
}

.section-bar__text {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--ink);
}

/* ===== 页面入口小型卡片 ===== */
.page-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 24rpx 24rpx 40rpx;
}

.page-chip {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 28rpx;
  border-radius: 16rpx;
  background: var(--card);
  box-shadow: 0 6rpx 18rpx rgb(15 23 42 / 5%);

  &:active {
    background: var(--line);
  }
}

:deep(.page-chip__icon) {
  font-size: 36rpx;
  color: var(--brand);
}

.page-chip__title {
  font-size: 27rpx;
  font-weight: 700;
  color: var(--ink);
}

.category-card {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding: 28rpx;
  border-radius: 22rpx;
  background: var(--card);
  box-shadow: 0 8rpx 24rpx rgb(15 23 42 / 6%);
  color: var(--muted);

  &:active {
    background: var(--line);
  }
}

.category-card__mark {
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

.category-card__mark-text {
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #fff;
}

:deep(.category-card__cover) {
  display: block;
  width: 104rpx;
  height: 104rpx;
}

.category-card__body {
  flex: 1;
  min-width: 0;
}

.category-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category-card__title {
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 800;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-card__count {
  margin-left: 16rpx;
  flex-shrink: 0;
  font-size: 23rpx;
  color: var(--brand);
}

.category-card__desc {
  display: block;
  overflow: hidden;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
