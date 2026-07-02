/**
 * auth - 鉴权中间件
 *
 * 提供 API Key 验证功能
 */

import { config } from '../config.js'

/**
 * API Key 验证中间件
 */
export function apiKeyAuth(req, res, next) {
  // 获取 API Key
  const apiKey = req.headers['x-api-key'] || req.query.apiKey

  // 检查是否提供 API Key
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: '缺少 API Key',
      message: '请在请求头中提供 X-API-Key'
    })
  }

  // 验证 API Key
  const validKeys = config.apiKeys || []
  if (!validKeys.includes(apiKey)) {
    return res.status(403).json({
      success: false,
      error: 'API Key 无效',
      message: '请提供有效的 API Key'
    })
  }

  // 将 API Key 信息添加到请求对象
  req.apiKey = apiKey

  next()
}

/**
 * 可选的 API Key 验证（不强制）
 */
export function optionalApiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey

  if (apiKey) {
    const validKeys = config.apiKeys || []
    if (validKeys.includes(apiKey)) {
      req.apiKey = apiKey
      req.isAuthenticated = true
    } else {
      req.isAuthenticated = false
    }
  } else {
    req.isAuthenticated = false
  }

  next()
}

export default {
  apiKeyAuth,
  optionalApiKeyAuth
}
