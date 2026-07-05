<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchChangelogs } from '@/api/changelog'
import ChangelogEntry from '@/components/changelog-entry/changelog-entry.vue'
import { parseEntryBlocks } from '@/utils/changelog-entry'
import type { ChangelogGroup, ChangelogType } from '@/types/changelog'

const groups = ref<ChangelogGroup[]>([])
const loading = ref(true)
const error = ref('')

// 变更内容支持简易 Markdown：行内（粗体 / 斜体 / 行内码 / 链接）与
// 块级列表（有序 / 无序 / 嵌套），解析成块级节点交给 ChangelogEntry 渲染。
function parseEntry(value: string) {
  return parseEntryBlocks(value)
}

// 变更类别 → 徽标配色 class；未知类别回退到「其他」
const TAG_CLASS: Record<ChangelogType, string> = {
  功能: 'tag--feature',
  优化: 'tag--optimize',
  修复: 'tag--fix',
  删除: 'tag--delete',
  设计: 'tag--design',
  新增: 'tag--add',
  其他: 'tag--other',
}

function tagClassOf(type: string) {
  return TAG_CLASS[type as ChangelogType] ?? 'tag--other'
}

// createTime → 「M月D日」
function formatDay(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

onLoad(async () => {
  try {
    groups.value = await fetchChangelogs()
  }
  catch (e) {
    console.error(e)
    error.value = e instanceof Error ? e.message : '更新日志加载失败'
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <view class="page">
    <!-- 标题 -->
    <view class="title-bar">
      <text class="title-bar__text">
        更新日志
      </text>
      <text class="title-bar__sub">
        记录每一次迭代与改进
      </text>
    </view>

    <!-- 状态 -->
    <view
      v-if="loading"
      class="state"
    >
      加载中…
    </view>
    <view
      v-else-if="error"
      class="state"
    >
      {{ error }}
    </view>
    <view
      v-else-if="!groups.length"
      class="state"
    >
      暂无更新日志
    </view>

    <!-- 时间线 -->
    <view
      v-else
      class="timeline"
    >
      <view
        v-for="group in groups"
        :key="`${group.year}-${group.month}`"
        class="month"
      >
        <view class="month__head">
          <text class="month__title">
            {{ group.year }}年{{ group.month }}月
          </text>
          <text class="month__count">
            {{ group.logs.length }} 条
          </text>
        </view>

        <view class="month__body">
          <view
            v-for="(log, i) in group.logs"
            :key="log.id"
            class="log"
            :class="{ 'log--last': i === group.logs.length - 1 }"
          >
            <view class="log__day">
              {{ formatDay(log.createTime) }}
            </view>
            <view class="log__changes">
              <view
                v-for="(entry, j) in log.entries"
                :key="j"
                class="change"
              >
                <text
                  class="tag"
                  :class="tagClassOf(entry.type)"
                >
                  {{ entry.type }}
                </text>
                <view class="change__text">
                  <changelog-entry :blocks="parseEntry(entry.value)" />
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

/* ===== 标题 ===== */
.title-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 40rpx 40rpx 8rpx;
}

.title-bar__text {
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.title-bar__sub {
  padding-bottom: 10rpx;
  font-size: 24rpx;
  color: var(--muted);
}

/* ===== 状态 ===== */
.state {
  padding: 120rpx 0;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
}

/* ===== 月份分组 ===== */
.timeline {
  padding: 40rpx 24rpx 0;
}

.month {
  margin-bottom: 36rpx;
}

.month__head {
  display: flex;
  align-items: center;
  padding: 0 8rpx 20rpx;
}

.month__title {
  flex: 1;
  font-size: 34rpx;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.month__count {
  font-size: 23rpx;
  color: var(--muted);
}

.month__body {
  padding: 0 8rpx;
}

.log {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 8rpx 20rpx 0;
}

.log:not(.log--last) {
  border-bottom: 1rpx solid var(--line);
}

.log__day {
  width: 88rpx;
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.5;
  color: var(--brand);
  text-align: center;
}

.log__changes {
  flex: 1;
  min-width: 0;
  margin-left: 22rpx;
}

.change {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;

  &:not(:last-child) {
    margin-bottom: 18rpx;
  }
}

.tag {
  padding: 4rpx 14rpx;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.5;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.tag--feature {
  color: #4f46e5;
  background: rgb(99 102 241 / 12%);
}

.tag--optimize {
  color: #2563eb;
  background: rgb(59 130 246 / 12%);
}

.tag--fix {
  color: #d97706;
  background: rgb(245 158 11 / 12%);
}

.tag--delete {
  color: #dc2626;
  background: rgb(239 68 68 / 12%);
}

.tag--design {
  color: #9333ea;
  background: rgb(168 85 247 / 12%);
}

.tag--add {
  color: #059669;
  background: rgb(16 185 129 / 12%);
}

.tag--other {
  color: #64748b;
  background: rgb(100 116 139 / 12%);
}

.change__text {
  flex: 1;
  min-width: 0;
}
</style>
