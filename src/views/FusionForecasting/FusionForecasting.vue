<template>
  <div class="fusion-forecasting-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-area">
        <!-- 今日预测发电量卡片 -->
        <div class="forecast-card">
          <h2 class="card-title">今日预测总发电量</h2>
          <div class="forecast-value">
            <span class="value">4,521</span>
            <span class="unit">万度</span>
          </div>
          <div class="forecast-details">
            <span class="detail-item">较昨日 <span class="increase">+8.2%</span></span>
            <span class="detail-item">较上周 <span class="increase">+12.5%</span></span>
          </div>
        </div>

        <!-- 中心布局容器 -->
        <div class="center-layout">
          <!-- 左侧内容 -->
          <div class="left-content">
            <!-- 发电资源分析和站点信息 -->
            <div class="stats-grid">
              <!-- 发电资源分析 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>发电资源分析</h3>
                </div>
                <div class="stat-content">
                  <div class="resource-item" v-for="resource in powerResourceData" :key="resource.name">
                    <div class="resource-bar">
                      <div class="resource-fill"
                        :style="{ width: resource.value + '%', backgroundColor: resource.color }">
                      </div>
                    </div>
                    <div class="resource-info">
                      <span class="resource-name">{{ resource.name }}</span>
                      <span class="resource-value">{{ resource.value }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 站点信息 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>站点信息</h3>
                </div>
                <div class="stat-content">
                  <div class="station-stats">
                    <div class="station-item">
                      <span class="station-label">水电站</span>
                      <div class="station-stats-details">
                        <span class="stat-value">{{ stationStatsData.hydropower.count }}座</span>
                        <span class="stat-value">{{ stationStatsData.hydropower.totalCapacity }}MW</span>
                      </div>
                    </div>
                    <div class="station-item">
                      <span class="station-label">光伏站</span>
                      <div class="station-stats-details">
                        <span class="stat-value">{{ stationStatsData.solar.count }}座</span>
                        <span class="stat-value">{{ stationStatsData.solar.totalCapacity }}MW</span>
                      </div>
                    </div>
                    <div class="station-item">
                      <span class="station-label">风电</span>
                      <div class="station-stats-details">
                        <span class="stat-value">{{ stationStatsData.wind.count }}座</span>
                        <span class="stat-value">{{ stationStatsData.wind.totalCapacity }}MW</span>
                      </div>
                    </div>
                    <div class="station-item">
                      <span class="station-label">储能站</span>
                      <div class="station-stats-details">
                        <span class="stat-value">{{ stationStatsData.storage.count }}座</span>
                        <span class="stat-value">{{ stationStatsData.storage.totalCapacity }}MW</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 兴山县电力资源分布地图 -->
          <div class="map-card">
            <!-- 能源类型选择器 -->
            <div class="energy-type-selector">
              <button v-for="(config, type) in energyTypeConfig" :key="type"
                :class="['energy-type-btn', { active: currentEnergyType === type }]"
                :style="{ '--color': config.color }" @click="changeEnergyType(type)">
                {{ config.name }}
              </button>
            </div>
            <div ref="mapRef" id="map"></div>
            <div class="map-controls">
              <button class="el-button" @click="mapZoomIn">放大</button>
              <button class="el-button" @click="mapZoomOut">缩小</button>
              <button class="el-button" @click="mapReset">重置</button>
              <div class="layer-switch-container">
                <button class="el-button layer-btn" :class="{ active: currentMapLayer === 'normal' }"
                  @click="switchMapLayer('normal')">
                  标准地图
                </button>
                <button class="el-button layer-btn" :class="{ active: currentMapLayer === 'satellite' }"
                  @click="switchMapLayer('satellite')">
                  卫星地图
                </button>
              </div>
            </div>
          </div>

          <!-- 右侧内容 -->
          <div class="right-content">
            <!-- 图表区域 -->
            <div class="charts-grid">
              <!-- 发电资源分析图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>发电资源分析</h3>
                  <div class="chart-tabs">
                    <button class="tab-btn active">按类型</button>
                    <button class="tab-btn">按地区</button>
                  </div>
                </div>
                <div id="powerResourceChart" class="chart-container"></div>
              </div>

              <!-- 发电负荷监测图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>发电负荷监测</h3>
                </div>
                <div id="powerLoadChart" class="chart-container"></div>
              </div>

              <!-- 一排显示的四个图表 -->
              <div class="charts-row">
                <!-- 用电负荷监测图表 -->
                <div class="chart-card row-chart">
                  <div class="chart-header">
                    <h3>用电负荷监测</h3>
                  </div>
                  <div id="electricityLoadChart" class="chart-container row-chart-container"></div>
                </div>

                <!-- 电量预报图表 -->
                <div class="chart-card row-chart">
                  <div class="chart-header">
                    <h3>电量预报（发/用电）</h3>
                    <div class="chart-tabs">
                      <button class="tab-btn active">表格</button>
                      <button class="tab-btn">图表</button>
                    </div>
                  </div>
                  <div id="powerForecastChart" class="chart-container row-chart-container"></div>
                </div>

                <!-- 用电需求排名图表 -->
                <div class="chart-card row-chart">
                  <div class="chart-header">
                    <h3>用电需求排名（万度）：500</h3>
                  </div>
                  <div id="electricityDemandChart" class="chart-container row-chart-container"></div>
                </div>

                <!-- 最大负荷预测表格 -->
                <div class="chart-card row-chart">
                  <div class="chart-header">
                    <h3>最大负荷预测</h3>
                  </div>
                  <div class="table-container row-table-container">
                    <table class="forecast-table row-forecast-table">
                      <thead>
                        <tr>
                          <th>站名</th>
                          <th>三联河</th>
                          <th>李庄河</th>
                          <th>长河铺</th>
                          <th>黄龙洞</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in maxLoadForecast" :key="item.date">
                          <td>{{ item.date }}</td>
                          <td>{{ item.sanlian }}</td>
                          <td>{{ item.lizhuanghe }}</td>
                          <td>{{ item.changhepu }}</td>
                          <td>{{ item.huanglong }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
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
  TileLayer: {
    Satellite: any
    RoadNet: any
  }
}

// 由于多个文件可能声明了AMap全局变量，这里不重新声明Window接口
// 直接使用类型断言方式处理AMap对象

// 地图相关变量
const mapRef = ref<HTMLDivElement | null>(null)
let mapInstance: any = null
let AMap: AMapInstance | null = null
let markers: Map<string, any> = new Map() // 存储地图标记实例
let normalLayer: any = null
let satelliteLayer: any = null
// 当前地图图层类型
const currentMapLayer = ref<'normal' | 'satellite'>('normal')

// 区域特定数据 - 模拟不同区域的数据变化
const regionSpecificData = {
  '古夫镇': {
    powerResourceData: [
      { name: '水电', value: 65, color: '#4facfe' },
      { name: '光伏', value: 15, color: '#ffd700' },
      { name: '风电', value: 10, color: '#7fbf00' },
      { name: '其他', value: 10, color: '#ff6b6b' }
    ],
    stationStatsData: {
      hydropower: { count: 8, totalCapacity: 450 },
      solar: { count: 12, totalCapacity: 180 },
      wind: { count: 5, totalCapacity: 100 },
      storage: { count: 3, totalCapacity: 60 }
    },
    powerLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [98, 85, 82, 105, 120, 135, 140, 125],
      forecast: [95, 83, 80, 102, 118, 132, 138, 122]
    },
    electricityLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [90, 60, 120, 180, 150, 140, 130, 110],
      forecast: [88, 58, 118, 178, 148, 138, 128, 108]
    },
    powerForecastData: [
      { date: '18日', generated: 48.6, consumed: 45.3 },
      { date: '19日', generated: 46.7, consumed: 44.2 },
      { date: '20日', generated: 47.9, consumed: 45.8 }
    ],
    electricityDemandRanking: [
      { name: '工业用电', demand: 1150 },
      { name: '居民用电', demand: 920 },
      { name: '商业用电', demand: 780 },
      { name: '农业用电', demand: 350 },
      { name: '公共设施用电', demand: 300 }
    ]
  },
  '昭君镇': {
    powerResourceData: [
      { name: '水电', value: 30, color: '#4facfe' },
      { name: '光伏', value: 50, color: '#ffd700' },
      { name: '风电', value: 15, color: '#7fbf00' },
      { name: '其他', value: 5, color: '#ff6b6b' }
    ],
    stationStatsData: {
      hydropower: { count: 3, totalCapacity: 150 },
      solar: { count: 20, totalCapacity: 300 },
      wind: { count: 7, totalCapacity: 140 },
      storage: { count: 2, totalCapacity: 40 }
    },
    powerLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [85, 75, 72, 95, 110, 125, 130, 115],
      forecast: [82, 73, 70, 93, 108, 122, 128, 112]
    },
    electricityLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [100, 70, 140, 200, 170, 150, 140, 120],
      forecast: [98, 68, 138, 198, 168, 148, 138, 118]
    },
    powerForecastData: [
      { date: '18日', generated: 42.6, consumed: 40.3 },
      { date: '19日', generated: 40.7, consumed: 38.2 },
      { date: '20日', generated: 41.9, consumed: 39.8 }
    ],
    electricityDemandRanking: [
      { name: '工业用电', demand: 1050 },
      { name: '居民用电', demand: 980 },
      { name: '商业用电', demand: 820 },
      { name: '农业用电', demand: 380 },
      { name: '公共设施用电', demand: 320 }
    ]
  },
  '峡口镇': {
    powerResourceData: [
      { name: '水电', value: 25, color: '#4facfe' },
      { name: '光伏', value: 20, color: '#ffd700' },
      { name: '风电', value: 50, color: '#7fbf00' },
      { name: '其他', value: 5, color: '#ff6b6b' }
    ],
    stationStatsData: {
      hydropower: { count: 2, totalCapacity: 100 },
      solar: { count: 8, totalCapacity: 120 },
      wind: { count: 15, totalCapacity: 300 },
      storage: { count: 2, totalCapacity: 40 }
    },
    powerLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [92, 80, 78, 100, 115, 130, 135, 120],
      forecast: [90, 78, 76, 98, 113, 128, 133, 118]
    },
    electricityLoadData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      actual: [110, 80, 130, 160, 150, 140, 130, 110],
      forecast: [108, 78, 128, 158, 148, 138, 128, 108]
    },
    powerForecastData: [
      { date: '18日', generated: 44.6, consumed: 41.3 },
      { date: '19日', generated: 42.7, consumed: 39.2 },
      { date: '20日', generated: 43.9, consumed: 40.8 }
    ],
    electricityDemandRanking: [
      { name: '工业用电', demand: 1180 },
      { name: '居民用电', demand: 920 },
      { name: '商业用电', demand: 780 },
      { name: '农业用电', demand: 420 },
      { name: '公共设施用电', demand: 350 }
    ]
  }
}

// 定义能源数据类型接口
interface EnergyItem {
  name: string;
  capacity: number;
  count: number;
  generation?: number;
  status?: number;
  coordinates: number[];
}

interface EnergyDataType {
  hydropower: EnergyItem[];
  solar: EnergyItem[];
  wind: EnergyItem[];
  storage: EnergyItem[];
  [key: string]: EnergyItem[];
}

// 详细的能源数据评估 - 包含水电、光伏、风电、储能站等信息
const energyData: EnergyDataType = {
  // 水电数据
  hydropower: [
    { name: '古夫镇', capacity: 125, count: 3, generation: 85, coordinates: [110.79, 31.17] },
    { name: '昭君镇', capacity: 89, count: 2, generation: 72, coordinates: [110.68, 31.09] },
    { name: '峡口镇', capacity: 142, count: 4, generation: 92, coordinates: [110.72, 31.01] },
    { name: '南阳镇', capacity: 35, count: 1, generation: 65, coordinates: [110.94, 31.21] },
    { name: '黄粮镇', capacity: 67, count: 2, generation: 78, coordinates: [110.86, 31.12] },
    { name: '水月寺镇', capacity: 54, count: 2, generation: 68, coordinates: [111.02, 31.07] },
    { name: '高桥乡', capacity: 28, count: 1, generation: 59, coordinates: [110.61, 31.01] },
    { name: '榛子乡', capacity: 22, count: 1, generation: 55, coordinates: [110.93, 31.33] }
  ],
  // 光伏数据
  solar: [
    { name: '古夫镇', capacity: 45, count: 2, generation: 78, coordinates: [110.78, 31.16] },
    { name: '昭君镇', capacity: 38, count: 1, generation: 70, coordinates: [110.67, 31.10] },
    { name: '峡口镇', capacity: 32, count: 1, generation: 65, coordinates: [110.71, 31.02] },
    { name: '南阳镇', capacity: 18, count: 1, generation: 62, coordinates: [110.93, 31.20] },
    { name: '黄粮镇', capacity: 25, count: 1, generation: 68, coordinates: [110.85, 31.11] },
    { name: '水月寺镇', capacity: 12, count: 1, generation: 58, coordinates: [111.01, 31.08] },
    { name: '高桥乡', capacity: 8, count: 0, generation: 45, coordinates: [110.62, 31.00] },
    { name: '榛子乡', capacity: 10, count: 0, generation: 48, coordinates: [110.92, 31.32] }
  ],
  // 风电数据
  wind: [
    { name: '古夫镇', capacity: 18, count: 1, generation: 65, coordinates: [110.80, 31.15] },
    { name: '昭君镇', capacity: 12, count: 0, generation: 55, coordinates: [110.69, 31.08] },
    { name: '峡口镇', capacity: 25, count: 1, generation: 70, coordinates: [110.73, 31.03] },
    { name: '南阳镇', capacity: 35, count: 1, generation: 75, coordinates: [110.95, 31.22] },
    { name: '黄粮镇', capacity: 28, count: 1, generation: 68, coordinates: [110.87, 31.13] },
    { name: '水月寺镇', capacity: 42, count: 2, generation: 82, coordinates: [111.03, 31.06] },
    { name: '高桥乡', capacity: 15, count: 0, generation: 52, coordinates: [110.60, 31.02] },
    { name: '榛子乡', capacity: 48, count: 2, generation: 85, coordinates: [110.94, 31.34] }
  ],
  // 储能站数据
  storage: [
    { name: '古夫镇', capacity: 25, count: 2, status: 75, coordinates: [110.79, 31.18] },
    { name: '昭君镇', capacity: 18, count: 1, status: 65, coordinates: [110.68, 31.11] },
    { name: '峡口镇', capacity: 22, count: 1, status: 70, coordinates: [110.72, 31.04] },
    { name: '南阳镇', capacity: 10, count: 0, status: 55, coordinates: [110.94, 31.19] },
    { name: '黄粮镇', capacity: 15, count: 1, status: 62, coordinates: [110.86, 31.14] },
    { name: '水月寺镇', capacity: 12, count: 0, status: 58, coordinates: [111.02, 31.09] },
    { name: '高桥乡', capacity: 8, count: 0, status: 52, coordinates: [110.61, 31.03] },
    { name: '榛子乡', capacity: 10, count: 0, status: 55, coordinates: [110.93, 31.31] }
  ]
}

// 当前显示的能源类型
const currentEnergyType = ref<keyof EnergyTypeConfigs>('hydropower')

// 能源类型配置接口
interface EnergyTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface EnergyTypeConfigs {
  hydropower: EnergyTypeConfig;
  solar: EnergyTypeConfig;
  wind: EnergyTypeConfig;
  storage: EnergyTypeConfig;
  [key: string]: EnergyTypeConfig;
}

// 能源类型配置
const energyTypeConfig: EnergyTypeConfigs = {
  hydropower: { name: '水电', color: '#4facfe', unit: 'MW', field: 'capacity', icon: '💧' },
  solar: { name: '光伏', color: '#ffd700', unit: 'MW', field: 'capacity', icon: '☀️' },
  wind: { name: '风电', color: '#7fbf00', unit: 'MW', field: 'capacity', icon: '🌬️' },
  storage: { name: '储能', color: '#ff6b6b', unit: '%', field: 'status', icon: '🔋' }
}

// 发电资源数据
let powerResourceData = [
  { name: '水电', value: 45, color: '#4facfe' },
  { name: '光伏', value: 30, color: '#ffd700' },
  { name: '风电', value: 15, color: '#7fbf00' },
  { name: '其他', value: 10, color: '#ff6b6b' }
]

// 站点统计数据
let stationStatsData = {
  hydropower: { count: 12, totalCapacity: 560 },
  solar: { count: 8, totalCapacity: 120 },
  wind: { count: 3, totalCapacity: 45 },
  storage: { count: 5, totalCapacity: 100 }
}

// 用电需求排名
let electricityDemandRanking = [
  { name: '工业用电', demand: 1250 },
  { name: '居民用电', demand: 980 },
  { name: '商业用电', demand: 750 },
  { name: '农业用电', demand: 320 },
  { name: '公共设施用电', demand: 280 }
]

// 电量预报数据
let powerForecastData = [
  { date: '18日', generated: 45.6, consumed: 42.3 },
  { date: '19日', generated: 43.7, consumed: 41.2 },
  { date: '20日', generated: 44.9, consumed: 41.8 }
]

// 发电负荷监测数据
let powerLoadData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  actual: [98, 85, 82, 105, 120, 135, 140, 125],
  forecast: [95, 83, 80, 102, 118, 132, 138, 122]
}

// 用电负荷监测数据
let electricityLoadData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  actual: [85, 72, 80, 95, 105, 110, 120, 105],
  forecast: [83, 70, 78, 93, 103, 108, 118, 103]
}

// 最大负荷预测数据
const maxLoadForecast = [
  { date: '6月18日', sanlian: '85%', lizhuanghe: '78%', changhepu: '92%', huanglong: '72%' },
  { date: '6月19日', sanlian: '82%', lizhuanghe: '80%', changhepu: '88%', huanglong: '75%' },
  { date: '6月20日', sanlian: '88%', lizhuanghe: '82%', changhepu: '90%', huanglong: '78%' }
]

// 原始数据备份 - 移到所有数据变量定义之后
const originalData = {
  powerResourceData: JSON.parse(JSON.stringify(powerResourceData)),
  stationStatsData: JSON.parse(JSON.stringify(stationStatsData)),
  powerLoadData: JSON.parse(JSON.stringify(powerLoadData)),
  electricityLoadData: JSON.parse(JSON.stringify(electricityLoadData)),
  powerForecastData: JSON.parse(JSON.stringify(powerForecastData)),
  electricityDemandRanking: JSON.parse(JSON.stringify(electricityDemandRanking))
}

// 初始化所有图表
const initCharts = () => {
  initPowerResourceChart()
  initPowerLoadChart()
  initElectricityLoadChart()
  initPowerForecastChart()
  initElectricityDemandChart()
}

// 初始化发电资源分析图表
const initPowerResourceChart = () => {
  const chart = echarts.init(document.getElementById('powerResourceChart') as HTMLElement)
  const option = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: powerResourceData.map(item => item.color),
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
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
        name: '发电资源',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
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
        data: powerResourceData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化发电负荷监测图表
const initPowerLoadChart = () => {
  const chart = echarts.init(document.getElementById('powerLoadChart') as HTMLElement)
  const option = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['实际值', '预测值'],
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
      boundaryGap: false,
      data: powerLoadData.time,
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
        name: '实际值',
        type: 'line',
        stack: 'Total',
        data: powerLoadData.actual,
        smooth: true,
        lineStyle: {
          color: '#4facfe'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 172, 254, 0.5)' },
            { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
          ])
        }
      },
      {
        name: '预测值',
        type: 'line',
        stack: 'Total',
        data: powerLoadData.forecast,
        smooth: true,
        lineStyle: {
          color: '#ff6b6b',
          type: 'dashed'
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化用电负荷监测图表
const initElectricityLoadChart = () => {
  const chart = echarts.init(document.getElementById('electricityLoadChart') as HTMLElement)
  const option = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['实际值', '预测值'],
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
      boundaryGap: false,
      data: electricityLoadData.time,
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
        name: '实际值',
        type: 'line',
        stack: 'Total',
        data: electricityLoadData.actual,
        smooth: true,
        lineStyle: {
          color: '#7fbf00'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(127, 191, 0, 0.5)' },
            { offset: 1, color: 'rgba(127, 191, 0, 0.1)' }
          ])
        }
      },
      {
        name: '预测值',
        type: 'line',
        stack: 'Total',
        data: electricityLoadData.forecast,
        smooth: true,
        lineStyle: {
          color: '#ffd700',
          type: 'dashed'
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化电量预报图表
const initPowerForecastChart = () => {
  const chart = echarts.init(document.getElementById('powerForecastChart') as HTMLElement)
  const option = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['发电量', '用电量'],
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
      data: powerForecastData.map(item => item.date),
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
        name: '发电量',
        type: 'bar',
        data: powerForecastData.map(item => item.generated),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ])
        }
      },
      {
        name: '用电量',
        type: 'bar',
        data: powerForecastData.map(item => item.consumed),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#ff6b6b' },
            { offset: 1, color: '#ff8e8e' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化用电需求排名图表
const initElectricityDemandChart = () => {
  const chart = echarts.init(document.getElementById('electricityDemandChart') as HTMLElement)
  const option = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
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
    yAxis: {
      type: 'category',
      data: electricityDemandRanking.map(item => item.name).reverse(),
      axisLine: {
        lineStyle: {
          color: '#fff'
        }
      },
      axisLabel: {
        color: '#fff',
        fontSize: 12
      }
    },
    series: [
      {
        name: '用电需求',
        type: 'bar',
        data: electricityDemandRanking.map(item => item.demand).reverse(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ])
        },
        label: {
          show: true,
          position: 'right',
          color: '#fff'
        }
      }
    ]
  }
  chart.setOption(option)
}

// 监听窗口大小变化，重置图表大小
const handleResize = () => {
  // 处理所有图表
  const charts = document.querySelectorAll('div[id$="Chart"]')
  charts.forEach(chart => {
    const instance = echarts.getInstanceByDom(chart as HTMLElement)
    if (instance) {
      instance.resize()
    }
  })

  // 处理地图
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 地图配置项
const mapConfig = {
  apiKey: '1c8fb5781411703ac5c3343201e0ab99',
  securityConfig: {
    securityJsCode: '8468351a95a828e0700d4aaa085c3551'
  }
}

// 加载高德地图API
const loadMapScript = () => {
  return new Promise((resolve, reject) => {
    // 设置安全配置
    window._AMapSecurityConfig = mapConfig.securityConfig

    // 检查是否已经加载过高德地图API
    if (window.AMap) {
      AMap = window.AMap
      console.log('AMap API already loaded')
      resolve(AMap)
      return
    }

    // 创建script标签加载高德地图API
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.MapType,AMap.TileLayer,AMap.TileLayer.Satellite`
    script.onload = () => {
      AMap = window.AMap
      console.log('AMap API loaded successfully')
      resolve(AMap)
    }
    script.onerror = (error) => {
      reject(new Error('高德地图API加载失败: ' + (error instanceof Error ? error.message : '未知错误')))
    }
    document.head.appendChild(script)
  })
}

// 初始化地图
const initMap = async () => {
  try {
    // 加载高德地图API
    await loadMapScript()

    // 获取地图容器
    const mapContainer = mapRef.value
    if (!mapContainer || !AMap) return

    // 创建地图实例
    mapInstance = new AMap.Map(mapContainer, {
      viewMode: '2D',
      center: [110.78, 31.20], // 湖北省宜昌市兴山县
      zoom: 10
    })

    // 添加基础控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar())

    // 创建并管理图层
    normalLayer = new (AMap.TileLayer as any)()
    satelliteLayer = new (AMap.TileLayer.Satellite as any)()

    // 初始显示标准图层
    normalLayer.setMap(mapInstance)
    // 添加能源站点标记
    updateEnergyMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('兴山县地图加载完成')
    })

  } catch (error) {
    console.error('地图初始化失败:', error)
    // 显示错误信息
    if (mapRef.value) {
      mapRef.value.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
          <div>
            <h3>地图加载失败</h3>
            <p>请检查API密钥是否正确或网络连接是否正常</p>
            <p>错误信息: ${error instanceof Error ? error.message : '未知错误'}</p>
          </div>
        </div>
      `
    }
  }
}

// 添加能源站点标记
const updateEnergyMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  const config = energyTypeConfig[currentEnergyType.value]
  const data = energyData[currentEnergyType.value]

  // 为每个站点添加标记
  data.forEach((item: EnergyItem, index: number) => {
    if (item.count > 0) { // 只有当站点数量大于0时才显示标记
      // 创建自定义HTML标记
      const iconContent = `
        <div class="custom-marker" style="position: relative; display: inline-block;">
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          ">
            ${config.icon}
          </div>
          <div class="marker-label" style="
            position: absolute;
            bottom: -30px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
          ">
            ${item.name}: ${(item as any)[config.field]}${config.unit}
          </div>
        </div>
      `

      const marker = new (AMap as any).Marker({
        position: item.coordinates,
        content: iconContent,
        zIndex: 100 + index,
        offset: new (AMap as any).Pixel(-20, -20)
      })

      // 绑定点击事件 - 切换选中区域并更新图表
      marker.on('click', (e: any) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation()
        }

        // 如果点击的是当前选中的区域，则取消选中
        if (selectedRegion.value === item.name) {
          selectRegion(null)
        } else {
          selectRegion(item.name)
        }

        // 创建信息窗口
        const infoWindow = new (AMap as any).InfoWindow({
          content: createInfoWindowContent(item, config),
          size: new (AMap as any).Size(300, 200),
          offset: new (AMap as any).Pixel(0, -50)
        })

        infoWindow.open(mapInstance, item.coordinates)
      })

      marker.setMap(mapInstance)
      markers.set(`${currentEnergyType.value}-${item.name}`, marker)
    }
  })
}

// 创建信息窗口内容
const createInfoWindowContent = (item: any, config: any) => {
  // 根据不同能源类型显示不同的详细信息
  let detailInfo = ''
  if (currentEnergyType.value === 'hydropower') {
    detailInfo = `
      <p><strong>装机容量:</strong> ${item.capacity}MW</p>
      <p><strong>电站数量:</strong> ${item.count}座</p>
      <p><strong>发电效率:</strong> ${item.generation}%</p>
    `
  } else if (currentEnergyType.value === 'solar') {
    detailInfo = `
      <p><strong>装机容量:</strong> ${item.capacity}MW</p>
      <p><strong>电站数量:</strong> ${item.count}座</p>
      <p><strong>发电效率:</strong> ${item.generation}%</p>
    `
  } else if (currentEnergyType.value === 'wind') {
    detailInfo = `
      <p><strong>装机容量:</strong> ${item.capacity}MW</p>
      <p><strong>电站数量:</strong> ${item.count}座</p>
      <p><strong>发电效率:</strong> ${item.generation}%</p>
    `
  } else if (currentEnergyType.value === 'storage') {
    detailInfo = `
      <p><strong>装机容量:</strong> ${item.capacity}MW</p>
      <p><strong>储能站数量:</strong> ${item.count}座</p>
      <p><strong>当前状态:</strong> ${item.status}%</p>
    `
  }

  return `
    <div class="custom-info-window" style="padding: 12px; background-color: rgba(255, 255, 255, 0.95); border: 1px solid #4facfe;">
      <div class="info-window-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${config.icon} ${item.name}${config.name}站</h3>
      </div>
      <div class="info-window-content" style="font-size: 14px; color: #666;">
        ${detailInfo}
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
          <p><strong>坐标:</strong> ${item.coordinates[0].toFixed(4)}, ${item.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    </div>
  `
}

// 切换能源类型
const changeEnergyType = (type: keyof EnergyTypeConfigs) => {
  currentEnergyType.value = type
  updateEnergyMarkers()
}

// 切换地图图层（标准/卫星）
const switchMapLayer = (layerType: 'normal' | 'satellite') => {
  if (!normalLayer || !satelliteLayer || !mapInstance) return

  currentMapLayer.value = layerType

  if (layerType === 'normal') {
    // 显示标准图层，隐藏卫星图层
    normalLayer.setMap(mapInstance)
    satelliteLayer.setMap(null)
  } else if (layerType === 'satellite') {
    // 显示卫星图层，隐藏标准图层
    normalLayer.setMap(null)
    satelliteLayer.setMap(mapInstance)
  }
}

// 地图控制函数
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
    mapInstance.setCenter([110.78, 31.20])
    mapInstance.setZoom(10)
  }
}

// 切换选中区域
const selectRegion = (regionName: string | null) => {
  selectedRegion.value = regionName

  // 更新所有图表的数据
  updateAllCharts()

  // 更新地图标记样式
  updateMarkerStyles()
}

// 更新所有图表数据
const updateAllCharts = () => {
  // 根据选中的区域获取对应的数据
  const regionData = selectedRegion.value ? regionSpecificData[selectedRegion.value as keyof typeof regionSpecificData] : null

  if (regionData) {
    // 更新各数据集 - 对于数组需要重新赋值而不是使用Object.assign
    // 发电资源分布
    powerResourceData = JSON.parse(JSON.stringify(regionData.powerResourceData))
    // 电站统计信息
    stationStatsData = JSON.parse(JSON.stringify(regionData.stationStatsData))
    // 发电负荷监测
    powerLoadData = JSON.parse(JSON.stringify(regionData.powerLoadData))
    // 用电负荷监测
    electricityLoadData = JSON.parse(JSON.stringify(regionData.electricityLoadData))
    // 电量预报
    powerForecastData = JSON.parse(JSON.stringify(regionData.powerForecastData))
    // 用电需求排名
    electricityDemandRanking = JSON.parse(JSON.stringify(regionData.electricityDemandRanking))
  } else {
    // 恢复原始数据
    powerResourceData = JSON.parse(JSON.stringify(originalData.powerResourceData))
    stationStatsData = JSON.parse(JSON.stringify(originalData.stationStatsData))
    powerLoadData = JSON.parse(JSON.stringify(originalData.powerLoadData))
    electricityLoadData = JSON.parse(JSON.stringify(originalData.electricityLoadData))
    powerForecastData = JSON.parse(JSON.stringify(originalData.powerForecastData))
    electricityDemandRanking = JSON.parse(JSON.stringify(originalData.electricityDemandRanking))
  }

  // 重新渲染所有图表
  renderAllCharts()
}

// 重新渲染所有图表
const renderAllCharts = () => {
  initPowerResourceChart()
  initPowerLoadChart()
  initElectricityLoadChart()
  initPowerForecastChart()
  initElectricityDemandChart()
}

// 更新标记样式
const updateMarkerStyles = () => {
  if (markers instanceof Map) {
    // 如果markers是Map对象
    markers.forEach((marker, key) => {
      if (marker && (marker as any)._icon) {
        const icon = (marker as any)._icon
        // 根据是否选中来改变标记样式
        // 因为key的格式是 "energyType-name"，所以我们需要只比较name部分
        const markerName = key.split('-')[1]
        if (selectedRegion.value === markerName) {
          // 选中状态样式
          icon.style.transform = 'scale(1.2)'
          icon.style.zIndex = '100'
        } else {
          // 未选中状态样式
          icon.style.transform = 'scale(1)'
          icon.style.zIndex = '10'
        }
      }
    })
  } else if (typeof markers === 'object') {
    // 如果markers是普通对象
    Object.keys(markers).forEach(key => {
      const marker = markers[key]
      if (marker && (marker as any)._icon) {
        const icon = (marker as any)._icon
        // 根据是否选中来改变标记样式
        // 因为key的格式是 "energyType-name"，所以我们需要只比较name部分
        const markerName = key.split('-')[1]
        if (selectedRegion.value === markerName) {
          // 选中状态样式
          icon.style.transform = 'scale(1.2)'
          icon.style.zIndex = '100'
        } else {
          // 未选中状态样式
          icon.style.transform = 'scale(1)'
          icon.style.zIndex = '10'
        }
      }
    })
  }
}

// 监听选中区域变化
watch(selectedRegion, () => {
  // 这里可以添加额外的处理逻辑
})

// 监听能源类型变化，更新标记
watch(currentEnergyType, () => {
  updateEnergyMarkers()
})

// 组件挂载时初始化
onMounted(() => {
  initCharts()
  initMap()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  markers.clear()
})
</script>

<style scoped>
.fusion-forecasting-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #0D1136 0%, #1A2151 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 顶部导航 */
.top-header {
  height: 82px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 主要内容区域 */
.main-content {
  min-height: calc(100vh - 82px);
  width: 100%;
  overflow-x: hidden;
}

/* 内容区域 */
.content-area {
  width: 100%;
  padding: 30px;
  overflow-y: auto;
  max-width: 100vw;
  box-sizing: border-box;
}

/* 今日预测发电量卡片 */
.forecast-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card-title {
  font-size: 24px;
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.forecast-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 15px;
}

.value {
  font-size: 48px;
  font-weight: bold;
  background: linear-gradient(45deg, #4facfe, #00f2fe);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unit {
  font-size: 18px;
  margin-left: 10px;
  color: rgba(255, 255, 255, 0.7);
}

.forecast-details {
  display: flex;
  justify-content: center;
  gap: 30px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.increase {
  color: #7fbf00;
}

.decrease {
  color: #ff6b6b;
}

/* 统计卡片网格 */
.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-header {
  margin-bottom: 15px;
}

.stat-header h3 {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
}

/* 发电资源分析内容 */
.resource-item {
  margin-bottom: 15px;
}

.resource-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 5px;
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.resource-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* 站点统计信息 */
.station-stats {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.station-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.station-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 5px;
  display: block;
}

.station-stats-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.9);
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.chart-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header h3 {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

.chart-tabs {
  display: flex;
  gap: 5px;
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
  background: #4facfe;
  color: #fff;
  border-color: #4facfe;
}

.chart-container {
  width: 100%;
  height: 250px;
}

/* 表格容器 */
.table-container {
  width: 100%;
  overflow-x: auto;
}

.forecast-table {
  width: 100%;
  border-collapse: collapse;
}

.forecast-table th,
.forecast-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.forecast-table th {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.forecast-table td {
  color: rgba(255, 255, 255, 0.7);
}

.forecast-table tr:hover td {
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
}

/* 一排图表容器 - 调整为屏幕宽度并对齐左侧 */
.charts-row {
  position: relative;
  display: flex;
  gap: 15px;
  width: 95vw;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-left: -66.6vw;
  left: 0;
  margin-top: 20px;
}

/* 一排图表中的每个卡片 */
.row-chart {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
}

/* 一排图表中的图表容器 */
.row-chart-container {
  height: 200px;
  flex: 1;
}

/* 一排图表中的表格容器 */
.row-table-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  max-height: 200px;
}

/* 一排图表中的表格样式 */
.row-forecast-table th,
.row-forecast-table td {
  padding: 6px 8px;
  font-size: 12px;
}

.row-forecast-table th {
  white-space: nowrap;
}

.row-forecast-table td {
  white-space: nowrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    padding: 20px;
  }
}

/* 中心布局容器 */
.center-layout {
  display: grid;
  grid-template-columns: 1fr minmax(400px, 600px) 1fr;
  gap: 20px;
  align-items: start;
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
}

/* 左侧内容 */
.left-content {
  width: 100%;
  min-width: 0;
}

/* 右侧内容 */
.right-content {
  width: 100%;
  min-width: 0;
}

/* 地图样式 */
.map-card {
  color: #000;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  width: 93%;
}

#map {
  width: 100%;
  height: 600px;
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
}

.map-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
  align-items: center;
}

.map-controls .el-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
}

.map-controls .el-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

/* 图层切换按钮容器 */
.layer-switch-container {
  display: flex;
  margin-left: auto;
}

.layer-btn.active {
  background: rgba(79, 172, 254, 0.8) !important;
  color: #fff !important;
  border-color: rgba(79, 172, 254, 1) !important;
}

/* 能源类型选择器样式 */
.energy-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  justify-content: center;
}

.energy-type-btn {
  padding: 8px 16px;
  border: 2px solid transparent;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.energy-type-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.energy-type-btn:hover::before {
  left: 100%;
}

.energy-type-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.energy-type-btn.active {
  background: var(--color);
  color: #fff;
  border-color: var(--color);
  box-shadow: 0 0 10px rgba(79, 172, 254, 0.5);
}

/* 自定义标记样式 */
:deep(.custom-marker) {
  transition: all 0.3s ease;
}

:deep(.custom-marker:hover .marker-icon) {
  transform: scale(1.2) !important;
}

:deep(.custom-marker:hover .marker-label) {
  display: block !important;
}

/* 响应式设计 */
@media (max-width: 1600px) {
  .center-layout {
    grid-template-columns: 1fr minmax(400px, 550px) 1fr;
  }

  .content-area {
    padding: 25px;
  }
}

@media (max-width: 1400px) {
  .center-layout {
    grid-template-columns: 1fr minmax(350px, 500px) 1fr;
    gap: 15px;
  }

  .content-area {
    padding: 20px;
  }
}

@media (max-width: 1200px) {
  .center-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .content-area {
    padding: 20px 15px;
  }

  .map-card {
    max-width: 100%;
    margin: 0 auto;
  }

  #map {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .forecast-card {
    padding: 20px;
  }

  .content-area {
    padding: 15px 10px;
  }

  #map {
    height: 400px;
  }
}

@media (max-width: 1400px) {
  .center-layout {
    grid-template-columns: 1fr 500px 1fr;
  }
}

@media (max-width: 1200px) {
  .center-layout {
    grid-template-columns: 1fr;
  }

  .map-card {
    order: 1;
    width: 70%;
    margin: 0 auto 20px;
  }

  .left-content {
    order: 2;
  }

  .right-content {
    order: 3;
  }

  .stats-grid {
    flex-direction: row;
    justify-content: space-between;
  }

  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .map-card {
    width: 100%;
  }

  #map {
    height: 450px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .energy-type-selector {
    flex-wrap: wrap;
  }

  .map-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  .layer-switch-container {
    margin-left: 0;
    margin-top: 10px;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    flex-direction: column;
  }
}
</style>
