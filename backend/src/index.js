/**
 * WebGIS Agent 后端服务入口
 *
 * 主要职责：
 * 1. 启动 Express 服务器
 * 2. 配置中间件 (CORS, Body Parser)
 * 3. 注册路由
 * 4. 处理静态资源
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { chatRouter } from './routes/chat.js'
import { toolsRouter } from './routes/tools.js'

// 加载环境变量
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8001

// ============ 中间件配置 ============

// CORS 跨域配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Body Parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ============ 路由注册 ============

// 聊天接口
app.use('/api/chat', chatRouter)

// 工具接口
app.use('/api/tools', toolsRouter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'webgis-agent-backend'
  })
})

// ============ 错误处理 ============

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `接口 ${req.method} ${req.path} 不存在`
  })
})

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  })
})

// ============ 启动服务器 ============

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║        WebGIS Agent Backend Server          ║
╠══════════════════════════════════════════════╣
║  Status:    Running                          ║
║  Port:      ${PORT}                            ║
║  URL:       http://localhost:${PORT}            ║
╚══════════════════════════════════════════════╝
  `)
})

export default app
