<template>
  <div class="fusion-forecasting-container">
    <!-- 顶部标题 -->
    <div class="header-title">
      <h2>融合预报</h2>
      <div class="date-display">{{ currentDate }}</div>
    </div>

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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import { useMapStore } from '@/stores/map'

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
    new(): any
    Satellite: any
    RoadNet: any
  }
}

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

// 定义能源类型
const currentEnergyType = ref<string>('all')
const currentMapLayer = ref<string>('normal')
const selectedRegion = ref<string>('')

// 地图实例
let mapInstance: any = null
let markers: Map<string, any> = new Map()
let AMap: AMapInstance | null = null

// 使用Pinia store
const mapStore = useMapStore()

// 配置项
const mapConfig = {
  apiKey: '1c8fb5781411703ac5c3343201e0ab99', // 从SatelliteMap复制的API密钥
  securityConfig: {
    securityJsCode: '8468351a95a828e0700d4aaa085c3551' // 安全码
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
    // 显式指定需要加载的模块
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.MapType,AMap.TileLayer,AMap.TileLayer.Satellite`
    script.onload = () => {
      AMap = window.AMap
      console.log('AMap API loaded successfully with all required modules')
      resolve(AMap)
    }
    script.onerror = (error) => {
      reject(new Error('高德地图API加载失败: ' + (error instanceof Error ? error.message : '未知错误')))
    }
    document.head.appendChild(script)
  })
}

// 站点统计数据
const stationStatsData = ref<any>({
  hydropower: { count: 12, totalCapacity: 520 },
  solar: { count: 8, totalCapacity: 180 },
  wind: { count: 15, totalCapacity: 670 },
  storage: { count: 5, totalCapacity: 95 }
})

// 发电资源分析数据
const powerResourceData = ref<any[]>([
  { name: '水电', value: 42, color: '#4facfe' },
  { name: '风电', value: 35, color: '#00f2fe' },
  { name: '光伏', value: 18, color: '#ff8042' },
  { name: '其他', value: 5, color: '#8884d8' }
])

// 能源类型配置
const energyTypeConfig = {
  all: { name: '全部能源', color: '#4facfe' },
  hydropower: { name: '水电', color: '#4facfe' },
  solar: { name: '光伏', color: '#ff8042' },
  wind: { name: '风电', color: '#00f2fe' },
  storage: { name: '储能', color: '#8884d8' }
}

// 负荷预测数据
const maxLoadForecast = ref<any[]>([
  { date: '今日', sanlian: '32.5', lizhuanghe: '28.3', changhepu: '42.1', huanglong: '35.8' },
  { date: '明日', sanlian: '31.2', lizhuanghe: '29.5', changhepu: '43.6', huanglong: '34.9' },
  { date: '后天', sanlian: '33.8', lizhuanghe: '30.1', changhepu: '41.8', huanglong: '36.2' }
])

// 地图实例
const mapRef = ref<HTMLDivElement>()

// 初始化地图
const initMap = async () => {
  try {
    // 加载高德地图API
    await loadMapScript()

    // 获取地图容器
    const mapContainer = mapRef.value
    if (!mapContainer || !AMap) return

    // 1. 创建地图实例，使用默认配置
    mapInstance = new AMap.Map(mapContainer, {
      viewMode: '2D',
      center: [110.78, 31.20], // 湖北省宜昌市兴山县
      zoom: 10
    })

    // 2. 添加基础控件
    if (AMap) {
      mapInstance.addControl(new AMap.Scale())
      mapInstance.addControl(new AMap.ToolBar())
    }

    // 3. 手动创建和管理图层
    let normalLayer = null
    let satelliteLayer = null
    let roadNetLayer = null

    // 4. 先加载标准图层作为默认显示
    if (AMap) {
      normalLayer = new AMap.TileLayer() // 使用标准地图图层
      normalLayer.setMap(mapInstance)
      console.log('标准图层已添加并显示')

      // 5. 创建卫星图层和路网图层但先不显示
      satelliteLayer = new AMap.TileLayer.Satellite()
      roadNetLayer = new AMap.TileLayer.RoadNet()
      console.log('卫星图层和路网图层已创建')
    }

    // 6. 添加能源标记到地图
    updateEnergyMarkers()

    // 7. 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('融合预报地图加载完成')
    })

    // 8. 添加重试逻辑：尝试在延迟后显示标准图层
    setTimeout(() => {
      console.log('尝试显示标准图层')
      if (normalLayer) {
        normalLayer.setMap(mapInstance)
        if (satelliteLayer) satelliteLayer.setMap(null)
        console.log('已尝试自动切换到标准图层')
      }
    }, 2000)

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

// 切换能源类型
const changeEnergyType = (type: string) => {
  currentEnergyType.value = type
  updateEnergyMarkers()
}

// 切换地图图层
const switchMapLayer = (layer: string) => {
  currentMapLayer.value = layer

  if (!mapInstance || !AMap) return

  // 获取当前已创建的图层
  const layers = mapInstance.getLayers()

  // 清除所有图层
  layers.forEach((layer: any) => {
    if (layer instanceof AMap.TileLayer) {
      mapInstance.remove(layer)
    }
  })

  // 根据选择的图层类型重新添加图层
  if (layer === 'normal') {
    // 添加标准图层
    const normalLayer = new AMap.TileLayer()
    mapInstance.add(normalLayer)
  } else if (layer === 'satellite') {
    // 添加卫星图层和路网图层
    const satelliteLayer = new AMap.TileLayer.Satellite()
    const roadNetLayer = new AMap.TileLayer.RoadNet()
    mapInstance.add([satelliteLayer, roadNetLayer])
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
    mapInstance.setZoomAndCenter(10, [110.78, 31.20]) // 重置到兴山县中心
  }
}

// 更新能源标记
const updateEnergyMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除所有旧标记
  markers.forEach((marker: any) => {
    marker.setMap(null)
  })
  markers.clear()

  // 根据当前选择的能源类型添加标记
  const energyType = currentEnergyType.value

  // 模拟能源站点数据
  const energyStations = getEnergyStations(energyType)

  // 添加标记到地图
  energyStations.forEach((station: any) => {
    const markerKey = `${station.type}-${station.name}`

    // 创建自定义HTML标记
    const iconContent = `
      <div class="custom-marker" style="position: relative; display: inline-block;">
        <div class="marker-icon" style="
          background-color: ${station.color};
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
        ">
          ${station.icon}
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
          ${station.name}
        </div>
      </div>
    `

    const marker = new AMap.Marker({
      position: station.coordinates,
      content: iconContent,
      zIndex: 100,
      offset: new AMap.Pixel(-20, -20)
    })

    // 绑定点击事件
    marker.on('click', () => {
      selectedRegion.value = station.name
      updateMarkerStyles()
    })

    marker.setMap(mapInstance)
    markers.set(markerKey, marker)
  })
}

// 获取能源站点数据
const getEnergyStations = (type: string) => {
  // 模拟的能源站点数据
  const allStations = [
    // 水电站
    { type: 'hydropower', name: '兴山电站', coordinates: [110.75, 31.18], color: '#4facfe', icon: '💧' },
    { type: 'hydropower', name: '高阳电站', coordinates: [110.80, 31.15], color: '#4facfe', icon: '💧' },
    { type: 'hydropower', name: '峡口电站', coordinates: [110.70, 31.22], color: '#4facfe', icon: '💧' },

    // 光伏站
    { type: 'solar', name: '兴山光伏', coordinates: [110.82, 31.20], color: '#ff8042', icon: '☀️' },
    { type: 'solar', name: '南阳光伏', coordinates: [110.73, 31.15], color: '#ff8042', icon: '☀️' },

    // 风电站
    { type: 'wind', name: '黄粮风电', coordinates: [110.85, 31.25], color: '#00f2fe', icon: '💨' },
    { type: 'wind', name: '榛子风电', coordinates: [110.68, 31.30], color: '#00f2fe', icon: '💨' },

    // 储能站
    { type: 'storage', name: '县城储能', coordinates: [110.78, 31.17], color: '#8884d8', icon: '🔋' },
    { type: 'storage', name: '南阳储能', coordinates: [110.73, 31.15], color: '#8884d8', icon: '🔋' }
  ]

  if (type === 'all') {
    return allStations
  }

  return allStations.filter(station => station.type === type)
}

// 处理窗口大小变化
const handleResize = () => {
  // 处理窗口大小变化
}

// 初始化图表
const initCharts = () => {
  // 初始化所有图表
  initPowerResourceChart()
  initPowerLoadChart()
  initElectricityLoadChart()
  initPowerForecastChart()
  initElectricityDemandChart()
}

// 发电资源分析图表
const initPowerResourceChart = () => {
  const chartDom = document.getElementById('powerResourceChart')
  if (chartDom) {
    const myChart = echarts.init(chartDom)

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item'
      },
      legend: {
        top: 'bottom',
        textStyle: {
          color: 'rgba(255, 255, 255, 0.7)'
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
            borderColor: 'rgba(0, 0, 0, 0.3)',
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
          data: powerResourceData.value
        }
      ]
    }

    myChart.setOption(option)
  }
}

// 发电负荷监测图表
const initPowerLoadChart = () => {
  const chartDom = document.getElementById('powerLoadChart')
  if (chartDom) {
    const myChart = echarts.init(chartDom)

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      ],
      series: [
        {
          name: '发电负荷',
          type: 'line',
          stack: 'Total',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79, 172, 254, 0.8)' },
              { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
            ])
          },
          emphasis: {
            focus: 'series'
          },
          lineStyle: {
            color: '#4facfe',
            width: 3
          },
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#4facfe',
            borderColor: '#fff',
            borderWidth: 2
          },
          data: [120, 80, 90, 150, 220, 240, 210, 180]
        }
      ]
    }

    myChart.setOption(option)
  }
}

// 用电负荷监测图表
const initElectricityLoadChart = () => {
  const chartDom = document.getElementById('electricityLoadChart')
  if (chartDom) {
    const myChart = echarts.init(chartDom)

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          boundaryGap: false,
          data: ['00:00', '06:00', '12:00', '18:00'],
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          axisLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.3)'
            }
          },
          axisLabel: {
            color: 'rgba(255, 255, 255, 0.7)'
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      ],
      series: [
        {
          name: '用电负荷',
          type: 'line',
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 242, 254, 0.8)' },
              { offset: 1, color: 'rgba(0, 242, 254, 0.1)' }
            ])
          },
          lineStyle: {
            color: '#00f2fe',
            width: 2
          },
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: {
            color: '#00f2fe'
          },
          data: [90, 80, 180, 120]
        }
      ]
    }

    myChart.setOption(option)
  }
}

// 电量预报图表
const initPowerForecastChart = () => {
  const chartDom = document.getElementById('powerForecastChart')
  if (chartDom) {
    const myChart = echarts.init(chartDom)

    const option = {
      backgroundColor: 'transparent',
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
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: ['今日', '明日', '后天'],
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      series: [
        {
          name: '发电量',
          type: 'bar',
          data: [180, 195, 210],
          itemStyle: {
            color: '#4facfe',
            borderRadius: [0, 4, 4, 0]
          },
          barWidth: '30%'
        },
        {
          name: '用电量',
          type: 'bar',
          data: [120, 135, 140],
          itemStyle: {
            color: '#00f2fe',
            borderRadius: [0, 4, 4, 0]
          },
          barWidth: '30%'
        }
      ]
    }

    myChart.setOption(option)
  }
}

// 用电需求排名图表
const initElectricityDemandChart = () => {
  const chartDom = document.getElementById('electricityDemandChart')
  if (chartDom) {
    const myChart = echarts.init(chartDom)

    const option = {
      backgroundColor: 'transparent',
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
        type: 'category',
        data: ['工业', '商业', '居民', '农业'],
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)',
          interval: 0,
          rotate: 0
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        },
        axisLabel: {
          color: 'rgba(255, 255, 255, 0.7)'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      series: [
        {
          data: [320, 180, 120, 50],
          type: 'bar',
          itemStyle: {
            color: '#ff8042',
            borderRadius: 4
          },
          barWidth: '40%'
        }
      ]
    }

    myChart.setOption(option)
  }
}

// 模拟初始数据
const originalData = {
  powerResourceData: JSON.parse(JSON.stringify(powerResourceData.value)),
  stationStatsData: JSON.parse(JSON.stringify(stationStatsData.value)),
  powerLoadData: [],
  electricityLoadData: [],
  powerForecastData: [],
  electricityDemandRanking: []
}

// 重新设置数据
const resetData = () => {
  powerResourceData.value = JSON.parse(JSON.stringify(originalData.powerResourceData))
  stationStatsData.value = JSON.parse(JSON.stringify(originalData.stationStatsData))
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
  updateCurrentDate()
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
  if (markers instanceof Map) {
    markers.clear()
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

/* 主要内容区域 */
.main-content {
  min-height: calc(100vh - 120px);
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
  padding: 10px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
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
  transition: all 0.3s ease;
}

.station-item:hover {
  background: rgba(79, 172, 254, 0.1);
  border-color: rgba(79, 172, 254, 0.3);
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

/* 地图样式 */
.map-card {
  color: #000;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  width: 93%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

#map {
  width: 100%;
  height: 600px;
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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
  transition: all 0.3s ease;
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

/* 顶部标题样式 */
.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 15px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.header-title h2 {
  margin: 0;
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.date-display {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 400;
}

/* 能源类型选择器样式 */
.energy-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  justify-content: center;
  flex-wrap: wrap;
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
  box-shadow: 0 0 15px rgba(79, 172, 254, 0.5);
}

/* 右侧内容 */
.right-content {
  width: 100%;
  min-width: 0;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
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
  transition: all 0.3s ease;
}

.forecast-table tr:hover td {
  background: rgba(79, 172, 254, 0.1);
  color: #4facfe;
}

/* 一排图表容器 */
.charts-row {
  display: flex;
  gap: 15px;
  width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;
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
  height: 180px;
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

/* 滚动条样式 */
.charts-row::-webkit-scrollbar {
  height: 6px;
}

.charts-row::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.charts-row::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.charts-row::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
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
  .forecast-card {
    padding: 20px;
  }

  .content-area {
    padding: 15px 10px;
  }

  #map {
    height: 400px;
  }

  .stats-grid {
    flex-direction: column;
  }

  .value {
    font-size: 36px;
  }

  .forecast-details {
    flex-direction: column;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .content-area {
    padding: 10px 8px;
  }

  #map {
    height: 350px;
  }

  .chart-card {
    padding: 15px;
  }

  .energy-type-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
