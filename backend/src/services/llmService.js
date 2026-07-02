/**
 * llmService - 大模型服务
 *
 * 支持 OpenAI 兼容格式的 API
 * 适用于：小米 MiMo、通义千问、智谱、本地 Ollama 等
 */

import { config } from '../config.js'

/**
 * 调用大模型 API（流式输出）
 * @param {Object} options - 调用参数
 * @param {Array} options.messages - 消息列表
 * @param {Function} options.onChunk - 数据块回调
 * @param {Function} options.onDone - 完成回调
 * @param {Function} options.onError - 错误回调
 */
export async function streamChat(options) {
  const {
    messages,
    onChunk = () => {},
    onDone = () => {},
    onError = () => {}
  } = options

  try {
    const response = await fetch(`${config.llm.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.llm.apiKey}`
      },
      body: JSON.stringify({
        model: config.llm.model,
        messages,
        stream: true,
        temperature: config.llm.temperature,
        max_tokens: config.llm.maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API 错误: ${response.status} ${response.statusText}`)
    }

    // 读取流式响应
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

        const data = trimmedLine.slice(6)
        if (data === '[DONE]') {
          onDone()
          continue
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            onChunk(content)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

  } catch (error) {
    onError(error)
    throw error
  }
}

/**
 * 调用大模型 API（非流式）
 * @param {Object} options - 调用参数
 * @param {Array} options.messages - 消息列表
 * @returns {Promise<string>} 模型回复
 */
export async function chat(options) {
  const { messages } = options

  const response = await fetch(`${config.llm.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llm.apiKey}`
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      stream: false,
      temperature: config.llm.temperature,
      max_tokens: config.llm.maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`LLM API 错误: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

/**
 * 调用大模型 API（带 Function Calling）
 * @param {Object} options - 调用参数
 * @param {Array} options.messages - 消息列表
 * @param {Array} options.tools - 工具定义
 * @returns {Promise<Object>} 模型回复（可能包含工具调用）
 */
export async function chatWithTools(options) {
  const { messages, tools = [] } = options

  const response = await fetch(`${config.llm.apiUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.llm.apiKey}`
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      stream: false,
      temperature: config.llm.temperature,
      max_tokens: config.llm.maxTokens
    })
  })

  if (!response.ok) {
    throw new Error(`LLM API 错误: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message || {}
}

/**
 * 解析流式响应中的工具调用
 * @param {string} content - 模型输出内容
 * @returns {Object|null} 解析出的工具调用
 */
export function parseToolCall(content) {
  // 尝试解析 JSON 格式的工具调用
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.type === 'tool_call' && parsed.name) {
        return {
          name: parsed.name,
          arguments: parsed.arguments || {}
        }
      }
    } catch (e) {
      // 解析失败
    }
  }

  // 尝试直接解析 JSON
  try {
    const parsed = JSON.parse(content)
    if (parsed.type === 'tool_call' && parsed.name) {
      return {
        name: parsed.name,
        arguments: parsed.arguments || {}
      }
    }
  } catch (e) {
    // 解析失败
  }

  return null
}

export default {
  streamChat,
  chat,
  chatWithTools,
  parseToolCall
}
