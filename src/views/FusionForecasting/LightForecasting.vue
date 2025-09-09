<template>
  <div class="light-forecasting-container">
    <!-- 头部标题 -->
    <div class="header-title">
      <h2>光电预测与分析</h2>
      <div class="date-display">{{ currentDate }}</div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 今日预测光电总量卡片 -->
        <div class="total-forecast-card">
          <div class="card-title">今日预测光电总量</div>
          <div class="forecast-value">
            <span class="value">{{ totalLightForecast }}</span>
            <span class="unit">万千瓦时</span>
          </div>
          <div class="growth-info">
            <span class="growth-label">环比昨日</span>
            <span class="growth-value"
              :class="lightLevelTrend === 'rising' ? 'positive' : lightLevelTrend === 'falling' ? 'negative' : ''">
              {{ lightLevelTrend === 'rising' ? '+' : lightLevelTrend === 'falling' ? '-' : '' }}{{
                Math.abs(lightLevelChange) }}%
            </span>
          </div>
        </div>

        <!-- 光电站分布图 -->
        <div class="light-station-card">
          <div class="card-title">光电站分布</div>
          <div id="lightStationChart" class="chart-container"></div>
        </div>

        <!-- 光照强度监测 -->
        <div class="light-intensity-card">
          <div class="card-title">光照强度监测</div>
          <div class="chart-tabs">
            <button class="tab-btn" :class="{ active: currentLightIntensityPeriod === 'day' }"
              @click="changeLightIntensityPeriod('day')">日</button>
            <button class="tab-btn" :class="{ active: currentLightIntensityPeriod === 'week' }"
              @click="changeLightIntensityPeriod('week')">周</button>
            <button class="tab-btn" :class="{ active: currentLightIntensityPeriod === 'month' }"
              @click="changeLightIntensityPeriod('month')">月</button>
          </div>
          <div id="lightIntensityChart" class="chart-container"></div>
        </div>

        <!-- 发电效率分析 -->
        <div class="efficiency-card">
          <div class="card-title">发电效率分析</div>
          <div id="efficiencyChart" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 地图区域 -->
        <div class="map-section">
          <div class="map-controls">
            <div class="light-type-selector">
              <button v-for="(config, key) in lightTypeConfig" :key="key"
                :class="['energy-type-btn', { active: currentLightType === key }]" :style="{ '--color': config.color }"
                @click="changeLightType(key)">
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

        <!-- 发电趋势图 -->
        <div class="power-trend-card">
          <div class="card-title">发电趋势</div>
          <div id="powerTrendChart" class="chart-container"></div>
        </div>

        <!-- 区域光电分布 -->
        <div class="region-light-card">
          <div class="card-title">区域光电分布</div>
          <div class="light-stations-list">
            <div v-for="station in filteredLightStations" :key="station.name" class="light-station-item">
              <div class="station-name">{{ station.name }}</div>
              <div class="station-info">
                <span class="station-value">{{ station.power }}</span>
                <span class="station-unit">万千瓦时</span>
                <span class="status-indicator" :class="getStationStatusClass(station.status || 0)"></span>
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

// 区域特定数据 - 灯光预测专用数据
const regionSpecificData = {
  '古夫镇': {
    lightStationData: [
      { name: '固定式光伏', value: 45, color: '#FFD700' },
      { name: '跟踪式光伏', value: 30, color: '#FFA500' },
      { name: 'BIPV光伏', value: 25, color: '#FF8C00' }
    ],
    lightIntensityData: {
      time: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [0, 65, 95, 70, 20, 0]
    },
    powerTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [5200, 5400, 5100, 4800, 5000, 5300, 5500],
      forecast: [5100, 5300, 5000, 4700, 4900, 5200, 5400]
    },
    efficiencyData: [
      { name: '古夫镇电站', value: 88, standard: 85 },
      { name: '昭君镇电站', value: 85, standard: 85 },
      { name: '峡口镇电站', value: 90, standard: 85 },
      { name: '南阳镇电站', value: 82, standard: 85 },
      { name: '黄粮镇电站', value: 86, standard: 85 }
    ]
  },
  '昭君镇': {
    lightStationData: [
      { name: '固定式光伏', value: 40, color: '#FFD700' },
      { name: '跟踪式光伏', value: 35, color: '#FFA500' },
      { name: 'BIPV光伏', value: 25, color: '#FF8C00' }
    ],
    lightIntensityData: {
      time: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [0, 60, 90, 65, 15, 0]
    },
    powerTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [4800, 5000, 4700, 4400, 4600, 4900, 5100],
      forecast: [4700, 4900, 4600, 4300, 4500, 4800, 5000]
    },
    efficiencyData: [
      { name: '古夫镇电站', value: 86, standard: 85 },
      { name: '昭君镇电站', value: 84, standard: 85 },
      { name: '峡口镇电站', value: 88, standard: 85 },
      { name: '南阳镇电站', value: 80, standard: 85 },
      { name: '黄粮镇电站', value: 84, standard: 85 }
    ]
  },
  '峡口镇': {
    lightStationData: [
      { name: '固定式光伏', value: 50, color: '#FFD700' },
      { name: '跟踪式光伏', value: 25, color: '#FFA500' },
      { name: 'BIPV光伏', value: 25, color: '#FF8C00' }
    ],
    lightIntensityData: {
      time: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [0, 70, 100, 75, 25, 0]
    },
    powerTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [5600, 5800, 5500, 5200, 5400, 5700, 5900],
      forecast: [5500, 5700, 5400, 5100, 5300, 5600, 5800]
    },
    efficiencyData: [
      { name: '古夫镇电站', value: 90, standard: 85 },
      { name: '昭君镇电站', value: 87, standard: 85 },
      { name: '峡口镇电站', value: 92, standard: 85 },
      { name: '南阳镇电站', value: 84, standard: 85 },
      { name: '黄粮镇电站', value: 88, standard: 85 }
    ]
  }
}

// 定义光照数据类型接口
interface LightItem {
  name: string;
  power: number;
  efficiency: number;
  area: number;
  status?: number;
  coordinates: number[];
}

interface LightDataType {
  fixed: LightItem[];
  tracking: LightItem[];
  bipv: LightItem[];
  [key: string]: LightItem[];
}

// 详细的光照数据评估
const lightData: LightDataType = {
  // 固定式光伏数据
  fixed: [
    { name: '古夫镇光伏电站', power: 5200, efficiency: 88, area: 12, status: 95, coordinates: [110.78, 31.18] },
    { name: '昭君镇光伏电站', power: 4800, efficiency: 86, area: 10, status: 88, coordinates: [110.69, 31.10] },
    { name: '峡口镇光伏电站', power: 5600, efficiency: 90, area: 13, status: 96, coordinates: [110.73, 31.02] },
    { name: '南阳镇光伏电站', power: 4200, efficiency: 82, area: 9, status: 75, coordinates: [110.95, 31.22] },
    { name: '黄粮镇光伏电站', power: 4500, efficiency: 86, area: 10, status: 82, coordinates: [110.87, 31.13] },
    { name: '水月寺光伏电站', power: 4000, efficiency: 80, area: 9, status: 58, coordinates: [111.03, 31.08] },
    { name: '高桥光伏电站', power: 3800, efficiency: 78, area: 8, status: 55, coordinates: [110.60, 31.00] },
    { name: '榛子光伏电站', power: 3500, efficiency: 76, area: 8, status: 52, coordinates: [110.94, 31.34] }
  ],
  // 跟踪式光伏数据
  tracking: [
    { name: '古夫镇跟踪电站', power: 3500, efficiency: 92, area: 8, status: 94, coordinates: [110.77, 31.19] },
    { name: '昭君镇跟踪电站', power: 3200, efficiency: 90, area: 7, status: 87, coordinates: [110.68, 31.11] },
    { name: '峡口镇跟踪电站', power: 3800, efficiency: 94, area: 9, status: 96, coordinates: [110.72, 31.03] },
    { name: '南阳镇跟踪电站', power: 2800, efficiency: 88, area: 6, status: 78, coordinates: [110.94, 31.23] },
    { name: '黄粮镇跟踪电站', power: 3000, efficiency: 90, area: 7, status: 85, coordinates: [110.86, 31.14] },
    { name: '水月寺跟踪电站', power: 2600, efficiency: 86, area: 6, status: 62, coordinates: [111.02, 31.09] },
    { name: '高桥跟踪电站', power: 2400, efficiency: 84, area: 5, status: 57, coordinates: [110.59, 31.01] },
    { name: '榛子跟踪电站', power: 2200, efficiency: 82, area: 5, status: 53, coordinates: [110.93, 31.35] }
  ],
  // BIPV光伏数据
  bipv: [
    { name: '古夫镇BIPV', power: 1500, efficiency: 85, area: 5, status: 93, coordinates: [110.79, 31.17] },
    { name: '昭君镇BIPV', power: 1300, efficiency: 83, area: 4, status: 86, coordinates: [110.70, 31.09] },
    { name: '峡口镇BIPV', power: 1600, efficiency: 87, area: 5, status: 95, coordinates: [110.74, 31.01] },
    { name: '南阳镇BIPV', power: 1200, efficiency: 81, area: 4, status: 76, coordinates: [110.96, 31.21] },
    { name: '黄粮镇BIPV', power: 1400, efficiency: 84, area: 4, status: 83, coordinates: [110.88, 31.12] },
    { name: '水月寺BIPV', power: 1100, efficiency: 79, area: 3, status: 60, coordinates: [111.04, 31.07] },
    { name: '高桥BIPV', power: 1000, efficiency: 77, area: 3, status: 56, coordinates: [110.61, 30.99] },
    { name: '榛子BIPV', power: 900, efficiency: 75, area: 3, status: 54, coordinates: [110.95, 31.33] }
  ]
}

// 当前显示的光照类型
const currentLightType = ref<keyof LightTypeConfigs>('fixed')

// 光照类型配置接口
interface LightTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface LightTypeConfigs {
  fixed: LightTypeConfig;
  tracking: LightTypeConfig;
  bipv: LightTypeConfig;
  [key: string]: LightTypeConfig;
}

// 光照类型配置
const lightTypeConfig: LightTypeConfigs = {
  fixed: { name: '固定式光伏', color: '#FFD700', unit: '万千瓦时', field: 'power', icon: '🏠' },
  tracking: { name: '跟踪式光伏', color: '#FFA500', unit: '万千瓦时', field: 'power', icon: '🔄' },
  bipv: { name: 'BIPV光伏', color: '#FF8C00', unit: '万千瓦时', field: 'power', icon: '🏢' }
}

// 光电站数据
let lightStationData = [
  { name: '固定式光伏', value: 45, color: '#FFD700' },
  { name: '跟踪式光伏', value: 30, color: '#FFA500' },
  { name: 'BIPV光伏', value: 25, color: '#FF8C00' }
]

// 当前时间周期 (日/周/月)
const currentLightIntensityPeriod = ref('day')

// 日光照强度数据
const dayLightIntensityData = {
  time: ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  intensity: [0, 65, 95, 70, 20, 0]
}

// 周光照强度数据
const weekLightIntensityData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  intensity: [65, 70, 75, 68, 72, 80, 85]
}

// 月光照强度数据
const monthLightIntensityData = {
  time: ['1月', '2月', '3月', '4月', '5月', '6月'],
  intensity: [45, 52, 65, 80, 95, 90]
}

// 当前使用的数据
let lightIntensityData = JSON.parse(JSON.stringify(dayLightIntensityData))

// 切换时间周期
const changeLightIntensityPeriod = (period: 'day' | 'week' | 'month') => {
  currentLightIntensityPeriod.value = period

  // 根据选择的周期更新数据
  if (period === 'day') {
    lightIntensityData = JSON.parse(JSON.stringify(dayLightIntensityData))
  } else if (period === 'week') {
    lightIntensityData = JSON.parse(JSON.stringify(weekLightIntensityData))
  } else if (period === 'month') {
    lightIntensityData = JSON.parse(JSON.stringify(monthLightIntensityData))
  }

  // 重新初始化图表
  initLightIntensityChart()
}

// 发电趋势数据
let powerTrendData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  actual: [5200, 5400, 5100, 4800, 5000, 5300, 5500],
  forecast: [5100, 5300, 5000, 4700, 4900, 5200, 5400]
}

// 效率数据
let efficiencyData = [
  { name: '古夫镇电站', value: 88, standard: 85 },
  { name: '昭君镇电站', value: 85, standard: 85 },
  { name: '峡口镇电站', value: 90, standard: 85 },
  { name: '南阳镇电站', value: 82, standard: 85 },
  { name: '黄粮镇电站', value: 86, standard: 85 }
]

// 原始数据备份
const originalData = {
  lightStationData: JSON.parse(JSON.stringify(lightStationData)),
  lightIntensityData: JSON.parse(JSON.stringify(lightIntensityData)),
  powerTrendData: JSON.parse(JSON.stringify(powerTrendData)),
  efficiencyData: JSON.parse(JSON.stringify(efficiencyData))
}

// 计算总光电预测
const totalLightForecast = ref(5680)

// 计算光照趋势
const lightLevelTrend = ref('rising')
const lightLevelChange = ref(3.2)

// 可用区域列表
const availableRegions = ref(['古夫镇', '昭君镇', '峡口镇', '南阳镇', '黄粮镇', '水月寺镇', '高桥乡', '榛子乡'])

// 根据选中区域过滤光电站数据
const filteredLightStations = computed(() => {
  if (!selectedRegion.value) {
    // 如果没有选择区域，显示前5个光电站
    return lightData[currentLightType.value].slice(0, 5)
  }
  // 否则根据区域名称过滤
  return lightData[currentLightType.value].filter(station =>
    station.name.includes(selectedRegion.value!)
  )
})

// 获取电站状态类名
const getStationStatusClass = (status: number) => {
  if (status >= 80) return 'normal'
  if (status >= 60) return 'attention'
  return 'warning'
}

// 获取电站状态文本
const getStationStatusText = (status: number) => {
  if (status >= 80) return '正常'
  if (status >= 60) return '注意'
  return '警告'
}

// 切换光照类型
const changeLightType = (type: keyof LightTypeConfigs) => {
  currentLightType.value = type
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
const showInfoWindow = (panel: any, marker: any, config: any) => {
  if (!mapInstance) return

  const infoWindow = new AMap.InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${panel.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: ${config.name}</p>
          <p class="resource-status">状态: <span style="color: ${panel.status && panel.status >= 80 ? '#00B42A' : panel.status && panel.status >= 60 ? '#FF7D00' : '#F53F3F'}">${panel.status && panel.status >= 80 ? '正常' : panel.status && panel.status >= 60 ? '注意' : '警告'}</span></p>
          <p class="resource-power">发电量: ${panel.power} ${config.unit}</p>
          <p class="resource-efficiency">效率: ${panel.efficiency}%</p>
          <p class="resource-area">面积: ${panel.area} 公顷</p>
          <p class="resource-coordinates">坐标: ${panel.coordinates[0].toFixed(4)}, ${panel.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new AMap.Size(320, 200),
    offset: new AMap.Pixel(0, -50)
  })

  infoWindow.open(mapInstance, panel.coordinates)
}

// 添加地图标记
const addMarkers = () => {
  if (!AMap || !mapInstance) return

  const stations = lightData[currentLightType.value]
  const config = lightTypeConfig[currentLightType.value]

  stations.forEach(station => {
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
        ${station.name}
      </div>
    `

    const marker = new AMap.Marker({
      position: station.coordinates,
      content: markerContent,
      offset: new AMap.Pixel(-20, -20),
      zIndex: 100
    })

    marker.setMap(mapInstance)
    markers.set(station.name, marker)

    // 添加点击事件
    marker.on('click', () => {
      showInfoWindow(station, marker, config)
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
  initLightStationChart()
  initLightIntensityChart()
  initPowerTrendChart()
  initEfficiencyChart()
}

// 初始化光电站分布图
const initLightStationChart = () => {
  const chart = echarts.init(document.getElementById('lightStationChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: lightStationData.map(item => item.color),
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
        name: '光电站类型分布',
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
        data: lightStationData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化光照强度图表
const initLightIntensityChart = () => {
  const chart = echarts.init(document.getElementById('lightIntensityChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c} lux'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: lightIntensityData.time,
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
        formatter: '{value} lux'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '光照强度',
        type: 'line',
        data: lightIntensityData.intensity,
        smooth: true,
        lineStyle: {
          color: '#FFD700',
          width: 3
        },
        itemStyle: {
          color: '#FFD700',
          borderColor: '#FFD700',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 215, 0, 0.5)' },
            { offset: 1, color: 'rgba(255, 215, 0, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化发电趋势图表
const initPowerTrendChart = () => {
  const chart = echarts.init(document.getElementById('powerTrendChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].name + '<br/>'
        params.forEach((item: any) => {
          result += item.marker + item.seriesName + ': ' + item.value + ' 万千瓦时<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['实际发电量', '预测发电量'],
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
      data: powerTrendData.time,
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
        formatter: '{value} 万千瓦时'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '实际发电量',
        type: 'bar',
        data: powerTrendData.actual,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FFA500' },
            { offset: 1, color: '#FF8C00' }
          ])
        },
        // 设置柱状图宽度
        barWidth: '30%',
        // 设置柱状图间距
        barGap: '0%',
        barCategoryGap: '40%'
      },
      {
        name: '预测发电量',
        type: 'line',
        data: powerTrendData.forecast.map((value, index) => {
          // 为折线图数据点添加位置偏移
          return {
            value: value,
            itemStyle: {
              color: '#FFD700'
            },
            // 向右偏移
            offset: [15, 0]
          };
        }),
        smooth: true,
        lineStyle: {
          color: '#FFD700',
          width: 2
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
  chart.setOption(option)
}

// 初始化效率图表
const initEfficiencyChart = () => {
  const chart = echarts.init(document.getElementById('efficiencyChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = efficiencyData.find(item => item.name === params[0].name)
        return `${params[0].name}<br/>${params[0].marker} 效率: ${params[0].value}%<br/>标准效率: ${item?.standard}%`
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
      data: efficiencyData.map(item => item.name),
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
      min: 70,
      max: 100,
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        formatter: '{value}%'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      axisPointer: {
        label: {
          formatter: '{value}%'
        }
      }
    },
    series: [
      // 标准线
      {
        name: '标准效率',
        type: 'line',
        data: efficiencyData.map(item => item.standard),
        smooth: true,
        lineStyle: {
          color: '#FFD700',
          width: 2,
          type: 'dashed'
        },
        symbol: 'none',
        showSymbol: false
      },
      {
        name: '发电效率',
        type: 'bar',
        data: efficiencyData.map(item => ({
          value: item.value,
          itemStyle: {
            color: item.value >= item.standard ? '#00B42A' : '#FF7D00'
          }
        })),
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
    lightStationData = regionData.lightStationData
    lightIntensityData = regionData.lightIntensityData
    powerTrendData = regionData.powerTrendData
    efficiencyData = regionData.efficiencyData

    // 更新图表
    initCharts()
    ElMessage.success(`已切换到${selectedRegion.value}的数据`)
  } else {
    // 恢复原始数据
    lightStationData = originalData.lightStationData
    lightIntensityData = originalData.lightIntensityData
    powerTrendData = originalData.powerTrendData
    efficiencyData = originalData.efficiencyData

    // 更新图表
    initCharts()
  }
}

// 监听窗口大小变化，更新图表
const handleResize = () => {
  // 更新所有图表大小
  const charts = ['lightStationChart', 'lightIntensityChart', 'powerTrendChart', 'efficiencyChart']
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
.light-forecasting-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  padding: 15px;
  overflow: auto;
  box-sizing: border-box;
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
  color: #FFD700;
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
.light-station-card,
.light-intensity-card,
.efficiency-card,
.map-section,
.power-trend-card,
.region-light-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.map-section {
  color: #000;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #FFD700;
  border-bottom: 2px solid rgba(255, 215, 0, 0.3);
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

.light-type-selector {
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
  background: #FFD700;
  color: #000;
  border-color: #FFD700;
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
  background: #FFD700;
  color: #000;
  border-color: #FFD700;
}

.map-container {
  width: 100%;
  height: 350px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.light-stations-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.light-station-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.light-station-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.station-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.station-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.station-value {
  font-size: 16px;
  font-weight: 600;
  color: #FFD700;
}

.station-unit {
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
  background: #FFD700;
  color: #000;
  border-color: #FFD700;
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
}

@media (max-width: 768px) {
  .light-forecasting-container {
    padding: 10px;
  }

  .header-title h2 {
    font-size: 20px;
  }

  .map-controls {
    flex-wrap: wrap;
    gap: 10px;
  }

  .light-type-selector {
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
