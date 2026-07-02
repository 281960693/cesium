# WebGIS Agent - 智能地理信息系统

基于 Cesium.js 和大语言模型的智能 WebGIS Agent，通过自然语言交互实现空间数据分析和可视化。

## 项目特性

- **3D 地图引擎**：基于 Cesium.js 的 3D 地球渲染
- **智能对话**：集成大语言模型，支持自然语言交互
- **流式响应**：SSE 实现"边思考边输出"的极速响应体验
- **工具调用**：Function Calling 实现 Agent 工具调度
- **GIS 工具箱**：POI 检索、地图打点、视角控制、围栏绘制等

## 技术栈

### 前端
- Vue 3 + Vite
- Cesium.js 3D 地图
- SSE 流式通信

### 后端
- Node.js + Express
- OpenAI 兼容 API（支持小米 MiMo、通义千问、智谱、Ollama 等）
- 天地图 API

## 项目结构

```
webgis-agent/
├── frontend/              # Vue3 前端项目
│   ├── src/
│   │   ├── components/    # Vue 组件
│   │   ├── composables/   # 组合式函数
│   │   ├── services/      # 服务层
│   │   └── utils/         # 工具函数
│   └── vite.config.js
│
├── backend/               # Express 后端
│   ├── src/
│   │   ├── routes/        # 路由
│   │   ├── services/      # 服务
│   │   └── middleware/     # 中间件
│   └── package.json
│
└── docs/                  # 项目文档
    └── 阶段一-*.md ... 阶段五-*.md
```

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd webgis-agent

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 配置

```bash
# 配置环境变量
cp .env.example .env

# 编辑 .env 文件，填入以下配置：
# - LLM_API_KEY: 大模型 API Key
# - TIANDITU_API_KEY: 天地图 API Key
```

### 启动

```bash
# 启动后端服务 (端口 8001)
cd backend
npm run dev

# 启动前端开发服务器 (端口 3000)
cd frontend
npm run dev
```

访问 http://localhost:3000

### 支持的大模型

本项目支持 OpenAI 兼容格式的 API，可以接入多种大模型：

| 模型 | 部署方式 | API 地址示例 |
|------|----------|-------------|
| 小米 MiMo | 本地部署 (Ollama/vLLM) | http://localhost:11434/v1 |
| 通义千问 | 阿里云 API | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| 智谱 GLM | 智谱 API | https://open.bigmodel.cn/api/paas/v4 |
| 本地模型 | Ollama | http://localhost:11434/v1 |

#### 小米 MiMo 配置示例

```bash
# 1. 使用 Ollama 部署 MiMo
ollama pull qwen2.5:7b  # 或其他兼容模型

# 2. 配置 .env 文件
LLM_API_KEY=ollama
LLM_API_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:7b
```

#### 通义千问配置示例

```bash
# 配置 .env 文件
LLM_API_KEY=your_dashscope_api_key
LLM_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-turbo
```

## 使用示例

```
用户: 查询附近的医院
助手: 我来帮你查询附近的医院。
      [执行工具: search_poi]
      查询完成！找到 5 家医院，我已将它们标记在地图上。

用户: 飞行到最近的医院
助手: 好的，我将为你飞行到最近的 XX 医院。
      [执行工具: fly_to_location]
      已到达目标位置。

用户: 绘制 500 米范围的围栏
助手: 已为你绘制 500 米范围的圆形围栏。
      [执行工具: draw_circle]
```

## 文档

详细设计文档请查看 `docs/` 目录：

- [阶段一：基础设施与地图基座搭建](docs/阶段一-基础设施与地图基座搭建.md)
- [阶段二：SSE 流式通信与 Agent 核心中枢](docs/阶段二-SSE流式通信与Agent核心中枢.md)
- [阶段三：原子化 GIS 工具箱开发](docs/阶段三-原子化GIS工具箱开发.md)
- [阶段四：复杂场景编排与异常兜底](docs/阶段四-复杂场景编排与异常兜底.md)
- [阶段五：企业级优化与部署上线](docs/阶段五-企业级优化与部署上线.md)

## 开发指南

### 添加新工具

1. 在 `frontend/src/services/toolRegistry.js` 中定义工具 Schema
2. 在 `frontend/src/composables/useToolExecutor.js` 中实现工具处理函数
3. 在 `App.vue` 中注册工具

### 代码规范

- 使用 Vue 3 Composition API
- 遵循 ESLint 规则
- 提交前运行 `npm run lint`

## 部署

### Docker 部署

```bash
# 构建镜像
docker build -t webgis-agent .

# 运行容器
docker run -p 8001:8001 \
  -e LLM_API_KEY=your_key \
  -e TIANDITU_API_KEY=your_key \
  webgis-agent
```

### Docker Compose

```bash
docker-compose up -d
```

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue 或联系维护者。
