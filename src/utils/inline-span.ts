// 行内片段渲染工具。
//
// 关键约束：小程序原生 <text> 不能包含 <block> 或自定义组件，所以容器型 span
// （strong/em/strike/link）的 children 不能用子组件递归。改用 h() 构造纯原生 <text>
// 元素：容器型直接展开 children 为同级 <text>（class 一路下传累积），保证编译产物
// 是 <text><text>...</text><text>...</text></text> 这种合法嵌套。
//
// 与 utils/markdown.ts 配套：容器型片段通过 children 字段嵌套子片段，对应
// 「删除线内嵌链接」「链接内嵌粗体」等主站 markdown-it 支持的语法。
//
// 链接点击通过 emitOpen 回调传出；调用方负责实际处理（小程序不能直接打开外链，
// 一般是复制到剪贴板）。

import { h, type VNode } from 'vue'
import type { InlineSpan } from '@/types/markdown'

/** 把 span 树拍平成纯字符串，用于 link 内 children 牺牲修饰以换取编译合法 */
function flattenToText(span: InlineSpan): string {
  if (span.type === 'text' || span.type === 'code') {
    return span.text
  }
  return span.children.map(flattenToText).join('')
}

/**
 * 把 spans 列表递归构造为原生 <text> VNode 数组。
 *
 * 容器型 children 一律拍平成同级 <text>，class 一路下传累积。
 * link 的 children 拍平成字符串（不再保留内部修饰 class），整段可点击。
 */
export function buildInlineSpans(
  spans: InlineSpan[],
  emitOpen: (href: string) => void,
): VNode[] {
  function build(span: InlineSpan, key: string): VNode {
    switch (span.type) {
      case 'text':
        return h('text', { key, class: 'md-inline md-inline--text' }, span.text)

      case 'code':
        return h('text', { key, class: 'md-inline md-inline--code' }, span.text)

      case 'strong':
      case 'em':
      case 'strike':
        // 容器型：children 拍平成同级 <text>，class 累积。
        return h(
          'text',
          { key, class: `md-inline md-inline--${span.type}` },
          span.children.map((c, i) => build(c, `${key}-${i}`)),
        )

      case 'link':
        // 链接：children 拍平成纯文本（不再保留内部修饰），整段可点击。
        return h(
          'text',
          {
            key,
            class: 'md-inline md-inline--link',
            onTap: () => emitOpen(span.href),
          },
          span.children.map(flattenToText).join(''),
        )
    }
  }

  return spans.map((s, i) => build(s, `s-${i}`))
}