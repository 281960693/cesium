# 阶段二：SSE 流式通信与 Agent 核心中枢

## 2.1 SSE 双向通信链路

### 什么是 SSE？

**Server-Sent Events (SSE)** 是一种服务器向客户端推送数据的技术，基于 HTTP 协议，具有以下特点：

```
对比三种实时通信方案：

WebSocket：
  协议：ws:// 或 wss://
  方向：双向通信
  复杂度：高（需要专门的服务器支持）
  适用场景：聊天室、实时游戏

SSE (Server-Sent Events)：
  协议：HTTP/HTTPS
  方向：服务器 → 客户端（单向）
  复杂度：低（标准 HTTP 协议）
  适用场景：AI 流式输出、实时通知

Long Polling：
  协议：HTTP/HTTPS
  方向：客户端轮询
  复杂度：中
  适用场景：兼容旧浏览器
```

**为什么选择 SSE？**

1. **大模型输出特性**：LLM 是单向输出（服务器生成文本推送给客户端），不需要客户端频繁发送
2. **浏览器原生支持**：EventSource API 开箱即用
3. **自动重连**：内置断线重连机制
4. **实现简单**：不需要额外的服务器框架

### SSE 通信流程

```
┌─────────────────────────────────────────────────────────────┐
│                      SSE 通信流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client                          Server                    │
│    │                               │                       │
│    │  1. POST /api/chat/stream     │                       │
│    │  ───────────────────────────> │                       │
│    │                               │                       │
│    │  2. HTTP 200                  │                       │
│    │  Content-Type: text/event-stream                       │
│    │  <─────────────────────────── │                       │
│    │                               │                       │
│    │  3. data: {"type":"text",...} │                       │
│    │  <─────────────────────────── │  (逐块推送)           │
│    │                               │                       │
│    │  4. data: {"type":"text",...} │                       │
│    │  <─────────────────────────── │                       │
│    │                               │                       │
│    │  5. data: [DONE]              │                       │
│    │  <─────────────────────────── │  (结束标记)           │
│    │                               │                       │
└─────────────────────────────────────────────────────────────┘
```

### 前端实现 (fetch + ReadableStream)

```javascript
// SSE 客户端实现
async function chatStream(message, onChunk, onDone) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })

  // 获取 ReadableStream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    // 解码二进制数据
    const chunk = decoder.decode(value)

    // 解析 SSE 格式
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          onDone()
        } else {
          const parsed = JSON.parse(data)
          onChunk(parsed)
        }
      }
    }
  }
}
```

### 后端实现 (Express SSE)

```javascript
// Express SSE 中间件
app.post('/api/chat/stream', (req, res) => {
  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // 发送数据
  function sendEvent(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  // 发送完成标记
  function sendDone() {
    res.write('data: [DONE]\n\n')
    res.end()
  }

  // 模拟流式输出
  const text = '你好，我是 GIS 助手...'
  for (const char of text) {
    sendEvent({ type: 'text', content: char })
  }
  sendDone()
})
```

---

## 2.2 自定义通信协议

### 协议设计目标

将大模型的输出分为两类：
1. **自然语言**：对用户说的话（显示在聊天框）
2. **系统指令**：JSON 格式的函数调用（在前端执行）

### 数据帧格式

```typescript
// 消息类型定义
interface SSEMessage {
  // 消息类型
  type: 'text' | 'tool_call' | 'tool_result' | 'status' | 'error'

  // 根据类型不同，内容不同
  content?: string          // text 类型的文本内容
  name?: string             // tool_call 类型的工具名称
  arguments?: object        // tool_call 类型的参数
  result?: any              // tool_result 类型的工具执行结果
  status?: string           // status 类型的状态描述
  error?: string            // error 类型的错误信息
}
```

### 消息类型说明

```yaml
# 消息类型枚举
text:
  description: 自然语言文本
  示例: { type: "text", content: "我来帮你查询附近的医院" }

tool_call:
  description: 工具调用指令（前端执行）
  示例:
    type: "tool_call"
    name: "search_poi"
    arguments: { keyword: "医院", radius: 1000 }

tool_result:
  description: 工具执行结果（从前端返回）
  示例:
    type: "tool_result"
    name: "search_poi"
    result: { count: 5, pois: [...] }

status:
  description: 状态提示
  示例: { type: "status", content: "正在查询中..." }

error:
  description: 错误信息
  示例: { type: "error", content: "查询失败，请重试" }
```

### 前端消息解析器

```javascript
// 消息解析器
function parseSSEMessage(rawData) {
  const messages = []

  // 按行分割
  const lines = rawData.split('\n')

  for (const line of lines) {
    // 跳过空行和非数据行
    if (!line.startsWith('data: ')) continue

    const data = line.slice(6).trim()
    if (data === '[DONE]') {
      messages.push({ type: 'DONE' })
      continue
    }

    try {
      const parsed = JSON.parse(data)
      messages.push(parsed)
    } catch (e) {
      console.warn('解析 SSE 数据失败:', data)
    }
  }

  return messages
}

// 使用示例
const rawSSE = `
data: {"type":"text","content":"我来帮你"}
data: {"type":"tool_call","name":"search_poi","arguments":{}}
data: {"type":"status","content":"查询中"}
data: [DONE]
`

const messages = parseSSEMessage(rawSSE)
// messages = [
//   { type: 'text', content: '我来帮你' },
//   { type: 'tool_call', name: 'search_poi', arguments: {} },
//   { type: 'status', content: '查询中' },
//   { type: 'DONE' }
// ]
```

---

## 2.3 Agent 大脑系统设计

### System Prompt 设计

```markdown
# 角色定义
你是 WebGIS 智能助手，一个专业的空间数据分析专家。

# 能力边界
你可以：
- 搜索和分析 POI 数据
- 在 3D 地图上标记位置
- 绘制空间范围（圆形、多边形）
- 计算距离和面积
- 分析空间关系

你不可以：
- 执行与 GIS 无关的任务
- 访问用户的私人数据
- 修改系统设置

# 工作流程
1. 理解用户意图
2. 确定需要调用的工具
3. 生成工具调用参数
4. 等待工具执行结果
5. 用自然语言总结结果

# 输出格式
对于用户可见的内容，使用自然语言。
对于需要执行的操作，输出 JSON 格式的工具调用。

# 示例
用户: "查询附近 1 公里内的医院"
回复:
我来帮你查询附近 1 公里内的医院。

{"type": "tool_call", "name": "search_poi", "arguments": {"keyword": "医院", "radius": 1000}}

查询完成，找到 5 家医院。我已将它们标记在地图上。
```

### Prompt 工程最佳实践

```
1. 明确角色：告诉模型它是谁
   ❌ "你是一个助手"
   ✅ "你是 WebGIS 智能助手，一个专业的空间数据分析专家"

2. 明确能力边界：能做什么，不能做什么
   ✅ 列出具体能力清单
   ✅ 明确禁止行为

3. 结构化输出：指定输出格式
   ✅ 使用 JSON Schema 描述工具调用格式
   ✅ 提供输入输出示例

4. Few-shot 示例：给模型学习样本
   ✅ 提供 2-3 个完整的对话示例

5. 错误处理：告诉模型遇到错误怎么办
   ✅ "如果工具调用失败，告诉用户原因并建议重试"
```

---

## 2.4 工具注册表 (Tool Registry)

### 设计原理

工具注册表是 Agent 能力的"说明书"，告诉大模型：
1. 有哪些工具可用
2. 每个工具的功能
3. 调用时需要哪些参数

```
┌─────────────────────────────────────────────────────────────┐
│                    工具注册表架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  System Prompt                    Tool Registry             │
│  ┌────────────────────┐          ┌────────────────────┐   │
│  │ 你是一个 GIS 专家    │  ───>   │ search_poi         │   │
│  │ 可以搜索 POI...     │          │ fly_to_location    │   │
│  └────────────────────┘          │ draw_marker        │   │
│                                  │ draw_circle        │   │
│                                   └────────────────────┘   │
│                                           │                 │
│                                           ▼                 │
│                              ┌────────────────────┐        │
│                              │   LLM (GPT-4)      │        │
│                              │   Function Calling  │        │
│                              └────────────────────┘        │
│                                           │                 │
│                                           ▼                 │
│                              ┌────────────────────┐        │
│                              │   前端执行工具       │        │
│                              │   search_poi()     │        │
│                              └────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### JSON Schema 定义

```json
{
  "name": "search_poi",
  "description": "根据关键词搜索附近的兴趣点（POI）",
  "parameters": {
    "type": "object",
    "properties": {
      "keyword": {
        "type": "string",
        "description": "搜索关键词，如'医院'、'餐厅'"
      },
      "location": {
        "type": "object",
        "properties": {
          "longitude": { "type": "number" },
          "latitude": { "type": "number" }
        },
        "description": "搜索中心点坐标"
      },
      "radius": {
        "type": "number",
        "description": "搜索半径（米），默认 1000"
      }
    },
    "required": ["keyword"]
  }
}
```

### 工具注册表示例

```javascript
const toolRegistry = {
  // 搜索类工具
  search_poi: {
    name: 'search_poi',
    description: '根据关键词搜索附近的兴趣点',
    parameters: { /* JSON Schema */ },
    handler: async (args) => {
      // 调用后端 API
      return await searchPOI(args)
    }
  },

  // 地图控制类工具
  fly_to_location: {
    name: 'fly_to_location',
    description: '控制地图视角飞行到指定位置',
    parameters: { /* JSON Schema */ },
    handler: (args, viewer) => {
      // 调用 Cesium API
      viewer.camera.flyTo(...)
    }
  },

  // 绘制类工具
  draw_marker: {
    name: 'draw_marker',
    description: '在地图上绘制标记点',
    parameters: { /* JSON Schema */ },
    handler: (args, viewer) => {
      // 调用 Cesium API
      viewer.entities.add(...)
    }
  }
}
```

---

## 2.5 工具执行流程

### 完整流程

```
┌─────────────────────────────────────────────────────────────┐
│                    工具执行流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 用户输入                                                 │
│     "查询附近 1 公里内的医院"                                │
│                          │                                  │
│                          ▼                                  │
│  2. Agent 分析意图                                           │
│     识别：需要搜索 POI                                       │
│     决定调用：search_poi                                    │
│                          │                                  │
│                          ▼                                  │
│  3. 生成工具调用参数                                         │
│     {                                                       │
│       "type": "tool_call",                                 │
│       "name": "search_poi",                                │
│       "arguments": {                                        │
│         "keyword": "医院",                                  │
│         "radius": 1000                                      │
│       }                                                     │
│     }                                                       │
│                          │                                  │
│                          ▼                                  │
│  4. 前端接收并执行工具                                       │
│     - 解析 JSON                                             │
│     - 调用对应的 handler 函数                                │
│     - 获取执行结果                                           │
│                          │                                  │
│                          ▼                                  │
│  5. 将结果返回给 Agent                                       │
│     {                                                       │
│       "type": "tool_result",                               │
│       "name": "search_poi",                                │
│       "result": { "count": 5, "pois": [...] }              │
│     }                                                       │
│                          │                                  │
│                          ▼                                  │
│  6. Agent 生成自然语言回复                                   │
│     "查询完成，找到 5 家医院。我已将它们标记在地图上。"       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 多步工具调用

```
复杂任务示例："查询最近的医院，并绘制 500 米范围的围栏"

Step 1: search_poi({ keyword: "医院" })
        → 返回医院列表

Step 2: 选择距离最近的医院
        → 计算距离，排序

Step 3: fly_to_location({ longitude, latitude })
        → 飞行到最近医院

Step 4: draw_marker({ longitude, latitude, name })
        → 标记医院位置

Step 5: draw_circle({ longitude, latitude, radius: 500 })
        → 绘制 500 米围栏

Step 6: 生成自然语言回复
        → "已为你找到最近的 XX 医院，并绘制了 500 米范围的围栏。"
```

---

## 2.6 前端工具执行器

### ToolExecutor 设计

```javascript
// 工具执行器
class ToolExecutor {
  constructor(viewer) {
    this.viewer = viewer
    this.registry = new Map()
  }

  // 注册工具
  register(name, handler) {
    this.registry.set(name, handler)
  }

  // 执行工具
  async execute(toolCall) {
    const { name, arguments: args } = toolCall

    const handler = this.registry.get(name)
    if (!handler) {
      throw new Error(`未知工具: ${name}`)
    }

    try {
      const result = await handler(args, this.viewer)
      return { success: true, result }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// 使用示例
const executor = new ToolExecutor(viewer)

// 注册工具
executor.register('search_poi', searchPOIHandler)
executor.register('fly_to_location', flyToHandler)
executor.register('draw_marker', drawMarkerHandler)
executor.register('draw_circle', drawCircleHandler)

// 执行工具调用
const result = await executor.execute({
  name: 'search_poi',
  arguments: { keyword: '医院', radius: 1000 }
})
```

---

## 2.7 MVP 阶段二交付物

### 代码交付物

```
frontend/src/
├── composables/
│   ├── useCesium.js          # Cesium 地图管理
│   ├── useSSE.js             # SSE 通信管理 (新增)
│   └── useToolExecutor.js    # 工具执行器 (新增)
├── services/
│   ├── chatService.js        # 聊天服务 (新增)
│   └── toolRegistry.js       # 工具注册表 (新增)
└── components/
    └── ChatSidebar/
        └── ChatSidebar.vue   # 更新：接入 SSE
```

### 功能验证清单

- [ ] SSE 流式响应正常工作
- [ ] 消息逐字显示（打字机效果）
- [ ] 工具调用 JSON 正确解析
- [ ] 工具执行器正确调用工具
- [ ] [DONE] 标记正确处理
- [ ] 断线重连机制正常

---

## 2.8 常见问题

**Q: SSE 连接断开怎么办？**
```javascript
// 使用 EventSource API（自动重连）
const eventSource = new EventSource('/api/chat/stream')

eventSource.onmessage = (event) => {
  // 处理消息
}

eventSource.onerror = (error) => {
  console.error('SSE 错误:', error)
  // EventSource 会自动重连
}
```

**Q: 如何处理大模型返回格式错误的 JSON？**
```javascript
// 增加容错处理
function parseToolCall(raw) {
  try {
    return JSON.parse(raw)
  } catch (e) {
    // 尝试提取 JSON 部分
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('无法解析工具调用')
  }
}
```
