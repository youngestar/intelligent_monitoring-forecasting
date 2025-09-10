<template>
  <div class="water-forecasting-container">
    <!-- 头部标题 -->
    <div class="header-title">
      <h2>水电预测与分析</h2>
      <div class="date-display">{{ currentDate }}</div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 今日预测水电总量卡片 -->
        <div class="total-forecast-card">
          <div class="card-title">今日预测水电总量</div>
          <div class="forecast-value">
            <span class="value">{{ totalWaterForecast }}</span>
            <span class="unit">万千瓦时</span>
          </div>
          <div class="growth-info">
            <span class="growth-label">环比昨日</span>
            <span class="growth-value"
              :class="waterLevelTrend === 'rising' ? 'positive' : waterLevelTrend === 'falling' ? 'negative' : ''">
              {{ waterLevelTrend === 'rising' ? '+' : waterLevelTrend === 'falling' ? '-' : '' }}{{
                Math.abs(waterLevelChange) }}%
            </span>
          </div>
        </div>

        <!-- 水资源来源分布 -->
        <div class="water-resource-card">
          <div class="card-title">水资源来源分布</div>
          <div id="waterSourceChart" class="chart-container"></div>
        </div>

        <!-- 水资源使用情况 -->
        <div class="water-usage-card">
          <div class="card-title">水资源使用情况</div>
          <div class="chart-tabs">
            <button class="tab-btn" :class="{ active: currentWaterUsagePeriod === 'day' }"
              @click="changeWaterUsagePeriod('day')">日</button>
            <button class="tab-btn" :class="{ active: currentWaterUsagePeriod === 'week' }"
              @click="changeWaterUsagePeriod('week')">周</button>
            <button class="tab-btn" :class="{ active: currentWaterUsagePeriod === 'month' }"
              @click="changeWaterUsagePeriod('month')">月</button>
          </div>
          <div id="waterUsageChart" class="chart-container"></div>
        </div>

        <!-- 水质监测 -->
        <div class="water-quality-card">
          <div class="card-title">水质监测</div>
          <div id="waterQualityChart" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 地图区域 -->
        <div class="map-section">
          <div class="map-controls">
            <div class="water-type-selector">
              <button v-for="(config, key) in waterTypeConfig" :key="key"
                :class="['energy-type-btn', { active: currentWaterType === key }]" :style="{ '--color': config.color }"
                @click="changeWaterType(key)">
                {{ config.icon }} {{ config.name }}
              </button>
            </div>
            <div class="map-toolbar">
              <button class="toolbar-btn" @click="mapZoomIn">
                <Plus />
              </button>
              <button class="toolbar-btn" @click="mapZoomOut">
                <Minus />
              </button>
              <button class="toolbar-btn" @click="mapReset">
                <Refresh />
              </button>
            </div>
            <div class="layer-switch-container">
              <button :class="['layer-btn', 'toolbar-btn', { active: currentMapLayer === 'normal' }]"
                @click="switchMapLayer('normal')">
                <MapLocation />
              </button>
              <button :class="['layer-btn', 'toolbar-btn', { active: currentMapLayer === 'satellite' }]"
                @click="switchMapLayer('satellite')">
                <Picture as PictureOutline />
              </button>
            </div>
          </div>
          <div id="map" class="map-container" ref="mapRef"></div>
        </div>

        <!-- 水位变化趋势图 -->
        <div class="water-level-card">
          <div class="card-title">水位变化趋势</div>
          <div id="waterLevelChart" class="chart-container"></div>
        </div>

        <!-- 区域水资源分布 -->
        <div class="region-water-card">
          <div class="card-title">区域水资源分布</div>
          <div class="water-resources-list">
            <div v-for="resource in filteredWaterResources" :key="resource.name" class="water-resource-item">
              <div class="resource-name">{{ resource.name }}</div>
              <div class="resource-info">
                <span class="resource-value">{{ resource.storage }}</span>
                <span class="resource-unit">万立方米</span>
                <span class="status-indicator" :class="getResourceStatusClass(resource.status || 0)"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { Plus, Minus, Refresh, MapLocation, Picture, Picture as PictureOutline } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 当前日期
const currentDate = ref('')

// 计算今天的日期
const updateCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${year}-${month}-${day}`
}

// 当前选中的区域
const selectedRegion = ref<string | null>(null)

// 声明AMap全局变量类型
interface AMapInstance {
  Map: any
  Marker: any
  InfoWindow: any
  ToolBar: any
  Scale: any
  MapType: any
  Icon: any
  Pixel: any
  Size: any
  TileLayer: any | {
    Satellite: any
    RoadNet: any
  }
}

// 地图相关变量
const mapRef = ref<HTMLDivElement | null>(null)
let mapInstance: any = null
let AMap: AMapInstance | null = null
let markers: Map<string, any> = new Map() // 存储地图标记实例
let normalLayer: any = null
let satelliteLayer: any = null
let roadNetLayer: any = null // 路网图层变量
// 当前地图图层类型
const currentMapLayer = ref<'normal' | 'satellite'>('normal')

// 区域特定数据 - 水资源预测专用数据
const regionSpecificData = {
  '古夫镇': {
    waterSourceData: [
      { name: '地表水', value: 60, color: '#4facfe' },
      { name: '地下水', value: 30, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [120, 118, 116, 115, 117, 119, 121, 120.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [8500, 8300, 8400, 8600, 8700, 8200, 8100],
      forecast: [8400, 8200, 8300, 8500, 8600, 8100, 8000]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.5, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.2, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.15, standard: 0 - 0.5 },
      { name: 'COD', value: 12, standard: 0 - 30 },
      { name: '总磷', value: 0.08, standard: 0 - 0.2 }
    ]
  },
  '昭君镇': {
    waterSourceData: [
      { name: '地表水', value: 55, color: '#4facfe' },
      { name: '地下水', value: 35, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [118, 116, 114, 113, 115, 117, 119, 118.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [7800, 7600, 7700, 7900, 8000, 7500, 7400],
      forecast: [7700, 7500, 7600, 7800, 7900, 7400, 7300]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.4, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.0, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.16, standard: 0 - 0.5 },
      { name: 'COD', value: 13, standard: 0 - 30 },
      { name: '总磷', value: 0.09, standard: 0 - 0.2 }
    ]
  },
  '峡口镇': {
    waterSourceData: [
      { name: '地表水', value: 65, color: '#4facfe' },
      { name: '地下水', value: 25, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [122, 120, 118, 117, 119, 121, 123, 122.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [9000, 8800, 8900, 9100, 9200, 8700, 8600],
      forecast: [8900, 8700, 8800, 9000, 9100, 8600, 8500]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.6, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.3, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.14, standard: 0 - 0.5 },
      { name: 'COD', value: 11, standard: 0 - 30 },
      { name: '总磷', value: 0.07, standard: 0 - 0.2 }
    ]
  }
}

// 定义水资源数据类型接口
interface WaterItem {
  name: string;
  storage: number;
  flow: number;
  quality: number;
  status?: number;
  coordinates: number[];
}

interface WaterDataType {
  river: WaterItem[];
  reservoir: WaterItem[];
  well: WaterItem[];
  [key: string]: WaterItem[];
}

// 详细的水资源数据评估
const waterData: WaterDataType = {
  // 河流数据
  river: [
    { name: '古夫河', storage: 12500, flow: 120, quality: 92, status: 94, coordinates: [110.78, 31.18] },
    { name: '香溪河', storage: 9800, flow: 95, quality: 88, status: 87, coordinates: [110.69, 31.10] },
    { name: '峡口河', storage: 11200, flow: 110, quality: 94, status: 95, coordinates: [110.73, 31.02] },
    { name: '南阳河', storage: 8500, flow: 85, quality: 86, status: 75, coordinates: [110.95, 31.22] },
    { name: '黄粮河', storage: 9200, flow: 90, quality: 89, status: 83, coordinates: [110.87, 31.13] },
    { name: '水月寺河', storage: 8100, flow: 80, quality: 87, status: 59, coordinates: [111.03, 31.08] },
    { name: '高桥河', storage: 7500, flow: 75, quality: 85, status: 56, coordinates: [110.60, 31.00] },
    { name: '榛子河', storage: 7800, flow: 78, quality: 84, status: 53, coordinates: [110.94, 31.34] }
  ],
  // 水库数据
  reservoir: [
    { name: '香溪河水库', storage: 55000, flow: 250, quality: 95, status: 96, coordinates: [110.79, 31.15] },
    { name: '昭君水库', storage: 42000, flow: 220, quality: 93, status: 91, coordinates: [110.67, 31.08] },
    { name: '峡口水库', storage: 52000, flow: 240, quality: 96, status: 97, coordinates: [110.71, 31.04] },
    { name: '南阳水库', storage: 35000, flow: 180, quality: 92, status: 86, coordinates: [110.96, 31.20] },
    { name: '黄粮水库', storage: 38000, flow: 190, quality: 93, status: 89, coordinates: [110.85, 31.11] },
    { name: '水月寺水库', storage: 32000, flow: 170, quality: 91, status: 63, coordinates: [111.01, 31.09] },
    { name: '高桥水库', storage: 30000, flow: 160, quality: 90, status: 58, coordinates: [110.62, 31.01] },
    { name: '榛子水库', storage: 28000, flow: 150, quality: 89, status: 55, coordinates: [110.92, 31.32] }
  ],
  // 水井数据
  well: [
    { name: '古夫镇水井', storage: 8500, flow: 45, quality: 90, status: 92, coordinates: [110.77, 31.16] },
    { name: '昭君镇水井', storage: 7800, flow: 42, quality: 89, status: 85, coordinates: [110.66, 31.09] },
    { name: '峡口镇水井', storage: 8200, flow: 44, quality: 91, status: 93, coordinates: [110.70, 31.03] },
    { name: '南阳镇水井', storage: 6500, flow: 38, quality: 88, status: 77, coordinates: [110.94, 31.21] },
    { name: '黄粮镇水井', storage: 7200, flow: 40, quality: 89, status: 81, coordinates: [110.86, 31.12] },
    { name: '水月寺镇水井', storage: 6200, flow: 37, quality: 87, status: 61, coordinates: [111.02, 31.07] },
    { name: '高桥乡水井', storage: 5800, flow: 35, quality: 86, status: 57, coordinates: [110.61, 31.02] },
    { name: '榛子乡水井', storage: 5500, flow: 34, quality: 85, status: 54, coordinates: [110.93, 31.33] }
  ]
}

// 当前显示的水资源类型
const currentWaterType = ref<keyof WaterTypeConfigs>('river')

// 水资源类型配置接口
interface WaterTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface WaterTypeConfigs {
  river: WaterTypeConfig;
  reservoir: WaterTypeConfig;
  well: WaterTypeConfig;
  [key: string]: WaterTypeConfig;
}

// 水资源类型配置
const waterTypeConfig: WaterTypeConfigs = {
  river: { name: '河流', color: '#4facfe', unit: '万立方米', field: 'storage', icon: '🌊' },
  reservoir: { name: '水库', color: '#00f2fe', unit: '万立方米', field: 'storage', icon: '🏞️' },
  well: { name: '水井', color: '#00a2ff', unit: '万立方米', field: 'storage', icon: '💧' }
}

// 水源类型数据
let waterSourceData = [
  { name: '地表水', value: 60, color: '#4facfe' },
  { name: '地下水', value: 30, color: '#00f2fe' },
  { name: '其他水源', value: 10, color: '#00a2ff' }
]

// 水位数据
let waterLevelData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  level: [120, 118, 116, 115, 117, 119, 121, 120.5]
}

// 当前时间周期 (日/周/月)
const currentWaterUsagePeriod = ref('day')

// 日用水量数据
const dayWaterUsageData = {
  time: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  actual: [350, 320, 850, 920, 880, 420],
  forecast: [340, 310, 840, 910, 870, 410]
}

// 周用水量数据
const weekWaterUsageData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  actual: [8500, 8300, 8400, 8600, 8700, 8200, 8100],
  forecast: [8400, 8200, 8300, 8500, 8600, 8100, 8000]
}

// 月用水量数据
const monthWaterUsageData = {
  time: ['1月', '2月', '3月', '4月', '5月', '6月'],
  actual: [258000, 235000, 242000, 268000, 275000, 262000],
  forecast: [256000, 233000, 240000, 266000, 273000, 260000]
}

// 当前使用的数据
let waterUsageData = JSON.parse(JSON.stringify(dayWaterUsageData))

// 切换时间周期
const changeWaterUsagePeriod = (period: 'day' | 'week' | 'month') => {
  currentWaterUsagePeriod.value = period

  // 根据选择的周期更新数据
  if (period === 'day') {
    waterUsageData = JSON.parse(JSON.stringify(dayWaterUsageData))
  } else if (period === 'week') {
    waterUsageData = JSON.parse(JSON.stringify(weekWaterUsageData))
  } else if (period === 'month') {
    waterUsageData = JSON.parse(JSON.stringify(monthWaterUsageData))
  }

  // 重新初始化图表
  initWaterUsageChart()
}

// 水质数据
let waterQualityData = [
  { name: 'PH值', value: 7.5, standard: '6.5-8.5' },
  { name: '溶解氧', value: 8.2, standard: '5-14.6' },
  { name: '氨氮', value: 0.15, standard: '0-0.5' },
  { name: 'COD', value: 12, standard: '0-30' },
  { name: '总磷', value: 0.08, standard: '0-0.2' }
]

// 原始数据备份
const originalData = {
  waterSourceData: JSON.parse(JSON.stringify(waterSourceData)),
  waterLevelData: JSON.parse(JSON.stringify(waterLevelData)),
  waterUsageData: JSON.parse(JSON.stringify(waterUsageData)),
  waterQualityData: JSON.parse(JSON.stringify(waterQualityData))
}

// 计算总水量预测
const totalWaterForecast = ref(9850)

// 计算水位趋势
const waterLevelTrend = ref('rising')
const waterLevelChange = ref(2.5)

// 可用区域列表
const availableRegions = ref(['古夫镇', '昭君镇', '峡口镇', '南阳镇', '黄粮镇', '水月寺镇', '高桥乡', '榛子乡'])

// 根据选中区域过滤水资源数据
const filteredWaterResources = computed(() => {
  if (!selectedRegion.value) {
    // 如果没有选择区域，显示前5个水资源点
    return waterData[currentWaterType.value].slice(0, 5)
  }
  // 否则根据区域名称过滤
  return waterData[currentWaterType.value].filter(resource =>
    resource.name.includes(selectedRegion.value!)
  )
})

// 获取资源状态类名
const getResourceStatusClass = (status: number) => {
  if (status >= 80) return 'normal'
  if (status >= 60) return 'attention'
  return 'warning'
}

// 获取资源状态文本
const getResourceStatusText = (status: number) => {
  if (status >= 80) return '正常'
  if (status >= 60) return '注意'
  return '警告'
}

// 切换水资源类型
const changeWaterType = (type: keyof WaterTypeConfigs) => {
  currentWaterType.value = type
  // 清除现有标记
  clearMarkers()
  // 添加新标记
  addMarkers()
}

// 切换地图图层
const switchMapLayer = (layer: 'normal' | 'satellite') => {
  currentMapLayer.value = layer
  if (mapInstance && normalLayer && satelliteLayer) {
    if (layer === 'normal') {
      // 显示标准图层，隐藏卫星图层和路网图层
      normalLayer.setMap(mapInstance)
      satelliteLayer.setMap(null)
      if (roadNetLayer) roadNetLayer.setMap(null)
    } else {
      // 隐藏标准图层，显示卫星图层和路网图层
      normalLayer.setMap(null)
      satelliteLayer.setMap(mapInstance)
      if (roadNetLayer) roadNetLayer.setMap(mapInstance)
    }
  }
}

// 地图缩放
const mapZoomIn = () => {
  if (mapInstance) {
    mapInstance.zoomIn()
  }
}

const mapZoomOut = () => {
  if (mapInstance) {
    mapInstance.zoomOut()
  }
}

const mapReset = () => {
  if (mapInstance) {
    mapInstance.setZoomAndCenter(11, [110.8, 31.1])
  }
}

// 清除地图标记
const clearMarkers = () => {
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()
}

// 显示信息窗口
const showInfoWindow = (resource: any, marker: any, config: any) => {
  if (!mapInstance) return

  const infoWindow = new AMap.InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${resource.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: ${config.name}</p>
          <p class="resource-storage">存储量: ${resource.storage} ${config.unit}</p>
          <p class="resource-flow">流量: ${resource.flow} m³/s</p>
          <p class="resource-quality">水质: ${resource.quality}%</p>
          <p class="resource-coordinates">坐标: ${resource.coordinates[0].toFixed(4)}, ${resource.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new AMap.Size(320, 200),
    offset: new AMap.Pixel(0, -50)
  })

  infoWindow.open(mapInstance, resource.coordinates)
}

// 添加地图标记
const addMarkers = () => {
  if (!AMap || !mapInstance) return

  const resources = waterData[currentWaterType.value]
  const config = waterTypeConfig[currentWaterType.value]

  resources.forEach(resource => {
    // 创建自定义HTML标记
    const markerContent = document.createElement('div')
    markerContent.className = 'custom-marker'
    markerContent.style.cssText = 'position: relative; display: inline-block;'

    markerContent.innerHTML = `
      <div class="marker-icon" style="
        background-color: ${config.color};
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        cursor: pointer;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      ">
        ${config.icon}
      </div>
      <div class="marker-label" style="
        position: absolute;
        bottom: -32px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        ${resource.name}
      </div>
    `

    const marker = new AMap.Marker({
      position: resource.coordinates,
      content: markerContent,
      offset: new AMap.Pixel(-20, -20),
      zIndex: 100
    })

    marker.setMap(mapInstance)
    markers.set(resource.name, marker)

    // 添加点击事件
    marker.on('click', () => {
      showInfoWindow(resource, marker, config)
    })
  })
}

// 初始化地图
const initMap = async () => {
  try {
    // 检查AMap是否已经加载
    if (window.AMap) {
      AMap = window.AMap
      createMapInstance()
    } else {
      // 如果AMap未加载，使用安全的方式监听API加载
      const script = document.createElement('script')
      script.type = 'text/javascript'
      // 显式指定需要加载的模块，确保包含标准图层和卫星图层所需的所有组件
      script.src = `https://webapi.amap.com/maps?v=2.0&key=1c8fb5781411703ac5c3343201e0ab99&plugin=AMap.Scale,AMap.ToolBar,AMap.MapType,AMap.TileLayer,AMap.TileLayer.Satellite`
      script.onload = () => {
        AMap = window.AMap
        createMapInstance()
      }
      document.head.appendChild(script)
    }
  } catch (error) {
    console.error('地图初始化失败:', error)
    // 显示错误信息
    if (mapRef.value) {
      mapRef.value.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
            <div>
              <h3>地图加载失败</h3>
              <p>请检查API密钥是否正确或网络连接是否正常</p>
            </div>
          </div>
        `
    }
  }
}

// 创建地图实例
const createMapInstance = () => {
  if (!AMap || !mapRef.value) return

  // 创建地图
  mapInstance = new AMap.Map(mapRef.value, {
    center: [110.8, 31.1],
    zoom: 11,
    mapStyle: 'amap://styles/119203f56a63326f4bba9e5e5e39b0fc', // 深色地图样式
    features: ['road', 'point', 'building']
  })

  // 创建标准图层
  normalLayer = new AMap.TileLayer()
  normalLayer.setMap(mapInstance)

  // 创建卫星图层和路网图层但先不显示
  satelliteLayer = new AMap.TileLayer.Satellite()
  const roadNetLayer = new AMap.TileLayer.RoadNet()

  // 默认显示标准图层，隐藏卫星图层和路网图层
  normalLayer.setMap(mapInstance)
  satelliteLayer.setMap(null)
  roadNetLayer.setMap(null)

  // 添加工具条
  mapInstance.addControl(new AMap.ToolBar())
  mapInstance.addControl(new AMap.Scale())

  // 添加标记
  addMarkers()
}

// 初始化所有图表
const initCharts = () => {
  initWaterSourceChart()
  initWaterLevelChart()
  initWaterUsageChart()
  initWaterQualityChart()
}

// 初始化水源类型图表
const initWaterSourceChart = () => {
  const chart = echarts.init(document.getElementById('waterSourceChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: waterSourceData.map(item => item.color),
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}%'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: '#fff'
      }
    },
    series: [
      {
        name: '水源类型分布',
        type: 'pie',
        radius: ['35%', '75%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1A2151',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold',
            color: '#fff'
          }
        },
        labelLine: {
          show: false
        },
        data: waterSourceData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化水位图表
const initWaterLevelChart = () => {
  const chart = echarts.init(document.getElementById('waterLevelChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}米'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: waterLevelData.time,
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        formatter: '{value}m'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '水位',
        type: 'line',
        data: waterLevelData.level,
        smooth: true,
        lineStyle: {
          color: '#4FCAFE',
          width: 3
        },
        itemStyle: {
          color: '#4FCAFE',
          borderColor: '#4FCAFE',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 202, 254, 0.5)' },
            { offset: 1, color: 'rgba(79, 202, 254, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化用水量图表
const initWaterUsageChart = () => {
  const chart = echarts.init(document.getElementById('waterUsageChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].name + '<br/>'
        params.forEach((item: any) => {
          result += item.marker + item.seriesName + ': ' + item.value + ' 立方米<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['实际用水量', '预测用水量'],
      textStyle: {
        color: '#fff'
      },
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: waterUsageData.time,
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff'
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        formatter: '{value} 立方米'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '实际用水量',
        type: 'bar',
        data: waterUsageData.actual,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00f2fe' },
            { offset: 1, color: '#4facfe' }
          ])
        },
        // 设置柱状图宽度
        barWidth: '30%',
        // 设置柱状图间距
        barGap: '0%',
        barCategoryGap: '40%'
      },
      {
        name: '预测用水量',
        type: 'line',
        data: waterUsageData.forecast.map((value, index) => {
          // 为折线图数据点添加位置偏移
          return {
            value: value,
            itemStyle: {
              color: '#4FCAFE'
            },
            // 向右偏移
            offset: [15, 0]
          };
        }),
        smooth: true,
        lineStyle: {
          color: '#4FCAFE',
          width: 2
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
  chart.setOption(option)
}

// 初始化水质图表
const initWaterQualityChart = () => {
  const chart = echarts.init(document.getElementById('waterQualityChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = waterQualityData.find(item => item.name === params[0].name)
        return `${params[0].name}<br/>${params[0].marker} 当前值: ${params[0].value}<br/>标准范围: ${item?.standard}`
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: waterQualityData.map(item => item.name),
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '水质指标',
        type: 'bar',
        data: waterQualityData.map(item => item.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4FCAFE' },
            { offset: 1, color: '#1A1B2A' }
          ])
        },
        barWidth: '60%'
      }
    ]
  }
  chart.setOption(option)
}

// 监听区域变化
const onRegionChange = () => {
  if (selectedRegion.value && regionSpecificData[selectedRegion.value]) {
    const regionData = regionSpecificData[selectedRegion.value]
    waterSourceData = regionData.waterSourceData
    waterLevelData = regionData.waterLevelData
    waterUsageData = regionData.waterUsageData
    waterQualityData = regionData.waterQualityData

    // 更新图表
    initCharts()
    ElMessage.success(`已切换到${selectedRegion.value}的数据`)
  } else {
    // 恢复原始数据
    waterSourceData = originalData.waterSourceData
    waterLevelData = originalData.waterLevelData
    waterUsageData = originalData.waterUsageData
    waterQualityData = originalData.waterQualityData

    // 更新图表
    initCharts()
  }
}

// 监听窗口大小变化，更新图表
const handleResize = () => {
  // 更新所有图表大小
  const charts = ['waterSourceChart', 'waterLevelChart', 'waterUsageChart', 'waterQualityChart']
  charts.forEach(id => {
    const chartElement = document.getElementById(id)
    if (chartElement) {
      const chart = echarts.getInstanceByDom(chartElement)
      if (chart) {
        chart.resize()
      }
    }
  })
}

// 组件挂载时初始化
onMounted(() => {
  updateCurrentDate()
  initMap()

  // 等待DOM加载完成后初始化图表
  setTimeout(() => {
    initCharts()
  }, 100)

  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理地图
  if (mapInstance) {
    mapInstance.destroy()
  }

  // 清理标记
  clearMarkers()

  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
})

// 监听区域变化
watch(selectedRegion, onRegionChange)
</script>

<style scoped>
.water-forecasting-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0D1136 0%, #161F4A 100%);
  color: #fff;
  padding: 15px;
  overflow: auto;
  box-sizing: border-box;
  --primary-color: #4FCAFE;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
}

.date-display {
  font-size: 16px;
  color: #aaa;
}

.main-content {
  display: flex;
  gap: 15px;
  overflow: visible;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow: visible;
}

.left-panel {
  width: 40%;
}

.right-panel {
  width: 60%;
}

.total-forecast-card,
.water-resource-card,
.water-usage-card,
.water-quality-card,
.map-section,
.water-level-card,
.region-water-card,
.reservoir-rate-card,
.efficiency-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

/* 减小今日预测水电总量卡片的占位空间 */
.total-forecast-card.compact {
  padding: 15px;
  min-height: auto;
}

.total-forecast-card.compact .forecast-value .value {
  font-size: 32px;
  /* 减小字体大小 */
}

.total-forecast-card.compact .forecast-value .unit {
  font-size: 16px;
  /* 减小单位字体大小 */
}

.map-section {
  color: #000;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--primary-color);
  border-bottom: 2px solid rgba(79, 202, 254, 0.3);
  padding-bottom: 10px;
}

.forecast-value {
  display: flex;
  align-items: baseline;
  margin: 15px 0;
}

.forecast-value .value {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin-right: 10px;
}

.forecast-value .unit {
  font-size: 20px;
  color: #aaa;
}

.growth-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.growth-label {
  font-size: 14px;
  color: #aaa;
}

.growth-value {
  font-size: 16px;
  font-weight: 600;
}

.growth-value.positive {
  color: #00B42A;
}

.growth-value.negative {
  color: #F53F3F;
}

.chart-container {
  width: 100%;
  height: 220px;
  position: relative;
}

/* 地图内部图表样式 */
#map .chart-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px;
}

/* 图表标签样式 */
.chart-label {
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

/* 地图内部图表标题 */
#map .chart-title {
  color: #4facfe;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
}

/* 地图内部图表坐标轴样式 */
#map .el-table th {
  background-color: rgba(0, 0, 0, 0.5) !important;
  color: #fff !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
}

#map .el-table td {
  background-color: rgba(0, 0, 0, 0.3) !important;
  color: #aaa !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.water-type-selector {
  display: flex;
  gap: 10px;
}

.energy-type-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.energy-type-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.energy-type-btn.active {
  background: var(--color);
  border-color: var(--color);
  color: #000;
}

.map-toolbar {
  display: flex;
  gap: 10px;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toolbar-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.layer-switch-container {
  display: flex;
  gap: 10px;
}

.layer-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.layer-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.layer-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

.map-container {
  width: 100%;
  height: 350px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.water-resources-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.water-resource-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.water-resource-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.resource-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.resource-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resource-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
}

.resource-unit {
  font-size: 14px;
  color: #aaa;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.normal {
  background-color: #00B42A;
}

.status-indicator.attention {
  background-color: #FF7D00;
}

.status-indicator.warning {
  background-color: #F53F3F;
}

.chart-tabs {
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
}

.tab-btn {
  padding: 5px 12px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.tab-btn.active {
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
}

/* 水库蓄水率样式 */
.reservoir-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reservoir-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.reservoir-name {
  font-size: 14px;
  color: #ddd;
}

.reservoir-percentage {
  height: 8px;
  background: linear-gradient(90deg, #4FCAFE 0%, #00f2fe 100%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 5px;
  font-size: 12px;
  color: #000;
  font-weight: 600;
  transition: width 0.5s ease;
}

/* 发电效率分析样式 */
.efficiency-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  padding: 15px;
  border-radius: 8px;
}

.metric-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100%;
  }

  .map-container {
    height: 400px;
  }

  .efficiency-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .water-forecasting-container {
    padding: 10px;
  }

  .header-title h2 {
    font-size: 20px;
  }

  .map-controls {
    flex-wrap: wrap;
    gap: 10px;
  }

  .water-type-selector {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .forecast-value .value {
    font-size: 36px;
  }

  .chart-container {
    height: 180px;
  }
}
</style>
