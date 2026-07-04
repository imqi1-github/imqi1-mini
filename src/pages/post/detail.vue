<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchPostDetail } from '@/api/post'
import CommentSection from '@/components/comment-section/comment-section.vue'
import MarkdownNodes from '@/components/markdown-nodes/markdown-nodes.vue'
import LivePhoto from '@/components/live-photo/live-photo.vue'
import type { PostDetail, PostCategory, PostCover } from '@/types/post'
import type { MarkdownBlock } from '@/types/markdown'
import { parseMarkdown } from '@/utils/markdown'
import { isLivePhoto } from '@/utils/live-photo'

const post = ref<PostDetail | null>(null)
const loading = ref(true)
const error = ref('')
// 是否图片版式：从图片分类进入时 URL 带 photo=1，大图在上、信息在下
const isPhoto = ref(false)
// 满屏封面高度：用系统可用高度而非 100vh，避免把导航栏也算进去导致底部标题被截掉
const heroHeight = ref('100vh')
try {
  const { windowHeight } = uni.getWindowInfo()
  if (windowHeight) heroHeight.value = `${windowHeight}px`
}
catch {}

const postId = ref(0)

const blocks = computed<MarkdownBlock[]>(() =>
  post.value ? parseMarkdown(post.value.content) : [],
)

// 正文是否有内容：为空时头部不显示分隔用的下边框
const hasContent = computed(() => blocks.value.length > 0)

async function load(id: number) {
  loading.value = true
  error.value = ''
  try {
    post.value = await fetchPostDetail(id)
    if (post.value.title) {
      uni.setNavigationBarTitle({ title: post.value.title })
    }
  }
  catch (e) {
    console.error(e)
    error.value = e instanceof Error ? e.message : '文章加载失败'
  }
  finally {
    loading.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (!id || !Number.isInteger(id) || id <= 0) {
    loading.value = false
    error.value = '文章不存在'
    return
  }
  isPhoto.value = query?.photo === '1'
  postId.value = id
  load(id)
})

// 图片版式下用于轮播的封面列表；兜底用首图，避免 covers 为空但有单封面
const galleryCovers = computed<PostCover[]>(() => {
  if (!post.value) return []
  if (post.value.covers.length) return post.value.covers
  return post.value.cover ? [{ url: post.value.cover, title: '' }] : []
})

function previewCover(index: number) {
  const urls = galleryCovers.value.map(item => item.url)
  if (!urls.length) return
  uni.previewImage({ urls, current: urls[index] })
}

function previewImage(src: string) {
  uni.previewImage({ urls: [src], current: src })
}

function goCategory(cat: PostCategory) {
  if (!cat.slug) return
  const url = `/pages/category/detail?slug=${encodeURIComponent(cat.slug)}&name=${encodeURIComponent(cat.name)}`
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="page">
    <!-- 加载 / 错误态 -->
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

    <template v-else-if="post">
      <!-- 图片版式头部：封面占满屏宽在上，标题/描述/分类在下 -->
      <template v-if="isPhoto">
        <!-- 多图轮播 -->
        <swiper
          v-if="galleryCovers.length > 1"
          class="photo-hero"
          :style="{ height: heroHeight }"
          :indicator-dots="true"
          indicator-color="rgba(255,255,255,0.4)"
          indicator-active-color="#fff"
          :circular="true"
        >
          <swiper-item
            v-for="(item, ci) in galleryCovers"
            :key="ci"
          >
            <live-photo
              v-if="isLivePhoto(item.url)"
              class="photo-hero__img"
              :src="item.url"
              :alt="item.title"
              mode="aspectFill"
              :fill="true"
            />
            <image
              v-else
              class="photo-hero__img"
              :src="item.url"
              mode="aspectFill"
              @tap="previewCover(ci)"
            />
            <view
              v-if="item.title"
              class="photo-hero__caption"
            >
              <text class="photo-hero__caption-text">
                {{ item.title }}
              </text>
            </view>
          </swiper-item>
        </swiper>
        <!-- 单图 -->
        <live-photo
          v-else-if="galleryCovers.length === 1 && isLivePhoto(galleryCovers[0].url)"
          class="photo-hero"
          :style="{ height: heroHeight }"
          :src="galleryCovers[0].url"
          :alt="galleryCovers[0].title"
          mode="aspectFill"
          :fill="true"
        />
        <image
          v-else-if="galleryCovers.length === 1"
          class="photo-hero photo-hero__img"
          :style="{ height: heroHeight }"
          :src="galleryCovers[0].url"
          mode="aspectFill"
          @tap="previewCover(0)"
        />

        <view
          class="photo-meta"
          :class="{ 'photo-meta--no-border': !hasContent }"
        >
          <text class="header__title">
            {{ post.title }}
          </text>
          <text
            v-if="post.description"
            class="photo-meta__desc"
          >
            {{ post.description }}
          </text>
          <text class="header__time">
            {{ post.publishedAt }}
          </text>

          <view
            v-if="post.categories.length"
            class="header__cats"
          >
            <text
              v-for="cat in post.categories"
              :key="cat.mid"
              class="cat-tag"
              @tap="goCategory(cat)"
            >
              {{ cat.name }}
            </text>
          </view>
        </view>
      </template>

      <!-- 普通版式头部：封面在标题上方，多图用轮播（尺寸同单封面） -->
      <view
        v-else
        class="header"
        :class="{ 'header--no-border': !hasContent }"
      >
        <!-- 多图轮播 -->
        <swiper
          v-if="galleryCovers.length > 1"
          class="header__cover"
          :indicator-dots="true"
          indicator-color="rgba(255,255,255,0.4)"
          indicator-active-color="#fff"
          :circular="true"
        >
          <swiper-item
            v-for="(item, ci) in galleryCovers"
            :key="ci"
          >
            <live-photo
              v-if="isLivePhoto(item.url)"
              class="header__cover-img"
              :src="item.url"
              :alt="item.title"
              mode="aspectFill"
              :fill="true"
            />
            <image
              v-else
              class="header__cover-img"
              :src="item.url"
              mode="aspectFill"
              @tap="previewCover(ci)"
            />
            <view
              v-if="item.title"
              class="header__cover-caption"
            >
              <text class="header__cover-caption-text">
                {{ item.title }}
              </text>
            </view>
          </swiper-item>
        </swiper>
        <!-- 单图 -->
        <live-photo
          v-else-if="post.cover && isLivePhoto(post.cover)"
          class="header__cover"
          :src="post.cover"
          mode="aspectFill"
          :fill="true"
        />
        <image
          v-else-if="post.cover"
          class="header__cover"
          :src="post.cover"
          mode="aspectFill"
          @tap="previewImage(post.cover)"
        />
        <text class="header__title">
          {{ post.title }}
        </text>
        <text class="header__time">
          {{ post.publishedAt }}
        </text>

        <!-- 所属分类 -->
        <view
          v-if="post.categories.length"
          class="header__cats"
        >
          <text
            v-for="cat in post.categories"
            :key="cat.mid"
            class="cat-tag"
            @tap="goCategory(cat)"
          >
            {{ cat.name }}
          </text>
        </view>
      </view>

      <!-- 正文 -->
      <view
        v-if="hasContent"
        class="content"
      >
        <markdown-nodes :blocks="blocks" />
      </view>

      <!-- 评论区 -->
      <comment-section :cid="postId" />
    </template>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.state {
  padding: 120rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 头部 ===== */
.header {
  padding: 40rpx 40rpx 24rpx;
  background: var(--card);
  border-bottom: 1rpx solid var(--line);
}

.header--no-border {
  border-bottom: none;
}

.header__cover {
  display: block;
  width: 100%;
  height: 320rpx;
  margin-bottom: 28rpx;
  overflow: hidden;
  border-radius: 16rpx;
  background: var(--line);
}

/* 轮播内的图片撑满 swiper 容器 */
.header__cover-img {
  width: 100%;
  height: 100%;
}

/* 轮播封面标题浮层 */
.header__cover-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48rpx 28rpx 20rpx;
  background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 60%) 100%);
}

.header__cover-caption-text {
  display: block;
  overflow: hidden;
  font-size: 24rpx;
  line-height: 1.4;
  color: #fff;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header__title {
  display: block;
  font-size: 46rpx;
  font-weight: 800;
  line-height: 1.35;
  color: var(--ink);
}

.header__time {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: var(--muted);
}

.header__cats {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 24rpx;
}

.cat-tag {
  padding: 8rpx 22rpx;
  font-size: 24rpx;
  line-height: 1.4;
  color: var(--brand);
  background: rgb(59 130 246 / 10%);
  border-radius: 999rpx;

  &:active {
    background: rgb(59 130 246 / 20%);
  }
}

/* ===== 图片版式头部 ===== */
/* 封面占满整个屏幕（沉浸式大图），向下滚动可见标题/描述/分类 */
.photo-hero {
  display: block;
  width: 100%;
  height: 100vh; /* 兜底，实际高度由 :style heroHeight 覆盖 */
  background: var(--line);
}

.photo-hero__img {
  width: 100%;
  height: 100%;
}

/* 满屏封面标题浮层 */
.photo-hero__caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 64rpx 40rpx 40rpx;
  background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 60%) 100%);
}

.photo-hero__caption-text {
  display: block;
  font-size: 28rpx;
  line-height: 1.5;
  color: #fff;
}

.photo-meta {
  padding: 32rpx 40rpx 24rpx;
  background: var(--card);
  border-bottom: 1rpx solid var(--line);
}

.photo-meta--no-border {
  border-bottom: none;
}

.photo-meta__desc {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.7;
  color: var(--muted);
}

/* ===== 正文容器 ===== */
.content {
  padding: 32rpx 40rpx;
  background: var(--card);
}
</style>
