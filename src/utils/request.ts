import { apiBaseUrl, miniApiSecret } from '@/config/env'
import type { ApiResponse } from '@/types/request'
import { hmacSha256Hex } from '@/utils/hmac'

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

// apiBaseUrl 去掉协议+域名后的路径前缀（如 https://imqi1.com/api/mini → /api/mini）。
// 用于把请求还原成后端 req.url 那样的「含前缀完整路径」，签名才能对得上。
const apiBasePath = (() => {
  const withoutOrigin = apiBaseUrl.replace(/^https?:\/\/[^/]+/i, '')
  const trimmed = withoutOrigin.replace(/\/$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
})()

// 生成随机 nonce（无需强随机，仅用于让相同请求签名不同）。
function genNonce() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

// 为请求生成 HMAC 签名头。密钥为空时返回空对象（后端此时也不校验）。
// signPath 必须与后端收到的 req.url 完全一致：apiBasePath + 具体 path（含查询串）。
function buildSignHeaders(method: string, path: string): Record<string, string> {
  if (!miniApiSecret) {
    return {}
  }
  const signPath = joinUrl(apiBasePath, path)
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonce = genNonce()
  const stringToSign = `${method.toUpperCase()}\n${signPath}\n${timestamp}\n${nonce}`
  const sign = hmacSha256Hex(miniApiSecret, stringToSign)
  return {
    'X-Mini-Timestamp': timestamp,
    'X-Mini-Nonce': nonce,
    'X-Mini-Sign': sign,
  }
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
      header: buildSignHeaders('GET', path),
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
      header: buildSignHeaders('GET', path),
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
        ...buildSignHeaders('POST', path),
      },
      data,
      success: res => resolveResponse<T>(res, resolve, reject),
      fail: error => reject(error instanceof Error ? error : new Error('网络请求失败')),
    })
  })
}
