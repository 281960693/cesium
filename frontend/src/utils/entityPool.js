/**
 * entityPool - 实体池管理器
 *
 * 职责：
 * 1. 管理地图上的所有实体
 * 2. 控制实体数量上限
 * 3. 提供批量操作方法
 */

/**
 * 创建实体池
 * @param {import('cesium').Viewer} viewer - Cesium Viewer
 * @param {Object} options - 配置项
 * @returns {Object} 实体池实例
 */
export function createEntityPool(viewer, options = {}) {
  const { maxEntities = 500 } = options

  // 存储所有管理的实体
  const entities = new Map()

  /**
   * 添加实体
   * @param {string} id - 实体唯一标识
   * @param {Object} options - Entity 构造参数
   * @returns {import('cesium').Entity} 创建的实体
   */
  function add(id, options) {
    // 检查数量限制
    if (entities.size >= maxEntities) {
      // 删除最早的实体
      const oldestId = entities.keys().next().value
      remove(oldestId)
      console.warn(`[EntityPool] 实体数量达到上限，已删除: ${oldestId}`)
    }

    // 创建实体
    const entity = viewer.entities.add({
      id: `pool_${id}`,
      ...options
    })

    entities.set(id, entity)
    return entity
  }

  /**
   * 获取实体
   * @param {string} id - 实体唯一标识
   * @returns {import('cesium').Entity|null}
   */
  function get(id) {
    return entities.get(id) || null
  }

  /**
   * 移除实体
   * @param {string} id - 实体唯一标识
   */
  function remove(id) {
    const entity = entities.get(id)
    if (entity) {
      viewer.entities.remove(entity)
      entities.delete(id)
    }
  }

  /**
   * 更新实体
   * @param {string} id - 实体唯一标识
   * @param {Object} updates - 更新的属性
   */
  function update(id, updates) {
    const entity = entities.get(id)
    if (entity) {
      Object.assign(entity, updates)
    }
  }

  /**
   * 清除所有实体
   */
  function clear() {
    entities.forEach((entity) => {
      viewer.entities.remove(entity)
    })
    entities.clear()
    console.log('[EntityPool] 已清除所有实体')
  }

  /**
   * 获取所有实体
   * @returns {import('cesium').Entity[]}
   */
  function getAll() {
    return Array.from(entities.values())
  }

  /**
   * 获取实体数量
   * @returns {number}
   */
  function count() {
    return entities.size
  }

  /**
   * 按类型筛选实体
   * @param {Function} predicate - 筛选函数
   * @returns {import('cesium').Entity[]}
   */
  function filter(predicate) {
    return Array.from(entities.values()).filter(predicate)
  }

  /**
   * 批量添加实体
   * @param {Array<{id: string, options: Object}>} items - 实体列表
   * @returns {import('cesium').Entity[]}
   */
  function addBatch(items) {
    return items.map(item => add(item.id, item.options))
  }

  /**
   * 批量移除实体
   * @param {string[]} ids - 实体 ID 列表
   */
  function removeBatch(ids) {
    ids.forEach(id => remove(id))
  }

  return {
    add,
    get,
    remove,
    update,
    clear,
    getAll,
    count,
    filter,
    addBatch,
    removeBatch
  }
}

// ============ 内置实体工厂 ============

/**
 * 创建 POI 标记实体
 */
export function createPOIMarker(poi) {
  return {
    position: Cesium.Cartesian3.fromDegrees(
      poi.location.longitude,
      poi.location.latitude
    ),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#e74c3c'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    },
    label: {
      text: poi.name,
      font: '14px sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    description: `
      <div style="padding: 10px;">
        <h3 style="margin: 0 0 10px 0;">${poi.name}</h3>
        <p style="margin: 5px 0;"><strong>地址:</strong> ${poi.address}</p>
        <p style="margin: 5px 0;"><strong>电话:</strong> ${poi.phone || '暂无'}</p>
        <p style="margin: 5px 0;"><strong>距离:</strong> ${poi.distance}m</p>
      </div>
    `,
    name: poi.name
  }
}

/**
 * 创建圆形区域实体
 */
export function createCircleZone(options) {
  const { longitude, latitude, radius, color = '#4a90e2' } = options

  return {
    position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
    ellipse: {
      semiMajorAxis: radius,
      semiMinorAxis: radius,
      material: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(color),
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
    }
  }
}

export default {
  createEntityPool,
  createPOIMarker,
  createCircleZone
}
