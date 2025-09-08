<template>
  <div class="water-resource-container">
    <!-- 顶部标题栏 -->
    <div class="header">
      <div class="header-left">
        <h2>水资源实时监控</h2>
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
      <!-- 左侧区域：水资源统计和图表 -->
      <div class="left-section">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon water-icon">💧</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalReservoirs }}</div>
              <div class="stat-label">水库总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon normal-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ normalReservoirs }}</div>
              <div class="stat-label">正常运行</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-number">{{ warningReservoirs }}</div>
              <div class="stat-label">水位预警</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon flow-icon">🌊</div>
            <div class="stat-content">
              <div class="stat-number">{{ avgWaterFlow }}m³/s</div>
              <div class="stat-label">平均流量</div>
            </div>
          </div>
        </div>

        <div class="charts-container">
          <div class="chart-item">
            <h3>水库水位趋势</h3>
            <div id="waterLevelChart" class="chart"></div>
          </div>
          <div class="chart-item">
            <h3>水资源分布</h3>
            <div id="waterDistributionChart" class="chart"></div>
          </div>
        </div>
      </div>

      <!-- 中间区域：地图 -->
      <div class="center-section">
        <!-- 水资源类型选择器 -->
        <div class="resource-type-selector">
          <button v-for="(config, type) in resourceTypeConfig" :key="type"
            :class="['resource-type-btn', { active: currentResourceType === type }]"
            :style="{ '--color': config.color }"
            @click="changeResourceType(type as 'all' | 'reservoir' | 'river' | 'hydropower')">
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

      <!-- 右侧区域：水库详情和预警信息 -->
      <div class="right-section">
        <div class="reservoir-detail-container">
          <h3>重点水库详情</h3>
          <div class="reservoir-list">
            <div class="reservoir-item" v-for="reservoir in reservoirList" :key="reservoir.id">
              <div class="reservoir-header">
                <span class="reservoir-name">{{ reservoir.name }}</span>
                <span :class="['reservoir-status', reservoir.status]">{{ reservoir.statusText }}</span>
              </div>
              <div class="reservoir-info">
                <div class="info-item">
                  <span class="info-label">水位：</span>
                  <span class="info-value">{{ reservoir.waterLevel }}m / {{ reservoir.maxLevel }}m</span>
                </div>
                <div class="info-item">
                  <span class="info-label">库容：</span>
                  <span class="info-value">{{ reservoir.storage }}万m³</span>
                </div>
                <div class="info-item">
                  <span class="info-label">流量：</span>
                  <span class="info-value">{{ reservoir.flow }}m³/s</span>
                </div>
                <div class="info-item">
                  <span class="info-label">水质：</span>
                  <span class="info-value">{{ reservoir.waterQuality }}</span>
                </div>
              </div>
              <div class="water-level-bar">
                <div :class="['water-level-fill', reservoir.status]"
                  :style="{ width: reservoir.levelPercentage + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="warning-container">
          <h3>预警信息</h3>
          <div class="warning-list">
            <div class="warning-item" v-for="warning in warningList" :key="warning.id">
              <div class="warning-time">{{ warning.time }}</div>
              <div class="warning-content">
                <span :class="['warning-type', warning.level]">{{ warning.levelText }}</span>
                <span>{{ warning.content }}</span>
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
const currentResourceType = ref<'all' | 'reservoir' | 'river' | 'hydropower'>('all')

// 资源类型配置
const resourceTypeConfig = {
  all: { name: '全部资源', color: '#4facfe', icon: '💧' },
  reservoir: { name: '水库', color: '#0096FF', icon: '🏞️' },
  river: { name: '河流', color: '#00BFFF', icon: '🌊' },
  hydropower: { name: '水电站', color: '#4facfe', icon: '💧' }
}

// 图表实例
let waterLevelChart: any = null
let waterDistributionChart: any = null

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
const totalReservoirs = ref(12)
const normalReservoirs = ref(9)
const warningReservoirs = ref(3)
const avgWaterFlow = ref(125.8)

// 水库列表数据
const reservoirList = ref([
  {
    id: 1,
    name: '古夫水库',
    waterLevel: 128.5,
    maxLevel: 135.0,
    levelPercentage: 95,
    storage: 1250,
    flow: 120.5,
    waterQuality: '良好',
    status: 'warning',
    statusText: '水位预警'
  },
  {
    id: 2,
    name: '昭君水库',
    waterLevel: 98.2,
    maxLevel: 120.0,
    levelPercentage: 82,
    storage: 850,
    flow: 95.3,
    waterQuality: '良好',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 3,
    name: '峡口水库',
    waterLevel: 105.7,
    maxLevel: 110.0,
    levelPercentage: 96,
    storage: 920,
    flow: 135.8,
    waterQuality: '良好',
    status: 'warning',
    statusText: '水位预警'
  },
  {
    id: 4,
    name: '南阳水库',
    waterLevel: 88.3,
    maxLevel: 115.0,
    levelPercentage: 77,
    storage: 780,
    flow: 85.2,
    waterQuality: '良好',
    status: 'normal',
    statusText: '正常'
  }
])

// 生成基于当前时间的预警信息
const generateWarningList = () => {
  const now = new Date();
  const warningContents = [
    {
      id: 1,
      level: 'warning',
      levelText: '黄色预警',
      content: '古夫水库水位已达128.5米，接近警戒水位',
      minutesOffset: 0
    },
    {
      id: 2,
      level: 'warning',
      levelText: '黄色预警',
      content: '峡口水库水位快速上涨，请注意防范',
      minutesOffset: 75
    },
    {
      id: 3,
      level: 'attention',
      levelText: '橙色预警',
      content: '预计未来12小时有强降雨，各水库需做好防汛准备',
      minutesOffset: 150
    },
    {
      id: 4,
      level: 'normal',
      levelText: '一般通知',
      content: '昭君水库水位监测设备例行检查已完成',
      minutesOffset: 255
    }
  ];
  return warningContents.map(item => {
    const time = new Date(now.getTime() - item.minutesOffset * 60000);
    return {
      ...item,
      time: time.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-')
    };
  });
}

// 预警信息列表 - 从实时时间开始
const warningList = ref(generateWarningList())

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

    // 创建水资源标记
    updateResourceMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('水资源地图加载完成')
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
const changeResourceType = (type: 'all' | 'reservoir' | 'river' | 'hydropower') => {
  currentResourceType.value = type
  updateResourceMarkers()
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

// 更新资源标记
const updateResourceMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 模拟水资源数据
  const resources = [
    { id: 1, name: '古夫水库', type: 'reservoir', coordinates: [110.79, 31.17], status: 'warning', waterLevel: 128.5, maxLevel: 135.0 },
    { id: 2, name: '昭君水库', type: 'reservoir', coordinates: [110.68, 31.09], status: 'normal', waterLevel: 98.2, maxLevel: 120.0 },
    { id: 3, name: '峡口水库', type: 'reservoir', coordinates: [110.72, 31.01], status: 'warning', waterLevel: 105.7, maxLevel: 110.0 },
    { id: 4, name: '南阳水库', type: 'reservoir', coordinates: [110.94, 31.21], status: 'normal', waterLevel: 88.3, maxLevel: 115.0 },
    { id: 5, name: '香溪河', type: 'river', coordinates: [110.80, 31.10], status: 'normal', flow: 150.3 },
    { id: 6, name: '古夫镇水电', type: 'hydropower', coordinates: [110.78, 31.18], status: 'normal', capacity: 125, generation: 85 },
    { id: 7, name: '南阳镇水电', type: 'hydropower', coordinates: [110.93, 31.20], status: 'attention', capacity: 35, generation: 30 },
    { id: 8, name: '高桥乡水电', type: 'hydropower', coordinates: [110.60, 31.00], status: 'normal', capacity: 50, generation: 45 }
  ]

  // 过滤资源数据
  const filteredResources = currentResourceType.value === 'all'
    ? resources
    : resources.filter(resource => resource.type === currentResourceType.value)

  // 为每个资源创建标记
  filteredResources.forEach((resource, index) => {
    // 根据资源类型和状态设置不同颜色的图标
    let iconColor = '#00B42A' // 默认正常绿色
    if (resource.status === 'attention') {
      iconColor = '#FF7D00' // 注意黄色
    } else if (resource.status === 'warning') {
      iconColor = '#F53F3F' // 警告红色
    }

    // 获取资源类型对应的图标字符和配置
    const config = resourceTypeConfig[resource.type as keyof typeof resourceTypeConfig]
    const iconMap = {
      reservoir: '🏞️',
      river: '🌊',
      hydropower: '💧'
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
          ${iconMap[resource.type as keyof typeof iconMap]}
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
          ${resource.name}
        </div>
      </div>
    `

    const marker = new (AMap as any).Marker({
      position: resource.coordinates,
      content: iconContent,
      zIndex: 100 + index,
      offset: new (AMap as any).Pixel(-20, -20)
    })

    // 绑定点击事件 - 显示信息窗口
    marker.on('click', (e: any) => {
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }
      showInfoWindow(resource, marker)
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
    markers.set(`${resource.type}-${resource.id}`, marker)
  })
}

// 显示信息窗口
const showInfoWindow = (resource: any, marker: any) => {
  if (!mapInstance) return
  
  let content = ''
  
  if (resource.type === 'reservoir') {
    content = `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${resource.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: 水库</p>
          <p class="resource-status">状态: <span style="color: ${resource.status === 'normal' ? '#00B42A' : resource.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${resource.status === 'normal' ? '正常' : resource.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-water-level">当前水位: ${resource.waterLevel}m / ${resource.maxLevel}m</p>
          <p class="resource-level-percentage">水位百分比: ${Math.round((resource.waterLevel / resource.maxLevel) * 100)}%</p>
          <div class="water-level-indicator">
            <div class="water-level-fill" style="width: ${Math.round((resource.waterLevel / resource.maxLevel) * 100)}%; background: ${resource.status === 'normal' ? '#00B42A' : resource.status === 'attention' ? '#FF7D00' : '#F53F3F'}"></div>
          </div>
        </div>
      </div>
    `
  } else if (resource.type === 'river') {
    content = `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${resource.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: 河流</p>
          <p class="resource-status">状态: <span style="color: ${resource.status === 'normal' ? '#00B42A' : resource.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${resource.status === 'normal' ? '正常' : resource.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-flow">当前流量: ${resource.flow}m³/s</p>
        </div>
      </div>
    `
  } else if (resource.type === 'hydropower') {
    content = `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${resource.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">类型: 水电站</p>
          <p class="resource-status">状态: <span style="color: ${resource.status === 'normal' ? '#00B42A' : resource.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${resource.status === 'normal' ? '正常' : resource.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-capacity">装机容量: ${resource.capacity}MW</p>
          <p class="resource-generation">当前发电: ${resource.generation}MW</p>
          <p class="resource-load-rate">负载率: ${Math.round((resource.generation / resource.capacity) * 100)}%</p>
        </div>
      </div>
    `
  }

  const infoWindow = new (AMap as any).InfoWindow({
    content: content,
    size: new (AMap as any).Size(320, 200),
    offset: new (AMap as any).Pixel(0, -50)
  })

  infoWindow.open(mapInstance, resource.coordinates)
}

// 创建信息窗口内容 - 为了兼容原有代码结构保留此函数名，但内部调用showInfoWindow
const createInfoWindowContent = (resource: any) => {
  // 这里返回的内容实际上不会被使用，因为我们在点击事件中直接调用了showInfoWindow
  return ''
}

// 初始化水位趋势图表
const initWaterLevelChart = () => {
  const chartDom = document.getElementById('waterLevelChart')
  if (!chartDom) return

  waterLevelChart = echarts.init(chartDom)
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
      data: ['古夫水库', '昭君水库', '峡口水库'],
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
      data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '现在'],
      axisLine: {
        lineStyle: {
          color: '#999'
        }
      },
      axisLabel: {
        color: '#fff'
      }
    },
    yAxis: {
      type: 'value',
      name: '水位(m)',
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
    series: [
      {
        name: '古夫水库',
        type: 'line',
        stack: '总量',
        data: [126.5, 126.8, 127.2, 127.8, 128.2, 128.4, 128.5],
        lineStyle: {
          color: '#F53F3F'
        },
        itemStyle: {
          color: '#F53F3F'
        },
        markLine: {
          silent: true,
          lineStyle: {
            color: '#F53F3F',
            type: 'dashed'
          },
          data: [
            {
              yAxis: 130,
              label: {
                formatter: '警戒水位',
                position: 'insideEndTop',
                color: '#F53F3F'
              }
            }
          ]
        }
      },
      {
        name: '昭君水库',
        type: 'line',
        stack: '总量',
        data: [96.5, 96.8, 97.0, 97.5, 98.0, 98.1, 98.2],
        lineStyle: {
          color: '#00B42A'
        },
        itemStyle: {
          color: '#00B42A'
        }
      },
      {
        name: '峡口水库',
        type: 'line',
        stack: '总量',
        data: [102.5, 103.2, 103.8, 104.5, 105.0, 105.5, 105.7],
        lineStyle: {
          color: '#FF7D00'
        },
        itemStyle: {
          color: '#FF7D00'
        },
        markLine: {
          silent: true,
          lineStyle: {
            color: '#FF7D00',
            type: 'dashed'
          },
          data: [
            {
              yAxis: 108,
              label: {
                formatter: '警戒水位',
                position: 'insideEndTop',
                color: '#FF7D00'
              }
            }
          ]
        }
      }
    ]
  }

  waterLevelChart.setOption(option)
}

// 初始化水资源分布图表
const initWaterDistributionChart = () => {
  const chartDom = document.getElementById('waterDistributionChart')
  if (!chartDom) return

  waterDistributionChart = echarts.init(chartDom)
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
        name: '水资源类型',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { name: '水库', value: 12, itemStyle: { color: '#0096FF' } },
          { name: '河流', value: 5, itemStyle: { color: '#00BFFF' } },
          { name: '水电站', value: 8, itemStyle: { color: '#4facfe' } },
          { name: '其他水利设施', value: 3, itemStyle: { color: '#69b1ff' } }
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

  waterDistributionChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  initWaterLevelChart()
  initWaterDistributionChart()
}

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (waterLevelChart) waterLevelChart.resize()
  if (waterDistributionChart) waterDistributionChart.resize()

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 刷新数据
const refreshData = () => {
  // 这里可以添加刷新数据的逻辑
  console.log('刷新水资源数据')
  // 模拟数据更新
  reservoirList.value.forEach(reservoir => {
    if (reservoir.status === 'warning') {
      reservoir.waterLevel += Math.random() * 0.2 - 0.05
      reservoir.levelPercentage = Math.round((reservoir.waterLevel / reservoir.maxLevel) * 100)
    }
  })

  // 重新渲染图表
  if (waterLevelChart) {
    const option = waterLevelChart.getOption()
    if (option && option.series) {
      // 模拟更新图表数据
      const series = option.series as any[]
      series.forEach((s, index) => {
        if (s.data && s.data.length > 0) {
          const lastValue = s.data[s.data.length - 1]
          s.data[s.data.length - 1] = lastValue + (Math.random() * 0.2 - 0.05)
        }
      })
      waterLevelChart.setOption(option)
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
  if (waterLevelChart) waterLevelChart.dispose()
  if (waterDistributionChart) waterDistributionChart.dispose()
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

.water-resource-container {
  padding: 0;
  min-height: 100%;
  background-color: #0D1136;
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

.btn-refresh:hover {
  background: rgba(79, 202, 254, 0.3);
  border-color: rgba(79, 202, 254, 0.5);
  transform: translateY(-1px);
}

.refresh-icon::before {
  content: '🔄';
}

/* 内容区域 */
.content-area {
  flex: 1;
  display: flex;
  gap: 15px;
  padding: 10px;
  overflow: hidden;
}

/* 左侧区域 */
.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 120px);
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
  border-color: rgba(79, 202, 254, 0.3);
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

.water-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.normal-icon {
  background: linear-gradient(135deg, #00B42A 0%, #7FFF00 100%);
}

.warning-icon {
  background: linear-gradient(135deg, #FF7D00 0%, #FFA500 100%);
}

.flow-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00BFFF 100%);
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
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
  min-height: calc(100vh - 200px);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.map-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.map-controls button {
  flex: 1;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.map-controls button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.layer-switch-container {
  display: flex;
  margin-left: auto;
  flex: 1.5;
  gap: 5px;
}

.layer-btn {
  flex: 1;
}

.layer-btn.active {
  background: rgba(79, 172, 254, 0.8) !important;
  color: #fff !important;
  border-color: rgba(79, 172, 254, 1) !important;
}

/* 右侧区域 */
.right-section {
  color: #fff;
  flex: 0.8;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 120px);
  /* 限制右栏高度在屏幕内 */
  overflow-y: auto;
}

.reservoir-detail-container,
.warning-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.reservoir-detail-container h3,
.warning-container h3 {
  margin: 0 0 15px 0;
  color: var(--info-color);
  font-size: 16px;
  font-weight: 600;
}

.reservoir-list,
.warning-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reservoir-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
}

.reservoir-item:hover {
  transform: translateX(5px);
  border-color: rgba(79, 172, 254, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.reservoir-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.reservoir-name {
  font-weight: bold;
  color: #fff;
  font-size: 14px;
}

.reservoir-status {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.reservoir-status.normal {
  background: var(--success-color);
}

.reservoir-status.attention {
  background: var(--secondary-color);
}

.reservoir-status.warning {
  background: var(--danger-color);
}

.reservoir-info {
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

.water-level-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.water-level-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.water-level-fill.normal {
  background: #00B42A;
}

.water-level-fill.attention {
  background: #FF7D00;
}

.water-level-fill.warning {
  background: #F53F3F;
}

.warning-item {
  padding: 12px 15px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid var(--info-color);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.8);
}

.warning-item:hover {
  background: linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(79, 172, 254, 0.05) 100%);
  transform: translateX(5px);
  box-shadow: 0 3px 10px rgba(79, 172, 254, 0.2);
}

.warning-time {
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 6px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.warning-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-type {
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.warning-type.normal {
  color: var(--success-color);
}

.warning-type.attention {
  color: var(--secondary-color);
}

.warning-type.warning {
  color: var(--danger-color);
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
