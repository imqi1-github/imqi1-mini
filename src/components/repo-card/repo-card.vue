<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchRepo } from '@/api/repo'
import type { MiniRepo } from '@/types/repo'

// 仓库卡片：主站前端直接 fetch github/gitee API，小程序改走后端 /api/mini/repo 代理。
const props = defineProps<{
  platform: 'github' | 'gitee'
  owner: string
  repo: string
  url: string
}>()

const info = ref<MiniRepo | null>(null)
const loading = ref(true)
const error = ref('')

// 语言 → 圆点颜色（覆盖常见语言，其余灰色）
const LANG_COLOR: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  Java: '#b07219',
  Go: '#00add8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  Vue: '#41b883',
}

function langColor(lang: string) {
  return LANG_COLOR[lang] || '#94a3b8'
}

// 大数值千分位，便于展示 star/fork
function formatCount(n: number) {
  return n.toLocaleString()
}

function openRepo() {
  uni.setClipboardData({
    data: props.url,
    success: () => uni.showToast({ title: '仓库链接已复制', icon: 'none' }),
  })
}

onMounted(() => {
  fetchRepo(props.platform, props.owner, props.repo)
    .then((data) => {
      info.value = data
    })
    .catch((e: unknown) => {
      error.value = e instanceof Error ? e.message : '仓库信息加载失败'
    })
    .finally(() => {
      loading.value = false
    })
})
</script>

<template>
  <view class="repo">
    <view
      v-if="loading"
      class="repo__state"
    >
      仓库信息加载中…
    </view>
    <view
      v-else-if="error"
      class="repo__state"
    >
      {{ error }}
    </view>

    <view
      v-else-if="info"
      class="repo__card"
      @tap="openRepo"
    >
      <!-- 顶部：平台 + 公开/私有 -->
      <view class="repo__bar">
        <text
          class="repo__platform"
          :class="`repo__platform--${info.platform}`"
        >
          {{ info.platform === 'github' ? 'GitHub' : 'Gitee' }}
        </text>
        <text
          class="repo__badge"
          :class="info.isPrivate ? 'repo__badge--private' : 'repo__badge--public'"
        >
          {{ info.isPrivate ? '私有' : '公开' }}
        </text>
      </view>

      <!-- 内容 -->
      <view class="repo__body">
        <view class="repo__head">
          <text class="repo__name">
            {{ info.fullName }}
          </text>
          <text class="repo__ext">
            ↗
          </text>
        </view>

        <text
          v-if="info.description"
          class="repo__desc"
        >
          {{ info.description }}
        </text>

        <view class="repo__meta">
          <text class="repo__stat">
            ★ {{ formatCount(info.stars) }}
          </text>
          <text class="repo__stat">
            ⑂ {{ formatCount(info.forks) }}
          </text>
          <view
            v-if="info.language"
            class="repo__lang"
          >
            <view
              class="repo__lang-dot"
              :style="{ background: langColor(info.language) }"
            />
            <text class="repo__lang-text">
              {{ info.language }}
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.repo {
  margin: 32rpx 0;
}

.repo__state {
  padding: 40rpx;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
}

.repo__card {
  overflow: hidden;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;

  &:active {
    border-color: var(--brand);
  }
}

.repo__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: var(--line);
}

.repo__platform {
  font-size: 24rpx;
  font-weight: 600;
}

.repo__platform--github {
  color: var(--ink);
}

.repo__platform--gitee {
  color: #c71d23;
}

.repo__badge {
  padding: 2rpx 14rpx;
  font-size: 20rpx;
  border-radius: 20rpx;
}

.repo__badge--public {
  color: #16a34a;
  background: rgb(34 197 94 / 12%);
}

.repo__badge--private {
  color: #ca8a04;
  background: rgb(234 179 8 / 12%);
}

.repo__body {
  padding: 24rpx;
}

.repo__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.repo__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.repo__ext {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 26rpx;
  color: var(--muted);
}

.repo__desc {
  display: block;
  margin-top: 12rpx;
  overflow: hidden;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--muted);
}

.repo__meta {
  display: flex;
  align-items: center;
  margin-top: 20rpx;
}

.repo__stat {
  margin-right: 28rpx;
  font-size: 24rpx;
  color: var(--muted);
}

.repo__lang {
  display: flex;
  align-items: center;
}

.repo__lang-dot {
  width: 16rpx;
  height: 16rpx;
  margin-right: 10rpx;
  border-radius: 50%;
}

.repo__lang-text {
  font-size: 24rpx;
  color: var(--muted);
}
</style>
