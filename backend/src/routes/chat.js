/**
 * 聊天接口路由
 *
 * 提供：
 * 1. /api/chat - 普通聊天接口
 * 2. /api/chat/stream - SSE 流式聊天接口
 */

import { Router } from 'express'
import { streamChat, parseToolCall } from '../services/llmService.js'
import { generateSystemPrompt, getOpenAITools } from '../services/toolRegistry.js'

export const chatRouter = Router()

/**
 * POST /api/chat
 * 普通聊天接口（非流式）
 */
chatRouter.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      })
    }

    // 构建消息列表
    const messages = [
      { role: 'system', content: generateSystemPrompt() },
      ...history,
      { role: 'user', content: message }
    ]

    // 调用 LLM
    const response = await fetch(`${process.env.LLM_API_URL || 'http://localhost:11434/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LLM_API_KEY || 'ollama'}`
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'qwen2.5:7b',
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API 错误: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || '抱歉，无法生成回复'

    res.json({
      success: true,
      data: {
        reply,
        toolCalls: []
      }
    })
  } catch (error) {
    console.error('[Chat Error]', error)
    res.status(500).json({
      success: false,
      error: '处理请求时出错: ' + error.message
    })
  }
})

/**
 * POST /api/chat/stream
 * SSE 流式聊天接口
 */
chatRouter.post('/stream', async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: '消息内容不能为空'
      })
    }

    console.log('\n💬 ====== 收到大模型流式调用请求 ======\n')
    console.log(`[LLM Request] 用户当前输入: "${message}"`)
    console.log(`[LLM Request] 历史对话轮数: ${history.length} 轮`)

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 构建消息列表
    const messages = [
      { role: 'system', content: generateSystemPrompt() },
      ...history,
      { role: 'user', content: message }
    ]

    // 尝试调用真实的 LLM API
    try {
      await streamLLMResponse(res, messages)
    } catch (error) {
      console.error('[Stream] LLM API 调用失败，使用模拟响应:', error.message)
      // 降级到模拟响应
      await sendMockStreamResponse(res, message)
    }

    res.end()
  } catch (error) {
    console.error('[Stream Error]', error)
    res.end()
  }
})

// ============ 辅助函数 ============

/**
 * 调用真实 LLM API 并流式返回
 */
async function streamLLMResponse(res, messages) {
  console.log(`[LLM Request] 发送 API 请求到: ${process.env.LLM_API_URL || 'http://localhost:11434/v1'}/chat/completions`)
  console.log(`[LLM Request] 调用的模型型号: ${process.env.LLM_MODEL || 'qwen2.5:7b'}`)

  const response = await fetch(`${process.env.LLM_API_URL || 'http://localhost:11434/v1'}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY || 'ollama'}`
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'qwen2.5:7b',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  if (!response.ok) {
    throw new Error(`LLM API 错误: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''

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
        console.log(`\n✨ [LLM Response] 大模型文本回答已生成完毕. 长度: ${fullContent.length} 字`)
        console.log('[LLM Response] 完整输出内容:\n' + '-'.repeat(50) + '\n' + fullContent.trim() + '\n' + '-'.repeat(50))

        // 检查是否包含工具调用
        const toolCall = parseToolCall(fullContent)
        if (toolCall) {
          console.log(`🛠️ [LLM Response] 成功解析出工具调用指令: ${toolCall.name}`, toolCall.arguments)
          res.write(`data: ${JSON.stringify({
            type: 'tool_call',
            name: toolCall.name,
            arguments: toolCall.arguments
          })}\n\n`)
        } else {
          console.log('ℹ️ [LLM Response] 大模型未触发任何 GIS 工具调用.')
        }

        console.log('\n====== 大模型调用流式结束 ======\n')
        res.write('data: [DONE]\n\n')
        return
      }

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) {
          fullContent += content
          res.write(`data: ${JSON.stringify({
            type: 'text',
            content
          })}\n\n`)
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  // 如果没有发送 [DONE]，补发一个
  res.write('data: [DONE]\n\n')
}

/**
 * 模拟流式响应（降级方案）
 */
async function sendMockStreamResponse(res, message) {
  const chunks = [
    { type: 'text', content: '收到你的消息，' },
    { type: 'text', content: '正在分析中...\n' },
    { type: 'status', content: '思考中' },
    { type: 'text', content: `你说的是"${message}"对吗？` },
    { type: 'text', content: '\n\n我理解了你的需求，让我来帮你处理。' },
    { type: 'text', content: '\n\n（这是模拟响应，请配置 LLM API 以使用真实模型）' }
  ]

  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify(chunk)}\n\n`)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  res.write('data: [DONE]\n\n')
}
