/**
 * chatService - 聊天服务
 *
 * 职责：
 * 1. 管理对话历史
 * 2. 处理消息发送
 * 3. 协调 SSE 和工具执行
 */

import { ref, readonly } from 'vue'
import { useSSE } from '@/composables/useSSE.js'
import { generateSystemPrompt } from './toolRegistry.js'

/**
 * 创建聊天服务
 * @param {Object} toolExecutor - 工具执行器实例
 * @returns {Object} 聊天服务实例
 */
export function createChatService(toolExecutor) {
  // 对话历史
  const messages = ref([])

  // 状态
  const isLoading = ref(false)
  const currentStatus = ref('')
  const error = ref(null)

  // SSE 客户端
  const sse = useSSE()

  /**
   * 发送用户消息
   * @param {string} content - 用户输入的消息内容
   * @param {Object} mapContext - 地图上下文信息（可选）
   * @returns {Promise<void>}
   */
  async function sendMessage(content, mapContext = {}) {
    console.log('[ChatService] sendMessage 被调用，收到消息内容:', content)
    if (!content.trim() || isLoading.value) {
      console.warn('[ChatService] 发送终止。原因：内容为空或正在加载中。isLoading:', isLoading.value)
      return
    }

    // 添加用户消息
    const userMessage = createMessage('user', content)
    messages.value.push(userMessage)
    console.log('[ChatService] 已将用户消息加入 messages 列表:', userMessage)

    // 清空输入，设置加载状态
    isLoading.value = true
    currentStatus.value = '思考中...'
    error.value = null

    // 创建助手消息占位符
    const assistantMessage = createMessage('assistant', '')
    messages.value.push(assistantMessage)
    console.log('[ChatService] 已将助手占位消息加入 messages 列表:', assistantMessage)

    // 收集完整回复
    let fullReply = ''

    try {
      await sse.sendMessage(content, {
        // 处理文本块
        onText: (text) => {
          fullReply += text
          updateAssistantMessage(assistantMessage.id, fullReply)
        },

        // 处理工具调用
        onToolCall: async (toolCall) => {
          currentStatus.value = `执行工具: ${toolCall.name}...`

          // 添加工具调用到消息
          addToolCallToMessage(assistantMessage, toolCall)

          // 执行工具
          const result = await toolExecutor.executeTool(toolCall)

          // 添加工具结果到消息
          addToolResultToMessage(assistantMessage, toolCall.id, result)

          // 更新状态
          if (result.success) {
            currentStatus.value = `${toolCall.name} 执行完成`
          } else {
            currentStatus.value = `${toolCall.name} 执行失败: ${result.error}`
          }
        },

        // 处理状态更新
        onStatus: (status) => {
          currentStatus.value = status
        },

        // 处理错误
        onError: (e) => {
          error.value = e.message || '发送消息失败'
          currentStatus.value = '出错了'
        },

        // 处理完成
        onDone: () => {
          currentStatus.value = ''
          isLoading.value = false
        }
      })
    } catch (e) {
      error.value = e.message
      currentStatus.value = '出错了'
      isLoading.value = false
    }
  }

  /**
   * 创建消息对象
   */
  function createMessage(role, content) {
    return {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      toolCalls: []
    }
  }

  /**
   * 更新助手消息内容
   */
  function updateAssistantMessage(messageId, content) {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.content = content
    }
  }

  /**
   * 添加工具调用到消息
   */
  function addToolCallToMessage(message, toolCall) {
    message.toolCalls.push({
      id: toolCall.id || generateId(),
      name: toolCall.name,
      arguments: toolCall.arguments,
      status: 'executing',
      result: null
    })
  }

  /**
   * 添加工具结果到消息
   */
  function addToolResultToMessage(message, toolCallId, result) {
    const toolCall = message.toolCalls.find(tc => tc.id === toolCallId)
    if (toolCall) {
      toolCall.status = result.success ? 'success' : 'error'
      toolCall.result = result
    }
  }

  /**
   * 生成唯一 ID
   */
  function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 清除对话历史
   */
  function clearHistory() {
    messages.value = []
  }

  /**
   * 取消当前流式传输
   */
  function cancel() {
    sse.cancel()
    isLoading.value = false
    currentStatus.value = ''
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    currentStatus: readonly(currentStatus),
    error: readonly(error),
    sendMessage,
    clearHistory,
    cancel
  }
}

export default createChatService
