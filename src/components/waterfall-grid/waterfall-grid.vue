<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WaterfallImage } from '@/types/markdown'
import LivePhoto from '@/components/live-photo/live-photo.vue'
import { isLivePhoto } from '@/utils/live-photo'

// 两列错落瀑布流：小程序无法用 CSS columns（多端不可靠），改用手动分列。
// 拿到每张图的宽高比后，贪心放入当前累计高度较矮的一列，视觉上左右均衡。
// 高度未知（图片未测量完）前按 1:1 估算，避免初始全挤一列。
const props = defineProps<{
  images: WaterfallImage[]
}>()

// 每张图的宽高比（height / width），未测量时为默认 1
const ratios = ref<Record<number, number>>({})

// image 组件 load 事件：detail 携带图片原始宽高（uni 类型未精确导出，局部声明）
interface ImageLoadEvent {
  detail?: { width?: number, height?: number }
}

function setRatio(index: number, w?: number, h?: number) {
  if (w && h) {
    ratios.value = { ...ratios.value, [index]: h / w }
  }
}

function onImageLoad(index: number, e: ImageLoadEvent) {
  setRatio(index, e.detail?.width, e.detail?.height)
}

// live-photo 透传的尺寸事件（实况图用组件渲染，宽高比同样参与分列）。
// 下标由组件 tag 原样带回（小程序端无法在模板内联箭头里引用循环变量）。
function onLiveLoad(payload: { width: number, height: number, tag: number }) {
  setRatio(payload.tag, payload.width, payload.height)
}

interface Column {
  items: { image: WaterfallImage, index: number }[]
  height: number
}

// 按测得比例贪心分两列；比例缺省用 1，保证首帧也能均衡铺开
const columns = computed<Column[]>(() => {
  const cols: Column[] = [
    { items: [], height: 0 },
    { items: [], height: 0 },
  ]
  props.images.forEach((image, index) => {
    const ratio = ratios.value[index] ?? 1
    const target = cols[0].height <= cols[1].height ? cols[0] : cols[1]
    target.items.push({ image, index })
    target.height += ratio
  })
  return cols
})

function preview(current: string) {
  const urls = props.images.map(img => img.url)
  if (!urls.length) return
  uni.previewImage({ urls, current })
}

// 单元格点击：普通图预览大图；实况图交给内部 live-photo 自行播放，外层不重复处理
function onCellTap(image: WaterfallImage) {
  if (isLivePhoto(image.url)) return
  preview(image.url)
}
</script>

<template>
  <view class="waterfall">
    <view
      v-for="(col, ci) in columns"
      :key="ci"
      class="waterfall__col"
    >
      <view
        v-for="cell in col.items"
        :key="cell.index"
        class="waterfall__item"
        @tap="onCellTap(cell.image)"
      >
        <!-- 实况照片：live-photo 组件自带点击播放，圆角需传入（原生 video 不受父级裁剪）。
             tag 透传下标，@load 直接绑函数（小程序端组件事件不能用引用循环变量的内联箭头）。 -->
        <live-photo
          v-if="isLivePhoto(cell.image.url)"
          class="waterfall__img"
          :src="cell.image.url"
          :alt="cell.image.title"
          mode="widthFix"
          radius="12rpx"
          :tag="cell.index"
          @load="onLiveLoad"
        />
        <image
          v-else
          class="waterfall__img"
          :src="cell.image.url"
          mode="widthFix"
          @load="(e) => onImageLoad(cell.index, e as unknown as ImageLoadEvent)"
        />
        <view
          v-if="cell.image.title"
          class="waterfall__caption"
        >
          <text class="waterfall__caption-text">
            {{ cell.image.title }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.waterfall {
  display: flex;
  margin: 24rpx 0;
}

.waterfall__col {
  box-sizing: border-box;
  flex: 1;
  min-width: 0;

  &:first-child {
    padding-right: 6rpx;
  }

  &:last-child {
    padding-left: 6rpx;
  }
}

.waterfall__item {
  position: relative;
  margin-bottom: 12rpx;
  overflow: hidden;
  border-radius: 12rpx;
  background: var(--line);

  &:active {
    opacity: 0.85;
  }
}

.waterfall__img {
  display: block;
  width: 100%;
}

/* 标题浮层：底部渐变遮罩 + 白字，长标题省略 */
.waterfall__caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 40rpx 20rpx 14rpx;
  background: linear-gradient(180deg, transparent 0%, rgb(0 0 0 / 55%) 100%);
}

.waterfall__caption-text {
  display: block;
  overflow: hidden;
  font-size: 22rpx;
  line-height: 1.4;
  color: #fff;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
