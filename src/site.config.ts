import { defineSiteConfig } from '@/utils/site-config'

/**
 * 小程序站点静态配置实例。
 *
 * 在任何文件中 `import { siteConfig } from '@/site.config'` 即可使用。
 * 悬浮提示会展示各字段的 JSDoc 说明。
 */
export const siteConfig = defineSiteConfig({
  siteName: 'ImQi1',
  siteUrl: 'https://imqi1.com',
  home: {
    eyebrow: 'MINI PROGRAM',
    titleLines: ['记录代码，', '也记录生活。'],
    description: '技术笔记、城市漫步、随手拍，偶尔写点没用的东西。',
    primaryButton: {
      label: 'ImQi1',
    },
    secondaryButton: {
      label: '关于',
    },
  },
  category: {
    pageSize: 12,
    // 图片分类 slug：命中则该分类走双列封面瀑布流，其余走标题列表
    photoCategorySlugs: ['shot'],
  },
  codeFont: {
    // 家族名：uni.loadFontFace 与 CSS 都按它引用。
    family: 'JetBrainsMono',
    // 字体文件 URL：CDN 需加入微信「downloadFile 合法域名」否则真机加载失败。
    url: 'https://cdn.imqi1.com/fonts/JetBrainsMono-Rest.woff2',
  },
})
