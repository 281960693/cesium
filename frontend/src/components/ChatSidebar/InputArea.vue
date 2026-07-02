<template>
  <div class="input-area">
    <!-- 快捷操作提示 -->
    <div class="quick-actions">
      <button class="quick-btn" @click="sendQuickMessage('查询附近的医院')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        查询医院
      </button>
      <button class="quick-btn" @click="sendQuickMessage('查找周边的餐厅')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/>
        </svg>
        查找餐厅
      </button>
      <button class="quick-btn" @click="sendQuickMessage('显示我的位置')">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        显示位置
      </button>
    </div>

    <!-- 输入框 -->
    <div class="input-wrapper">
      <textarea
        ref="inputRef"
        v-model="inputValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @keydown.enter.exact="handleEnter"
        @input="autoResize"
        rows="1"
      ></textarea>
      <button
        class="send-btn"
        :disabled="!inputValue.trim() || disabled"
        @click="handleSend"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>

    <!-- 提示文字 -->
    <div class="input-hint">
      按 Enter 发送，Shift + Enter 换行
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '输入你的问题...'
  }
})

const emit = defineEmits(['send'])

const inputValue = ref('')
const inputRef = ref(null)

// 处理回车发送
const handleEnter = (e) => {
  if (!e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

// 发送消息
const handleSend = () => {
  const content = inputValue.value.trim()
  if (content && !props.disabled) {
    emit('send', content)
    inputValue.value = ''
    // 重置输入框高度
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.style.height = 'auto'
      }
    })
  }
}

// 发送快捷消息
const sendQuickMessage = (message) => {
  if (!props.disabled) {
    emit('send', message)
  }
}

// 自动调整高度
const autoResize = () => {
  const textarea = inputRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }
}
</script>

<style scoped>
.input-area {
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.quick-btn svg {
  opacity: 0.7;
}

/* 输入框 */
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: rgba(59, 130, 246, 0.5);
}

textarea {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
  font-family: inherit;
}

textarea::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

textarea:disabled {
  opacity: 0.5;
}

/* 发送按钮 */
.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn svg {
  transform: translateX(1px);
}

/* 提示文字 */
.input-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin-top: 8px;
}
</style>
