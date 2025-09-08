<template>
  <div class="energy-storage-container">
    <!-- 顶部标题栏 -->
    <div class="header">
      <div class="header-left">
        <h2>储能设施实时监控</h2>
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
      <!-- 左侧区域：储能统计和图表 -->
      <div class="left-section">
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-icon storage-icon">🔋</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalStorages }}</div>
              <div class="stat-label">储能站点</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon normal-icon">✅</div>
            <div class="stat-content">
              <div class="stat-number">{{ normalStorages }}</div>
              <div class="stat-label">正常运行</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon warning-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-number">{{ warningStorages }}</div>
              <div class="stat-label">需要关注</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon capacity-icon">⚡</div>
            <div class="stat-content">
              <div class="stat-number">{{ totalCapacity }}MW</div>
              <div class="stat-label">总容量</div>
            </div>
          </div>
        </div>

        <div class="charts-container">
          <div class="chart-item">
            <h3>储能容量趋势</h3>
            <div id="storageCapacityChart" class="chart"></div>
          </div>
          <div class="chart-item">
            <h3>储能类型分布</h3>
            <div id="storageTypeChart" class="chart"></div>
          </div>
        </div>
      </div>

      <!-- 中间区域：地图 -->
      <div class="center-section">
        <!-- 储能类型选择器 -->
        <div class="resource-type-selector">
          <button v-for="(config, type) in resourceTypeConfig" :key="type"
            :class="['resource-type-btn', { active: currentResourceType === type }]"
            :style="{ '--color': config.color }"
            @click="changeResourceType(type as 'all' | 'battery' | 'pumped' | 'thermal')">
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

      <!-- 右侧区域：储能详情和预警信息 -->
      <div class="right-section">
        <div class="storage-detail-container">
          <h3>重点储能设施</h3>
          <div class="storage-list">
            <div class="storage-item" v-for="storage in storageList" :key="storage.id">
              <div class="storage-header">
                <span class="storage-name">{{ storage.name }}</span>
                <span :class="['storage-status', storage.status]">{{ storage.statusText }}</span>
              </div>
              <div class="storage-info">
                <div class="info-item">
                  <span class="info-label">容量：</span>
                  <span class="info-value">{{ storage.capacity }}MW</span>
                </div>
                <div class="info-item">
                  <span class="info-label">SOC：</span>
                  <span class="info-value">{{ storage.soc }}%</span>
                </div>
                <div class="info-item">
                  <span class="info-label">效率：</span>
                  <span class="info-value">{{ storage.efficiency }}%</span>
                </div>
                <div class="info-item">
                  <span class="info-label">类型：</span>
                  <span class="info-value">{{ storage.type }}</span>
                </div>
              </div>
              <div class="soc-bar">
                <div :class="['soc-fill', storage.status]" :style="{ width: storage.soc + '%' }"></div>
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
const currentResourceType = ref<'all' | 'battery' | 'pumped' | 'thermal'>('all')

// 资源类型配置
const resourceTypeConfig = {
  all: { name: '全部储能', color: '#8A2BE2', icon: '🔋' },
  battery: { name: '电池储能', color: '#9932CC', icon: '🔋' },
  pumped: { name: '抽水储能', color: '#4B0082', icon: '💧' },
  thermal: { name: '热能储能', color: '#FF6347', icon: '🔥' }
}

// 图表实例
let storageCapacityChart: any = null
let storageTypeChart: any = null

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
const totalStorages = ref(8)
const normalStorages = ref(6)
const warningStorages = ref(2)
const totalCapacity = ref(150)

// 储能设施列表数据
const storageList = ref([
  {
    id: 1,
    name: '古夫储能站',
    capacity: 50,
    soc: 78,
    efficiency: 85,
    type: '电池储能',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 2,
    name: '昭君抽水蓄能',
    capacity: 80,
    soc: 45,
    efficiency: 75,
    type: '抽水储能',
    status: 'normal',
    statusText: '正常'
  },
  {
    id: 3,
    name: '峡口热能储能',
    capacity: 20,
    soc: 25,
    efficiency: 65,
    type: '热能储能',
    status: 'warning',
    statusText: '需要关注'
  },
  {
    id: 4,
    name: '南阳储能站',
    capacity: 30,
    soc: 15,
    efficiency: 80,
    type: '电池储能',
    status: 'warning',
    statusText: '需要关注'
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
      content: '南阳储能站SOC已达15%，建议充电',
      minutesOffset: 0
    },
    {
      id: 2,
      level: 'warning',
      levelText: '黄色预警',
      content: '峡口热能储能效率偏低，建议检查',
      minutesOffset: 75
    },
    {
      id: 3,
      level: 'attention',
      levelText: '橙色预警',
      content: '预计未来12小时有强降雨，各储能站点需做好防潮准备',
      minutesOffset: 150
    },
    {
      id: 4,
      level: 'normal',
      levelText: '一般通知',
      content: '古夫储能站例行维护已完成',
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

    // 创建储能设施标记
    updateStorageMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('储能地图加载完成')
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
const changeResourceType = (type: 'all' | 'battery' | 'pumped' | 'thermal') => {
  currentResourceType.value = type
  updateStorageMarkers()
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

// 更新储能设施标记
const updateStorageMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 模拟储能设施数据
  const storages = [
    { id: 1, name: '古夫储能站', type: 'battery', coordinates: [110.79, 31.17], status: 'normal', capacity: 50, soc: 78, efficiency: 85 },
    { id: 2, name: '昭君抽水蓄能', type: 'pumped', coordinates: [110.68, 31.09], status: 'normal', capacity: 80, soc: 45, efficiency: 75 },
    { id: 3, name: '峡口热能储能', type: 'thermal', coordinates: [110.72, 31.01], status: 'warning', capacity: 20, soc: 25, efficiency: 65 },
    { id: 4, name: '南阳储能站', type: 'battery', coordinates: [110.94, 31.21], status: 'warning', capacity: 30, soc: 15, efficiency: 80 },
    { id: 5, name: '高桥储能站', type: 'battery', coordinates: [110.60, 31.00], status: 'normal', capacity: 25, soc: 65, efficiency: 82 },
    { id: 6, name: '榛子储能站', type: 'thermal', coordinates: [110.85, 31.30], status: 'normal', capacity: 15, soc: 55, efficiency: 68 },
    { id: 7, name: '水月寺储能站', type: 'battery', coordinates: [110.92, 31.10], status: 'normal', capacity: 35, soc: 70, efficiency: 83 },
    { id: 8, name: '黄粮储能站', type: 'battery', coordinates: [110.75, 31.15], status: 'normal', capacity: 40, soc: 80, efficiency: 86 }
  ]

  // 过滤储能设施数据
  const filteredStorages = currentResourceType.value === 'all'
    ? storages
    : storages.filter(storage => storage.type === currentResourceType.value)

  // 为每个储能设施创建标记
  filteredStorages.forEach((storage, index) => {
    // 根据储能类型和状态设置不同颜色的图标
    let iconColor = '#00B42A' // 默认正常绿色
    if (storage.status === 'attention') {
      iconColor = '#FF7D00' // 注意黄色
    } else if (storage.status === 'warning') {
      iconColor = '#F53F3F' // 警告红色
    }

    // 获取资源类型对应的图标字符和配置
    const config = resourceTypeConfig[storage.type as keyof typeof resourceTypeConfig]
    const iconMap = {
      battery: '🔋',
      pumped: '💧',
      thermal: '🔥'
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
          ${iconMap[storage.type as keyof typeof iconMap]}
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
          ${storage.name}
        </div>
      </div>
    `

    const marker = new (AMap as any).Marker({
      position: storage.coordinates,
      content: iconContent,
      zIndex: 100 + index,
      offset: new (AMap as any).Pixel(-20, -20)
    })

    // 绑定点击事件 - 显示信息窗口
    marker.on('click', (e: any) => {
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }
      showInfoWindow(storage, marker)
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
    markers.set(`${storage.type}-${storage.id}`, marker)
  })
}

// 显示信息窗口
const showInfoWindow = (storage: any, marker: any) => {
  if (!mapInstance) return

  // 根据类型添加资源信息
  let resourceTypeInfo = ''
  if (storage.type === 'battery') {
    resourceTypeInfo = '类型: 电池储能'
  } else if (storage.type === 'pumped') {
    resourceTypeInfo = '类型: 抽水蓄能'
  } else if (storage.type === 'thermal') {
    resourceTypeInfo = '类型: 热能储能'
  } else {
    resourceTypeInfo = '类型: 储能资源'
  }

  const infoWindow = new (AMap as any).InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${storage.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">${resourceTypeInfo}</p>
          <p class="resource-status">状态: <span style="color: ${storage.status === 'normal' ? '#00B42A' : storage.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${storage.status === 'normal' ? '正常' : storage.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-capacity">装机容量: ${storage.capacity}MW</p>
          <p class="resource-efficiency">效率: ${storage.efficiency}%</p>
          <p class="resource-soc">SOC: ${storage.soc}%</p>
          <p class="resource-coordinates">坐标: ${storage.coordinates[0].toFixed(4)}, ${storage.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new (AMap as any).Size(320, 200),
    offset: new (AMap as any).Pixel(0, -50)
  })

  infoWindow.open(mapInstance, storage.coordinates)
}

// 创建信息窗口内容 - 为了兼容原有代码结构保留此函数名，但内部调用showInfoWindow
const createInfoWindowContent = (storage: any) => {
  // 这里返回的内容实际上不会被使用，因为我们在点击事件中直接调用了showInfoWindow
  return ''
}

// 初始化储能容量趋势图表
const initStorageCapacityChart = () => {
  const chartDom = document.getElementById('storageCapacityChart')
  if (!chartDom) return

  storageCapacityChart = echarts.init(chartDom)
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
      data: ['SOC均值', '效率均值'],
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
      name: '百分比(%)',
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
        name: 'SOC均值',
        type: 'line',
        stack: '总量',
        data: [65, 62, 58, 50, 45, 52, 50],
        lineStyle: {
          color: '#8A2BE2'
        },
        itemStyle: {
          color: '#8A2BE2'
        }
      },
      {
        name: '效率均值',
        type: 'line',
        stack: '总量',
        data: [82, 83, 81, 79, 78, 80, 79],
        lineStyle: {
          color: '#4facfe'
        },
        itemStyle: {
          color: '#4facfe'
        }
      }
    ]
  }

  storageCapacityChart.setOption(option)
}

// 初始化储能类型分布图表
const initStorageTypeChart = () => {
  const chartDom = document.getElementById('storageTypeChart')
  if (!chartDom) return

  storageTypeChart = echarts.init(chartDom)
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
        color: '#ffffff'
      }
    },
    series: [
      {
        name: '储能类型',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { name: '电池储能', value: 150, itemStyle: { color: '#8A2BE2' } },
          { name: '抽水储能', value: 80, itemStyle: { color: '#4B0082' } },
          { name: '热能储能', value: 35, itemStyle: { color: '#FF6347' } },
          { name: '其他储能', value: 10, itemStyle: { color: '#DDA0DD' } }
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

  storageTypeChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  initStorageCapacityChart()
  initStorageTypeChart()
}

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (storageCapacityChart) storageCapacityChart.resize()
  if (storageTypeChart) storageTypeChart.resize()

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 刷新数据
const refreshData = () => {
  // 这里可以添加刷新数据的逻辑
  console.log('刷新储能数据')
  // 模拟数据更新
  storageList.value.forEach(storage => {
    if (storage.status === 'warning') {
      storage.soc += Math.random() * 5 - 2.5
      storage.soc = Math.max(0, Math.min(100, storage.soc))
    }
  })

  // 重新渲染图表
  if (storageCapacityChart) {
    const option = storageCapacityChart.getOption()
    if (option && option.series) {
      // 模拟更新图表数据
      const series = option.series as any[]
      series.forEach((s, index) => {
        if (s.data && s.data.length > 0) {
          const lastValue = s.data[s.data.length - 1]
          s.data[s.data.length - 1] = lastValue + (Math.random() * 5 - 2.5)
        }
      })
      storageCapacityChart.setOption(option)
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
  if (storageCapacityChart) storageCapacityChart.dispose()
  if (storageTypeChart) storageTypeChart.dispose()

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.energy-storage-container {
  padding: 0;
  min-height: 100%;
  background-color: #0D1136;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  background: rgba(138, 43, 226, 0.8);
  color: #fff;
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-refresh:hover {
  background: rgba(138, 43, 226, 1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
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
  box-shadow: 0 5px 15px rgba(138, 43, 226, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #8A2BE2 0%, #9932CC 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.storage-icon {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
}

.normal-icon {
  background: linear-gradient(135deg, var(--success-color) 0%, #7FFF00 100%);
}

.warning-icon {
  background: linear-gradient(135deg, var(--warning-color) 0%, var(--warning-hover) 100%);
}

.capacity-icon {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
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
  background: rgba(138, 43, 226, 0.2);
  color: white;
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s ease;
}

.map-controls button:hover {
  background: rgba(138, 43, 226, 0.4);
  box-shadow: 0 2px 8px rgba(138, 43, 226, 0.2);
}

.layer-switch-container {
  display: flex;
  gap: 5px;
}

.layer-btn {
  flex: 1;
}

.layer-btn.active {
  background: rgba(138, 43, 226, 0.6);
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

.storage-detail-container,
.warning-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.storage-detail-container h3,
.warning-container h3 {
  margin: 0 0 15px 0;
  color: var(--info-color);
  font-size: 16px;
  font-weight: 600;
}

.storage-list,
.warning-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.storage-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 12px;
  transition: all 0.3s ease;
}

.storage-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(138, 43, 226, 0.2);
  background: rgba(255, 255, 255, 0.08);
}

.storage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.storage-name {
  font-weight: bold;
  color: #fff;
  font-size: 14px;
}

.storage-status {
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.storage-status.normal {
  background: var(--success-color);
}

.storage-status.attention {
  background: var(--warning-color);
}

.storage-status.warning {
  background: var(--danger-color);
}

.storage-info {
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

.soc-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.soc-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.soc-fill.normal {
  background: #00B42A;
}

.soc-fill.attention {
  background: #FF7D00;
}

.soc-fill.warning {
  background: #F53F3F;
}

.warning-item {
  padding: 12px 15px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid var(--primary-color);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.warning-item:hover {
  background: rgba(138, 43, 226, 0.1);
  transform: translateX(5px);
  box-shadow: 0 3px 10px rgba(138, 43, 226, 0.2);
  border-left: 3px solid var(--primary-hover);
}

.warning-time {
  color: #aaa;
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
  color: #00B42A;
}

.warning-type.attention {
  color: #FF7D00;
}

.warning-type.warning {
  color: #F53F3F;
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
