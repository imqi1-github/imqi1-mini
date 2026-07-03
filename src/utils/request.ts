import { apiBaseUrl } from '@/config/env'
import type { ApiResponse } from '@/types/request'

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

// 统一解析后端 { success, data, message } 响应，成功返回 data，失败 reject 出可读 message。
function resolveResponse<T>(
  res: UniApp.RequestSuccessCallbackResult,
  resolve: (value: T) => void,
  reject: (reason: Error) => void,
) {
  const body = res.data as ApiResponse<T>

  // 后端对 400/404/429 等用 createError 抛出，body 里没有 success 字段，
  // 优先取其 message（如「评论太频繁，请 N 秒后再试」）作为提示。
  if (res.statusCode < 200 || res.statusCode >= 300) {
    const message = (res.data as { message?: string })?.message
    reject(new Error(message || `请求失败：${res.statusCode}`))
    return
  }

  if (!body?.success) {
    reject(new Error(body?.message || '请求失败'))
    return
  }

  resolve(body.data)
}

export function request<T>(path: string) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: joinUrl(apiBaseUrl, path),
      method: 'GET',
      success: res => resolveResponse<T>(res, resolve, reject),
      fail: error => reject(error instanceof Error ? error : new Error('网络请求失败')),
    })
  })
}

// 解析并返回后端完整响应体（含 data 之外的同级字段），成功校验同 resolveResponse。
function resolveEnvelope<T extends { success?: boolean, message?: string }>(
  res: UniApp.RequestSuccessCallbackResult,
  resolve: (value: T) => void,
  reject: (reason: Error) => void,
) {
  const body = res.data as T

  if (res.statusCode < 200 || res.statusCode >= 300) {
    const message = (res.data as { message?: string })?.message
    reject(new Error(message || `请求失败：${res.statusCode}`))
    return
  }

  if (!body?.success) {
    reject(new Error(body?.message || '请求失败'))
    return
  }

  resolve(body)
}

/** GET 请求：返回后端完整响应体（用于 data 之外还需读取同级字段的场景） */
export function requestFull<T extends { success?: boolean, message?: string }>(path: string) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: joinUrl(apiBaseUrl, path),
      method: 'GET',
      success: res => resolveEnvelope<T>(res, resolve, reject),
      fail: error => reject(error instanceof Error ? error : new Error('网络请求失败')),
    })
  })
}

/** POST 请求：body 作为 JSON 提交，响应解析同 request */
export function post<T>(path: string, data: object) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: joinUrl(apiBaseUrl, path),
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        // 小程序客户端标识：后端据此把评论 agent 记为 "Mini"，
        // 主站评论区据此展示小程序图标（parseUserAgent 已内置 Mini 映射）。
        'X-Client-Platform': 'mini',
      },
      data,
      success: res => resolveResponse<T>(res, resolve, reject),
      fail: error => reject(error instanceof Error ? error : new Error('网络请求失败')),
    })
  })
}
