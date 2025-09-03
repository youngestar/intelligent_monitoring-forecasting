<template>
  <div class="fusion-forecasting-container">
    <!-- 顶部导航 -->
    <div class="top-header"></div>

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
                  <div class="resource-fill" :style="{ width: resource.value + '%', backgroundColor: resource.color }">
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
              </div>
            </div>
          </div>
        </div>

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

          <!-- 用电负荷监测图表 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>用电负荷监测</h3>
            </div>
            <div id="electricityLoadChart" class="chart-container"></div>
          </div>

          <!-- 电量预报图表 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>电量预报（发/用电）</h3>
              <div class="chart-tabs">
                <button class="tab-btn active">表格</button>
                <button class="tab-btn">图表</button>
              </div>
            </div>
            <div id="powerForecastChart" class="chart-container"></div>
          </div>

          <!-- 用电需求排名图表 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>用电需求排名（万度）：500</h3>
            </div>
            <div id="electricityDemandChart" class="chart-container"></div>
          </div>

          <!-- 最大负荷预测表格 -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>最大负荷预测</h3>
            </div>
            <div class="table-container">
              <table class="forecast-table">
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

        <!-- 兴山县电力资源分布地图 -->
        <div class="map-card">
          <!-- 能源类型选择器 -->
          <div class="energy-type-selector">
            <button 
              v-for="(config, type) in energyTypeConfig" 
              :key="type"
              :class="['energy-type-btn', { active: currentEnergyType === type }]"
              :style="{ '--color': config.color }"
              @click="changeEnergyType(type)"
            >
              {{ config.name }}
            </button>
          </div>
          <div id="map"></div>
          <div class="map-controls">
            <button class="el-button" @click="mapZoomIn">放大</button>
            <button class="el-button" @click="mapZoomOut">缩小</button>
            <button class="el-button" @click="mapReset">重置</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

// 详细的能源数据评估 - 包含水电、光伏、风电、储能站等信息
const energyData = {
  // 水电数据
  hydropower: [
    { name: '古夫镇', capacity: 125, count: 3, generation: 85 },
    { name: '昭君镇', capacity: 89, count: 2, generation: 72 },
    { name: '峡口镇', capacity: 142, count: 4, generation: 92 },
    { name: '南阳镇', capacity: 35, count: 1, generation: 65 },
    { name: '黄粮镇', capacity: 67, count: 2, generation: 78 },
    { name: '水月寺镇', capacity: 54, count: 2, generation: 68 },
    { name: '高桥乡', capacity: 28, count: 1, generation: 59 },
    { name: '榛子乡', capacity: 22, count: 1, generation: 55 }
  ],
  // 光伏数据
  solar: [
    { name: '古夫镇', capacity: 45, count: 2, generation: 78 },
    { name: '昭君镇', capacity: 38, count: 1, generation: 70 },
    { name: '峡口镇', capacity: 32, count: 1, generation: 65 },
    { name: '南阳镇', capacity: 18, count: 1, generation: 62 },
    { name: '黄粮镇', capacity: 25, count: 1, generation: 68 },
    { name: '水月寺镇', capacity: 12, count: 1, generation: 58 },
    { name: '高桥乡', capacity: 8, count: 0, generation: 45 },
    { name: '榛子乡', capacity: 10, count: 0, generation: 48 }
  ],
  // 风电数据
  wind: [
    { name: '古夫镇', capacity: 18, count: 1, generation: 65 },
    { name: '昭君镇', capacity: 12, count: 0, generation: 55 },
    { name: '峡口镇', capacity: 25, count: 1, generation: 70 },
    { name: '南阳镇', capacity: 35, count: 1, generation: 75 },
    { name: '黄粮镇', capacity: 28, count: 1, generation: 68 },
    { name: '水月寺镇', capacity: 42, count: 2, generation: 82 },
    { name: '高桥乡', capacity: 15, count: 0, generation: 52 },
    { name: '榛子乡', capacity: 48, count: 2, generation: 85 }
  ],
  // 储能站数据
  storage: [
    { name: '古夫镇', capacity: 25, count: 2, status: 75 },
    { name: '昭君镇', capacity: 18, count: 1, status: 65 },
    { name: '峡口镇', capacity: 22, count: 1, status: 70 },
    { name: '南阳镇', capacity: 10, count: 0, status: 55 },
    { name: '黄粮镇', capacity: 15, count: 1, status: 62 },
    { name: '水月寺镇', capacity: 12, count: 0, status: 58 },
    { name: '高桥乡', capacity: 8, count: 0, status: 52 },
    { name: '榛子乡', capacity: 10, count: 0, status: 55 }
  ]
}

// 当前显示的能源类型
const currentEnergyType = ref('hydropower')

// 能源类型配置
const energyTypeConfig = {
  hydropower: { name: '水电', color: '#4facfe', unit: 'MW', field: 'capacity' },
  solar: { name: '光伏', color: '#ffd700', unit: 'MW', field: 'capacity' },
  wind: { name: '风电', color: '#7fbf00', unit: 'MW', field: 'capacity' },
  storage: { name: '储能', color: '#ff6b6b', unit: '%', field: 'status' }
}

// 发电资源数据
const powerResourceData = [
  { name: '水电', value: 45, color: '#4facfe' },
  { name: '光伏', value: 30, color: '#ffd700' },
  { name: '风电', value: 15, color: '#7fbf00' },
  { name: '其他', value: 10, color: '#ff6b6b' }
]

// 站点统计数据
const stationStatsData = {
  hydropower: { count: 12, totalCapacity: 560 },
  solar: { count: 8, totalCapacity: 120 },
  wind: { count: 3, totalCapacity: 45 }
}

// 用电需求排名
const electricityDemandRanking = [
  { name: '工业用电', demand: 1250 },
  { name: '居民用电', demand: 980 },
  { name: '商业用电', demand: 750 },
  { name: '农业用电', demand: 320 },
  { name: '公共设施用电', demand: 280 }
]

// 电量预报数据
const powerForecastData = [
  { date: '18日', generated: 45.6, consumed: 42.3 },
  { date: '19日', generated: 43.7, consumed: 41.2 },
  { date: '20日', generated: 44.9, consumed: 41.8 }
]

// 发电负荷监测数据
const powerLoadData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  actual: [98, 85, 82, 105, 120, 135, 140, 125],
  forecast: [95, 83, 80, 102, 118, 132, 138, 122]
}

// 用电负荷监测数据
const electricityLoadData = {
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

// 初始化所有图表
const initCharts = () => {
  initPowerResourceChart()
  initPowerLoadChart()
  initElectricityLoadChart()
  initPowerForecastChart()
  initElectricityDemandChart()
  initMapChart()
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
  const mapElement = document.getElementById('map')
  if (mapElement) {
    const mapInstance = echarts.getInstanceByDom(mapElement)
    if (mapInstance) {
      mapInstance.resize()
    }
  }
}

// 兴山县地图数据（分镇更细，含类型与更丰富的色带）
const mapData = [
  { name: '古夫镇', value: 32500, type: 'high' },
  { name: '昭君镇', value: 21800, type: 'medium' },
  { name: '峡口镇', value: 28300, type: 'high' },
  { name: '南阳镇', value: 8700, type: 'low' },
  { name: '黄粮镇', value: 15600, type: 'medium' },
  { name: '水月寺镇', value: 12400, type: 'medium' },
  { name: '高桥乡', value: 7200, type: 'low' },
  { name: '榛子乡', value: 6500, type: 'low' }
]

// 地图相关变量
let mapChart: any = null

// 根据当前选择的能源类型获取对应的地图数据
const getCurrentMapData = () => {
  const config = energyTypeConfig[currentEnergyType.value]
  return energyData[currentEnergyType.value].map(item => ({
    name: item.name,
    value: item[config.field],
    fullData: item
  }))
}

// 切换能源类型
const changeEnergyType = (type: string) => {
  currentEnergyType.value = type
  if (mapChart) {
    const config = energyTypeConfig[type]
    const option = mapChart.getOption()
    
    // 更新数据
    option.series[0].data = getCurrentMapData()
    
    // 更新标题
    option.title[0].text = `兴山县各乡镇${config.name}资源分布`
    
    // 更新颜色映射
    option.visualMap.inRange.color = getColorRange(type)
    
    mapChart.setOption(option)
  }
}

// 根据能源类型获取对应的颜色范围
const getColorRange = (type: string) => {
  const baseRanges = {
    hydropower: ['#001529', '#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff', '#e6f7ff'],
    solar: ['#f5f5f5', '#fff7e6', '#ffe7ba', '#ffd591', '#ffc069', '#ffa940', '#ff8c00'],
    wind: ['#f6ffed', '#d9f7be', '#b7eb8f', '#95de64', '#73d13d', '#52c41a', '#389e0d'],
    storage: ['#fff1f0', '#ffccc7', '#ffa39e', '#ff7875', '#ff4d4f', '#cf1322', '#a8071a']
  }
  return baseRanges[type] || baseRanges.hydropower
}

// 初始化地图图表
const initMapChart = () => {
  const mapElement = document.getElementById('map') as HTMLElement
  if (!mapElement) return

  mapChart = echarts.init(mapElement)

  // 显示加载状态
  mapChart.showLoading()

  // 加载兴山县GeoJSON本地数据
  fetch('/src/assets/兴山县.geoJson')
    .then(response => {
      if (!response.ok) {
        throw new Error('加载地图数据失败: ' + response.status)
      }
      return response.json()
    })
    .then((xingshanJson: any) => {
      mapChart.hideLoading()

      // 注册地图
      echarts.registerMap('兴山县', xingshanJson)

      const config = energyTypeConfig[currentEnergyType.value]
      
      const option = {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        title: {
          text: `兴山县各乡镇${config.name}资源分布`,
          subtext: '基于详细数值的区域色彩分布',
          textStyle: {
            color: '#fff',
            fontSize: 16
          },
          subtextStyle: {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 12
          },
          left: 'center',
          top: 10
        },
        tooltip: {
          trigger: 'item',
          showDelay: 0,
          transitionDuration: 0.2,
          formatter: function (params: any) {
            if (params.data && params.data.fullData) {
              const data = params.data.fullData
              const config = energyTypeConfig[currentEnergyType.value]
              const mainValue = data[config.field]
              
              // 根据不同能源类型显示不同的详细信息
              let detailInfo = ''
              if (currentEnergyType.value === 'hydropower') {
                detailInfo = `\n装机容量: ${data.capacity}MW\n电站数量: ${data.count}座\n发电效率: ${data.generation}%`
              } else if (currentEnergyType.value === 'solar') {
                detailInfo = `\n装机容量: ${data.capacity}MW\n电站数量: ${data.count}座\n发电效率: ${data.generation}%`
              } else if (currentEnergyType.value === 'wind') {
                detailInfo = `\n装机容量: ${data.capacity}MW\n电站数量: ${data.count}座\n发电效率: ${data.generation}%`
              } else if (currentEnergyType.value === 'storage') {
                detailInfo = `\n装机容量: ${data.capacity}MW\n储能站数量: ${data.count}座\n当前状态: ${data.status}%`
              }
              
              return `${params.name}:${detailInfo}`
            }
            return `${params.name}`
          }
        },
        legend: {
          orient: 'horizontal',
          data: ['高', '中', '低'],
          bottom: 10,
          left: 'center',
          textStyle: {
            color: '#fff'
          },
          itemWidth: 10,
          itemHeight: 10
        },
        visualMap: {
          left: 'left',
          min: 0,
          max: getMaxValueForType(currentEnergyType.value),
          inRange: {
            color: getColorRange(currentEnergyType.value)
          },
          text: ['高', '低'],
          textStyle: {
            color: '#fff'
          },
          calculable: true
        },
        toolbox: {
          show: true,
          left: 'right',
          top: 'top',
          feature: {
            dataView: { readOnly: false },
            restore: {},
            saveAsImage: {}
          },
          iconStyle: {
            borderColor: '#fff'
          }
        },
        series: [
          {
            name: '兴山县数据',
            type: 'map',
            map: '兴山县',
            roam: true,  // 启用缩放和平移
            emphasis: {
              label: {
                show: true,
                color: '#fff',
                fontWeight: 'bold'
              },
              itemStyle: {
                areaColor: config.color,
                borderColor: '#fff',
                borderWidth: 2
              }
            },
            select: {
              label: {
                show: true,
                color: '#fff',
                fontWeight: 'bold'
              },
              itemStyle: {
                areaColor: '#ff6b6b',
                borderColor: '#fff',
                borderWidth: 2
              }
            },
            label: {
              show: true,
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12,
              formatter: '{b}'
            },
            itemStyle: {
              areaColor: 'rgba(79, 172, 254, 0.3)',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderWidth: 1,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              shadowBlur: 10
            },
            data: getCurrentMapData()
          }
        ]
      }

      mapChart.setOption(option)
    })
    .catch(error => {
      console.error('加载地图数据失败:', error)
      mapChart.hideLoading()
      mapChart.setOption({
        title: {
          text: '地图加载失败',
          textStyle: {
            color: '#ff4d4f'
          }
        }
      })
    })
}

// 获取指定能源类型的最大值，用于visualMap的max设置
const getMaxValueForType = (type: string) => {
  const config = energyTypeConfig[type]
  const max = Math.max(...energyData[type].map(item => item[config.field]))
  return max * 1.2  // 留出20%的余量
}

// 地图控制函数
const mapZoomIn = () => {
  if (mapChart) {
    mapChart.dispatchAction({ type: 'zoom', zoom: 1.2 })
  }
}

const mapZoomOut = () => {
  if (mapChart) {
    mapChart.dispatchAction({ type: 'zoom', zoom: 0.8 })
  }
}

const mapReset = () => {
  if (mapChart) {
    mapChart.dispatchAction({ type: 'restore' })
  }
}

// 组件挂载时初始化
onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (mapChart) {
    mapChart.dispose()
  }
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
}

/* 内容区域 */
.content-area {
  width: 100%;
  padding: 30px;
  overflow-y: auto;
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
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 30px;
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
  grid-template-columns: repeat(3, 1fr);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .content-area {
    padding: 20px;
  }
}

/* 地图样式 */
.map-card {
  grid-column: span 3;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  margin-top: 20px;
}

#map {
  width: 100%;
  height: 400px;
  margin-top: 10px;
}

.map-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
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

/* 地图响应式样式 */
@media (max-width: 1400px) {
  .charts-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .map-card {
    grid-column: span 1;
  }

  #map {
    height: 350px;
  }
  
  .energy-type-selector {
    flex-wrap: wrap;
  }
}
</style>
