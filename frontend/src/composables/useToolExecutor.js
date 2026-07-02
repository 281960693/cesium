/**
 * useToolExecutor - 工具执行器
 *
 * 职责：
 * 1. 管理工具注册表
 * 2. 执行工具调用
 * 3. 返回执行结果
 */

import { ref, readonly } from 'vue'
import { addPointMarker, drawCircle } from './useCesium.js'

/**
 * 创建工具执行器
 * @param {import('cesium').Viewer} viewer - Cesium Viewer 实例
 * @returns {Object} 工具执行器实例
 */
export function useToolExecutor(viewer) {
  // 工具注册表
  const toolRegistry = ref(new Map())

  // 执行状态
  const isExecuting = ref(false)
  const lastError = ref(null)

  /**
   * 注册工具
   * @param {string} name - 工具名称
   * @param {Function} handler - 工具处理函数
   */
  function registerTool(name, handler) {
    toolRegistry.value.set(name, handler)
    console.log(`[ToolExecutor] 注册工具: ${name}`)
  }

  /**
   * 批量注册工具
   * @param {Object} tools - 工具配置对象
   */
  function registerTools(tools) {
    Object.entries(tools).forEach(([name, handler]) => {
      registerTool(name, handler)
    })
  }

  /**
   * 执行工具调用
   * @param {Object} toolCall - 工具调用信息
   * @param {string} toolCall.name - 工具名称
   * @param {Object} toolCall.arguments - 工具参数
   * @returns {Promise<Object>} 执行结果
   */
  async function executeTool(toolCall) {
    const { name, arguments: args } = toolCall

    const handler = toolRegistry.value.get(name)
    if (!handler) {
      const error = `未知工具: ${name}`
      console.error('[ToolExecutor]', error)
      lastError.value = error
      return { success: false, error }
    }

    isExecuting.value = true
    lastError.value = null

    try {
      console.log(`[ToolExecutor] 执行工具: ${name}`, args)
      const result = await handler(args, viewer)
      console.log(`[ToolExecutor] 工具执行完成: ${name}`, result)
      return { success: true, result }
    } catch (e) {
      console.error(`[ToolExecutor] 工具执行失败: ${name}`, e)
      lastError.value = e.message
      return { success: false, error: e.message }
    } finally {
      isExecuting.value = false
    }
  }

  /**
   * 获取所有已注册的工具名称
   */
  function getRegisteredTools() {
    return Array.from(toolRegistry.value.keys())
  }

  return {
    toolRegistry: readonly(toolRegistry),
    isExecuting: readonly(isExecuting),
    lastError: readonly(lastError),
    registerTool,
    registerTools,
    executeTool,
    getRegisteredTools
  }
}

// ============ 内置工具实现 ============

/**
 * 搜索 POI 工具
 */
export async function searchPOIHandler(args, viewer) {
  const Cesium = window.Cesium
  if (!Cesium) {
    throw new Error('Cesium 库未加载完成')
  }
  const { keyword, location, radius = 1000 } = args

  // 如果没有提供位置，使用地图中心点
  let searchLocation = location
  if (!searchLocation && viewer) {
    const camera = viewer.camera
    const cartographic = camera.positionCartographic
    searchLocation = {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude)
    }
  }

  // 调用后端 API
  const response = await fetch('/api/tools/poi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword,
      location: searchLocation,
      radius
    })
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.error || 'POI 搜索失败')
  }

  // 自动在地图上绘制搜索到的所有 POI 标记点，并飞向第一个点
  if (viewer && data.data && data.data.results) {
    const pois = data.data.results
    pois.forEach(poi => {
      addPointMarker(viewer, {
        longitude: poi.location.longitude,
        latitude: poi.location.latitude,
        name: poi.name,
        description: `地址: ${poi.address || '暂无'}<br>电话: ${poi.telephone || '暂无'}`
      })
    })

    if (pois.length > 0) {
      const firstPoi = pois[0]
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          Number(firstPoi.location.longitude),
          Number(firstPoi.location.latitude),
          3000
        ),
        duration: 1.5
      })
    }
  }

  return data.data
}

/**
 * 飞行到指定位置工具
 */
export function flyToLocationHandler(args, viewer) {
  const Cesium = window.Cesium
  if (!Cesium) {
    throw new Error('Cesium 库未加载完成')
  }
  const { longitude, latitude, height = 1000 } = args

  if (!viewer) {
    throw new Error('地图未初始化')
  }

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(Number(longitude), Number(latitude), Number(height)),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    },
    duration: 2
  })

  return { success: true, message: `已飞行到 (${longitude}, ${latitude})` }
}

/**
 * 绘制标记点工具
 */
export function drawMarkerHandler(args, viewer) {
  const { longitude, latitude, name, description = '' } = args

  if (!viewer) {
    throw new Error('地图未初始化')
  }

  const entity = addPointMarker(viewer, {
    longitude,
    latitude,
    name,
    description
  })

  return {
    success: true,
    message: `已添加标记: ${name}`,
    entityId: entity.id
  }
}

/**
 * 绘制圆形区域工具
 */
export function drawCircleHandler(args, viewer) {
  const { longitude, latitude, radius, color = '#4a90e2' } = args

  if (!viewer) {
    throw new Error('地图未初始化')
  }

  const entity = drawCircle(viewer, {
    longitude,
    latitude,
    radius,
    color
  })

  return {
    success: true,
    message: `已绘制半径为 ${radius}m 的圆形区域`,
    entityId: entity.id
  }
}

/**
 * 清除所有标记工具
 */
export function clearAllHandler(args, viewer) {
  if (!viewer) {
    throw new Error('地图未初始化')
  }

  const count = viewer.entities.values.length
  viewer.entities.removeAll()

  return {
    success: true,
    message: `已清除 ${count} 个标记`
  }
}
