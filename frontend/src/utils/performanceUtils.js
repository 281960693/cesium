/**
 * performanceUtils - 性能优化工具
 *
 * 职责：
 * 1. 数据阈值控制
 * 2. 数据采样
 * 3. 聚合显示
 * 4. 性能监控
 */

// 性能配置
export const PERFORMANCE_CONFIG = {
  // POI 数量阈值
  POI_THRESHOLD: {
    LOW: 50,
    MEDIUM: 200,
    HIGH: 500
  },

  // 渲染模式
  RENDER_MODE: {
    FULL: 'full',
    CLUSTER: 'cluster',
    SAMPLE: 'sample'
  },

  // 动画帧率限制
  MAX_FPS: 30,

  // 数据缓存大小
  MAX_CACHE_SIZE: 1000
}

/**
 * 根据数据量选择渲染模式
 * @param {number} count - POI 数量
 * @returns {string} 渲染模式
 */
export function selectRenderMode(count) {
  if (count <= PERFORMANCE_CONFIG.POI_THRESHOLD.LOW) {
    return PERFORMANCE_CONFIG.RENDER_MODE.FULL
  } else if (count <= PERFORMANCE_CONFIG.POI_THRESHOLD.MEDIUM) {
    return PERFORMANCE_CONFIG.RENDER_MODE.CLUSTER
  } else {
    return PERFORMANCE_CONFIG.RENDER_MODE.SAMPLE
  }
}

/**
 * 数据采样
 * @param {Array} data - 原始数据
 * @param {number} maxCount - 最大数量
 * @param {string} strategy - 采样策略 ('random' | 'uniform' | 'important')
 * @returns {Array} 采样后的数据
 */
export function sampleData(data, maxCount = 100, strategy = 'uniform') {
  if (!data || data.length <= maxCount) return data

  switch (strategy) {
    case 'random':
      return randomSample(data, maxCount)
    case 'important':
      return importantSample(data, maxCount)
    case 'uniform':
    default:
      return uniformSample(data, maxCount)
  }
}

/**
 * 均匀采样
 */
function uniformSample(data, maxCount) {
  const step = Math.ceil(data.length / maxCount)
  const sampled = []

  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i])
  }

  return sampled
}

/**
 * 随机采样
 */
function randomSample(data, maxCount) {
  const shuffled = [...data].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, maxCount)
}

/**
 * 重要性采样（基于距离排序）
 */
function importantSample(data, maxCount) {
  // 假设有距离信息，优先保留距离近的
  if (data[0]?.distance !== undefined) {
    return [...data]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxCount)
  }

  // 没有距离信息则使用均匀采样
  return uniformSample(data, maxCount)
}

/**
 * 聚合 POI 数据
 * @param {Array} pois - POI 数组
 * @param {number} gridSize - 网格大小（度）
 * @returns {Map} 聚合结果
 */
export function clusterPOIs(pois, gridSize = 0.01) {
  const clusters = new Map()

  pois.forEach(poi => {
    const gridX = Math.floor(poi.location.longitude / gridSize)
    const gridY = Math.floor(poi.location.latitude / gridSize)
    const key = `${gridX}_${gridY}`

    if (!clusters.has(key)) {
      clusters.set(key, {
        center: { longitude: 0, latitude: 0 },
        count: 0,
        pois: []
      })
    }

    const cluster = clusters.get(key)
    cluster.center.longitude += poi.location.longitude
    cluster.center.latitude += poi.location.latitude
    cluster.count++
    cluster.pois.push(poi)
  })

  // 计算聚合中心点
  clusters.forEach(cluster => {
    cluster.center.longitude /= cluster.count
    cluster.center.latitude /= cluster.count
  })

  return clusters
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: 0,
      memory: 0,
      entityCount: 0,
      renderTime: 0
    }
    this.history = []
    this.maxHistory = 60
  }

  /**
   * 更新性能指标
   */
  update(metrics) {
    Object.assign(this.metrics, metrics)

    this.history.push({
      timestamp: Date.now(),
      ...this.metrics
    })

    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
  }

  /**
   * 获取平均 FPS
   */
  getAverageFPS() {
    if (this.history.length === 0) return 0

    const sum = this.history.reduce((acc, m) => acc + m.fps, 0)
    return Math.round(sum / this.history.length)
  }

  /**
   * 检查性能是否下降
   */
  isPerformanceDegraded() {
    const avgFPS = this.getAverageFPS()
    return avgFPS < PERFORMANCE_CONFIG.MAX_FPS * 0.8
  }

  /**
   * 获取性能建议
   */
  getRecommendation() {
    const recommendations = []

    if (this.isPerformanceDegraded()) {
      recommendations.push('考虑减少地图上的实体数量')
      recommendations.push('开启聚合显示模式')
    }

    if (this.metrics.entityCount > PERFORMANCE_CONFIG.POI_THRESHOLD.HIGH) {
      recommendations.push('实体数量过多，建议采样显示')
    }

    if (this.metrics.memory > 500) {
      recommendations.push('内存使用过高，建议清理缓存')
    }

    return recommendations
  }
}

// 创建单例
export const performanceMonitor = new PerformanceMonitor()

export default {
  PERFORMANCE_CONFIG,
  selectRenderMode,
  sampleData,
  clusterPOIs,
  performanceMonitor
}
