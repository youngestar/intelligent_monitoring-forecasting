<template>
  <div class="wind-resource-container">
    <!-- 顶部标题栏 -->
    <div class="header">
      <div class="header-left">
        <h2>风能资源实时监控</h2>
      </div>
      <div class="header-right">
        <div class="date-display">{{ currentDate }}</div>
        <button class="btn-refresh" @click="refreshData" :disabled="isRefreshing">
          <i class="refresh-icon" :class="{ 'rotating': isRefreshing }"></i> {{ isRefreshing ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 左侧区域：风能统计和图表 -->
      <div class="left-section">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon turbine-icon">🌪️</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalTurbines }}</div>
              <div class="stat-label">风电场</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon normal-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ normalTurbines }}</div>
              <div class="stat-label">正常运行</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-number">{{ warningTurbines }}</div>
              <div class="stat-label">需要关注</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon power-icon">⚡</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalPower }}MW</div>
              <div class="stat-label">总装机</div>
            </div>
          </div>
        </div>

        <div class="charts-container">
          <div class="chart-item">
            <h3>发电功率趋势</h3>
            <div id="powerTrendChart" class="chart"></div>
          </div>
          <div class="chart-item">
            <h3>风速分布</h3>
            <div id="windSpeedChart" class="chart"></div>
          </div>
        </div>
      </div>

      <!-- 中间区域：地图 -->
      <div class="center-section">
        <!-- 风电类型选择器 -->
        <div class="resource-type-selector">
          <button v-for="(config, type) in resourceTypeConfig" :key="type"
            :class="['resource-type-btn', { active: currentResourceType === type }]"
            :style="{ '--color': config.color }"
            @click="changeResourceType(type as 'all' | 'onshore' | 'offshore' | 'distributed')">
            {{ config.icon }} {{ config.name }}
          </button>
        </div>

        <div id="map" ref="mapRef" class="map"></div>

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

      <!-- 右侧区域：风电场详情和预警信息 -->
      <div class="right-section">
        <div class="turbine-detail-container">
          <h3>重点风电场</h3>
          <div class="turbine-list">
            <div class="turbine-item" v-for="turbine in turbineList" :key="turbine.id">
              <div class="turbine-header">
                <span class="turbine-name">{{ turbine.name }}</span>
                <span :class="['turbine-status', turbine.status]">{{ turbine.statusText }}</span>
              </div>
              <div class="turbine-info">
                <div class="info-item">
                  <span class="info-label">容量：</span>
                  <span class="info-value">{{ turbine.capacity }}MW</span>
                </div>
                <div class="info-item">
                  <span class="info-label">发电：</span>
                  <span class="info-value">{{ turbine.power }}kW</span>
                </div>
                <div class="info-item">
                  <span class="info-label">风速：</span>
                  <span class="info-value">{{ turbine.windSpeed }}m/s</span>
                </div>
                <div class="info-item">
                  <span class="info-label">效率：</span>
                  <span class="info-value">{{ turbine.efficiency }}%</span>
                </div>
              </div>
              <div class="power-bar">
                <div :class="['power-fill', turbine.status]" :style="{ width: turbine.capacity + '%' }">
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="weather-forecast-container">
          <h3>天气预报</h3>
          <div class="weather-list">
            <div class="weather-item" v-for="weather in weatherForecast" :key="weather.time">
              <div class="weather-time">{{ weather.time }}</div>
              <div class="weather-icon">{{ weather.icon }}</div>
              <div class="weather-info">
                <span class="weather-temp">{{ weather.temp }}°</span>
                <span class="weather-desc">{{ weather.description }}</span>
                <span class="weather-wind">风速：{{ weather.windSpeed }}m/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

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
  TileLayer: any & {
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

// 当前地图图层类型
const currentMapLayer = ref<'normal' | 'satellite'>('normal')

// 当前资源类型
const currentResourceType = ref<'all' | 'onshore' | 'offshore' | 'distributed'>('all')

// 资源类型配置
const resourceTypeConfig = {
  all: { name: '全部风电', color: '#1890ff', icon: '🌪️' },
  onshore: { name: '陆上风电', color: '#40a9ff', icon: '🏔️' },
  offshore: { name: '海上风电', color: '#0050b3', icon: '🌊' },
  distributed: { name: `分散式风电`, color: '#096dd9', icon: '🏡' }
}

// 图表实例
let powerTrendChart: any = null
let windSpeedChart: any = null

// 地图配置
const mapConfig = {
  center: [110.78, 31.12], // 兴山县中心坐标
  zoom: 10,
  minZoom: 9,
  maxZoom: 13,
  apiKey: '1c8fb5781411703ac5c3343201e0ab99',
  securityConfig: {
    securityJsCode: '8468351a95a828e0700d4aaa085c3551'
  }
}

// 统计数据
const totalTurbines = ref(8)
const normalTurbines = ref(6)
const warningTurbines = ref(2)
const totalPower = ref(120)

// 风电场列表数据
const turbineList = ref([
  {
    id: 1,
    name: '兴山风电场',
    capacity: 30,
    power: 28500,
    windSpeed: 8.5,
    efficiency: 95,
    type: '陆上风电',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 2,
    name: '昭君风电场',
    capacity: 25,
    power: 22000,
    windSpeed: 7.8,
    efficiency: 88,
    type: '陆上风电',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 3,
    name: '古夫风电场',
    capacity: 20,
    power: 16000,
    windSpeed: 6.5,
    efficiency: 80,
    type: '陆上风电',
    status: 'warning',
    statusText: '需要关注'
  },
  {
    id: 4,
    name: '峡口风电场',
    capacity: 15,
    power: 11250,
    windSpeed: 7.0,
    efficiency: 75,
    type: '陆上风电',
    status: 'warning',
    statusText: '需要关注'
  }
])

// 获取真实时间的天气预报数据
const getRealTimeWindWeatherData = () => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  const weatherData = [
    {
      icon: '💨',
      temp: '25',
      description: '晴 微风',
      windSpeed: '3-5'
    },
    {
      icon: '💨',
      temp: '24',
      description: '多云 和风',
      windSpeed: '5-7'
    },
    {
      icon: '💨',
      temp: '23',
      description: '阴 大风',
      windSpeed: '8-10'
    },
    {
      icon: '💨',
      temp: '26',
      description: '晴 和风',
      windSpeed: '4-6'
    },
    {
      icon: '💨',
      temp: '27',
      description: '多云 微风',
      windSpeed: '2-4'
    }
  ]

  return weatherData.map((weather, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    let timeName
    if (index === 0) {
      timeName = '今天'
    } else if (index === 1) {
      timeName = '明天'
    } else if (index === 2) {
      timeName = '后天'
    } else {
      timeName = weekdays[date.getDay()]
    }
    return { ...weather, time: timeName }
  })
}

// 天气预报
const weatherForecast = ref(getRealTimeWindWeatherData())

// 当前日期
const currentDate = computed(() => {
  const now = new Date()
  return now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-')
})

// 加载地图API
const loadMapScript = () => {
  return new Promise<void>((resolve, reject) => {
    // 设置安全配置
    (window as any)._AMapSecurityConfig = mapConfig.securityConfig

    // 检查是否已经加载了地图API
    if ((window as any).AMap) {
      AMap = (window as any).AMap
      resolve()
      return
    }

    // 创建script标签
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.apiKey}&plugin=AMap.ToolBar,AMap.Scale,AMap.MapType,AMap.Icon,AMap.InfoWindow,AMap.TileLayer,AMap.TileLayer.Satellite`
    script.onerror = reject
    script.onload = () => {
      AMap = (window as any).AMap
      resolve()
    }
    document.head.appendChild(script)
  })
}

// 初始化地图
const initMap = async () => {
  try {
    await loadMapScript()
    if (!AMap || !mapRef.value) return

    // 创建地图实例
    mapInstance = new AMap.Map(mapRef.value, {
      viewMode: '3D',
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      mapStyle: 'amap://styles/light', // 浅色地图样式
      showLabel: true,
      showBuildingBlock: true
    })

    // 设置地图文字颜色为黑色
    mapInstance.setFeatures(['bg', 'road', 'building', 'water']);
    mapInstance.setMapStyle('amap://styles/light');

    // 添加基础控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar())

    // 创建并管理图层
    normalLayer = new (AMap.TileLayer as any)()
    satelliteLayer = new (AMap.TileLayer.Satellite as any)()

    // 初始显示标准图层
    normalLayer.setMap(mapInstance)

    // 创建风电场标记
    updateTurbineMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('风电地图加载完成')
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

// 切换资源类型
const changeResourceType = (type: 'all' | 'onshore' | 'offshore' | 'distributed') => {
  currentResourceType.value = type
  updateTurbineMarkers()
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
    mapInstance.setCenter(mapConfig.center)
    mapInstance.setZoom(mapConfig.zoom)
  }
}

// 更新风电场标记
const updateTurbineMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 模拟风电场数据，包含多种类型
  const turbines = [
    { id: 1, name: '兴山风电场', type: 'onshore', coordinates: [110.79, 31.17], status: 'normal', capacity: 30, power: 28500, windSpeed: 8.5, efficiency: 95 },
    { id: 2, name: '昭君风电场', type: 'onshore', coordinates: [110.68, 31.09], status: 'normal', capacity: 25, power: 22000, windSpeed: 7.8, efficiency: 88 },
    { id: 3, name: '古夫风电场', type: 'onshore', coordinates: [110.72, 31.01], status: 'warning', capacity: 20, power: 16000, windSpeed: 6.5, efficiency: 80 },
    { id: 4, name: '峡口风电场', type: 'onshore', coordinates: [110.94, 31.21], status: 'warning', capacity: 15, power: 11250, windSpeed: 7.0, efficiency: 75 },
    { id: 5, name: '长江海上风电场', type: 'offshore', coordinates: [110.82, 31.05], status: 'normal', capacity: 50, power: 46500, windSpeed: 9.2, efficiency: 93 },
    { id: 6, name: '三峡海上风电场', type: 'offshore', coordinates: [110.70, 31.02], status: 'normal', capacity: 40, power: 37200, windSpeed: 8.8, efficiency: 91 },
    { id: 7, name: '昭君村分散式风电', type: 'distributed', coordinates: [110.65, 31.12], status: 'normal', capacity: 5, power: 4700, windSpeed: 7.5, efficiency: 94 },
    { id: 8, name: '古夫镇分散式风电', type: 'distributed', coordinates: [110.73, 31.08], status: 'normal', capacity: 3, power: 2800, windSpeed: 7.2, efficiency: 92 }
  ]

  // 过滤风电场数据
  const filteredTurbines = currentResourceType.value === 'all'
    ? turbines
    : turbines.filter(turbine => turbine.type === currentResourceType.value)

  // 为每个风电场创建标记
  filteredTurbines.forEach((turbine, index) => {
    // 根据风电类型和状态设置不同颜色的图标
    let iconColor = '#00B42A' // 默认正常绿色
    if (turbine.status === 'attention') {
      iconColor = '#FF7D00' // 注意黄色
    } else if (turbine.status === 'warning') {
      iconColor = '#F53F3F' // 警告红色
    } else {
      iconColor = '#1890ff' // 正常蓝色
    }

    // 获取资源类型对应的图标字符和配置
    const config = resourceTypeConfig[turbine.type as keyof typeof resourceTypeConfig]
    const iconMap = {
      onshore: '🏔️',
      offshore: '🌊',
      distributed: '🏡'
    }

    // 创建自定义HTML标记
    const iconContent = `
      <div class="custom-marker" style="position: relative; display: inline-block;">
        <div class="marker-icon" style="
          background-color: ${iconColor};
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
          border: 2px solid white;
        ">
          ${iconMap[turbine.type as keyof typeof iconMap]}
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
          opacity: 0;
          transition: opacity 0.3s ease;
        ">
          ${turbine.name}
        </div>
      </div>
    `

    const marker = new (AMap as any).Marker({
      position: turbine.coordinates,
      content: iconContent,
      zIndex: 100 + index,
      offset: new (AMap as any).Pixel(-20, -20)
    })

    // 绑定点击事件 - 显示信息窗口
    marker.on('click', (e: any) => {
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }
      showInfoWindow(turbine, marker)
    })

    // 绑定鼠标悬停事件 - 显示标签
    marker.on('mouseover', () => {
      const label = marker.getContent().querySelector('.marker-label')
      if (label) {
        label.style.opacity = '1'
      }
    })

    marker.on('mouseout', () => {
      const label = marker.getContent().querySelector('.marker-label')
      if (label) {
        label.style.opacity = '0'
      }
    })

    marker.setMap(mapInstance)
    markers.set(`${turbine.type}-${turbine.id}`, marker)
  })
}

// 显示信息窗口
const showInfoWindow = (station: any, marker: any) => {
  if (!mapInstance) return

  let typeName = ''
  if (station.type === 'onshore') {
    typeName = '陆上风电'
  } else if (station.type === 'offshore') {
    typeName = '海上风电'
  } else if (station.type === 'hybrid') {
    typeName = '混合风电'
  } else {
    typeName = '风力发电站'
  }

  const generation = station.generation || (station.power / 1000).toFixed(1)

  const infoWindow = new (AMap as any).InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${station.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: ${typeName}</p>
          <p class="resource-status">状态: <span style="color: ${station.status === 'normal' ? '#00B42A' : station.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${station.status === 'normal' ? '正常' : station.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-capacity">装机容量: ${station.capacity}MW</p>
          <p class="resource-generation">当前发电: ${generation}MW</p>
          <p class="resource-efficiency">效率: ${station.efficiency}%</p>
          <p class="resource-wind-speed">风速: ${station.windSpeed}m/s</p>
          <p class="resource-coordinates">坐标: ${station.coordinates[0].toFixed(4)}, ${station.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new (AMap as any).Size(320, 200),
    offset: new (AMap as any).Pixel(0, -50)
  })

  infoWindow.open(mapInstance, station.coordinates)
}

// 创建信息窗口内容 - 为了兼容原有代码结构保留此函数名，但内部调用showInfoWindow
const createInfoWindowContent = (station: any) => {
  // 这里返回的内容实际上不会被使用，因为我们在点击事件中直接调用了showInfoWindow
  return ''
}

// 初始化发电功率趋势图表
const initPowerTrendChart = () => {
  const chartDom = document.getElementById('powerTrendChart')
  if (!chartDom) return

  powerTrendChart = echarts.init(chartDom)
  const option: EChartsOption = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    title: {
      textStyle: {
        color: '#36CFC9',
        fontSize: 14,
        fontWeight: 'bold'
      },
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['总发电功率', '风速均值'],
      textStyle: {
        color: '#fff'
      },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '现在'],
      axisLine: {
        lineStyle: {
          color: '#999'
        }
      },
      axisLabel: {
        color: '#fff'
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '功率(MW)',
        nameTextStyle: {
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#fff'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      {
        type: 'value',
        name: '风速(m/s)',
        nameTextStyle: {
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#fff'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '总发电功率',
        type: 'line',
        yAxisIndex: 0,
        stack: '总量',
        data: [10, 30, 45, 60, 70, 58, 45, 32],
        lineStyle: {
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(24, 144, 255, 0.8)'
            },
            {
              offset: 1,
              color: 'rgba(24, 144, 255, 0.2)'
            }
          ])
        }
      },
      {
        name: '风速均值',
        type: 'line',
        yAxisIndex: 1,
        stack: '总量',
        data: [6.5, 7.2, 8.8, 9.2, 9.5, 8.7, 7.8, 7.2],
        lineStyle: {
          color: '#4facfe'
        },
        itemStyle: {
          color: '#4facfe'
        }
      }
    ]
  }

  powerTrendChart.setOption(option)
}

// 初始化风速分布图表
const initWindSpeedChart = () => {
  const chartDom = document.getElementById('windSpeedChart')
  if (!chartDom) return

  windSpeedChart = echarts.init(chartDom)
  const option: EChartsOption = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    title: {
      textStyle: {
        color: '#36CFC9',
        fontSize: 14,
        fontWeight: 'bold'
      },
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#fff'
      }
    },
    series: [
      {
        name: '风速分布',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { name: '高风速区(>8m/s)', value: 4, itemStyle: { color: '#1890ff' } },
          { name: '中等风速区(6-8m/s)', value: 3, itemStyle: { color: '#40a9ff' } },
          { name: '低风速区(<6m/s)', value: 1, itemStyle: { color: '#0050b3' } }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        itemStyle: {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 2
        },
        label: {
          color: '#fff'
        }
      }
    ]
  }

  windSpeedChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  initPowerTrendChart()
  initWindSpeedChart()
}

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (powerTrendChart) powerTrendChart.resize()
  if (windSpeedChart) windSpeedChart.resize()

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 刷新状态
const isRefreshing = ref(false)

// 刷新数据
const refreshData = async () => {
  // 防止重复点击
  if (isRefreshing.value) return
  
  isRefreshing.value = true
  
  try {
    console.log('刷新风电数据')
    
    // 模拟网络请求延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新所有风电场数据
    turbineList.value.forEach(turbine => {
      // 为所有风电场添加随机波动，而不仅仅是警告状态的风电场
      const fluctuation = (Math.random() * 1000 - 500)
      // 四舍五入保留0位小数
      turbine.power = Number(Math.max(0, Math.min(turbine.capacity * 1000, turbine.power + fluctuation)).toFixed(0))
      // 四舍五入保留1位小数
      turbine.windSpeed = Number(Math.max(0, Math.min(25, turbine.windSpeed + (Math.random() * 0.5 - 0.25))).toFixed(1))
      
      // 根据风速和发电功率更新状态
      if (turbine.windSpeed < 3 || turbine.windSpeed > 20 || turbine.power < turbine.capacity * 1000 * 0.3) {
        turbine.status = 'warning'
        turbine.statusText = '需要关注'
      } else {
        turbine.status = 'normal'
        turbine.statusText = '正常运行'
      }
    })
    
    // 更新统计数据
    totalTurbines.value = turbineList.value.length
    normalTurbines.value = turbineList.value.filter(t => t.status === 'normal').length
    warningTurbines.value = turbineList.value.filter(t => t.status === 'warning').length
    
    // 更新当前日期时间
    updateCurrentDate()
    
    // 重新渲染所有图表
    if (powerTrendChart) {
      const option = powerTrendChart.getOption()
      if (option && option.series) {
        // 为所有系列更新最后一个数据点
        const series = option.series as any[]
        series.forEach((s, index) => {
          if (s.data && s.data.length > 0) {
            const lastValue = s.data[s.data.length - 1]
            // 四舍五入保留1位小数
            s.data[s.data.length - 1] = Number(Math.max(0, lastValue + (Math.random() * 5 - 2.5)).toFixed(1))
          }
        })
        powerTrendChart.setOption(option)
      }
    }
    
    // 重新渲染风速分布图
    if (windSpeedChart) {
      initWindSpeedChart()
    }
    
  } catch (error) {
    console.error('刷新数据失败:', error)
  } finally {
    isRefreshing.value = false
  }
}

// 更新当前日期时间
const updateCurrentDate = () => {
  const now = new Date()
  currentDate.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 组件挂载时初始化
onMounted(() => {
  initCharts()
  initMap()
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理
onUnmounted(() => {
  // 销毁图表实例
  if (powerTrendChart) powerTrendChart.dispose()
  if (windSpeedChart) windSpeedChart.dispose()

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
:root {
  --primary-color: #36CFC9;
  --secondary-color: #FF7D00;
  --danger-color: #F53F3F;
  --success-color: #00B42A;
  --info-color: #4FCAFE;
}

.wind-resource-container {
  width: 100%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  flex-direction: column;
  overflow: auto;
  color: #fff;
}

/* 顶部标题栏 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.header-left h2 {
  margin: 0;
  color: var(--primary-color);
  font-size: 20px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.date-display {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.btn-refresh {
  padding: 8px 16px;
  background: rgba(79, 202, 254, 0.2);
  color: #fff;
  border: 1px solid rgba(79, 202, 254, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.btn-refresh:hover:not(:disabled) {
  background: rgba(79, 202, 254, 0.3);
  border-color: rgba(79, 202, 254, 0.5);
  transform: translateY(-1px);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.refresh-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.refresh-icon::before {
  content: '🔄';
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

/* 左侧区域 */
.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 125px);
  /* 限制左栏高度在屏幕内 */
  overflow-y: auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border-color: rgba(79, 172, 254, 0.3);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, rgba(79, 202, 254, 0.3) 0%, rgba(0, 242, 254, 0.2) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--info-color);
}

.turbine-icon {
  background: linear-gradient(135deg, rgba(79, 202, 254, 0.3) 0%, rgba(0, 242, 254, 0.2) 100%);
}

.normal-icon {
  background: linear-gradient(135deg, rgba(0, 180, 42, 0.3) 0%, rgba(127, 255, 0, 0.2) 100%);
  color: var(--success-color);
}

.warning-icon {
  background: linear-gradient(135deg, rgba(255, 125, 0, 0.3) 0%, rgba(255, 165, 0, 0.2) 100%);
  color: var(--secondary-color);
}

.power-icon {
  background: linear-gradient(135deg, rgba(79, 202, 254, 0.3) 0%, rgba(0, 242, 254, 0.2) 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #fff;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 5px;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
}

.chart-item {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.chart-item:hover {
  box-shadow: 0 6px 20px rgba(79, 202, 254, 0.15);
  border-color: rgba(79, 202, 254, 0.3);
}

.chart-item h3 {
  margin: 0 0 15px 0;
  color: var(--info-color);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.chart {
  flex: 1;
  min-height: 250px;
}

/* 中间区域 */
.center-section {
  color: #000;
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 600px;
}

.resource-type-selector {
  display: flex;
  height: 60px;
  gap: 10px;
  background: #1e293b;
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.resource-type-btn {
  flex: 1;
  padding: 10px 15px;
  background: transparent;
  border: 2px solid var(--color);
  color: var(--color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.resource-type-btn:hover {
  background: var(--color);
  color: white;
  transform: translateY(-1px);
}

.resource-type-btn.active {
  background: var(--color);
  color: white;
}

.map {
  flex: 1;
  min-height: calc(100vh - 200px);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.map-controls {
  display: flex;
  gap: 10px;
  margin: 10px 0;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.map-controls button {
  flex: 1;
  padding: 8px 12px;
  background: rgba(79, 202, 254, 0.2);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(79, 202, 254, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
  font-weight: 500;
  min-width: 80px;
}

.map-controls button:hover {
  background: rgba(79, 202, 254, 0.4);
  border-color: rgba(79, 202, 254, 0.6);
  color: white;
}

.layer-switch-container {
  display: flex;
  flex: 1.5;
  gap: 5px;
  margin-left: auto;
}

.layer-btn {
  flex: 1;
}

.layer-btn.active {
  background: rgba(79, 202, 254, 0.4);
  color: white;
  border-color: rgba(79, 202, 254, 0.6);
}

/* 右侧区域 */
.right-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 125px);
  /* 限制右栏高度在屏幕内 */
  overflow-y: auto;
  width: 25%;
}

.turbine-detail-container,
.weather-forecast-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.turbine-detail-container h3,
.weather-forecast-container h3 {
  margin: 0 0 15px 0;
  color: var(--info-color);
  font-size: 16px;
  font-weight: 600;
}

.turbine-list,
.weather-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.turbine-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.turbine-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 202, 254, 0.15);
  border-color: rgba(79, 202, 254, 0.3);
}

.turbine-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.turbine-name {
  font-weight: bold;
  color: white;
  font-size: 14px;
}

.turbine-status {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.turbine-status.normal {
  background: var(--success-color);
}

.turbine-status.attention {
  background: var(--secondary-color);
}

.turbine-status.warning {
  background: var(--danger-color);
}

.turbine-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.info-label {
  color: rgba(255, 255, 255, 0.5);
}

.info-value {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.power-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.power-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.power-fill.normal {
  background: #00B42A;
}

.power-fill.attention {
  background: #FF7D00;
}

.power-fill.warning {
  background: #F53F3F;
}

.weather-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 15px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid var(--info-color);
  transition: all 0.3s ease;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
}

.weather-item:hover {
  background: linear-gradient(135deg, rgba(79, 202, 254, 0.1) 0%, rgba(79, 202, 254, 0.05) 100%);
  transform: translateX(5px);
  box-shadow: 0 3px 10px rgba(79, 202, 254, 0.2);
}

.weather-time {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  min-width: 60px;
}

.weather-icon {
  font-size: 24px;
  margin: 0 15px;
  color: var(--info-color);
}

.weather-info {
  flex: 1;
  text-align: right;
}

.weather-temp {
  font-size: 16px;
  font-weight: bold;
  color: white;
  margin-right: 10px;
}

.weather-desc {
  color: rgba(255, 255, 255, 0.6);
  display: block;
  font-size: 12px;
}

.weather-wind {
  color: rgba(255, 255, 255, 0.6);
  display: block;
  font-size: 12px;
  margin-top: 2px;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .content-area {
    flex-direction: column;
  }

  .left-section,
  .center-section,
  .right-section {
    width: 100%;
  }

  .center-section {
    order: -1;
    min-height: 500px;
  }

  .charts-container {
    flex-direction: row;
  }

  .chart-item {
    flex: 1;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 10px;
  }

  .header-right {
    width: 100%;
    justify-content: space-between;
  }

  .resource-type-selector {
    flex-wrap: wrap;
  }

  .resource-type-btn {
    flex: 1 1 45%;
  }

  .charts-container {
    flex-direction: column;
  }

  .stats-cards {
    grid-template-columns: 1fr;
  }

  .map-controls {
    flex-wrap: wrap;
  }

  .map-controls button {
    flex: 1 1 45%;
  }

  .layer-switch-container {
    flex: 1 1 100%;
  }
}
</style>
