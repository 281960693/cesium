<template>
  <div class="message-list" ref="listRef">
    <!-- 消息项 -->
    <div
      v-for="message in messages"
      :key="message.id"
      class="message-item"
      :class="message.role"
    >
      <!-- 头像 -->
      <div class="avatar">
        <template v-if="message.role === 'user'">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </template>
        <template v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </template>
      </div>

      <!-- 消息内容 -->
      <div class="content">
        <div class="role-name">{{ message.role === 'user' ? '你' : 'GIS 助手' }}</div>
        
        <!-- 助手思考过程展示 -->
        <template v-if="message.role === 'assistant' && extractThinking(message.content)">
          <div class="thinking-box">
            <div class="thinking-header" @click="toggleThinking(message.id)">
              <span class="thinking-title">🧠 思考过程...</span>
              <svg 
                class="chevron-icon" 
                :class="{ rotated: collapsedThinkingMap[message.id] }"
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <div v-show="!collapsedThinkingMap[message.id]" class="thinking-content">
              {{ extractThinking(message.content) }}
            </div>
          </div>
        </template>

        <!-- 过滤思考过程后的真实回答内容 -->
        <div 
          class="message-content" 
          v-html="formatContent(filterThinking(message.content))"
          v-if="filterThinking(message.content) || message.role === 'user'"
        ></div>
        <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
      </div>
    </div>

    <!-- 加载中提示 -->
    <div v-if="loading" class="message-item assistant">
      <div class="avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="content">
        <div class="role-name">GIS 助手</div>
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const listRef = ref(null)
const collapsedThinkingMap = ref({})

// 提取 <thinking> 内的内容
const extractThinking = (content) => {
  if (!content) return ''
  const match = content.match(/<thinking>([\s\S]*?)(<\/thinking>|$)/)
  return match ? match[1].trim() : ''
}

// 过滤掉 <thinking>...</thinking> 部分，只留真实回答
const filterThinking = (content) => {
  if (!content) return ''
  return content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim()
}

// 折叠/展开思考过程
const toggleThinking = (id) => {
  collapsedThinkingMap.value[id] = !collapsedThinkingMap.value[id]
}

// 自动滚动到底部（在整个消息列表长度或内容变化时）
watch(
  () => props.messages,
  async () => {
    await nextTick()
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
    }
  },
  { deep: true }
)

// 格式化内容（支持换行）
const formatContent = (content) => {
  if (!content) return ''
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 滚动条样式 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* 消息项 */
.message-item {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.message-item.user {
  flex-direction: row-reverse;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头像 */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user .avatar {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.assistant .avatar {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

/* 内容区域 */
.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  text-align: left;
}

.user .content {
  align-items: flex-end;
  text-align: right;
}

.assistant .content {
  align-items: flex-start;
  text-align: left;
}

.role-name {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
}

.message-content {
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  line-height: 1.6;
  word-wrap: break-word;
  width: fit-content;
  max-width: 100%;
  text-align: left;
}

.user .message-content {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border-bottom-right-radius: 4px;
}

.assistant .message-content {
  background: rgba(255, 255, 255, 0.1);
  border-bottom-left-radius: 4px;
}

.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.timestamp {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 4px;
}

.user .timestamp {
  text-align: right;
}

/* 打字动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 思考过程样式框 */
.thinking-box {
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 3px solid rgba(139, 92, 246, 0.5);
  border-radius: 4px;
  max-width: 100%;
  width: fit-content;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.thinking-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.chevron-icon {
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(-90deg);
}

.thinking-content {
  padding: 0 12px 10px 12px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.45);
  white-space: pre-wrap;
  border-top: 1px solid rgba(255, 255, 255, 0.02);
  padding-top: 8px;
  font-family: monospace;
}
</style>
