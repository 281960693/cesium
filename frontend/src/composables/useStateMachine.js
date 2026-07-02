/**
 * useStateMachine - 聊天状态机
 *
 * 职责：
 * 1. 管理聊天状态转换
 * 2. 状态变更通知
 * 3. 状态历史记录
 */

import { ref, readonly, computed } from 'vue'

// 状态枚举
export const ChatState = {
  IDLE: 'idle',
  THINKING: 'thinking',
  EXECUTING: 'executing',
  GENERATING: 'generating',
  ERROR: 'error'
}

// 状态描述
export const StateDescriptions = {
  [ChatState.IDLE]: '空闲',
  [ChatState.THINKING]: '思考中',
  [ChatState.EXECUTING]: '执行工具中',
  [ChatState.GENERATING]: '生成回复中',
  [ChatState.ERROR]: '出错'
}

// 合法的状态转换
const validTransitions = {
  [ChatState.IDLE]: [ChatState.THINKING],
  [ChatState.THINKING]: [ChatState.EXECUTING, ChatState.GENERATING, ChatState.ERROR],
  [ChatState.EXECUTING]: [ChatState.THINKING, ChatState.GENERATING, ChatState.ERROR],
  [ChatState.GENERATING]: [ChatState.IDLE, ChatState.ERROR],
  [ChatState.ERROR]: [ChatState.IDLE]
}

/**
 * 创建状态机
 * @param {Function} onStateChange - 状态变更回调
 * @returns {Object} 状态机实例
 */
export function useStateMachine(onStateChange = () => {}) {
  // 当前状态
  const currentState = ref(ChatState.IDLE)

  // 状态详情
  const stateDetail = ref({
    state: ChatState.IDLE,
    message: '',
    toolName: null,
    timestamp: Date.now()
  })

  // 状态历史
  const history = ref([])

  // 计算属性
  const isIdle = computed(() => currentState.value === ChatState.IDLE)
  const isThinking = computed(() => currentState.value === ChatState.THINKING)
  const isExecuting = computed(() => currentState.value === ChatState.EXECUTING)
  const isGenerating = computed(() => currentState.value === ChatState.GENERATING)
  const isError = computed(() => currentState.value === ChatState.ERROR)
  const isBusy = computed(() => currentState.value !== ChatState.IDLE)

  /**
   * 转换状态
   * @param {string} newState - 新状态
   * @param {Object} detail - 状态详情
   */
  function transition(newState, detail = {}) {
    const oldState = currentState.value

    // 检查是否是合法的状态转换
    if (!validTransitions[oldState]?.includes(newState)) {
      console.warn(`[StateMachine] 非法状态转换: ${oldState} -> ${newState}`)
      return false
    }

    // 更新状态
    currentState.value = newState
    stateDetail.value = {
      state: newState,
      message: detail.message || '',
      toolName: detail.toolName || null,
      timestamp: Date.now()
    }

    // 记录历史
    history.value.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      detail: stateDetail.value
    })

    // 通知回调
    onStateChange(newState, oldState, stateDetail.value)

    console.log(`[StateMachine] 状态转换: ${oldState} -> ${newState}`)
    return true
  }

  /**
   * 重置到空闲状态
   */
  function reset() {
    transition(ChatState.IDLE)
  }

  /**
   * 开始思考
   */
  function startThinking() {
    return transition(ChatState.THINKING, { message: '分析用户意图...' })
  }

  /**
   * 开始执行工具
   * @param {string} toolName - 工具名称
   */
  function startExecuting(toolName) {
    return transition(ChatState.EXECUTING, {
      message: `执行工具: ${toolName}`,
      toolName
    })
  }

  /**
   * 开始生成回复
   */
  function startGenerating() {
    return transition(ChatState.GENERATING, { message: '生成回复...' })
  }

  /**
   * 进入错误状态
   * @param {string} errorMessage - 错误信息
   */
  function setError(errorMessage) {
    return transition(ChatState.ERROR, { message: errorMessage })
  }

  /**
   * 获取当前状态描述
   */
  function getStateDescription() {
    return StateDescriptions[currentState.value] || '未知状态'
  }

  return {
    // 状态
    currentState: readonly(currentState),
    stateDetail: readonly(stateDetail),
    history: readonly(history),

    // 计算属性
    isIdle,
    isThinking,
    isExecuting,
    isGenerating,
    isError,
    isBusy,

    // 方法
    transition,
    reset,
    startThinking,
    startExecuting,
    startGenerating,
    setError,
    getStateDescription
  }
}

export default useStateMachine
