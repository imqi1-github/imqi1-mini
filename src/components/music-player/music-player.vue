<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { fetchMusic } from '@/api/music'
import type { MiniMusic } from '@/types/music'

// 精简单曲播放器：歌单/单曲都只取第一首（用户要求只显示一个播放器，不铺列表）。
// 小程序无 APlayer，用 uni.createInnerAudioContext 自建 UI + 播放控制。
const props = defineProps<{
  server: string
  mediaType: string
  id: string
}>()

const song = ref<MiniMusic | null>(null)
const loading = ref(true)
const error = ref('')

const playing = ref(false)
const duration = ref(0)
const current = ref(0)

let audio: UniApp.InnerAudioContext | null = null

// 秒 → m:ss
function formatTime(sec: number) {
  if (!sec || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function setupAudio(src: string) {
  audio = uni.createInnerAudioContext()
  audio.src = src
  audio.onPlay(() => { playing.value = true })
  audio.onPause(() => { playing.value = false })
  audio.onStop(() => { playing.value = false })
  audio.onEnded(() => { playing.value = false; current.value = 0 })
  audio.onTimeUpdate(() => {
    if (!audio) return
    current.value = audio.currentTime
    duration.value = audio.duration
  })
  audio.onError(() => { error.value = '音频播放失败' })
}

function toggle() {
  if (!audio) return
  if (playing.value) audio.pause()
  else audio.play()
}

// 拖动进度条跳转
function onSeek(e: { detail: { value: number } }) {
  if (!audio) return
  audio.seek(e.detail.value)
  current.value = e.detail.value
}

onMounted(() => {
  fetchMusic(props.server, props.mediaType, props.id)
    .then((data) => {
      if (!data || !data.url) {
        error.value = '未找到可播放的音乐'
        return
      }
      song.value = data
      setupAudio(data.url)
    })
    .catch((e: unknown) => {
      error.value = e instanceof Error ? e.message : '音乐加载失败'
    })
    .finally(() => {
      loading.value = false
    })
})

onBeforeUnmount(() => {
  if (audio) {
    audio.destroy()
    audio = null
  }
})
</script>

<template>
  <view class="music">
    <!-- 加载 / 错误态 -->
    <view
      v-if="loading"
      class="music__state"
    >
      音乐加载中…
    </view>
    <view
      v-else-if="error"
      class="music__state"
    >
      {{ error }}
    </view>

    <view
      v-else-if="song"
      class="music__box"
    >
      <image
        class="music__cover"
        :class="{ 'music__cover--spin': playing }"
        :src="song.pic"
        mode="aspectFill"
      />
      <view class="music__main">
        <view class="music__meta">
          <text class="music__name">
            {{ song.name }}
          </text>
          <text class="music__artist">
            {{ song.artist }}
          </text>
        </view>

        <view class="music__ctrl">
          <view
            class="music__btn"
            @tap="toggle"
          >
            <text class="music__btn-icon">
              {{ playing ? '⏸' : '▶' }}
            </text>
          </view>

          <slider
            class="music__slider"
            :min="0"
            :max="duration || 1"
            :value="current"
            block-size="12"
            active-color="var(--brand)"
            @change="onSeek"
          />

          <text class="music__time">
            {{ formatTime(current) }} / {{ formatTime(duration) }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.music {
  margin: 32rpx 0;
}

.music__state {
  padding: 40rpx;
  font-size: 26rpx;
  color: var(--muted);
  text-align: center;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
}

.music__box {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
}

.music__cover {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  margin-right: 24rpx;
  background: var(--line);
  border-radius: 50%;
}

/* 播放时封面缓慢旋转，呼应黑胶质感 */
.music__cover--spin {
  animation: music-spin 8s linear infinite;
}

@keyframes music-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.music__main {
  flex: 1;
  min-width: 0;
}

.music__meta {
  display: flex;
  align-items: baseline;
  margin-bottom: 12rpx;
}

.music__name {
  flex-shrink: 1;
  overflow: hidden;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music__artist {
  flex-shrink: 0;
  margin-left: 12rpx;
  overflow: hidden;
  font-size: 22rpx;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music__ctrl {
  display: flex;
  align-items: center;
}

.music__btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  background: var(--brand);
  border-radius: 50%;

  &:active {
    opacity: 0.85;
  }
}

.music__btn-icon {
  font-size: 26rpx;
  line-height: 1;
  color: #fff;
}

.music__slider {
  flex: 1;
  margin: 0 20rpx;
}

.music__time {
  flex-shrink: 0;
  font-size: 20rpx;
  color: var(--muted);
}
</style>
