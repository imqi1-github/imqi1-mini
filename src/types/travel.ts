// 小程序足迹类型（与后端 server/types/apis/mini.d.ts 的 MiniTravel 对齐）

/** 足迹关联的文章 */
export interface TravelContent {
  /** 文章 id，用于跳转文章详情 */
  id: number
  /** 文章标题 */
  title: string
  /** 是否图片文章（属于图片分类），进入详情时据此带 photo=1 */
  photo: boolean
}

/** 足迹点：一个去过的地方及其关联文章 */
export interface TravelItem {
  /** 足迹 id */
  id: number
  /** 地点名称 */
  name: string
  /** 地点描述，无则为空串 */
  desc: string
  /** 封面图地址，无则为空串 */
  cover: string
  /** 关联文章列表，可能为空 */
  contents: TravelContent[]
}
