/**
 * errorHandler - 错误处理器
 *
 * 职责：
 * 1. 统一错误处理
 * 2. 生成人性化错误回复
 * 3. 错误日志记录
 */

// 错误场景枚举
export const ErrorScenario = {
  NO_DATA: 'no_data',
  NO_LOCATION: 'no_location',
  API_ERROR: 'api_error',
  PARSE_ERROR: 'parse_error',
  TOOL_ERROR: 'tool_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
}

// 错误场景描述
export const ErrorScenarioDescriptions = {
  [ErrorScenario.NO_DATA]: '查询无结果',
  [ErrorScenario.NO_LOCATION]: '无定位权限',
  [ErrorScenario.API_ERROR]: 'API 调用失败',
  [ErrorScenario.PARSE_ERROR]: '解析错误',
  [ErrorScenario.TOOL_ERROR]: '工具执行失败',
  [ErrorScenario.TIMEOUT]: '请求超时',
  [ErrorScenario.UNKNOWN]: '未知错误'
}

// 兜底回复模板
const fallbackResponses = {
  [ErrorScenario.NO_DATA]: [
    '抱歉，在当前范围内没有找到符合条件的结果。',
    '没有找到相关数据，建议扩大搜索范围或更换关键词。',
    '搜索结果为空，你可以尝试更具体的关键词。'
  ],
  [ErrorScenario.NO_LOCATION]: [
    '无法获取你的当前位置。请在浏览器中开启定位权限后重试。',
    '定位服务不可用，你可以告诉我具体的位置信息。',
    '请在浏览器设置中允许定位权限，或者直接告诉我你的位置。'
  ],
  [ErrorScenario.API_ERROR]: [
    '服务暂时不可用，请稍后重试。',
    '网络连接出现问题，请检查网络后重试。',
    '服务繁忙，请稍后再试。'
  ],
  [ErrorScenario.PARSE_ERROR]: [
    '抱歉，我没有理解你的意思。可以换个说法再试一次吗？',
    '请再描述一下你的需求，我会尽力帮助你。',
    '你的问题可能需要更详细的描述，请再试试。'
  ],
  [ErrorScenario.TOOL_ERROR]: [
    '执行操作时出现问题，你可以尝试简化需求或稍后重试。',
    '工具执行失败，建议重新描述你的需求。',
    '操作未能完成，请检查输入信息后重试。'
  ],
  [ErrorScenario.TIMEOUT]: [
    '请求超时了，服务器可能比较忙，请稍后重试。',
    '处理时间过长，请简化你的问题后重试。',
    '响应超时，请检查网络后重试。'
  ],
  [ErrorScenario.UNKNOWN]: [
    '抱歉，发生了未知错误。请稍后重试。',
    '系统遇到了问题，请刷新页面后重试。',
    '出错了，请重新开始。'
  ]
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  constructor() {
    this.errorLog = []
  }

  /**
   * 处理错误并生成人性化回复
   * @param {Error|string} error - 错误对象或错误信息
   * @param {Object} context - 上下文信息
   * @returns {Object} 处理结果
   */
  handleError(error, context = {}) {
    // 识别错误场景
    const scenario = this.identifyScenario(error)

    // 记录错误
    this.logError(scenario, error, context)

    // 生成回复
    const response = this.generateResponse(scenario, context)

    return {
      scenario,
      response,
      originalError: error,
      shouldRetry: this.shouldRetry(scenario)
    }
  }

  /**
   * 识别错误场景
   */
  identifyScenario(error) {
    const errorMessage = error?.message || String(error)

    if (errorMessage.includes('not found') || errorMessage.includes('无结果')) {
      return ErrorScenario.NO_DATA
    }

    if (errorMessage.includes('location') || errorMessage.includes('定位')) {
      return ErrorScenario.NO_LOCATION
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return ErrorScenario.TIMEOUT
    }

    if (errorMessage.includes('API') || errorMessage.includes('网络')) {
      return ErrorScenario.API_ERROR
    }

    if (errorMessage.includes('parse') || errorMessage.includes('解析')) {
      return ErrorScenario.PARSE_ERROR
    }

    if (errorMessage.includes('tool') || errorMessage.includes('工具')) {
      return ErrorScenario.TOOL_ERROR
    }

    return ErrorScenario.UNKNOWN
  }

  /**
   * 生成人性化回复
   */
  generateResponse(scenario, context = {}) {
    const templates = fallbackResponses[scenario] || fallbackResponses[ErrorScenario.UNKNOWN]
    const template = templates[Math.floor(Math.random() * templates.length)]

    // 根据上下文定制回复
    let response = template

    if (context.keyword) {
      response += `\n\n你搜索的关键词是"${context.keyword}"，`
      response += '建议尝试更换为更通用的关键词。'
    }

    if (context.radius) {
      response += `\n\n当前搜索半径为 ${context.radius} 米，`
      response += '建议扩大到更大的范围。'
    }

    return response
  }

  /**
   * 判断是否应该重试
   */
  shouldRetry(scenario) {
    const retryableScenarios = [
      ErrorScenario.API_ERROR,
      ErrorScenario.TIMEOUT
    ]
    return retryableScenarios.includes(scenario)
  }

  /**
   * 记录错误日志
   */
  logError(scenario, error, context) {
    const logEntry = {
      timestamp: Date.now(),
      scenario,
      error: error?.message || String(error),
      context,
      stack: error?.stack
    }

    this.errorLog.push(logEntry)

    // 限制日志大小
    if (this.errorLog.length > 100) {
      this.errorLog.shift()
    }

    console.error(`[ErrorHandler] ${scenario}:`, error)
  }

  /**
   * 获取错误日志
   */
  getErrorLog() {
    return [...this.errorLog]
  }

  /**
   * 清除错误日志
   */
  clearErrorLog() {
    this.errorLog = []
  }
}

// 创建单例
export const errorHandler = new ErrorHandler()

export default errorHandler
