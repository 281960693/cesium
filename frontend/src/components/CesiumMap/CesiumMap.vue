<template>
  <div ref="cesiumContainer" class="cesium-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, defineExpose } from 'vue'
import { initCesium, destroyCesium } from '@/composables/useCesium.js'

// 容器引用
const cesiumContainer = ref(null)

// Cesium Viewer 实例
let viewer = null

// 事件
const emit = defineEmits(['ready'])

// 暴露方法给父组件
defineExpose({
  getViewer: () => viewer,
  // 飞行到指定位置
  flyTo: (longitude, latitude, height = 1000) => {
    if (viewer) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0
        }
      })
    }
  },
  // 清除所有实体
  clearEntities: () => {
    if (viewer) {
      viewer.entities.removeAll()
    }
  }
})

// 初始化地图
onMounted(async () => {
  if (cesiumContainer.value) {
    viewer = await initCesium(cesiumContainer.value)
    // 触发 ready 事件
    emit('ready', viewer)
  }
})

// 清理资源
onUnmounted(() => {
  destroyCesium(viewer)
  viewer = null
})
</script>

<style scoped>
.cesium-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 隐藏 Cesium 默认控件 */
:deep(.cesium-viewer) {
  position: relative;
}

:deep(.cesium-viewer-animationContainer),
:deep(.cesium-viewer-timelineContainer),
:deep(.cesium-viewer-bottom) {
  display: none !important;
}

:deep(.cesium-viewer-toolbar) {
  right: 10px !important;
  top: 10px !important;
}

:deep(.cesium-button) {
  background: rgba(40, 40, 40, 0.8) !important;
  border: none !important;
  color: white !important;
}

:deep(.cesium-button:hover) {
  background: rgba(60, 60, 60, 0.9) !important;
}
</style>
