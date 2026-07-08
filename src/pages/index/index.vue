<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchLatestContents } from '@/api/home'
import { siteConfig } from '@/site.config'
import type { ArticleCard } from '@/types/content'

const articles = ref<ArticleCard[]>([])
const loading = ref(true)

function getCoverFallback(title: string) {
  return title.trim().charAt(0) || '?'
}

onLoad(async () => {
  try {
    articles.value = await fetchLatestContents()
  }
  catch (error) {
    console.error(error)
    uni.showToast({ title: '文章加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
})

const goArticle = (a: ArticleCard) => {
  uni.navigateTo({ url: `/pages/content/detail?id=${a.id}` })
}
// 浏览文章：跳转网页版。小程序无法直接打开外部网址，复制链接到剪贴板由用户在浏览器打开。
const goWebsite = () => {
  uni.setClipboardData({
    data: siteConfig.siteUrl,
    success: () => uni.showToast({ title: '网页版链接已复制，请在浏览器打开', icon: 'none' }),
  })
}
// 关于：跳转应用内关于页
const goAbout = () => {
  uni.switchTab({ url: '/pages/about/index' })
}
// 查看全部：跳转归档页
const goArchive = () => {
  uni.switchTab({ url: '/pages/archive/index' })
}
</script>

<template>
  <view class="page">
    <!-- 英雄区：蓝色渐变卡片 -->
    <view class="hero">
      <view class="hero__glow" />
      <view class="hero__bar">
        <view class="brand">
          <view class="brand__dot" />
          <text class="brand__name">
            {{ siteConfig.siteName }}
          </text>
        </view>
      </view>

      <text class="hero__eyebrow">
        {{ siteConfig.home.eyebrow }}
      </text>
      <view class="hero__title">
        <block
          v-for="(line, i) in siteConfig.home.titleLines"
          :key="line"
        >
          {{ line }}<br v-if="i < siteConfig.home.titleLines.length - 1">
        </block>
      </view>
      <text class="hero__sub">
        {{ siteConfig.home.description }}
      </text>

      <view class="hero__actions">
        <wd-button
          type="primary"
          size="medium"
          custom-style="height:72rpx;padding:0 32rpx;background-color:#ffffff;color:#2563eb;border:none;border-radius:999rpx;font-size:26rpx"
          @click="goWebsite"
        >
          {{ siteConfig.home.primaryButton.label }}
        </wd-button>
        <wd-button
          type="primary"
          size="medium"
          custom-style="height:72rpx;padding:0 32rpx;background-color:rgba(255,255,255,0.14);color:#ffffff;border:1px solid rgba(255,255,255,0.55);border-radius:999rpx;font-size:26rpx"
          @click="goAbout"
        >
          {{ siteConfig.home.secondaryButton.label }}
        </wd-button>
      </view>
    </view>

    <!-- 最近发布 -->
    <view class="section">
      <view class="section__head">
        <view class="section__title">
          <text class="section__name">
            最近发布的文章
          </text>
        </view>
        <view
          class="section__more"
          @tap="goArchive"
        >
          <text>查看全部</text>
          <wd-icon
            class-prefix="ri"
            name="arrow-right-s-line"
            custom-class="section__more-icon"
          />
        </view>
      </view>

      <!-- 加载中占位：避免文章返回前下方内容跳动 -->
      <view
        v-if="loading"
        class="state"
      >
        加载中…
      </view>
      <view
        v-else-if="!articles.length"
        class="state"
      >
        还没有文章
      </view>

      <template v-else>
        <view class="grid">
          <view
            v-for="a in articles"
            :key="a.id"
            class="card"
            @tap="goArticle(a)"
          >
            <view class="card__cover">
              <wd-img
                v-if="a.cover"
                :src="a.cover"
                width="100%"
                height="200rpx"
                mode="aspectFill"
              />
              <view
                v-else
                class="card__cover-fallback"
              >
                <text class="card__cover-char">
                  {{ getCoverFallback(a.title) }}
                </text>
              </view>
            </view>
            <view class="card__body">
              <text class="card__title">
                {{ a.title }}
              </text>
              <view class="card__meta">
                <wd-icon
                  class-prefix="ri"
                  name="time-line"
                  custom-class="card__time-icon"
                />
                <text class="card__time">
                  {{ a.publishedAt }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view class="end">
          <view class="end__line" />
          <text class="end__text">
            已经到底啦
          </text>
          <view class="end__line" />
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 英雄区 ===== */
.hero {
  position: relative;
  overflow: hidden;
  margin: 24rpx 24rpx 0;
  padding: 40rpx 36rpx 44rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #4f8cff 0%, #2563eb 100%);
  box-shadow: 0 16rpx 40rpx rgb(37 99 235 / 28%);
  color: #fff;
}

/* 暗色模式：降低英雄区亮度，避免亮蓝在深色页面上过于刺眼 */
@media (prefers-color-scheme: dark) {
  .hero {
    background: linear-gradient(135deg, #2c4a7a 0%, #1b3a63 100%);
    box-shadow: 0 16rpx 40rpx rgb(0 0 0 / 40%);
  }

  .hero__glow {
    background: radial-gradient(circle, rgb(255 255 255 / 10%) 0%, rgb(255 255 255 / 0%) 70%);
  }
}

/* 装饰光晕 */
.hero__glow {
  position: absolute;
  top: -120rpx;
  right: -80rpx;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(255 255 255 / 22%) 0%, rgb(255 255 255) 70%);
  pointer-events: none;
}

.hero__bar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
}

.brand__dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #fff;
  margin-right: 14rpx;
}

.brand__name {
  font-size: 32rpx;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
}

.hero__eyebrow {
  position: relative;
  display: block;
  margin-top: 56rpx;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 0.4em;
  color: rgb(255 255 255 / 85%);
}

.hero__title {
  position: relative;
  margin-top: 20rpx;
  font-size: 60rpx;
  font-weight: 800;
  line-height: 1.28;
  letter-spacing: -0.01em;
  color: #fff;
}

.hero__sub {
  position: relative;
  display: block;
  margin-top: 24rpx;
  font-size: 26rpx;
  line-height: 1.7;
  color: rgb(255 255 255 / 82%);
}

.hero__actions {
  position: relative;
  display: flex;
  gap: 24rpx;
  margin-top: 48rpx;
}

/* ===== 最近发布 ===== */
.section {
  padding: 48rpx 24rpx 64rpx;
}

/* 加载 / 空态占位 */
.state {
  padding: 80rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

.section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.section__title {
  display: flex;
  align-items: baseline;
}

.section__name {
  font-size: 36rpx;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.section__more {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: var(--brand);

  text {
    margin-right: 6rpx;
  }
}

:deep(.section__more-icon) {
  font-size: 28rpx;
}

/* ===== 卡片网格 ===== */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.card {
  background: var(--card);
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgb(15 23 42 / 6%);
}

.card__cover {
  position: relative;
  height: 200rpx;
  overflow: hidden;
  background: var(--line);
  line-height: 0;
}

.card__cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: linear-gradient(135deg, rgb(59 130 246 / 16%) 0%, rgb(37 99 235 / 28%) 100%);
}

.card__cover-char {
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
  color: var(--brand);
}

.card__body {
  padding: 20rpx 22rpx 24rpx;
}

.card__title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 27rpx;
  font-weight: 600;
  line-height: 1.45;
  color: var(--ink);
  /* 单行标题也占满两行高度，保证卡片底对齐 */
  min-height: 78rpx;
}

.card__meta {
  display: flex;
  align-items: center;
  margin-top: 14rpx;
  color: var(--muted);
}

.card__time {
  margin-left: 4Frpx;
  font-size: 22rpx;
}

/* wd-icon 在 mp-weixin 下 virtualHost 会丢弃 size 生成的行内 style，
   故字号走 custom-class + :deep（与本项目其他图标一致） */
:deep(.card__time-icon) {
  font-size: 22rpx;
}

/* ===== 底部 ===== */
.end {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 56rpx;
}

.end__line {
  width: 64rpx;
  height: 2rpx;
  background: var(--line);
}

.end__text {
  margin: 0 20rpx;
  font-size: 22rpx;
  letter-spacing: 0.15em;
  color: var(--muted);
}
</style>
