<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { fetchMusic } from '@/api/music'
import type { MiniMusic } from '@/types/music'

// 歌单播放器：后端返回完整歌单，端上展示可点选切换的列表。
// 小程序无 APlayer，用 uni.createInnerAudioContext 自建 UI + 播放控制。
const props = defineProps<{
  server: string
  mediaType: string
  id: string
}>()

const songs = ref<MiniMusic[]>([])
const currentIndex = ref(0)
const loading = ref(true)
const error = ref('')
const songErr = ref('') // 单曲播放失败——仅提示，不覆盖播放器/列表，列表仍可重试/切歌

const playing = ref(false)
const duration = ref(0)
const current = ref(0)

// 当前播放的歌曲
const song = computed<MiniMusic | null>(() => songs.value[currentIndex.value] ?? null)
// 是否为歌单（多首才显示列表）
const hasList = computed(() => songs.value.length > 1)

let audio: UniApp.InnerAudioContext | null = null

// 秒 → m:ss
function formatTime(sec: number) {
  if (!sec || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

// 销毁旧实例并为指定歌曲重建 audio；autoPlay 为 true 时创建后立即播放。
function setupAudio(src: string, autoPlay: boolean) {
  if (audio) {
    audio.destroy()
    audio = null
  }
  current.value = 0
  duration.value = 0
  songErr.value = ''

  audio = uni.createInnerAudioContext()
  audio.src = src
  audio.onPlay(() => { playing.value = true })
  audio.onPause(() => { playing.value = false })
  audio.onStop(() => { playing.value = false })
  audio.onEnded(() => {
    playing.value = false
    current.value = 0
    // 歌单内自动播放下一首（最后一首播完则停在原地）
    if (hasList.value && currentIndex.value < songs.value.length - 1) {
      playSong(currentIndex.value + 1)
    }
  })
  audio.onTimeUpdate(() => {
    if (!audio) return
    current.value = audio.currentTime
    duration.value = audio.duration
  })
  audio.onError(() => { playing.value = false; current.value = 0; songErr.value = '该歌曲播放失败，请重试或切换' })

  if (autoPlay) audio.play()
}

// 切换到列表中的某一首：同一首则切换播放/暂停，不同首则重建并自动播放。
function playSong(index: number) {
  const target = songs.value[index]
  if (!target || !target.url) return

  if (index === currentIndex.value && audio) {
    toggle()
    return
  }
  currentIndex.value = index
  setupAudio(target.url, true)
}

function toggle() {
  if (!audio) return
  if (playing.value) audio.pause()
  else audio.play()
}

let disposed = false

onMounted(() => {
  fetchMusic(props.server, props.mediaType, props.id)
    .then((res) => {
      if (disposed) return
      const list = (res.list ?? []).filter(item => item && item.url)
      if (list.length === 0) {
        error.value = '未找到可播放的音乐'
        return
      }
      songs.value = list
      currentIndex.value = 0
      // 首曲预置 audio，但不自动播放（等用户点击）
      setupAudio(list[0].url, false)
    })
    .catch((e: unknown) => {
      if (disposed) return
      error.value = e instanceof Error ? e.message : '音乐加载失败'
    })
    .finally(() => {
      if (disposed) return
      loading.value = false
    })
})

onBeforeUnmount(() => {
  disposed = true
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
      <view class="music__main">
        <view class="music__meta">
          <text class="music__name">
            {{ song.name }}
          </text>
          <text class="music__artist">
            {{ song.artist }}
          </text>
        </view>

        <text
          v-if="songErr"
          class="music__err"
        >
          {{ songErr }}
        </text>

        <view class="music__ctrl">
          <view
            class="music__btn"
            :aria-label="playing ? '暂停' : '播放'"
            @tap="toggle"
          >
            <!-- 纯 CSS 绘制播放/暂停图标，避免使用 emoji -->
            <view
              v-if="playing"
              class="music__ico music__ico--pause"
            >
              <view class="music__ico-bar" />
              <view class="music__ico-bar" />
            </view>
            <view
              v-else
              class="music__ico music__ico--play"
            />
          </view>

          <text class="music__time">
            {{ formatTime(current) }} / {{ formatTime(duration) }}
          </text>
        </view>
      </view>
    </view>

    <!-- 歌单列表（多首才展示，可点选切换） -->
    <scroll-view
      v-if="!loading && !error && hasList"
      class="music__list"
      scroll-y
    >
      <view
        v-for="(item, index) in songs"
        :key="index"
        class="music__item"
        :class="{ 'music__item--active': index === currentIndex }"
        @tap="playSong(index)"
      >
        <!-- 当前曲：播放中显示动态条，暂停显示播放三角 -->
        <view class="music__item-ico">
          <view
            v-if="index === currentIndex && playing"
            class="music__item-wave"
          >
            <view class="music__item-wave-bar" />
            <view class="music__item-wave-bar" />
            <view class="music__item-wave-bar" />
          </view>
          <view
            v-else
            class="music__item-index"
          >
            {{ index + 1 }}
          </view>
        </view>
        <text class="music__item-name">
          {{ item.name }}
        </text>
        <text class="music__item-artist">
          {{ item.artist }}
        </text>
      </view>
    </scroll-view>
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

.music__err {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--danger);
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

/* 播放图标：CSS 三角形 */
.music__ico--play {
  width: 0;
  height: 0;
  margin-left: 4rpx;
  border-top: 12rpx solid transparent;
  border-bottom: 12rpx solid transparent;
  border-left: 20rpx solid #fff;
}

/* 暂停图标：两条竖条 */
.music__ico--pause {
  display: flex;
  align-items: center;
  justify-content: center;
}

.music__ico--pause .music__ico-bar {
  width: 6rpx;
  height: 22rpx;
  background: #fff;
  border-radius: 2rpx;

  & + .music__ico-bar {
    margin-left: 6rpx;
  }
}

.music__time {
  flex-shrink: 0;
  margin-left: 20rpx;
  font-size: 20rpx;
  color: var(--muted);
}

/* ===== 歌单列表 ===== */
.music__list {
  max-height: 480rpx;
  margin-top: 16rpx;
  background: var(--card);
  border: 1rpx solid var(--line);
  border-radius: 16rpx;
}

.music__item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--line);

  &:last-child {
    border-bottom: none;
  }

  &:active {
    opacity: 0.85;
  }
}

.music__item--active {
  .music__item-name {
    color: var(--brand);
    font-weight: 600;
  }
}

.music__item-ico {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.music__item-index {
  font-size: 24rpx;
  color: var(--muted);
}

/* 播放中动态音波（三条竖条循环伸缩） */
.music__item-wave {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 26rpx;
}

.music__item-wave-bar {
  width: 4rpx;
  height: 100%;
  background: var(--brand);
  border-radius: 2rpx;
  animation: music-wave 0.9s ease-in-out infinite;

  & + .music__item-wave-bar {
    margin-left: 4rpx;
  }

  &:nth-child(2) {
    animation-delay: 0.3s;
  }

  &:nth-child(3) {
    animation-delay: 0.6s;
  }
}

@keyframes music-wave {
  0%, 100% { transform: scaleY(0.35); }
  50% { transform: scaleY(1); }
}

.music__item-name {
  flex-shrink: 1;
  overflow: hidden;
  font-size: 26rpx;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music__item-artist {
  flex-shrink: 0;
  margin-left: 16rpx;
  overflow: hidden;
  max-width: 40%;
  font-size: 22rpx;
  color: var(--muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
