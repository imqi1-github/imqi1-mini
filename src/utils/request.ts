import { apiBaseUrl } from '@/config/env'
import type { ApiResponse } from '@/types/request'

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

export function request<T>(path: string) {
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: joinUrl(apiBaseUrl, path),
      method: 'GET',
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`请求失败：${res.statusCode}`))
          return
        }

        const body = res.data as ApiResponse<T>

        if (!body?.success) {
          reject(new Error(body?.message || '请求失败'))
          return
        }

        resolve(body.data)
      },
      fail: (error) => {
        reject(error)
      },
    })
  })
}
