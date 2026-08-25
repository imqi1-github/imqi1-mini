import type { WaterfallImage } from '@/types/markdown'

/** image 组件 load 事件 detail（uni 类型未精确导出，局部声明） */
export interface ImageLoadEvent {
  detail?: { width?: number, height?: number }
}

/** 瀑布流的一列内容 */
export interface Column {
  items: { image: WaterfallImage, index: number }[]
  height: number
}
