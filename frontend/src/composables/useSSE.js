/**
 * useSSE - Server-Sent Events 通信管理
 *
 * 职责：
 * 1. 管理 SSE 连接
 * 2. 解析流式数据
 * 3. 处理工具调用
 * 4. 断线重连
 */

import { ref, readonly } from 'vue'

/**
 * 创建 SSE 客户端
 * @param {string} url - SSE 端点 URL
 * @returns {Object} SSE 客户端实例
 */
export function useSSE() {
  // 状态
  const isConnected = ref(false)
  const isStreaming = ref(false)
  const error = ref(null)

  // 当前连接
  let abortController = null

  /**
   * 发送消息并接收流式响应
   * @param {string} message - 用户消息
   * @param {Object} handlers - 回调函数
   * @param {Function} handlers.onText - 文本块回调
   * @param {Function} handlers.onToolCall - 工具调用回调
   * @param {Function} handlers.onStatus - 状态更新回调
   * @param {Function} handlers.onError - 错误回调
   * @param {Function} handlers.onDone - 完成回调
   */
  async function sendMessage(message, handlers = {}) {
    const {
      onText = () => {},
      onToolCall = () => {},
      onStatus = () => {},
      onError = () => {},
      onDone = () => {}
    } = handlers

    // 如果正在流式传输，先取消
    if (abortController) {
      abortController.abort()
    }

    abortController = new AbortController()
    isStreaming.value = true
    error.value = null

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: abortController.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      isConnected.value = true

      // 获取 ReadableStream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 解码二进制数据
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // 处理完整的 SSE 消息
        const lines = buffer.split('\n')
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
            continue
          }

          const data = trimmedLine.slice(6)

          // 处理结束标记
          if (data === '[DONE]') {
            onDone()
            continue
          }

          // 解析 JSON 数据
          try {
            const parsed = JSON.parse(data)
            handleMessage(parsed, { onText, onToolCall, onStatus, onError })
          } catch (e) {
            console.warn('[SSE] 解析数据失败:', data, e)
          }
        }
      }

      // 处理缓冲区剩余数据
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6)
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data)
                handleMessage(parsed, { onText, onToolCall, onStatus, onError })
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        }
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('[SSE] 连接已取消')
      } else {
        console.error('[SSE] 连接错误:', e)
        error.value = e.message
        onError(e)
      }
    } finally {
      isStreaming.value = false
      isConnected.value = false
      abortController = null
    }
  }

  /**
   * 处理单条消息
   */
  function handleMessage(message, handlers) {
    const { onText, onToolCall, onStatus, onError } = handlers

    switch (message.type) {
      case 'text':
        onText(message.content)
        break

      case 'tool_call':
        onToolCall({
          id: message.id,
          name: message.name,
          arguments: message.arguments
        })
        break

      case 'tool_result':
        // 工具执行结果（通常由前端发送给后端）
        break

      case 'status':
        onStatus(message.content)
        break

      case 'error':
        onError(new Error(message.content))
        break

      default:
        console.warn('[SSE] 未知消息类型:', message.type)
    }
  }

  /**
   * 取消当前流式传输
   */
  function cancel() {
    if (abortController) {
      abortController.abort()
    }
  }

  return {
    isConnected: readonly(isConnected),
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    sendMessage,
    cancel
  }
}

export default useSSE
