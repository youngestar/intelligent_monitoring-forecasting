# ECharts 地图使用指南

本指南将详细介绍如何在减灾辅助平台项目中使用 ECharts 地图功能。

## 一、ECharts 地图简介

ECharts 提供了强大的地图可视化功能，可以展示地理区域数据分布、热力图等。在安全领域，可以用地图展示不同地区的安全事件分布、攻击来源等信息。

## 二、项目中的地图实现

项目中已实现了一个中国地图组件 `ChinaMap.vue`，主要包含以下文件：

1. `src/components/ChinaMap.vue` - 地图组件实现
2. `src/assets/china-map.json` - 地图数据文件
3. `src/views/map/MapView.vue` - 地图展示视图

## 三、如何使用地图组件

### 1. 直接使用已创建的地图视图

在项目导航菜单中，已添加"地图展示"菜单项，点击即可进入地图页面。

### 2. 在其他组件中引入地图组件

```vue
<template>
  <div>
    <h2>安全事件地图</h2>
    <ChinaMap :height="'500px'" :width="'100%'" />
  </div>
</template>

<script setup lang="ts">
import ChinaMap from '@/components/ChinaMap.vue'
</script>
```

## 四、地图组件参数说明

`ChinaMap` 组件支持以下属性：

| 属性名 | 类型 | 默认值 | 说明 |
|-------|------|-------|------|
| height | string | '50vh' | 地图高度 |
| width | string | '100%' | 地图宽度 |

## 五、自定义地图数据

### 1. 修改地图数据文件

`src/assets/china-map.json` 包含了地图的 GeoJSON 数据。如果需要更详细的地图数据，可以替换此文件。

### 2. 修改安全事件数据

在 `ChinaMap.vue` 组件中，可以修改 `securityEventData` 数组来自定义各地区的安全事件数据：

```javascript
const securityEventData = [
  { name: '北京', value: 85 },
  { name: '上海', value: 90 },
  // 其他省份数据...
]
```

## 六、自定义地图样式

### 1. 修改颜色渐变

在 `option.visualMap.inRange.color` 中可以修改地图的颜色渐变方案：

```javascript
visualMap: {
  // ...其他配置
  inRange: {
    color: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9']
  }
}
```

### 2. 修改高亮样式

在 `option.series[0].emphasis` 中可以修改鼠标悬停时的高亮样式：

```javascript
emphasis: {
  label: {
    show: true,
    color: '#fff'
  },
  itemStyle: {
    areaColor: '#3274ff'
  }
}
```

## 七、地图交互功能

地图组件支持以下交互功能：

- **平移**：鼠标拖拽可以平移地图
- **缩放**：鼠标滚轮可以放大缩小地图
- **点击**：点击省份可以查看详细数据
- **提示框**：鼠标悬停时显示提示信息

## 八、常见问题及解决方案

### 1. 地图数据加载失败

如果地图显示"地图数据加载失败"，请检查：
- `china-map.json` 文件是否存在
- 文件路径是否正确
- JSON 格式是否正确

### 2. 地图显示不全或变形

如果地图显示不全或变形，可以调整：
- 地图容器的宽高比例
- `roam` 属性设置
- 视图中心和缩放级别

### 3. 自定义其他地区的地图

如果需要显示其他地区的地图（如世界地图、某省地图等），可以：
- 准备相应地区的 GeoJSON 数据文件
- 在组件中注册新的地图数据
- 修改 `option.series[0].map` 属性为新注册的地图名称

## 九、扩展建议

1. **动态数据更新**：可以从后端 API 获取实时的安全事件数据，定期更新地图显示
2. **多级地图联动**：实现省市级地图的切换显示
3. **地图动画效果**：添加数据更新时的过渡动画
4. **集成其他图表**：在地图周围添加相关的统计图表，提供更全面的数据展示

## 十、示例代码

以下是在项目中使用 ECharts 地图的核心代码片段：

```javascript
// 导入地图数据
import mapData from '@/assets/china-map.json'

// 注册地图数据
echarts.registerMap('china', mapData)

// 创建地图配置
const option = {
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}'
  },
  visualMap: {
    min: 0,
    max: 100,
    inRange: {
      color: ['#e6f7ff', '#1890ff']
    }
  },
  series: [{
    type: 'map',
    map: 'china',
    data: [
      {name: '北京', value: 85},
      {name: '上海', value: 90}
      // 更多数据...
    ]
  }]
}
```

通过以上指南，您应该能够在项目中成功使用和自定义 ECharts 地图功能。如果有任何问题，请联系开发人员。