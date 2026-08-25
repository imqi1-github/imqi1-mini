<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { cleanLivePhotoUrl, extractLivePhotoMedia, releaseLivePhotoVideo } from '@/utils/live-photo'

// 实况照片（点击播放）。小程序 <video> 是原生组件、层级最高，无法像 web 那样在图片上
// 做悬浮交叉淡入，故采用「点击播放按钮后视频覆盖静态图播放，播完回到静态图」的交互。
// 视频段在首次点击时才拉取切分（省流量），提取结果缓存，二次点击直接复用。
const props = withDefaults(
  defineProps<{
    /** 实况照片地址（可含 #live 锚点，组件内部会清理） */
    src: string
    /** 无障碍描述 / 图片说明 */
    alt?: string
    /** 底层 <image> 的裁剪模式，与 uni image 的 mode 一致 */
    mode?: string
    /**
     * 是否填满父容器高度：
     * - true：封面场景，父级已定高（如轮播/头部封面），图片与视频均 100% 填充
     * - false：正文场景，用 widthFix 由宽度推高度，视频按图片真实宽高比定高
     */
    fill?: boolean
    /**
     * 圆角值（CSS 尺寸，如 '12rpx'）。原生 <video> 不受父级 overflow/border-radius 裁剪，
     * 需把圆角直接加到 video 自身；同时给容器与静态图加同值，视觉统一。
     */
    radius?: string
    /**
     * 透传标识：随 load 事件原样带回，供列表场景（如瀑布流）识别是哪张图。
     * 小程序端组件事件无法用引用循环变量的内联箭头绑定，改用此 tag 回传下标。
     */
    tag?: number
  }>(),
  {
    alt: '',
    mode: 'widthFix',
    fill: false,
    radius: '',
    tag: -1,
  },
)

// 尺寸事件：把静态图测得的原始宽高透传出去（供瀑布流按比例分列），并带回 tag
const emit = defineEmits<{
  load: [payload: { width: number, height: number, tag: number }]
}>()

// 清理后的静态图地址（去掉 #live）：优先用提取阶段回填的地址，否则由 src 推导。
// 用 computed + null 保护，避免 props.src 未就绪（undefined）时崩溃。
const resolvedImageSrc = ref<string | null>(null)
const imageSrc = computed(() => resolvedImageSrc.value ?? cleanLivePhotoUrl(props.src))

const videoSrc = ref<string | null>(null)
const playing = ref(false)
const loading = ref(false)
// 视频首帧是否已就绪：原生 <video> 从 autoplay 到首帧解码完成有黑屏间隙，
// 就绪前保持视频透明、只显示底层静态图，就绪后再淡入，消除黑屏。
const videoReady = ref(false)
// 加载中：点击播放后，视频提取（loading）或首帧尚未就绪期间均显示加载态，
// 播放按钮换成旋转 spinner，给用户明确反馈，直到画面真正出现。
const buffering = computed(() => loading.value || (playing.value && !videoReady.value))
// 图片真实宽高比（宽/高），正文场景据此给视频容器定高
const aspectRatio = ref<string>('')

// 底层图片加载完成：记录宽高比（正文场景给视频容器定高）并向外透传尺寸
function onImageLoad(e: Event) {
  const detail = (e as unknown as { detail?: { width?: number, height?: number } }).detail
  const w = detail?.width
  const h = detail?.height
  if (!w || !h) return
  if (!props.fill) aspectRatio.value = `${w} / ${h}`
  emit('load', { width: w, height: h, tag: props.tag })
}

async function ensureVideo(): Promise<string | null> {
  if (videoSrc.value) return videoSrc.value
  loading.value = true
  try {
    const media = await extractLivePhotoMedia(props.src)
    resolvedImageSrc.value = media.imageSrc
    videoSrc.value = media.videoSrc
    return media.videoSrc
  }
  finally {
    loading.value = false
  }
}

async function play() {
  if (buffering.value) return
  const src = await ensureVideo()
  if (!src) {
    // 无内嵌视频（非实况或提取失败）：退化为普通图片预览
    uni.previewImage({ urls: [imageSrc.value], current: imageSrc.value })
    return
  }
  videoReady.value = false
  playing.value = true
}

// 视频首帧渲染出来（时间开始走动）后再淡入，避免解码前的原生黑底
function onTimeUpdate() {
  if (!videoReady.value) videoReady.value = true
}

// 视频播完回到静态图
function onEnded() {
  playing.value = false
  videoReady.value = false
}

// 视频解码/播放失败：收起播放态、释放坏源并退化为静态图预览，避免永久 spinner（与 web 端 @error 降级一致）
function onVideoError() {
  playing.value = false
  videoReady.value = false
  if (videoSrc.value) {
    releaseLivePhotoVideo(videoSrc.value)
    videoSrc.value = null
  }
  uni.showToast({ title: '视频解码失败，已切换到图片', icon: 'none' })
}

// 点击图片：预览大图（放大）。播放改由播放按钮触发，二者互不干扰。
function onPreview() {
  if (playing.value) return
  uni.previewImage({ urls: [imageSrc.value], current: imageSrc.value })
}

onBeforeUnmount(() => {
  releaseLivePhotoVideo(videoSrc.value)
})
</script>

<template>
  <view
    class="live-photo"
    :class="{ 'live-photo--fill': fill }"
    :style="{
      ...(!fill && aspectRatio ? { aspectRatio } : {}),
      ...(radius ? { borderRadius: radius } : {}),
    }"
    @tap="onPreview"
  >
    <!-- 静态图：播放时保留在底层，避免视频加载间隙露白 -->
    <image
      class="live-photo__img"
      :src="imageSrc"
      :mode="mode"
      :style="{
        ...(fill ? { width: '100%', height: '100%' } : { width: '100%' }),
        ...(radius ? { borderRadius: radius } : {}),
      }"
      @load="onImageLoad"
    />

    <!-- 视频：点击后覆盖静态图自动播放，播完回到静态图。
         首帧就绪前保持透明（露出底层静态图），就绪后淡入，消除原生 <video> 的黑屏间隙；
         poster 设为静态图作为双重保险；圆角直接加在 video 上（原生组件不受父级 overflow 裁剪）。 -->
    <video
      v-if="playing && videoSrc"
      class="live-photo__video"
      :class="{ 'live-photo__video--ready': videoReady }"
      :src="videoSrc"
      :poster="imageSrc"
      :autoplay="true"
      :controls="false"
      :show-center-play-btn="false"
      :show-fullscreen-btn="false"
      :enable-progress-gesture="false"
      object-fit="cover"
      :style="radius ? { borderRadius: radius } : undefined"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onVideoError"
    />

    <!-- 「实况」标识（未播放时显示） -->
    <view
      v-if="!playing"
      class="live-photo__badge"
    >
      <!-- CSS 同心圆点（实况标识），替代 emoji -->
      <view class="live-photo__badge-icon" />
      <text>实况</text>
    </view>

    <!-- 播放按钮：点击播放实况视频（.stop 阻止冒泡到容器的图片预览）。
         视频画面出现前一直显示；加载/首帧解码期间显示旋转 spinner，否则显示播放三角。 -->
    <view
      v-if="!videoReady"
      class="live-photo__play"
      :class="{ 'live-photo__play--loading': buffering }"
      @tap.stop="play"
    >
      <!-- 加载中：CSS 旋转 spinner -->
      <view
        v-if="buffering"
        class="live-photo__spinner"
      />
      <!-- 空闲：CSS 播放三角 -->
      <view
        v-else
        class="live-photo__play-icon"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.live-photo {
  position: relative;
  display: block;
  width: 100%;
  overflow: hidden;
  background: var(--line);
}

/* 填充模式：占满父容器（封面场景，父级已定高） */
.live-photo--fill {
  height: 100%;
}

.live-photo__img {
  display: block;
  width: 100%;
}

.live-photo__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  /* 首帧就绪前透明，露出底层静态图，避免原生 video 解码前的黑屏；就绪后淡入 */
  opacity: 0;
  transition: opacity 0.2s ease;
}

.live-photo__video--ready {
  opacity: 1;
}

/* 「实况」标识 */
.live-photo__badge {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: 5rpx 14rpx;
  font-size: 19rpx;
  color: #fff;
  pointer-events: none;
  background: rgb(0 0 0 / 35%);
  border-radius: 999rpx;
}

.live-photo__badge-icon {
  position: relative;
  box-sizing: border-box;
  width: 18rpx;
  height: 18rpx;
  margin-right: 5rpx;
  border: 2rpx solid #fff;
  border-radius: 50%;

  /* 中心实心圆点，与外环组成实况「◉」标识 */
  &::after {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6rpx;
    height: 6rpx;
    content: '';
    background: #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }
}

/* 播放按钮 */
.live-photo__play {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50rpx;
  height: 50rpx;
  background: rgb(0 0 0 / 35%);
  border-radius: 50%;

  &:active {
    background: rgb(0 0 0 / 55%);
  }
}

.live-photo__play-icon {
  width: 0;
  height: 0;
  margin-left: 5rpx;
  border-top: 11rpx solid transparent;
  border-bottom: 11rpx solid transparent;
  border-left: 19rpx solid #fff;
}

/* 加载中：白色半环旋转 spinner */
.live-photo__spinner {
  width: 28rpx;
  height: 28rpx;
  border: 4rpx solid rgb(255 255 255 / 35%);
  border-top-color: #fff;
  border-radius: 50%;
  animation: live-photo-spin 0.7s linear infinite;
}

@keyframes live-photo-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
