<template>
  <div class="light-resource-container">
    <!-- 顶部标题栏 -->
    <div class="header">
      <div class="header-left">
        <h2>光能资源实时监控</h2>
      </div>
      <div class="header-right">
        <div class="date-display">{{ currentDate }}</div>
        <button class="btn-refresh" @click="refreshData">
          <i class="refresh-icon"></i> 刷新
        </button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 左侧区域：光能统计和图表 -->
      <div class="left-section">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon panel-icon">☀️</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalPanels }}</div>
              <div class="stat-label">光伏电站</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon normal-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ normalPanels }}</div>
              <div class="stat-label">正常运行</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-number">{{ warningPanels }}</div>
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
            <h3>光照强度分布</h3>
            <div id="irradiationChart" class="chart"></div>
          </div>
        </div>
      </div>

      <!-- 中间区域：地图 -->
      <div class="center-section">
        <!-- 光照类型选择器 -->
        <div class="resource-type-selector">
          <button v-for="(config, type) in resourceTypeConfig" :key="type"
            :class="['resource-type-btn', { active: currentResourceType === type }]"
            :style="{ '--color': config.color }"
            @click="changeResourceType(type as 'all' | 'solar' | 'bipv' | 'concentrated')">
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

      <!-- 右侧区域：光伏详情和预警信息 -->
      <div class="right-section">
        <div class="panel-detail-container">
          <h3>重点光伏电站</h3>
          <div class="panel-list">
            <div class="panel-item" v-for="panel in panelList" :key="panel.id">
              <div class="panel-header">
                <span class="panel-name">{{ panel.name }}</span>
                <span :class="['panel-status', panel.status]">{{ panel.statusText }}</span>
              </div>
              <div class="panel-info">
                <div class="info-item">
                  <span class="info-label">容量：</span>
                  <span class="info-value">{{ panel.capacity }}MW</span>
                </div>
                <div class="info-item">
                  <span class="info-label">发电：</span>
                  <span class="info-value">{{ panel.power }}kW</span>
                </div>
                <div class="info-item">
                  <span class="info-label">效率：</span>
                  <span class="info-value">{{ panel.efficiency }}%</span>
                </div>
                <div class="info-item">
                  <span class="info-label">辐照：</span>
                  <span class="info-value">{{ panel.irradiation }}W/m²</span>
                </div>
              </div>
              <div class="power-bar">
                <div :class="['power-fill', panel.status]" :style="{ width: panel.power / panel.capacity / 10 + '%' }">
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
const currentResourceType = ref<'all' | 'solar' | 'bipv' | 'concentrated'>('all')

// 资源类型配置
const resourceTypeConfig = {
  all: { name: '全部光伏', color: '#FFD700', icon: '☀️' },
  solar: { name: '地面光伏', color: '#FFA500', icon: '🏞️' },
  bipv: { name: '光伏建筑', color: '#FF8C00', icon: '🏠' },
  concentrated: { name: '光热发电', color: '#FF4500', icon: '🔥' }
}

// 图表实例
let powerTrendChart: any = null
let irradiationChart: any = null

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
const totalPanels = ref(12)
const normalPanels = ref(10)
const warningPanels = ref(2)
const totalPower = ref(95)

// 光伏电站列表数据
const panelList = ref([
  {
    id: 1,
    name: '昭君光伏电站',
    capacity: 20,
    power: 18500,
    efficiency: 92,
    irradiation: 950,
    type: '地面光伏',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 2,
    name: '古夫屋顶光伏',
    capacity: 5,
    power: 4200,
    efficiency: 84,
    irradiation: 950,
    type: '光伏建筑',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 3,
    name: '峡口光伏电站',
    capacity: 15,
    power: 12300,
    efficiency: 82,
    irradiation: 950,
    type: '地面光伏',
    status: 'warning',
    statusText: '需要关注'
  },
  {
    id: 4,
    name: '南阳光伏电站',
    capacity: 25,
    power: 18750,
    efficiency: 75,
    irradiation: 950,
    type: '地面光伏',
    status: 'warning',
    statusText: '需要关注'
  }
])

// 获取真实时间的天气预报数据
const getRealTimeLightWeatherData = () => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  const weatherData = [
    {
      icon: '☀️',
      temp: '32',
      description: '晴 微风'
    },
    {
      icon: '☁️',
      temp: '29',
      description: '多云 微风'
    },
    {
      icon: '🌤️',
      temp: '30',
      description: '晴间多云 微风'
    },
    {
      icon: '☀️',
      temp: '31',
      description: '晴 微风'
    },
    {
      icon: '🌤️',
      temp: '32',
      description: '晴间多云 微风'
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
const weatherForecast = ref(getRealTimeLightWeatherData())

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

    // 创建光伏电站标记
    updatePanelMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('光伏地图加载完成')
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
const changeResourceType = (type: 'all' | 'solar' | 'bipv' | 'concentrated') => {
  currentResourceType.value = type
  updatePanelMarkers()
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

// 更新光伏电站标记
const updatePanelMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 模拟光伏电站数据
  const panels = [
    { id: 1, name: '昭君光伏电站', type: 'solar', coordinates: [110.79, 31.17], status: 'normal', capacity: 20, power: 18500, efficiency: 92, irradiation: 950 },
    { id: 2, name: '古夫屋顶光伏', type: 'bipv', coordinates: [110.68, 31.09], status: 'normal', capacity: 5, power: 4200, efficiency: 84, irradiation: 950 },
    { id: 3, name: '峡口光伏电站', type: 'solar', coordinates: [110.72, 31.01], status: 'warning', capacity: 15, power: 12300, efficiency: 82, irradiation: 950 },
    { id: 4, name: '南阳光伏电站', type: 'solar', coordinates: [110.94, 31.21], status: 'warning', capacity: 25, power: 18750, efficiency: 75, irradiation: 950 },
    { id: 5, name: '高桥光伏电站', type: 'solar', coordinates: [110.60, 31.00], status: 'normal', capacity: 10, power: 9200, efficiency: 92, irradiation: 950 },
    { id: 6, name: '榛子光伏电站', type: 'solar', coordinates: [110.85, 31.30], status: 'normal', capacity: 12, power: 10600, efficiency: 88, irradiation: 950 },
    { id: 7, name: '水月寺光伏电站', type: 'solar', coordinates: [110.92, 31.10], status: 'normal', capacity: 8, power: 7300, efficiency: 91, irradiation: 950 },
    { id: 8, name: '黄粮光伏电站', type: 'solar', coordinates: [110.75, 31.15], status: 'normal', capacity: 15, power: 13800, efficiency: 92, irradiation: 950 },
    { id: 9, name: '兴山中学屋顶', type: 'bipv', coordinates: [110.78, 31.12], status: 'normal', capacity: 3, power: 2500, efficiency: 83, irradiation: 950 },
    { id: 10, name: '政府大楼屋顶', type: 'bipv', coordinates: [110.77, 31.13], status: 'normal', capacity: 4, power: 3300, efficiency: 82, irradiation: 950 },
    { id: 11, name: '工业园区光伏', type: 'solar', coordinates: [110.82, 31.08], status: 'normal', capacity: 18, power: 15300, efficiency: 85, irradiation: 950 },
    { id: 12, name: '光热发电站', type: 'concentrated', coordinates: [110.65, 31.18], status: 'normal', capacity: 20, power: 17000, efficiency: 85, irradiation: 950 }
  ]

  // 过滤光伏电站数据
  const filteredPanels = currentResourceType.value === 'all'
    ? panels
    : panels.filter(panel => panel.type === currentResourceType.value)

  // 为每个光伏电站创建标记
  filteredPanels.forEach((panel, index) => {
    // 根据光伏类型和状态设置不同颜色的图标
    let iconColor = '#00B42A' // 默认正常绿色
    if (panel.status === 'attention') {
      iconColor = '#FF7D00' // 注意黄色
    } else if (panel.status === 'warning') {
      iconColor = '#F53F3F' // 警告红色
    } else {
      iconColor = '#FFD700' // 正常金色
    }

    // 获取资源类型对应的图标字符和配置
    const config = resourceTypeConfig[panel.type as keyof typeof resourceTypeConfig]
    const iconMap = {
      solar: '☀️',
      bipv: '🏠',
      concentrated: '🔥'
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
          ${iconMap[panel.type as keyof typeof iconMap]}
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
          ${panel.name}
        </div>
      </div>
    `

    const marker = new (AMap as any).Marker({
      position: panel.coordinates,
      content: iconContent,
      zIndex: 100 + index,
      offset: new (AMap as any).Pixel(-20, -20)
    })

    // 绑定点击事件 - 显示信息窗口
    marker.on('click', (e: any) => {
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }

      // 创建信息窗口
      const infoWindow = new (AMap as any).InfoWindow({
        content: createInfoWindowContent(panel),
        size: new (AMap as any).Size(300, 200),
        offset: new (AMap as any).Pixel(0, -50)
      })

      infoWindow.open(mapInstance, panel.coordinates)
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
    markers.set(`${panel.type}-${panel.id}`, marker)
  })
}

// 创建信息窗口内容
const createInfoWindowContent = (panel: any) => {
  let content = ''

  if (panel.type === 'solar') {
    content = `
      <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; margin-bottom: 10px;">${panel.name}</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>类型：</strong>地面光伏</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>状态：</strong><span style="color: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${panel.status === 'normal' ? '正常' : panel.status === 'attention' ? '注意' : '警告'}</span></p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>装机容量：</strong>${panel.capacity}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>当前发电：</strong>${(panel.power / 1000).toFixed(1)}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>效率：</strong>${panel.efficiency}%</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>光照强度：</strong>${panel.irradiation}W/m²</p>
          <div style="margin-top: 5px; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; background: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}; width: ${(panel.power / (panel.capacity * 1000)) * 100}%"></div>
          </div>
        </div>
      </div>
    `
  } else if (panel.type === 'bipv') {
    content = `
      <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; margin-bottom: 10px;">${panel.name}</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>类型：</strong>光伏建筑</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>状态：</strong><span style="color: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${panel.status === 'normal' ? '正常' : panel.status === 'attention' ? '注意' : '警告'}</span></p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>装机容量：</strong>${panel.capacity}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>当前发电：</strong>${(panel.power / 1000).toFixed(1)}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>效率：</strong>${panel.efficiency}%</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>光照强度：</strong>${panel.irradiation}W/m²</p>
          <div style="margin-top: 5px; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; background: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}; width: ${(panel.power / (panel.capacity * 1000)) * 100}%"></div>
          </div>
        </div>
      </div>
    `
  } else if (panel.type === 'concentrated') {
    content = `
      <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
        <h3 style="margin-top: 0; color: #ffffff; font-size: 16px; margin-bottom: 10px;">${panel.name}</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>类型：</strong>光热发电</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>状态：</strong><span style="color: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${panel.status === 'normal' ? '正常' : panel.status === 'attention' ? '注意' : '警告'}</span></p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>装机容量：</strong>${panel.capacity}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>当前发电：</strong>${(panel.power / 1000).toFixed(1)}MW</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>效率：</strong>${panel.efficiency}%</p>
          <p style="margin: 0; color: #ffffff; font-size: 14px;"><strong>光照强度：</strong>${panel.irradiation}W/m²</p>
          <div style="margin-top: 5px; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; background: ${panel.status === 'normal' ? '#FFD700' : panel.status === 'attention' ? '#FF7D00' : '#F53F3F'}; width: ${(panel.power / (panel.capacity * 1000)) * 100}%"></div>
          </div>
        </div>
      </div>
    `
  }

  return content
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
      data: ['总发电功率', '效率均值'],
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
        name: '效率(%)',
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
        data: [5, 18, 45, 68, 75, 62, 25, 15],
        lineStyle: {
          color: '#FFD700'
        },
        itemStyle: {
          color: '#FFD700'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            {
              offset: 0,
              color: 'rgba(255, 215, 0, 0.8)'
            },
            {
              offset: 1,
              color: 'rgba(255, 215, 0, 0.2)'
            }
          ])
        }
      },
      {
        name: '效率均值',
        type: 'line',
        yAxisIndex: 1,
        stack: '总量',
        data: [75, 82, 88, 85, 83, 85, 80, 78],
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

// 初始化光照强度分布图表
const initIrradiationChart = () => {
  const chartDom = document.getElementById('irradiationChart')
  if (!chartDom) return

  irradiationChart = echarts.init(chartDom)
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    title: {
      textStyle: {
        color: '#36CFC9',
        fontSize: 14,
        fontWeight: 'bold'
      },
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      textStyle: {
        color: '#ffffff'
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: {
        color: '#ffffff'
      }
    },
    series: [
      {
        name: '光照强度',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { name: '高辐射区(>800W/m²)', value: 6, itemStyle: { color: '#FFD700' } },
          { name: '中等辐射区(500-800W/m²)', value: 4, itemStyle: { color: '#FFA500' } },
          { name: '低辐射区(<500W/m²)', value: 2, itemStyle: { color: '#FF8C00' } }
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
          color: '#ffffff'
        }
      }
    ]
  }

  irradiationChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  initPowerTrendChart()
  initIrradiationChart()
}

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (powerTrendChart) powerTrendChart.resize()
  if (irradiationChart) irradiationChart.resize()

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 刷新数据
const refreshData = () => {
  // 这里可以添加刷新数据的逻辑
  console.log('刷新光伏数据')
  // 模拟数据更新
  panelList.value.forEach(panel => {
    if (panel.status === 'warning') {
      panel.power += (Math.random() * 1000 - 500)
      panel.power = Math.max(0, Math.min(panel.capacity * 1000, panel.power))
    }
  })

  // 重新渲染图表
  if (powerTrendChart) {
    const option = powerTrendChart.getOption()
    if (option && option.series) {
      // 模拟更新图表数据
      const series = option.series as any[]
      series.forEach((s, index) => {
        if (s.data && s.data.length > 0) {
          const lastValue = s.data[s.data.length - 1]
          s.data[s.data.length - 1] = lastValue + (Math.random() * 5 - 2.5)
        }
      })
      powerTrendChart.setOption(option)
    }
  }
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
  if (irradiationChart) irradiationChart.dispose()

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.light-resource-container {
  width: 100%;
  height: 100vh;
  background-color: #0a1017;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部标题栏 */
.header {
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.header-left h2 {
  margin: 0;
  color: var(--info-color);
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
  color: #fff;
}

.btn-refresh {
  padding: 8px 16px;
  background: rgba(255, 215, 0, 0.3);
  color: white;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
}

.btn-refresh:hover {
  background: rgba(255, 215, 0, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-icon {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--warning-hover) 100%);
}

.normal-icon {
  background: linear-gradient(135deg, var(--success-color) 0%, #7FFF00 100%);
}

.warning-icon {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--warning-hover) 100%);
}

.power-icon {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--warning-hover) 100%);
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
  font-size: 12px;
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
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.chart-item:hover {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
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
  flex: 1.5;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.resource-type-selector {
  display: flex;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.resource-type-btn {
  flex: 1;
  padding: 10px 15px;
  background: transparent;
  border: 2px solid var(--color);
  color: var(--color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.resource-type-btn.active {
  background: var(--color);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.map {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
}

.map-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.map-controls button {
  padding: 8px 16px;
  background: rgba(255, 215, 0, 0.2);
  color: white;
  border: 1px solid rgba(255, 215, 0, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.map-controls button:hover {
  background: rgba(255, 215, 0, 0.4);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.2);
}

.layer-switch-container {
  display: flex;
  gap: 5px;
}

.layer-btn {
  flex: 1;
}

.layer-btn.active {
  background: rgba(255, 215, 0, 0.6);
  color: white;
}

/* 右侧区域 */
.right-section {
  color: #fff;
  flex: 0.8;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.panel-detail-container,
.weather-forecast-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.panel-detail-container h3,
.weather-forecast-container h3 {
  margin: 0 0 15px 0;
  color: var(--info-color);
  font-size: 16px;
  font-weight: 600;
}

.panel-list,
.weather-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
}

.panel-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(255, 215, 0, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.panel-name {
  font-weight: bold;
  color: #fff;
  font-size: 14px;
}

.panel-status {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.panel-status.normal {
  background: var(--warning-color);
  color: white;
}

.panel-status.attention {
  background: var(--warning-hover);
}

.panel-status.warning {
  background: var(--danger-color);
}

.panel-info {
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
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  color: #fff;
  font-weight: 500;
}

.power-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid var(--warning-color);
  transition: all 0.3s ease;
  cursor: pointer;
}

.weather-item:hover {
  background: rgba(255, 215, 0, 0.1);
  transform: translateX(5px);
  box-shadow: 0 3px 10px rgba(255, 215, 0, 0.2);
  border-left: 3px solid var(--warning-hover);
}

.weather-time {
  color: #fff;
  font-weight: 500;
  min-width: 60px;
}

.weather-icon {
  font-size: 24px;
  margin: 0 15px;
}

.weather-info {
  flex: 1;
  text-align: right;
}

.weather-temp {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  margin-right: 10px;
}

.weather-desc {
  color: rgba(255, 255, 255, 0.7);
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
