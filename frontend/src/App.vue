<template>
  <div class="app-container">
    <!-- Cesium 地图容器 -->
    <div class="map-container">
      <CesiumMap ref="cesiumMapRef" @ready="onMapReady" />
    </div>

    <!-- 聊天侧边栏 -->
    <div class="sidebar-container" :class="{ collapsed: sidebarCollapsed }">
      <ChatSidebar
        :collapsed="sidebarCollapsed"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
        @sendMessage="handleSendMessage"
        :messages="chatMessages"
        :loading="chatLoading"
        :status="chatStatus"
      />
    </div>

    <!-- 状态提示 -->
    <div class="status-bar" v-if="mapReady">
      <span class="status-indicator"></span>
      <span>地图已就绪</span>
      <span v-if="toolStatus" class="tool-status">| {{ toolStatus }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import CesiumMap from './components/CesiumMap/CesiumMap.vue'
import ChatSidebar from './components/ChatSidebar/ChatSidebar.vue'
import { useToolExecutor, searchPOIHandler, flyToLocationHandler, drawMarkerHandler, drawCircleHandler, clearAllHandler } from './composables/useToolExecutor.js'
import { createChatService } from './services/chatService.js'

// 地图相关状态
const cesiumMapRef = ref(null)
const mapReady = ref(false)
const viewer = ref(null)

// 侧边栏状态
const sidebarCollapsed = ref(false)

// 工具执行器
const toolExecutor = ref(null)

// 聊天服务
const chatService = ref(null)
const chatMessages = ref([])
const chatLoading = ref(false)
const chatStatus = ref('')
const toolStatus = ref('')

// 地图就绪回调
const onMapReady = (cesiumViewer) => {
  viewer.value = cesiumViewer
  console.log('[App] 地图已就绪')

  // 初始化工具执行器
  toolExecutor.value = useToolExecutor(cesiumViewer)

  // 注册所有工具
  toolExecutor.value.registerTools({
    search_poi: searchPOIHandler,
    fly_to_location: flyToLocationHandler,
    draw_marker: drawMarkerHandler,
    draw_circle: drawCircleHandler,
    clear_all: clearAllHandler
  })

  console.log('[App] 工具执行器已初始化')

  // 初始化聊天服务
  chatService.value = createChatService(toolExecutor.value)

  // 监听消息列表（深度监听，支持流式输出更新）
  watch(
    () => {
      const msgs = chatService.value?.messages
      return msgs && msgs.value !== undefined ? msgs.value : msgs
    },
    (newMessages) => {
      if (newMessages) {
        chatMessages.value = [...newMessages]
        console.log('[App] watch 监听到 messages 变更，当前消息数量:', chatMessages.value.length)
      } else {
        chatMessages.value = []
      }
    },
    { deep: true, immediate: true }
  )

  // 监听加载状态
  watch(
    () => {
      const loading = chatService.value?.isLoading
      return loading && loading.value !== undefined ? loading.value : loading
    },
    (loading) => {
      chatLoading.value = !!loading
    },
    { immediate: true }
  )

  // 监听当前状态
  watch(
    () => {
      const status = chatService.value?.currentStatus
      return status && status.value !== undefined ? status.value : status
    },
    (status) => {
      chatStatus.value = status || ''
    },
    { immediate: true }
  )

  // 监听工具执行状态
  watch(() => toolExecutor.value.isExecuting.value, (executing) => {
    if (executing) {
      toolStatus.value = '执行工具中...'
    } else {
      toolStatus.value = ''
    }
  })

  mapReady.value = true
}

// 发送消息处理
const handleSendMessage = async (content) => {
  console.log('[App] 收到发送消息指令，内容:', content)
  console.log('[App] 当前 chatService 是否就绪:', !!chatService.value)
  
  if (!chatService.value) {
    console.warn('[App] 聊天服务未初始化')
    return
  }

  try {
    console.log('[App] 开始调用 chatService.sendMessage...')
    await chatService.value.sendMessage(content, {
      // 地图上下文信息
      center: viewer.value ? {
        longitude: 116.3975,
        latitude: 39.9085
      } : null
    })
    console.log('[App] chatService.sendMessage 调用结束，当前消息数量:', chatMessages.value.length)
  } catch (err) {
    console.error('[App] 发送消息出错:', err)
  }
}

// 地图就绪回调
onMounted(() => {
  // CesiumMap 组件会触发 ready 事件
  console.log('[App] 应用已启动')
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
}

/* 地图容器 */
.map-container {
  flex: 1;
  height: 100%;
  position: relative;
}

/* 侧边栏容器 */
.sidebar-container {
  width: 380px;
  height: 100%;
  transition: width 0.3s ease;
  z-index: 100;
}

.sidebar-container.collapsed {
  width: 48px;
}

/* 状态栏 */
.status-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 200;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.tool-status {
  color: #fbbf24;
  margin-left: 4px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
