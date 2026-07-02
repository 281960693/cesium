/**
 * config - 应用配置
 *
 * 统一管理所有配置项
 */

import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

/**
 * 应用配置
 */
export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '8001'),
    env: process.env.NODE_ENV || 'development'
  },

  // 大模型 API 配置
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    apiUrl: process.env.LLM_API_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7')
  },

  // 天地图 API 配置
  tianditu: {
    apiKey: process.env.TIANDITU_API_KEY || ''
  },

  // 高德地图 API 配置（备选）
  amap: {
    apiKey: process.env.AMAP_API_KEY || ''
  },

  // API Keys（用于鉴权）
  apiKeys: process.env.API_KEYS?.split(',').filter(Boolean) || [],

  // 限流配置
  rateLimit: {
    global: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 分钟
      max: parseInt(process.env.RATE_LIMIT_MAX || '100')
    },
    chat: {
      windowMs: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW || '60000'), // 1 分钟
      max: parseInt(process.env.CHAT_RATE_LIMIT_MAX || '20')
    }
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

/**
 * 验证必需的配置项
 */
export function validateConfig() {
  const required = ['llm.apiKey', 'tianditu.apiKey']
  const missing = []

  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config)
    if (!value) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    console.warn(`[Config] 缺少配置项: ${missing.join(', ')}`)
    console.warn('[Config] 请在 .env 文件中配置相应的环境变量')
  }

  return missing.length === 0
}

export default config
