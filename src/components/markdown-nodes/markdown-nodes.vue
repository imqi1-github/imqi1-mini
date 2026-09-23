<script setup lang="ts">
import { ref, watch } from 'vue'
import { siteConfig } from '@/site.config'
import WaterfallGrid from '@/components/waterfall-grid/waterfall-grid.vue'
import MusicPlayer from '@/components/music-player/music-player.vue'
import RepoCard from '@/components/repo-card/repo-card.vue'
import LivePhoto from '@/components/live-photo/live-photo.vue'
import type { CalloutType, MarkdownBlock } from '@/types/markdown'
import { isLivePhoto } from '@/utils/live-photo'
import { ensureCodeFont } from '@/utils/code-font'

// 递归渲染 Markdown 块级节点。折叠面板（details）的内容再引用 <markdown-nodes>
// 渲染 children，自引用靠下方 defineOptions 的 name 解析（Vue 内建递归组件机制，
// 父页面需显式 import 本组件）。小程序无法用 v-html，故全部用原生 view/text 渲染。
//
// 行内片段（block.spans）已由 utils/markdown.ts 拍平为扁平叶子（cls/href 就位），
// 模板一层 v-for 渲染即可。刻意不用嵌套结构或自定义组件——小程序原生 <text>
// 不能包含 <block> 或自定义组件，此前两条路线（独立组件 / render function）
// 在 mp-weixin 运行时都翻过车，模板 + 扁平 v-for 是唯一稳妥路径。
defineOptions({ name: 'MarkdownNodes' })

const props = defineProps<{
  /** 待渲染的块级节点数组 */
  blocks: MarkdownBlock[]
}>()

// 含代码块时按需加载 Nerd Font 图标字体（否则终端图标显示为豆腐块）。
// ensureCodeFont 幂等，嵌套容器里的代码块在各自层级触发也只会加载一次。
watch(
  () => props.blocks,
  (blocks) => {
    if (blocks.some(b => b.type === 'code')) {
      ensureCodeFont()
    }
  },
  { immediate: true },
)

// 提示框图标（小程序无 svg，用 emoji 表意，配色见 style）
const CALLOUT_ICON: Record<CalloutType, string> = {
  success: '✓',
  warning: '⚠',
  error: '✕',
  info: 'ℹ',
}

// 每个折叠面板的展开状态，用下标标记；默认折叠
const openMap = ref<Record<number, boolean>>({})

function toggleDetails(index: number) {
  openMap.value = { ...openMap.value, [index]: !openMap.value[index] }
}

// 以 / 开头的根相对链接（如 /contents/1）不含域名，直接复制不可用；
// 用配置的网页版站点地址补全为完整地址。// 双斜杠 // 开头（协议相对）与含协议的绝对地址原样返回。
function resolveHref(href: string) {
  if (href.startsWith('/') && !href.startsWith('//') && siteConfig.siteUrl) {
    return siteConfig.siteUrl + href
  }
  return href
}

function openLink(href: string) {
  uni.setClipboardData({
    data: resolveHref(href),
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  })
}

function previewImage(src: string) {
  uni.previewImage({ urls: [src], current: src })
}

// 轮播图预览：传入全部图片与当前点击项
function previewImages(urls: string[], current: string) {
  if (!urls.length) return
  uni.previewImage({ urls, current })
}
</script>

<template>
  <block
    v-for="(block, bi) in blocks"
    :key="bi"
  >
    <!-- 标题 -->
    <view
      v-if="block.type === 'heading'"
      class="md-heading"
      :class="`md-heading--h${block.level}`"
    >
      <text
        v-for="(span, si) in block.spans"
        :key="si"
        class="md-inline"
        :class="span.cls"
        @tap="span.href ? openLink(span.href) : undefined"
      >{{ span.text }}</text>
    </view>

    <!-- 段落 -->
    <view
      v-else-if="block.type === 'paragraph'"
      class="md-paragraph"
    >
      <text
        v-for="(span, si) in block.spans"
        :key="si"
        class="md-inline"
        :class="span.cls"
        @tap="span.href ? openLink(span.href) : undefined"
      >{{ span.text }}</text>
    </view>

    <!-- 引用 -->
    <view
      v-else-if="block.type === 'quote'"
      class="md-quote"
    >
      <text
        v-for="(span, si) in block.spans"
        :key="si"
        class="md-inline"
        :class="span.cls"
        @tap="span.href ? openLink(span.href) : undefined"
      >{{ span.text }}</text>
    </view>

    <!-- 列表 -->
    <view
      v-else-if="block.type === 'list'"
      class="md-list"
    >
      <view
        v-for="(item, ii) in block.items"
        :key="ii"
        class="md-list__item"
      >
        <text class="md-list__marker">
          {{ block.ordered ? `${ii + 1}.` : '•' }}
        </text>
        <view class="md-list__body">
          <text
            v-for="(span, si) in item"
            :key="si"
            class="md-inline"
            :class="span.cls"
            @tap="span.href ? openLink(span.href) : undefined"
          >{{ span.text }}</text>
        </view>
      </view>
    </view>

    <!-- 代码块 -->
    <view
      v-else-if="block.type === 'code'"
      class="md-code"
    >
      <!-- 语言 / 文件名标题栏 -->
      <view
        v-if="block.lang || block.fileName"
        class="md-code__bar"
      >
        <text
          v-if="block.lang"
          class="md-code__lang"
        >
          {{ block.lang }}
        </text>
        <text
          v-if="block.fileName"
          class="md-code__file"
        >
          {{ block.fileName }}
        </text>
      </view>

      <scroll-view
        class="md-code__scroll"
        scroll-x
      >
        <view class="md-code__body">
          <view
            v-for="(codeLine, li) in block.lines"
            :key="li"
            class="md-code__line"
          >
            <!-- token 文本不可换行，否则会引入多余空白破坏代码显示 -->
            <!-- eslint-disable vue/multiline-html-element-content-newline, vue/singleline-html-element-content-newline -->
            <text
              v-for="(token, ti) in codeLine"
              :key="ti"
              class="md-code__token"
              :class="`tok--${token.type}`"
            >{{ token.text }}</text>
            <text v-if="codeLine.length === 0">{{ ' ' }}</text>
            <!-- eslint-enable vue/multiline-html-element-content-newline, vue/singleline-html-element-content-newline -->
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 图片：实况照片用 live-photo 组件（点击播放内嵌视频），普通图片用 image -->
    <live-photo
      v-else-if="block.type === 'image' && block.isLive"
      class="md-image"
      :src="block.src"
      :alt="block.alt"
      mode="widthFix"
      radius="12rpx"
    />
    <image
      v-else-if="block.type === 'image'"
      class="md-image"
      :src="block.src"
      mode="widthFix"
      @tap="previewImage(block.src)"
    />

    <!-- 分割线 -->
    <view
      v-else-if="block.type === 'divider'"
      class="md-divider"
    />

    <!-- 表格 -->
    <scroll-view
      v-else-if="block.type === 'table'"
      class="md-table-scroll"
      scroll-x
    >
      <view class="md-table">
        <!-- 表头 -->
        <view class="md-table__row md-table__row--head">
          <view
            v-for="(cell, ci) in block.header"
            :key="ci"
            class="md-table__cell md-table__cell--head"
            :class="`md-table__cell--${block.aligns[ci] || 'left'}`"
          >
            <text
              v-for="(span, si) in cell"
              :key="si"
              class="md-inline"
              :class="span.cls"
              @tap="span.href ? openLink(span.href) : undefined"
            >{{ span.text }}</text>
          </view>
        </view>

        <!-- 数据行 -->
        <view
          v-for="(row, ri) in block.rows"
          :key="ri"
          class="md-table__row"
        >
          <view
            v-for="(cell, ci) in row"
            :key="ci"
            class="md-table__cell"
            :class="`md-table__cell--${block.aligns[ci] || 'left'}`"
          >
            <text
              v-for="(span, si) in cell"
              :key="si"
              class="md-inline"
              :class="span.cls"
              @tap="span.href ? openLink(span.href) : undefined"
            >{{ span.text }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 折叠面板 -->
    <view
      v-else-if="block.type === 'details'"
      class="md-details"
    >
      <view
        class="md-details__summary"
        @tap="toggleDetails(bi)"
      >
        <text
          class="md-details__arrow"
          :class="{ 'md-details__arrow--open': openMap[bi] }"
        >
          ▶
        </text>
        <text class="md-details__title">
          {{ block.summary }}
        </text>
      </view>
      <view
        v-if="openMap[bi]"
        class="md-details__content"
      >
        <markdown-nodes :blocks="block.children" />
      </view>
    </view>

    <!-- 提示框 -->
    <view
      v-else-if="block.type === 'callout'"
      class="md-callout"
      :class="`md-callout--${block.variant}`"
    >
      <text class="md-callout__icon">
        {{ CALLOUT_ICON[block.variant] }}
      </text>
      <view class="md-callout__body">
        <markdown-nodes :blocks="block.children" />
      </view>
    </view>

    <!-- 大链接卡片 -->
    <view
      v-else-if="block.type === 'card' && block.variant === 'big'"
      class="md-card"
      @tap="openLink(block.url)"
    >
      <image
        v-if="block.image"
        class="md-card__cover"
        :src="block.image"
        mode="aspectFill"
      />
      <view class="md-card__body">
        <view class="md-card__head">
          <text class="md-card__title">
            {{ block.title }}
          </text>
          <text class="md-card__ext">
            ↗
          </text>
        </view>
        <text
          v-if="block.description"
          class="md-card__desc"
        >
          {{ block.description }}
        </text>
        <text class="md-card__url">
          {{ block.url }}
        </text>
      </view>
    </view>

    <!-- 小链接卡片 -->
    <view
      v-else-if="block.type === 'card' && block.variant === 'simple'"
      class="md-simple-card"
      @tap="openLink(block.url)"
    >
      <text class="md-simple-card__title">
        {{ block.title }}
      </text>
      <text class="md-simple-card__url">
        {{ block.url }}
      </text>
      <text class="md-simple-card__ext">
        ↗
      </text>
    </view>

    <!-- 轮播图 -->
    <view
      v-else-if="block.type === 'swiper'"
      class="md-swiper"
    >
      <swiper
        class="md-swiper__box"
        :indicator-dots="block.slides.length > 1"
        indicator-color="rgba(255,255,255,0.4)"
        indicator-active-color="#fff"
        :circular="true"
      >
        <swiper-item
          v-for="(slide, si) in block.slides"
          :key="si"
        >
          <live-photo
            v-if="isLivePhoto(slide.url)"
            class="md-swiper__img"
            :src="slide.url"
            :alt="slide.title"
            mode="aspectFill"
            :fill="true"
          />
          <image
            v-else
            class="md-swiper__img"
            :src="slide.url"
            mode="aspectFill"
            @tap="previewImages(block.slides.map(s => s.url), slide.url)"
          />
          <view
            v-if="slide.title"
            class="md-swiper__caption"
          >
            <text class="md-swiper__caption-text">
              {{ slide.title }}
            </text>
          </view>
        </swiper-item>
      </swiper>
    </view>

    <!-- 瀑布流 -->
    <waterfall-grid
      v-else-if="block.type === 'waterfall'"
      :images="block.images"
    />

    <!-- 音乐播放器 -->
    <music-player
      v-else-if="block.type === 'music'"
      :id="block.id"
      :server="block.server"
      :media-type="block.mediaType"
    />

    <!-- 仓库卡片 -->
    <repo-card
      v-else-if="block.type === 'repo'"
      :platform="block.platform"
      :owner="block.owner"
      :repo="block.repo"
      :url="block.url"
    />

    <!-- 视频：原生 <video> 播放，带控制条 -->
    <view
      v-else-if="block.type === 'video'"
      class="md-video"
    >
      <video
        class="md-video__player"
        :src="block.src"
        :controls="true"
        :show-center-play-btn="true"
        :enable-progress-gesture="true"
        object-fit="contain"
        preload="metadata"
      />
    </view>
  </block>
</template>

<style lang="scss" scoped>
/* ===== 行内样式 ===== */
.md-inline {
  font-size: 30rpx;
  line-height: 1.8;
  color: var(--ink);
  word-break: break-word;
}

.md-inline--strong {
  font-weight: 700;
}

.md-inline--em {
  font-style: italic;
}

.md-inline--strike {
  text-decoration: line-through;
}

.md-inline--code {
  padding: 2rpx 10rpx;
  margin: 0 4rpx;
  font-family: var(--code-font-family);
  font-size: 26rpx;
  color: var(--brand-2);
  background: var(--line);
  border-radius: 8rpx;
}

.md-inline--link {
  color: var(--brand);
  text-decoration: underline;
}

/* 删除线内嵌链接：两个类命中同一 text，text-decoration 单值属性会被
   后定义的 .md-inline--link 覆盖，需显式写叠加值（CSS3 多值简写） */
.md-inline--strike.md-inline--link {
  text-decoration: line-through underline;
}

/* ===== 标题 ===== */
.md-heading {
  margin: 36rpx 0 16rpx;
  font-weight: 700;
  color: var(--ink);
}

.md-heading--h1 { font-size: 44rpx; }
.md-heading--h2 { font-size: 38rpx; }
.md-heading--h3 { font-size: 34rpx; }
.md-heading--h4 { font-size: 32rpx; }
.md-heading--h5 { font-size: 30rpx; }
.md-heading--h6 { font-size: 28rpx; color: var(--muted); }

.md-heading .md-inline {
  font-size: inherit;
  font-weight: inherit;
  line-height: 1.4;
}

/* ===== 段落 ===== */
.md-paragraph {
  margin: 20rpx 0;
}

/* ===== 引用 ===== */
.md-quote {
  padding: 16rpx 24rpx;
  margin: 24rpx 0;
  background: var(--line);
  border-left: 6rpx solid var(--brand);
  border-radius: 0 12rpx 12rpx 0;
}

.md-quote .md-inline {
  color: var(--muted);
}

/* ===== 列表 ===== */
.md-list {
  margin: 20rpx 0;
}

.md-list__item {
  display: flex;
  margin: 10rpx 0;
}

.md-list__marker {
  flex-shrink: 0;
  margin-right: 14rpx;
  font-size: 30rpx;
  line-height: 1.8;
  color: var(--brand);
}

.md-list__body {
  flex: 1;
  min-width: 0;
}

/* ===== 代码块 ===== */
.md-code {
  box-sizing: border-box;
  width: 100%;
  margin: 24rpx 0;
  overflow: hidden;
  background: var(--code-bg);
  border-radius: 14rpx;
}

/* 语言 / 文件名标题栏 */
.md-code__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 24rpx;
  background: rgb(255 255 255 / 6%);
  border-bottom: 1rpx solid rgb(255 255 255 / 8%);
}

.md-code__lang {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 22rpx;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #7dd3fc;
  text-transform: uppercase;
}

.md-code__file {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 22rpx;
  color: #94a3b8;
}

.md-code__scroll {
  box-sizing: border-box;
  width: 100%;
  white-space: nowrap;
}

.md-code__body {
  display: inline-block;
  padding: 24rpx;
}

.md-code__line {
  min-height: 44rpx;
  font-size: 0; /* 消除 inline text 间空白 */
  white-space: pre;
}

.md-code__token {
  font-family: var(--code-font-family);
  font-size: 26rpx;
  line-height: 1.7;
  color: var(--code-ink);
}

/* token 配色（暗色主题） */
.tok--keyword { color: #c792ea; }
.tok--string { color: #c3e88d; }
.tok--comment { color: #607b96; font-style: italic; }
.tok--number { color: #f78c6c; }
.tok--function { color: #82aaff; }
.tok--punctuation { color: #89ddff; }
.tok--plain { color: #e2e8f0; }

/* ===== 图片 ===== */
.md-image {
  width: 100%;
  margin: 24rpx 0;
  border-radius: 12rpx;
}

/* ===== 分割线 ===== */
.md-divider {
  height: 1rpx;
  margin: 40rpx 0;
  background: var(--line);
}

/* ===== 表格 ===== */
.md-table-scroll {
  box-sizing: border-box;
  width: 100%;
  margin: 24rpx 0;
  white-space: nowrap;
}

.md-table {
  display: inline-block;
  min-width: 100%;
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: 12rpx;
}

.md-table__row {
  display: flex;
}

.md-table__row:not(:last-child) {
  border-bottom: 1rpx solid var(--line);
}

.md-table__row--head {
  background: var(--line);
}

.md-table__cell {
  box-sizing: border-box;
  min-width: 180rpx;
  flex: 1;
  padding: 16rpx 22rpx;
}

.md-table__cell:not(:last-child) {
  border-right: 1rpx solid var(--line);
}

.md-table__cell--head .md-inline {
  font-weight: 700;
  color: var(--ink);
}

.md-table__cell--left { text-align: left; }
.md-table__cell--center { text-align: center; }
.md-table__cell--right { text-align: right; }

.md-table__cell .md-inline {
  font-size: 26rpx;
  line-height: 1.6;
}

/* ===== 折叠面板 ===== */
.md-details {
  margin: 24rpx 0;
  overflow: hidden;
  border: 1rpx solid var(--line);
  border-radius: 12rpx;
}

.md-details__summary {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: var(--line);

  &:active {
    opacity: 0.85;
  }
}

.md-details__arrow {
  margin-right: 14rpx;
  font-size: 22rpx;
  color: var(--muted);
  transition: transform 0.2s;
}

.md-details__arrow--open {
  transform: rotate(90deg);
}

.md-details__title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
}

.md-details__content {
  padding: 4rpx 24rpx 20rpx;
  background: var(--card);
}

/* ===== 提示框 ===== */
.md-callout {
  display: flex;
  align-items: flex-start;
  /* 上下留小内边距，靠框内块级节点自身的外边距补足竖向间距，
     避免用 `.md-callout__body :first-child` 这类含通配的后代选择器（微信组件 wxss 禁用）。 */
  padding: 4rpx 24rpx;
  margin: 24rpx 0;
  border: 1rpx solid;
  border-radius: 14rpx;
}

.md-callout__icon {
  flex-shrink: 0;
  /* 与正文首个段落的 margin-top(20rpx) 对齐，避免图标高于首行文字 */
  margin-top: 22rpx;
  margin-right: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.6;
}

.md-callout__body {
  flex: 1;
  min-width: 0;
}

/* 四种配色：成功(绿) / 警告(黄) / 错误(红) / 信息(蓝) */
.md-callout--success {
  background: rgb(34 197 94 / 8%);
  border-color: rgb(34 197 94 / 30%);
}

.md-callout--success .md-callout__icon {
  color: #16a34a;
}

.md-callout--warning {
  background: rgb(234 179 8 / 8%);
  border-color: rgb(234 179 8 / 30%);
}

.md-callout--warning .md-callout__icon {
  color: #ca8a04;
}

.md-callout--error {
  background: rgb(239 68 68 / 8%);
  border-color: rgb(239 68 68 / 30%);
}

.md-callout--error .md-callout__icon {
  color: #dc2626;
}

.md-callout--info {
  background: rgb(59 130 246 / 8%);
  border-color: rgb(59 130 246 / 30%);
}

.md-callout--info .md-callout__icon {
  color: #2563eb;
}

/* ===== 大链接卡片 ===== */
.md-card {
  display: flex;
  margin: 32rpx 0;
  overflow: hidden;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;

  &:active {
    border-color: var(--brand);
  }
}

.md-card__cover {
  flex-shrink: 0;
  width: 200rpx;
  height: 200rpx;
  background: var(--line);
}

.md-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 24rpx 28rpx;
}

.md-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.md-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
  color: var(--ink);
}

.md-card__ext {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 28rpx;
  color: var(--muted);
}

.md-card__desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--muted);
}

.md-card__url {
  margin-top: 18rpx;
  overflow: hidden;
  font-size: 22rpx;
  line-height: 1.4;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ===== 小链接卡片 ===== */
.md-simple-card {
  display: flex;
  align-items: center;
  padding: 22rpx 28rpx;
  margin: 24rpx 0;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 12rpx;

  &:active {
    border-color: var(--brand);
  }
}

.md-simple-card__title {
  flex-shrink: 0;
  max-width: 50%;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.md-simple-card__url {
  flex: 1;
  min-width: 0;
  margin: 0 16rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: var(--muted);
  text-align: right;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.md-simple-card__ext {
  flex-shrink: 0;
  font-size: 26rpx;
  color: var(--muted);
}

/* ===== 轮播图 ===== */
.md-swiper {
  margin: 32rpx 0;
}

.md-swiper__box {
  width: 100%;
  height: 460rpx;
  overflow: hidden;
  border-radius: 16rpx;
  background: var(--line);
}

.md-swiper__img {
  width: 100%;
  height: 100%;
}

.md-swiper__caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 48rpx 28rpx 20rpx;
  background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 60%) 100%);
}

.md-swiper__caption-text {
  display: block;
  overflow: hidden;
  font-size: 24rpx;
  line-height: 1.4;
  color: #fff;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ===== 视频 ===== */
.md-video {
  margin: 32rpx 0;
}

.md-video__player {
  width: 100%;
  height: 422rpx; /* 约 16:9（750rpx 宽） */
  overflow: hidden;
  background: #000;
  border-radius: 16rpx;
}
</style>