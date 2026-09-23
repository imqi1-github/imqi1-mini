<script lang="ts">
import { defineComponent, h, type Component } from 'vue'
import { siteConfig } from '@/site.config'
import { buildInlineSpans } from '@/utils/inline-span'
import type { EntryBlock } from '@/types/changelog'

// 递归渲染更新日志变更内容的块级节点（文本 / 列表，列表可嵌套）。
// 自引用：h(ChangelogEntry, { blocks }) 渲染子列表 children。
// 显式标注返回类型为 Component，避免 TS 自引用 implicit any 报错。
const ChangelogEntry: Component = defineComponent({
  name: 'ChangelogEntry',
  props: {
    blocks: {
      type: Array,
      required: true,
    },
  },
  setup(props) {
    // 以 / 开头的根相对链接补全为完整站点地址后复制（小程序无法直接打开外链）
    function resolveHref(href: string): string {
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

    const inlineSpans = (spans: Parameters<typeof buildInlineSpans>[0]) =>
      buildInlineSpans(spans, openLink)

    function renderBlock(block: EntryBlock, bi: number) {
      if (block.type === 'text') {
        return h('view', { class: 'entry-text', key: `b-${bi}` }, inlineSpans(block.spans))
      }
      // list
      return h('view', { class: 'entry-list', key: `b-${bi}` },
        block.items.map((item, ii) =>
          h('view', { class: 'entry-list__item', key: `b-${bi}-i-${ii}` }, [
            h('text', { class: 'entry-list__marker' }, block.ordered ? `${ii + 1}.` : '•'),
            h('view', { class: 'entry-list__body' }, [
              h('view', { class: 'entry-list__line' }, inlineSpans(item.spans)),
              item.children.length
                ? h(ChangelogEntry, { blocks: item.children })
                : null,
            ]),
          ]),
        ),
      )
    }

    return () => h('block', null,
      (props.blocks as EntryBlock[]).map((b, i) => renderBlock(b, i)),
    )
  },
})

export default ChangelogEntry
</script>

<style lang="scss" scoped>
/* ===== 文本块 ===== */
.entry-text:not(:last-child) {
  margin-bottom: 10rpx;
}

/* ===== 列表 ===== */
.entry-list__item {
  display: flex;
  align-items: flex-start;
}

.entry-list__item:not(:last-child) {
  margin-bottom: 8rpx;
}

.entry-list__marker {
  flex-shrink: 0;
  min-width: 28rpx;
  margin-right: 28rpx;
  font-size: 27rpx;
  line-height: 1.6;
  color: var(--brand);
}

.entry-list__body {
  flex: 1;
  min-width: 0;
}

/* 子列表相对父项缩进 */
.entry-list__body .entry-list {
  margin-top: 8rpx;
}
</style>