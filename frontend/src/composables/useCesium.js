/**
 * useCesium - Cesium 地图管理组合式函数
 */

// 天地图 API 配置
const TIANDITU_TOKEN = import.meta.env.VITE_TIANDITU_TOKEN || 'your_token_here'

/**
 * 初始化 Cesium Viewer
 */
export async function initCesium(container) {
  // 动态导入 Cesium
  const Cesium = await import('cesium')
  window.Cesium = Cesium

  // 不传任何 terrain 参数，让它使用默认值
  const viewer = new Cesium.Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    navigationHelpButton: false,
    navigationInstructionsInitiallyVisible: false
  })

  // 清除默认图层
  viewer.imageryLayers.removeAll()

  // 添加天地图
  viewer.imageryLayers.addImageryProvider(
    new Cesium.WebMapTileServiceImageryProvider({
      url: `http://t{s}.tianditu.gov.cn/img_w/wmts?tk=${TIANDITU_TOKEN}`,
      layer: 'img',
      style: 'default',
      tileMatrixSetID: 'w',
      format: 'tiles',
      maximumLevel: 18,
      subdomains: ['0', '1', '2', '3', '4', '5', '6', '7']
    })
  )

  // 设置视角
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.3975, 39.9085, 5000000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
    }
  })

  // 关闭效果
  viewer.scene.globe.enableLighting = false
  viewer.scene.fog.enabled = false

  console.log('[CesiumMap] 地图初始化完成')
  return viewer
}

/**
 * 清理 Cesium 资源
 */
export function destroyCesium(viewer) {
  if (viewer) {
    viewer.entities.removeAll()
    viewer.imageryLayers.removeAll()
    viewer.destroy()
    console.log('[CesiumMap] 地图资源已清理')
  }
}

/**
 * 在地图上添加点标记
 */
export function addPointMarker(viewer, options) {
  const Cesium = window.Cesium
  if (!Cesium) {
    throw new Error('Cesium 库未加载完成')
  }
  const { longitude, latitude, name, description } = options

  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(Number(longitude), Number(latitude)),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#e74c3c'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2
    },
    label: {
      text: name,
      font: '14px sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 2,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -20),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    description: description || '',
    name: name
  })
}

/**
 * 绘制圆形区域
 */
export function drawCircle(viewer, options) {
  const Cesium = window.Cesium
  if (!Cesium) {
    throw new Error('Cesium 库未加载完成')
  }
  const { longitude, latitude, radius, color = '#4a90e2' } = options

  return viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(Number(longitude), Number(latitude)),
    ellipse: {
      semiMajorAxis: Number(radius),
      semiMinorAxis: Number(radius),
      material: Cesium.Color.fromCssColorString(color).withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString(color),
      outlineWidth: 2
    }
  })
}
