/**
 * GIS 工具接口路由
 *
 * 提供：
 * 1. /api/tools/registry - 获取工具注册表
 * 2. /api/tools/poi - POI 检索
 * 3. /api/tools/geocode - 地理编码
 */

import { Router } from 'express'

export const toolsRouter = Router()

/**
 * 工具注册表
 * 定义 Agent 可以调用的所有 GIS 工具
 */
const toolRegistry = {
  tools: [
    {
      name: 'search_poi',
      description: '根据关键词搜索附近的兴趣点（POI），如餐厅、医院、学校等',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键词，如"医院"、"餐厅"、"学校"'
          },
          location: {
            type: 'object',
            properties: {
              longitude: { type: 'number', description: '经度' },
              latitude: { type: 'number', description: '纬度' }
            },
            description: '搜索中心点坐标'
          },
          radius: {
            type: 'number',
            description: '搜索半径（米），默认 1000'
          }
        },
        required: ['keyword']
      }
    },
    {
      name: 'fly_to_location',
      description: '控制地图视角飞行到指定位置',
      parameters: {
        type: 'object',
        properties: {
          longitude: { type: 'number', description: '目标经度' },
          latitude: { type: 'number', description: '目标纬度' },
          height: { type: 'number', description: '飞行高度（米），默认 1000' }
        },
        required: ['longitude', 'latitude']
      }
    },
    {
      name: 'draw_marker',
      description: '在地图上绘制标记点',
      parameters: {
        type: 'object',
        properties: {
          longitude: { type: 'number', description: '标记点经度' },
          latitude: { type: 'number', description: '标记点纬度' },
          name: { type: 'string', description: '标记点名称' },
          description: { type: 'string', description: '标记点描述' }
        },
        required: ['longitude', 'latitude', 'name']
      }
    },
    {
      name: 'draw_circle',
      description: '在地图上绘制圆形区域',
      parameters: {
        type: 'object',
        properties: {
          longitude: { type: 'number', description: '圆心经度' },
          latitude: { type: 'number', description: '圆心纬度' },
          radius: { type: 'number', description: '半径（米）' },
          color: { type: 'string', description: '颜色，如 #4a90e2' }
        },
        required: ['longitude', 'latitude', 'radius']
      }
    }
  ]
}

/**
 * GET /api/tools/registry
 * 获取工具注册表
 */
toolsRouter.get('/registry', (req, res) => {
  res.json({
    success: true,
    data: toolRegistry
  })
})

/**
 * POST /api/tools/poi
 * POI 检索接口
 *
 * 请求体：
 * {
 *   "keyword": "医院",
 *   "location": { "longitude": 116.3975, "latitude": 39.9085 },
 *   "radius": 1000
 * }
 */
toolsRouter.post('/poi', async (req, res) => {
  try {
    const { keyword, location, radius = 1000 } = req.body

    // TODO: 对接天地图/高德 POI API
    // 这里返回模拟数据
    const mockPOIs = generateMockPOIs(keyword, location, radius)

    res.json({
      success: true,
      data: {
        keyword,
        location,
        radius,
        count: mockPOIs.length,
        results: mockPOIs
      }
    })
  } catch (error) {
    console.error('[POI Search Error]', error)
    res.status(500).json({
      success: false,
      error: 'POI 检索失败'
    })
  }
})

// ============ 辅助函数 ============

/**
 * 生成模拟 POI 数据
 */
function generateMockPOIs(keyword, location, radius) {
  const baseLng = location?.longitude || 116.3975
  const baseLat = location?.latitude || 39.9085

  const pois = []
  const count = Math.floor(Math.random() * 5) + 3 // 3-7 个结果

  for (let i = 0; i < count; i++) {
    // 随机偏移
    const offsetLng = (Math.random() - 0.5) * (radius / 111000) * 2
    const offsetLat = (Math.random() - 0.5) * (radius / 111000) * 2

    pois.push({
      id: `poi_${Date.now()}_${i}`,
      name: `${keyword}${['中心', '医院', '店', '馆', '站'][i % 5]}`,
      address: `示例地址 ${i + 1} 号`,
      location: {
        longitude: baseLng + offsetLng,
        latitude: baseLat + offsetLat
      },
      distance: Math.floor(Math.random() * radius),
      telephone: `010-${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      type: keyword
    })
  }

  return pois
}
