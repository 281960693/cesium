/**
 * cameraUtils - Cesium 相机控制工具
 *
 * 提供各种视角控制功能
 */

/**
 * 飞行到指定坐标
 * @param {import('cesium').Viewer} viewer - Cesium Viewer
 * @param {Object} options - 配置项
 * @param {number} options.longitude - 经度
 * @param {number} options.latitude - 纬度
 * @param {number} options.height - 高度（米），默认 1000
 * @param {number} options.heading - 朝向（度），默认 0
 * @param {number} options.pitch - 俯仰角（度），默认 -45
 * @param {number} options.duration - 动画时长（秒），默认 2
 */
export function flyToLocation(viewer, options) {
  const {
    longitude,
    latitude,
    height = 1000,
    heading = 0,
    pitch = -45,
    duration = 2
  } = options

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: Cesium.Math.toRadians(heading),
      pitch: Cesium.Math.toRadians(pitch),
      roll: 0
    },
    duration
  })
}

/**
 * 缩放到实体
 * @param {import('cesium').Viewer} viewer - Cesium Viewer
 * @param {import('cesium').Entity} entity - 目标实体
 * @param {number} offset - 距离（米），默认 5000
 */
export function zoomToEntity(viewer, entity, offset = 5000) {
  viewer.zoomTo(entity, new Cesium.HeadingPitchRange(
    0,
    Cesium.Math.toRadians(-45),
    offset
  ))
}

/**
 * 缩放到多个实体的边界
 * @param {import('cesium').Viewer} viewer - Cesium Viewer
 * @param {import('cesium').Entity[]} entities - 实体数组
 * @param {number} padding - 边距系数，默认 1.2
 */
export function fitToEntities(viewer, entities, padding = 1.2) {
  if (!entities || entities.length === 0) return

  // 获取所有实体的位置
  const positions = entities
    .map(entity => {
      const position = entity.position
      return position ? position.getValue(Cesium.JulianDate.now()) : null
    })
    .filter(Boolean)

  if (positions.length === 0) return

  // 计算边界球
  const boundingSphere = Cesium.BoundingSphere.fromPoints(positions)
  boundingSphere.radius *= padding

  // 飞行到边界球
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 0)
  })
}

/**
 * 重置到默认视角（中国中心）
 * @param {import('cesium').Viewer} viewer - Cesium Viewer
 */
export function resetView(viewer) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.3975, 39.9085, 5000000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    },
    duration: 2
  })
}

/**
 * 根据圆形区域计算最佳飞行高度
 * @param {number} radius - 半径（米）
 * @returns {number} 建议高度（米）
 */
export function calculateOptimalHeight(radius) {
  // 根据半径计算合适的观察高度
  // 经验公式：高度约为半径的 2-3 倍
  if (radius <= 500) return 1500
  if (radius <= 1000) return 3000
  if (radius <= 2000) return 6000
  if (radius <= 5000) return 15000
  return radius * 3
}

export default {
  flyToLocation,
  zoomToEntity,
  fitToEntities,
  resetView,
  calculateOptimalHeight
}
