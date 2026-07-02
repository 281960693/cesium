<template>
  <div class="chat-sidebar" :class="{ collapsed }">
    <!-- 折叠按钮 -->
    <button class="toggle-btn" @click="$emit('toggle')">
      <svg v-if="!collapsed" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>

    <!-- 展开状态的内容 -->
    <template v-if="!collapsed">
      <!-- 标题栏 -->
      <div class="sidebar-header">
        <div class="header-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <h2>GIS 智能助手</h2>
        </div>
        <span class="badge">AI</span>
      </div>

      <!-- 消息列表 -->
      <MessageList :messages="messages" :loading="loading" />

      <!-- 输入区域 -->
      <InputArea @send="$emit('sendMessage', $event)" :disabled="loading" />
    </template>

    <!-- 折叠状态的图标 -->
    <template v-else>
      <div class="collapsed-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
    </template>
  </div>
</template>

<script setup>
import MessageList from './MessageList.vue'
import InputArea from './InputArea.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  messages: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    default: ''
  }
})

defineEmits(['toggle', 'sendMessage'])
</script>

<style scoped>
.chat-sidebar {
  height: 100%;
  background: linear-gradient(180deg, #1a1f2e 0%, #0f1219 100%);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: width 0.3s ease;
}

.chat-sidebar:not(.collapsed) {
  width: 380px;
}

.chat-sidebar.collapsed {
  width: 48px;
  align-items: center;
}

/* 折叠按钮 */
.toggle-btn {
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  background: #2563eb;
  border: none;
  border-radius: 6px 0 0 6px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: #1d4ed8;
}

/* 标题栏 */
.sidebar-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

.header-content svg {
  color: #60a5fa;
}

.header-content h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.badge {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* 折叠状态图标 */
.collapsed-icon {
  margin-top: 60px;
  color: #60a5fa;
  cursor: pointer;
}

.collapsed-icon:hover {
  color: #93c5fd;
}
</style>
