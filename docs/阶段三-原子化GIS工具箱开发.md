# 阶段三：原子化 GIS 工具箱开发

## 3.1 POI 检索服务

### 天地图 API 接入

**API 文档地址**: https://console.tianditu.gov.cn/api/api/api-register.html

**接口说明**:
```
接口地址: http://api.tianditu.gov.cn/v2/search
请求方式: GET
参数说明:
  postStr: JSON 格式的查询参数
  tk: 天地图 API Key
  type: query (普通查询) / nearby (附近查询)
```

**查询参数示例**:
```json
{
  "keyWord": "医院",
  "level": "12",
  "mapBound": "116.02524,39.83833,116.65592,40.01062",
  "queryType": "1",  // 1: 普通查询, 7: 周边查询
  "start": "0",
  "count": "10",
  "specify": {
    "adminCode": "110000",  // 北京市
    "centroid": "116.3975,39.9085"
  }
}
```

### POI 数据模型

```typescript
interface POIResult {
  // 基础信息
  name: string           // POI 名称
  address: string        // 地址
  phone: string          // 电话

  // 位置信息
  location: {
    longitude: number    // 经度
    latitude: number     // 纬度
  }

  // 距离信息
  distance: number       // 距离（米）

  // 分类信息
  type: string           // POI 类型
  typeCode: string       // 类型编码

  // 其他信息
  rating?: number        // 评分
  hotPoint?: string      // 热点关键词
}
```

### 搜索算法优化

```
搜索策略：
1. 默认搜索：使用地图当前视窗范围
2. 周边搜索：以指定坐标为中心，按距离排序
3. 关键词组合：支持 "类型 + 关键词" 组合搜索
4. 模糊匹配：支持部分关键词匹配
```

---

## 3.2 地图打点与气泡组件

### Cesium Entity 体系

```
Entity 层级结构：
┌─────────────────────────────────────┐
│            Entity                   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │         Position            │   │
│  │   Cartesian3 (x, y, z)     │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │        Graphics             │   │
│  │  - Point (点)               │   │
│  │  - Billboard (图标)         │   │
│  │  - Label (文字)             │   │
│  │  - Description (详情)       │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │       Properties            │   │
│  │   自定义数据 (任意键值对)     │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 标记点渲染方案

**方案一：Point + Label**
```javascript
// 简单标记（小圆点 + 文字）
entity: {
  position: cartesian3,
  point: {
    pixelSize: 12,
    color: Cesium.Color.RED,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  },
  label: {
    text: '医院',
    font: '14px sans-serif',
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -20)
  }
}
```

**方案二：Billboard（自定义图标）**
```javascript
// 自定义图标标记
entity: {
  position: cartesian3,
  billboard: {
    image: '/icons/hospital.png',
    width: 32,
    height: 32,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  },
  label: { /* 同上 */ }
}
```

### 详情气泡组件

```
Cesium 气泡实现方案：

1. 原生 InfoBox（推荐用于简单场景）
   - 自动跟随实体
   - 支持 HTML 内容
   - 样式可控

2. 自定义 HTML Overlay（推荐用于复杂场景）
   - 完全自定义样式
   - 支持交互操作
   - 位置精确控制
```

**InfoBox 实现示例**:
```javascript
// 设置实体的描述（HTML 格式）
entity.description = `
  <div class="poi-info">
    <h3>${poi.name}</h3>
    <p>地址: ${poi.address}</p>
    <p>电话: ${poi.phone}</p>
    <p>距离: ${poi.distance}m</p>
    <button onclick="flyTo(${poi.location.longitude}, ${poi.location.latitude})">
      飞行到这里
    </button>
  </div>
`

// 启用 InfoBox
viewer.infoBox.viewModel.enableContent = true
```

---

## 3.3 智能视角控制

### Cesium 相机 API

```javascript
// 飞行到指定位置
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    longitude,  // 经度
    latitude,   // 纬度
    height      // 高度（米）
  ),
  orientation: {
    heading: Cesium.Math.toRadians(0),   // 朝向（0=北）
    pitch: Cesium.Math.toRadians(-45),   // 俯仰角（-90=垂直向下）
    roll: 0                              // 翻滚角
  },
  duration: 2  // 动画时长（秒）
})

// 缩放到实体边界
viewer.zoomTo(entity, new Cesium.HeadingPitchRange(
  0,                    // heading
  Cesium.Math.toRadians(-45),  // pitch
  5000                  // range（距离）
))
```

### 视角控制策略

```yaml
场景一: 查询单个 POI
  操作: 飞行到该 POI 位置
  高度: 1000m (近景)
  俯仰: -45°

场景二: 查询多个 POI
  操作: 缩放到所有 POI 的边界框
  高度: 自动计算
  俯仰: -60°

场景三: 绘制圆形区域
  操作: 飞行到圆心，确保圆完全可见
  高度: 根据半径自动计算
  俯仰: -45°

场景四: 清除所有标记
  操作: 重置到默认视角
  高度: 5000000m (鸟瞰)
  俯仰: -90°
```

### 自动视角计算

```javascript
/**
 * 根据实体集合计算最佳视角
 * @param {Entity[]} entities - 实体数组
 * @param {Viewer} viewer - Cesium Viewer
 */
function fitToEntities(entities, viewer) {
  if (entities.length === 0) return

  // 创建边界球
  const boundingSphere = new Cesium.BoundingSphere()

  // 合并所有实体的位置
  const positions = entities.map(e => e.position.getValue())
  boundingSphere.center = Cesium.BoundingSphere.fromPoints(positions).center
  boundingSphere.radius = Cesium.BoundingSphere.fromPoints(positions).radius * 1.2

  // 飞行到边界球
  viewer.camera.flyToBoundingSphere(boundingSphere, {
    duration: 1.5,
    offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 0)
  })
}
```

---

## 3.4 空间范围绘制

### 圆形区域 (CircleGraphics)

```javascript
// 绘制圆形围栏
const circleEntity = viewer.entities.add({
  position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat),
  ellipse: {
    semiMajorAxis: radius,      // 半径（米）
    semiMinorAxis: radius,      // 半径（米）
    material: Cesium.Color.fromCssColorString('#4a90e2').withAlpha(0.3),
    outline: true,
    outlineColor: Cesium.Color.fromCssColorString('#4a90e2'),
    outlineWidth: 2,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  }
})
```

### 多边形区域 (PolygonGraphics)

```javascript
// 绘制多边形围栏
const polygonEntity = viewer.entities.add({
  polygon: {
    hierarchy: Cesium.Cartesian3.fromDegreesArray([
      lng1, lat1,
      lng2, lat2,
      lng3, lat3,
      lng4, lat4
    ]),
    material: Cesium.Color.fromCssColorString('#22c55e').withAlpha(0.3),
    outline: true,
    outlineColor: Cesium.Color.fromCssColorString('#22c55e'),
    outlineWidth: 2,
    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
  }
})
```

### 贴地绘制原理

```
Cesium 贴地原理：

1. heightReference 属性
   - CLAMP_TO_GROUND: 贴地
   - RELATIVE_TO_GROUND: 相对于地面
   - NONE: 不贴地

2. terrain 服务支持
   - 需要加载地形数据
   - 地形精度影响贴地效果

3. 性能优化
   - 大量多边形使用 Primitive API
   - 开启 depthTestAgainstTerrain
```

---

## 3.5 实体管理策略

### Entity Pool（实体池）

```javascript
// 实体池管理器
class EntityPool {
  constructor(viewer) {
    this.viewer = viewer
    this.entities = new Map()
    this.maxCount = 500  // 最大实体数
  }

  // 添加实体
  add(id, options) {
    // 检查数量限制
    if (this.entities.size >= this.maxCount) {
      // 删除最旧的实体
      const oldestId = this.entities.keys().next().value
      this.remove(oldestId)
    }

    const entity = this.viewer.entities.add(options)
    this.entities.set(id, entity)
    return entity
  }

  // 移除实体
  remove(id) {
    const entity = this.entities.get(id)
    if (entity) {
      this.viewer.entities.remove(entity)
      this.entities.delete(id)
    }
  }

  // 清除所有
  clear() {
    this.entities.forEach((entity) => {
      this.viewer.entities.remove(entity)
    })
    this.entities.clear()
  }
}
```

### 性能优化策略

```
大量 POI 渲染优化：

1. 数据聚合（Clustering）
   - 将相近的 POI 聚合为一个点
   - 缩小时显示聚合，放大时展开

2. 视窗裁剪（Culling）
   - 只渲染当前视窗内的 POI
   - 使用 bounding volume 剔除

3. LOD 策略（Level of Detail）
   - 远距离：只显示点
   - 中距离：显示点 + 标签
   - 近距离：显示完整信息

4. 使用 Primitive API
   - 比 Entity API 性能更高
   - 适合大量同类型对象
```

---

## 3.6 MVP 阶段三交付物

### 功能清单

| 功能 | 状态 | 说明 |
|------|------|------|
| POI 搜索 | ✅ | 支持关键词 + 坐标搜索 |
| 地图打点 | ✅ | 支持标记点 + 标签 |
| 详情气泡 | ✅ | 点击显示详情 |
| 视角飞行 | ✅ | 自动定位到结果 |
| 圆形绘制 | ✅ | 支持半透明围栏 |
| 实体清除 | ✅ | 一键清除所有标记 |

### 代码结构

```
frontend/src/
├── composables/
│   ├── useCesium.js          # Cesium 管理（已更新）
│   ├── useSSE.js             # SSE 通信
│   └── useToolExecutor.js    # 工具执行器（已更新）
├── services/
│   ├── chatService.js        # 聊天服务
│   └── toolRegistry.js       # 工具注册表
└── utils/
    ├── entityPool.js         # 实体池管理
    └── cameraUtils.js        # 相机控制工具
```
