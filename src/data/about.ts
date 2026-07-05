import type { AboutInfo, TechStackItem } from '@/types/about'

// 关于页写死数据 —— 仅用于 UI 预览，后续替换为真实接口
export const blogInfo: AboutInfo[] = [
  { label: '站点名称', value: 'ImQi1', icon: 'window-fill' },
  { label: '作者', value: '棋', icon: 'account-circle-fill' },
  { label: '小程序版本', value: '2.0.0', icon: 'notification-fill' },
  { label: '网站地址', value: 'imqi1.com', icon: 'links-fill', action: 'copy' },
]

export const contactInfo: AboutInfo[] = [
  { label: '邮箱', value: 'imqi1@qq.com', icon: 'mail-fill', action: 'copy' },
]

// 小程序技术栈（取自 package.json），每项配品牌 logo
export const techStack: TechStackItem[] = [
  { name: 'uni-app', logo: '/static/tech/uni-app.svg' },
  { name: 'Vue 3', logo: '/static/tech/vue.svg' },
  { name: 'wot-design-uni', logo: '/static/tech/wot-design-uni.svg' },
  { name: 'UnoCSS', logo: '/static/tech/unocss.svg' },
  { name: 'TypeScript', logo: '/static/tech/typescript.svg' },
  { name: 'Vite', logo: '/static/tech/vite.svg' },
  { name: 'Sass', logo: '/static/tech/sass.svg' },
]

export const copyright = '2026 \u00A9 棋'
