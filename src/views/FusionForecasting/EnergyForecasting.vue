<template>
  <div class="energy-storage-container">
    <!-- 头部标题 -->
    <div class="header-title">
      <h2>储能预测与分析平台</h2>
      <div class="date-display">{{ currentDate }}</div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 今日预测储能总量卡片 -->
        <div class="total-storage-card">
          <div class="card-title">今日预测储能总量</div>
          <div class="storage-value">
            <span class="value">{{ totalEnergyStorage }}</span>
            <span class="unit">万千瓦时</span>
          </div>
          <div class="growth-info">
            <span class="growth-label">环比昨日</span>
            <span class="growth-value"
              :class="storageLevelTrend === 'rising' ? 'positive' : storageLevelTrend === 'falling' ? 'negative' : ''">
              {{ storageLevelTrend === 'rising' ? '+' : storageLevelTrend === 'falling' ? '-' : '' }}{{
                Math.abs(storageLevelChange) }}%
            </span>
          </div>
        </div>

        <!-- 储能类型分布 -->
        <div class="storage-type-card">
          <div class="card-title">储能类型分布</div>
          <div id="storageTypeChart" class="chart-container"></div>
        </div>

        <!-- 储能效率监测 -->
        <div class="efficiency-monitoring-card">
          <div class="card-title">储能效率监测</div>
          <div class="chart-tabs">
            <button class="tab-btn" :class="{ active: currentEfficiencyPeriod === 'day' }" @click="changeEfficiencyPeriod('day')">日</button>
            <button class="tab-btn" :class="{ active: currentEfficiencyPeriod === 'week' }" @click="changeEfficiencyPeriod('week')">周</button>
            <button class="tab-btn" :class="{ active: currentEfficiencyPeriod === 'month' }" @click="changeEfficiencyPeriod('month')">月</button>
          </div>
          <div id="efficiencyMonitoringChart" class="chart-container"></div>
        </div>

        <!-- 储能设备分析 -->
        <div class="equipment-analysis-card">
          <div class="card-title">储能设备分析</div>
          <div id="equipmentAnalysisChart" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 地图区域 -->
        <div class="map-section">
          <div class="map-controls">
            <div class="storage-type-selector">
              <button v-for="(config, key) in storageTypeConfig" :key="key"
                :class="['energy-type-btn', { active: currentStorageType === key }]"
                :style="{ '--color': config.color }" @click="changeStorageType(key)">
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

        <!-- 储能趋势图 -->
        <div class="storage-trend-card">
          <div class="card-title">储能趋势</div>
          <div id="storageTrendChart" class="chart-container"></div>
        </div>

        <!-- 区域储能分布 -->
        <div class="region-storage-card">
          <div class="card-title">区域储能分布</div>
          <div class="storage-stations-list">
            <div v-for="station in filteredStorageStations" :key="station.name" class="storage-station-item">
              <div class="station-name">{{ station.name }}</div>
              <div class="station-info">
                <span class="station-value">{{ station.capacity }}</span>
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

// 区域特定数据 - 储能预测专用数据
const regionSpecificData = {
  '古夫镇': {
    storageTypeData: [
      { name: '锂电池储能', value: 40, color: '#8A2BE2' },
      { name: '铅酸电池储能', value: 30, color: '#9F5DE2' },
      { name: '液流电池储能', value: 20, color: '#7700FF' },
      { name: '其他储能类型', value: 10, color: '#6A0DAD' }
    ],
    efficiencyData: {
      time: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      efficiency: [85, 88, 90, 87, 86, 84]
    },
    storageTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [1200, 1350, 1280, 1420, 1380, 1450, 1520],
      forecast: [1180, 1330, 1260, 1400, 1360, 1430, 1500]
    },
    equipmentData: [
      { name: '古夫镇储能站', value: 92, standard: 85 },
      { name: '昭君镇储能站', value: 88, standard: 85 },
      { name: '峡口镇储能站', value: 94, standard: 85 },
      { name: '南阳镇储能站', value: 85, standard: 85 },
      { name: '黄粮镇储能站', value: 90, standard: 85 }
    ]
  },
  '昭君镇': {
    storageTypeData: [
      { name: '锂电池储能', value: 42, color: '#8A2BE2' },
      { name: '铅酸电池储能', value: 28, color: '#9F5DE2' },
      { name: '液流电池储能', value: 18, color: '#7700FF' },
      { name: '其他储能类型', value: 12, color: '#6A0DAD' }
    ],
    efficiencyData: {
      time: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      efficiency: [84, 87, 89, 86, 85, 83]
    },
    storageTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [1100, 1250, 1180, 1320, 1280, 1350, 1420],
      forecast: [1080, 1230, 1160, 1300, 1260, 1330, 1400]
    },
    equipmentData: [
      { name: '古夫镇储能站', value: 90, standard: 85 },
      { name: '昭君镇储能站', value: 86, standard: 85 },
      { name: '峡口镇储能站', value: 92, standard: 85 },
      { name: '南阳镇储能站', value: 83, standard: 85 },
      { name: '黄粮镇储能站', value: 88, standard: 85 }
    ]
  },
  '峡口镇': {
    storageTypeData: [
      { name: '锂电池储能', value: 38, color: '#8A2BE2' },
      { name: '铅酸电池储能', value: 32, color: '#9F5DE2' },
      { name: '液流电池储能', value: 22, color: '#7700FF' },
      { name: '其他储能类型', value: 8, color: '#6A0DAD' }
    ],
    efficiencyData: {
      time: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      efficiency: [86, 89, 91, 88, 87, 85]
    },
    storageTrendData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [1300, 1450, 1380, 1520, 1480, 1550, 1620],
      forecast: [1280, 1430, 1360, 1500, 1460, 1530, 1600]
    },
    equipmentData: [
      { name: '古夫镇储能站', value: 94, standard: 85 },
      { name: '昭君镇储能站', value: 90, standard: 85 },
      { name: '峡口镇储能站', value: 96, standard: 85 },
      { name: '南阳镇储能站', value: 87, standard: 85 },
      { name: '黄粮镇储能站', value: 92, standard: 85 }
    ]
  }
}

// 定义储能数据类型接口
interface StorageItem {
  name: string;
  capacity: number;
  efficiency: number;
  life: number;
  status?: number;
  coordinates: number[];
}

interface StorageDataType {
  lithium: StorageItem[];
  leadAcid: StorageItem[];
  flow: StorageItem[];
  other: StorageItem[];
  [key: string]: StorageItem[];
}

// 详细的储能数据评估
const storageData: StorageDataType = {
  // 锂电池储能数据
  lithium: [
    { name: '古夫镇锂电池储能站', capacity: 4800, efficiency: 92, life: 7, status: 95, coordinates: [110.78, 31.18] },
    { name: '昭君镇锂电池储能站', capacity: 4200, efficiency: 90, life: 6, status: 88, coordinates: [110.69, 31.10] },
    { name: '峡口镇锂电池储能站', capacity: 5200, efficiency: 94, life: 8, status: 96, coordinates: [110.73, 31.02] },
    { name: '南阳镇锂电池储能站', capacity: 3800, efficiency: 88, life: 6, status: 75, coordinates: [110.95, 31.22] },
    { name: '黄粮镇锂电池储能站', capacity: 4000, efficiency: 90, life: 7, status: 72, coordinates: [110.87, 31.13] },
    { name: '水月寺锂电池储能站', capacity: 3500, efficiency: 86, life: 5, status: 58, coordinates: [111.03, 31.08] },
    { name: '高桥锂电池储能站', capacity: 3200, efficiency: 84, life: 5, status: 55, coordinates: [110.60, 31.00] },
    { name: '榛子锂电池储能站', capacity: 3000, efficiency: 82, life: 4, status: 52, coordinates: [110.94, 31.34] }
  ],
  // 铅酸电池储能数据
  leadAcid: [
    { name: '古夫镇铅酸电池储能站', capacity: 3500, efficiency: 85, life: 3, status: 92, coordinates: [110.77, 31.19] },
    { name: '昭君镇铅酸电池储能站', capacity: 3200, efficiency: 83, life: 3, status: 89, coordinates: [110.68, 31.11] },
    { name: '峡口镇铅酸电池储能站', capacity: 3800, efficiency: 87, life: 4, status: 94, coordinates: [110.72, 31.03] },
    { name: '南阳镇铅酸电池储能站', capacity: 2800, efficiency: 81, life: 3, status: 78, coordinates: [110.94, 31.23] },
    { name: '黄粮镇铅酸电池储能站', capacity: 3000, efficiency: 83, life: 3, status: 73, coordinates: [110.86, 31.14] },
    { name: '水月寺铅酸电池储能站', capacity: 2600, efficiency: 79, life: 2, status: 62, coordinates: [111.02, 31.09] },
    { name: '高桥铅酸电池储能站', capacity: 2400, efficiency: 77, life: 2, status: 59, coordinates: [110.59, 31.01] },
    { name: '榛子铅酸电池储能站', capacity: 2200, efficiency: 75, life: 2, status: 56, coordinates: [110.93, 31.35] }
  ],
  // 液流电池储能数据
  flow: [
    { name: '古夫镇液流电池储能站', capacity: 2500, efficiency: 88, life: 10, status: 93, coordinates: [110.79, 31.17] },
    { name: '昭君镇液流电池储能站', capacity: 2200, efficiency: 86, life: 9, status: 90, coordinates: [110.70, 31.09] },
    { name: '峡口镇液流电池储能站', capacity: 2800, efficiency: 90, life: 10, status: 95, coordinates: [110.74, 31.01] },
    { name: '南阳镇液流电池储能站', capacity: 1800, efficiency: 84, life: 8, status: 76, coordinates: [110.96, 31.21] },
    { name: '黄粮镇液流电池储能站', capacity: 2000, efficiency: 86, life: 9, status: 74, coordinates: [110.88, 31.12] },
    { name: '水月寺液流电池储能站', capacity: 1600, efficiency: 82, life: 8, status: 65, coordinates: [111.04, 31.07] },
    { name: '高桥液流电池储能站', capacity: 1400, efficiency: 80, life: 7, status: 61, coordinates: [110.61, 30.99] },
    { name: '榛子液流电池储能站', capacity: 1200, efficiency: 78, life: 7, status: 57, coordinates: [110.95, 31.33] }
  ],
  // 其他储能类型数据
  other: [
    { name: '古夫镇其他储能站', capacity: 1500, efficiency: 80, life: 5, status: 91, coordinates: [110.76, 31.16] },
    { name: '昭君镇其他储能站', capacity: 1300, efficiency: 78, life: 4, status: 87, coordinates: [110.67, 31.08] },
    { name: '峡口镇其他储能站', capacity: 1700, efficiency: 82, life: 6, status: 93, coordinates: [110.71, 31.00] },
    { name: '南阳镇其他储能站', capacity: 1200, efficiency: 76, life: 4, status: 77, coordinates: [110.93, 31.20] },
    { name: '黄粮镇其他储能站', capacity: 1400, efficiency: 79, life: 5, status: 71, coordinates: [110.85, 31.11] },
    { name: '水月寺其他储能站', capacity: 1100, efficiency: 75, life: 4, status: 64, coordinates: [111.01, 31.06] },
    { name: '高桥其他储能站', capacity: 1000, efficiency: 74, life: 4, status: 60, coordinates: [110.62, 30.98] },
    { name: '榛子其他储能站', capacity: 900, efficiency: 72, life: 3, status: 54, coordinates: [110.92, 31.32] }
  ]
}

// 当前显示的储能类型
const currentStorageType = ref<keyof StorageTypeConfigs>('lithium')

// 储能类型配置接口
interface StorageTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface StorageTypeConfigs {
  lithium: StorageTypeConfig;
  leadAcid: StorageTypeConfig;
  flow: StorageTypeConfig;
  other: StorageTypeConfig;
  [key: string]: StorageTypeConfig;
}

// 储能类型配置
const storageTypeConfig: StorageTypeConfigs = {
  lithium: { name: '锂电池储能', color: '#8A2BE2', unit: '万千瓦时', field: 'capacity', icon: '🔋' },
  leadAcid: { name: '铅酸电池储能', color: '#9F5DE2', unit: '万千瓦时', field: 'capacity', icon: '⚡' },
  flow: { name: '液流电池储能', color: '#7700FF', unit: '万千瓦时', field: 'capacity', icon: '💧' },
  other: { name: '其他储能类型', color: '#6A0DAD', unit: '万千瓦时', field: 'capacity', icon: '🔌' }
}

// 储能类型数据
let storageTypeData = [
  { name: '锂电池储能', value: 40, color: '#8A2BE2' },
  { name: '铅酸电池储能', value: 30, color: '#9F5DE2' },
  { name: '液流电池储能', value: 20, color: '#7700FF' },
  { name: '其他储能类型', value: 10, color: '#6A0DAD' }
]

// 当前时间周期 (日/周/月)
const currentEfficiencyPeriod = ref('day')

  // 日效率数据
const dayEfficiencyData = {
  time: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
  efficiency: [85, 88, 90, 87, 86, 84]
}

  // 周效率数据
const weekEfficiencyData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  efficiency: [86, 88, 90, 87, 85, 89, 88]
}

  // 月效率数据
const monthEfficiencyData = {
  time: ['1月', '2月', '3月', '4月', '5月', '6月'],
  efficiency: [84, 86, 88, 90, 89, 87]
}

  // 当前使用的数据
let efficiencyData = JSON.parse(JSON.stringify(dayEfficiencyData))

  // 切换时间周期
const changeEfficiencyPeriod = (period: 'day' | 'week' | 'month') => {
  currentEfficiencyPeriod.value = period
  
  // 根据选择的周期更新数据
  if (period === 'day') {
    efficiencyData = JSON.parse(JSON.stringify(dayEfficiencyData))
  } else if (period === 'week') {
    efficiencyData = JSON.parse(JSON.stringify(weekEfficiencyData))
  } else if (period === 'month') {
    efficiencyData = JSON.parse(JSON.stringify(monthEfficiencyData))
  }
  
  // 重新初始化图表
  initEfficiencyMonitoringChart()
}

// 储能趋势数据
let storageTrendData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  actual: [1200, 1350, 1280, 1420, 1380, 1450, 1520],
  forecast: [1180, 1330, 1260, 1400, 1360, 1430, 1500]
}

// 设备数据
let equipmentData = [
  { name: '古夫镇储能站', value: 92, standard: 85 },
  { name: '昭君镇储能站', value: 88, standard: 85 },
  { name: '峡口镇储能站', value: 94, standard: 85 },
  { name: '南阳镇储能站', value: 85, standard: 85 },
  { name: '黄粮镇储能站', value: 90, standard: 85 }
]

// 原始数据备份
const originalData = {
  storageTypeData: JSON.parse(JSON.stringify(storageTypeData)),
  efficiencyData: JSON.parse(JSON.stringify(efficiencyData)),
  storageTrendData: JSON.parse(JSON.stringify(storageTrendData)),
  equipmentData: JSON.parse(JSON.stringify(equipmentData))
}

// 计算总储能预测
const totalEnergyStorage = ref(1465)

// 计算储能趋势
const storageLevelTrend = ref('rising')
const storageLevelChange = ref(4.8)

// 可用区域列表
const availableRegions = ref(['古夫镇', '昭君镇', '峡口镇', '南阳镇', '黄粮镇', '水月寺镇', '高桥乡', '榛子乡'])

// 根据选中区域过滤储能站数据
const filteredStorageStations = computed(() => {
  if (!selectedRegion.value) {
    // 如果没有选择区域，显示前5个储能站
    return storageData[currentStorageType.value].slice(0, 5)
  }
  // 否则根据区域名称过滤
  return storageData[currentStorageType.value].filter(station =>
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

// 切换储能类型
const changeStorageType = (type: keyof StorageTypeConfigs) => {
  currentStorageType.value = type
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
const showInfoWindow = (station: any, marker: any, config: any) => {
  if (!mapInstance) return

  const infoWindow = new AMap.InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${station.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: ${config.name}</p>
          <p class="resource-capacity">容量: ${station.capacity} ${config.unit}</p>
          <p class="resource-efficiency">效率: ${station.efficiency}%</p>
          <p class="resource-life">使用寿命: ${station.life} 年</p>
          <p class="resource-coordinates">坐标: ${station.coordinates[0].toFixed(4)}, ${station.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new AMap.Size(320, 200),
    offset: new AMap.Pixel(0, -50)
  })

  infoWindow.open(mapInstance, station.coordinates)
}

// 添加地图标记
const addMarkers = () => {
  if (!AMap || !mapInstance) return

  const stations = storageData[currentStorageType.value]
  const config = storageTypeConfig[currentStorageType.value]

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
  initStorageTypeChart()
  initEfficiencyMonitoringChart()
  initStorageTrendChart()
  initEquipmentAnalysisChart()
}

// 初始化储能类型图表
const initStorageTypeChart = () => {
  const chart = echarts.init(document.getElementById('storageTypeChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: storageTypeData.map(item => item.color),
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
        name: '储能类型分布',
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
        data: storageTypeData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化效率监测图表
const initEfficiencyMonitoringChart = () => {
  const chart = echarts.init(document.getElementById('efficiencyMonitoringChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: efficiencyData.time,
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
      }
    },
    series: [
      {
        name: '储能效率',
        type: 'line',
        data: efficiencyData.efficiency,
        smooth: true,
        lineStyle: {
          color: '#8A2BE2',
          width: 3
        },
        itemStyle: {
          color: '#8A2BE2',
          borderColor: '#8A2BE2',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(138, 43, 226, 0.5)' },
            { offset: 1, color: 'rgba(138, 43, 226, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化储能趋势图表
const initStorageTrendChart = () => {
  const chart = echarts.init(document.getElementById('storageTrendChart') as HTMLElement)
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
      data: ['实际储能', '预测储能'],
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
      data: storageTrendData.time,
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
        name: '实际储能',
        type: 'bar',
        data: storageTrendData.actual,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#8A2BE2' },
            { offset: 1, color: '#6A0DAD' }
          ])
        },
        // 设置柱状图宽度
        barWidth: '30%',
        // 设置柱状图间距
        barGap: '0%',
        barCategoryGap: '40%'
      },
      {
        name: '预测储能',
        type: 'line',
        data: storageTrendData.forecast.map((value, index) => {
          // 为折线图数据点添加位置偏移
          return {
            value: value,
            itemStyle: {
              color: '#8A2BE2'
            },
            // 向右偏移
            offset: [15, 0]
          };
        }),
        smooth: true,
        lineStyle: {
          color: '#8A2BE2',
          width: 2
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
  chart.setOption(option)
}

// 初始化设备分析图表
const initEquipmentAnalysisChart = () => {
  const chart = echarts.init(document.getElementById('equipmentAnalysisChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = equipmentData.find(item => item.name === params[0].name)
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
      data: equipmentData.map(item => item.name),
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
        data: equipmentData.map(item => item.standard),
        smooth: true,
        lineStyle: {
          color: '#00f2fe',
          width: 2,
          type: 'dashed'
        },
        symbol: 'none',
        showSymbol: false
      },
      {
        name: '设备效率',
        type: 'bar',
        data: equipmentData.map(item => ({
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
    storageTypeData = regionData.storageTypeData
    efficiencyData = regionData.efficiencyData
    storageTrendData = regionData.storageTrendData
    equipmentData = regionData.equipmentData

    // 更新图表
    initCharts()
    ElMessage.success(`已切换到${selectedRegion.value}的数据`)
  } else {
    // 恢复原始数据
    storageTypeData = originalData.storageTypeData
    efficiencyData = originalData.efficiencyData
    storageTrendData = originalData.storageTrendData
    equipmentData = originalData.equipmentData

    // 更新图表
    initCharts()
  }
}

// 监听窗口大小变化，更新图表
const handleResize = () => {
  // 更新所有图表大小
  const charts = ['storageTypeChart', 'efficiencyMonitoringChart', 'storageTrendChart', 'equipmentAnalysisChart']
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
.energy-storage-container {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1A103A 0%, #2D1A50 100%);
  color: #fff;
  padding: 15px;
  overflow: auto;
  box-sizing: border-box;
  --primary-color: #8A2BE2;
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

.total-storage-card,
.storage-type-card,
.efficiency-monitoring-card,
.equipment-analysis-card,
.map-section,
.storage-trend-card,
.region-storage-card {
  background: rgba(35, 35, 35, 0.1);
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
  color: var(--primary-color);
  border-bottom: 2px solid rgba(138, 43, 226, 0.3);
  padding-bottom: 10px;
}

.storage-value {
  display: flex;
  align-items: baseline;
  margin: 15px 0;
}

.storage-value .value {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin-right: 10px;
}

.storage-value .unit {
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
  color: #8A2BE2;
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

.storage-type-selector {
  display: flex;
  gap: 10px;
}

.energy-type-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 20px;
  font-size: 11px;
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
  width: 32px;
  height: 32px;
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
  width: 32px;
  height: 32px;
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

.storage-stations-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.storage-station-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.storage-station-item:hover {
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
  color: var(--primary-color);
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
  background: var(--primary-color);
  color: #000;
  border-color: var(--primary-color);
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
  .energy-storage-container {
    padding: 10px;
  }

  .header-title h2 {
    font-size: 20px;
  }

  .map-controls {
    flex-wrap: wrap;
    gap: 10px;
  }

  .storage-type-selector {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .storage-value .value {
    font-size: 36px;
  }

  .chart-container {
    height: 180px;
  }
}
</style>
