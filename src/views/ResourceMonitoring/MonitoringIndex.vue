<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
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

// 当前能源类型
const currentEnergyType = ref<'all' | 'hydro' | 'solar' | 'wind'>('all')

// 能源类型配置
const energyTypeConfig = {
  all: { name: '全部能源', color: '#4facfe', icon: '⚡' },
  hydro: { name: '水电站', color: '#4facfe', icon: '💧' },
  solar: { name: '光伏站', color: '#ffd700', icon: '☀️' },
  wind: { name: '风电站', color: '#7fbf00', icon: '💨' }
}

// 图表实例
let distributionChart: any = null
let statusChart: any = null

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

// 当前选中的天气类型
const selectedWeatherTab = ref('weather')

// 获取真实时间的天气预报数据
const getRealTimeWeatherData = () => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  const weatherData = [
    { tempLow: 18, tempHigh: 28, icon: '' },
    { tempLow: 17, tempHigh: 27, icon: '' },
    { tempLow: 16, tempHigh: 26, icon: '' },
    { tempLow: 18, tempHigh: 29, icon: '' },
    { tempLow: 19, tempHigh: 28, icon: '' },
    { tempLow: 17, tempHigh: 26, icon: '' },
    { tempLow: 16, tempHigh: 25, icon: '' }
  ]

  return weatherData.map((weather, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    const dayName = index === 0 ? '今天' : weekdays[date.getDay()]
    return { ...weather, day: dayName }
  })
}

const weatherForecastData = ref(getRealTimeWeatherData())

// 生成基于当前时间的预警信息
const generateStrategyInfo = () => {
  const now = new Date();
  const strategyContents = [
    { id: 1, type: '特殊事件', content: '防汛期间，密切关注雨情变化', minutesOffset: 0 },
    { id: 2, type: '自动预警', content: '预测未来12小时有强降雨，请注意防范', minutesOffset: 120 },
    { id: 3, type: '调度指令', content: '各电站做好蓄水准备，应对即将到来的降雨', minutesOffset: 300 },
    { id: 4, type: '日常维护', content: '设备例行检查已完成，无异常情况', minutesOffset: 600 }
  ];

  return strategyContents.map(item => {
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

// 策略信息 - 从实时时间开始
const strategyInfo = ref(generateStrategyInfo())

// 当前滚动位置
const scrollPosition = ref(0)
const scrollInterval = ref<number | null>(null)

// 无限滚动效果
const startScrolling = () => {
  const container = document.querySelector('.strategy-list') as HTMLElement
  if (!container) return

  const scrollSpeed = 20 // 滚动速度
  const pauseTime = 3000 // 每滚动一项后暂停的时间(毫秒)
  let currentIndex = 0

  scrollInterval.value = window.setInterval(() => {
    const items = container.querySelectorAll('.strategy-item')
    if (items.length === 0) return

    // 计算下一个滚动位置
    currentIndex = (currentIndex + 1) % items.length
    const nextItem = items[currentIndex] as HTMLElement

    // 平滑滚动到下一项
    container.scrollTo({
      top: nextItem.offsetTop - 10, // 减去一些偏移量以更好地显示
      behavior: 'smooth'
    })
  }, pauseTime)
}

// 停止滚动
const stopScrolling = () => {
  if (scrollInterval.value) {
    clearInterval(scrollInterval.value)
    scrollInterval.value = null
  }
}

// 组件挂载时启动滚动
onMounted(() => {
  initCharts()
  initMap()
  window.addEventListener('resize', handleResize)
  setTimeout(startScrolling, 1000) // 延迟1秒启动滚动，确保DOM已加载完成
})

// 组件卸载时清理
onUnmounted(() => {
  // 销毁图表实例
  if (distributionChart) distributionChart.dispose()
  if (statusChart) statusChart.dispose()

  // 停止滚动
  stopScrolling()

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})

// 电站状态数据
const stationStatusData = {
  total: 25,
  normal: 22,
  attention: 2,
  warning: 1
}

// 电站详细数据
const stationDetailData = {
  '古夫镇水电': { capacity: 125, generation: 85, load: 68 },
  '昭君镇光伏': { capacity: 38, generation: 35, load: 92 },
  '峡口镇风电': { capacity: 25, generation: 20, load: 80 },
  '南阳镇水电': { capacity: 35, generation: 30, load: 85 },
  '黄粮镇光伏': { capacity: 25, generation: 22, load: 88 },
  '水月寺风电': { capacity: 42, generation: 30, load: 71 },
  '高桥乡水电': { capacity: 50, generation: 45, load: 90 },
  '榛子乡风电': { capacity: 30, generation: 25, load: 83 }
}

// 统计数据
const statisticalData = [
  { name: '水电站', count: 8, capacity: 450 },
  { name: '光伏站', count: 12, capacity: 180 },
  { name: '风电', count: 5, capacity: 100 },
  { name: '储能站', count: 3, capacity: 60 }
]

// 电站运行数据
const stationOperationData = [
  { name: '古夫镇水电', status: '正常', capacity: '125MW', generation: '85MW', load: '68%' },
  { name: '昭君镇光伏', status: '正常', capacity: '38MW', generation: '35MW', load: '92%' },
  { name: '峡口镇风电', status: '正常', capacity: '25MW', generation: '20MW', load: '80%' },
  { name: '南阳镇水电', status: '注意', capacity: '35MW', generation: '30MW', load: '85%' },
  { name: '黄粮镇光伏', status: '正常', capacity: '25MW', generation: '22MW', load: '88%' },
  { name: '水月寺风电', status: '警告', capacity: '42MW', generation: '30MW', load: '71%' }
]

// 切换天气选项卡
const switchWeatherTab = (tab: string) => {
  selectedWeatherTab.value = tab
}



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

    // 创建电站标记
    updateStationMarkers()

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

// 切换能源类型
const changeEnergyType = (type: 'all' | 'hydro' | 'solar' | 'wind') => {
  currentEnergyType.value = type
  updateStationMarkers()
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

// 更新电站标记
const updateStationMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 模拟电站数据
  const stations = [
    { name: '古夫镇水电', type: 'hydro', coordinates: [110.79, 31.17], status: 'normal' },
    { name: '昭君镇光伏', type: 'solar', coordinates: [110.68, 31.09], status: 'normal' },
    { name: '峡口镇风电', type: 'wind', coordinates: [110.72, 31.01], status: 'normal' },
    { name: '南阳镇水电', type: 'hydro', coordinates: [110.94, 31.21], status: 'attention' },
    { name: '黄粮镇光伏', type: 'solar', coordinates: [110.86, 31.12], status: 'normal' },
    { name: '水月寺风电', type: 'wind', coordinates: [111.02, 31.07], status: 'warning' },
    { name: '高桥乡水电', type: 'hydro', coordinates: [110.61, 31.01], status: 'normal' },
    { name: '榛子乡风电', type: 'wind', coordinates: [110.93, 31.33], status: 'normal' }
  ]

  // 过滤电站数据
  const filteredStations = currentEnergyType.value === 'all'
    ? stations
    : stations.filter(station => station.type === currentEnergyType.value)

  // 为每个电站创建标记
  filteredStations.forEach((station, index) => {
    // 根据电站类型和状态设置不同颜色的图标
    let iconColor = '#00B42A' // 默认正常绿色
    if (station.status === 'attention') {
      iconColor = '#FF7D00' // 注意黄色
    } else if (station.status === 'warning') {
      iconColor = '#F53F3F' // 警告红色
    }

    // 获取电站类型对应的图标字符和配置
    const config = energyTypeConfig[station.type as keyof typeof energyTypeConfig]

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
          opacity: 0;
          transition: opacity 0.3s ease;
        ">
          ${station.name}
        </div>
      </div>
    `

    const marker = new (AMap as any).Marker({
      position: station.coordinates,
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
        content: createInfoWindowContent(station),
        size: new (AMap as any).Size(300, 200),
        offset: new (AMap as any).Pixel(0, -50)
      })

      infoWindow.open(mapInstance, station.coordinates)
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
    markers.set(`${station.type}-${station.name}`, marker)
  })
}

// 创建信息窗口内容
const createInfoWindowContent = (station: any) => {
  const details = stationDetailData[station.name] || { capacity: 0, generation: 0, load: 0 }

  return `
    <div style="padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);">
      <h3 style="margin-top: 0; color: #000000; font-size: 16px; margin-bottom: 10px;">${station.name}</h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>类型：</strong>${station.type === 'hydro' ? '水电站' : station.type === 'solar' ? '光伏站' : '风电站'}</p>
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>状态：</strong><span style="color: ${station.status === 'normal' ? '#00B42A' : station.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${station.status === 'normal' ? '正常' : station.status === 'attention' ? '注意' : '警告'}</span></p>
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>装机容量：</strong>${details.capacity}MW</p>
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>当前发电：</strong>${details.generation}MW</p>
        <p style="margin: 0; color: #333; font-size: 14px;"><strong>负载率：</strong>${details.load}%</p>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
        <button style="padding: 6px 12px; background: #4facfe; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">查看详情</button>
      </div>
    </div>
  `
}

// 初始化分布统计图表
const initDistributionChart = () => {
  const chartDom = document.getElementById('distributionChart')
  if (!chartDom) return

  distributionChart = echarts.init(chartDom)
  const option: EChartsOption = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    title: {
      text: '资源分布统计',
      textStyle: {
        color: '#36CFC9',
        fontSize: 16,
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
        name: '电站数量',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: statisticalData.map(item => ({ name: item.name, value: item.count })),
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

  distributionChart.setOption(option)
}

// 初始化状态图表
const initStatusChart = () => {
  const chartDom = document.getElementById('statusChart')
  if (!chartDom) return

  statusChart = echarts.init(chartDom)
  const option: EChartsOption = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    title: {
      text: '电站运行状态',
      textStyle: {
        color: '#36CFC9',
        fontSize: 16,
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
        name: '运行状态',
        type: 'pie',
        radius: '60%',
        center: ['50%', '60%'],
        data: [
          { name: '正常', value: stationStatusData.normal, itemStyle: { color: '#00B42A' } },
          { name: '注意', value: stationStatusData.attention, itemStyle: { color: '#FF7D00' } },
          { name: '警告', value: stationStatusData.warning, itemStyle: { color: '#F53F3F' } }
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

  statusChart.setOption(option)
}

// 初始化所有图表
const initCharts = () => {
  initDistributionChart()
  initStatusChart()
}

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (distributionChart) distributionChart.resize()
  if (statusChart) statusChart.resize()

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize()
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
  if (distributionChart) distributionChart.dispose()
  if (statusChart) statusChart.dispose()

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="monitoring-container">
    <!-- 左侧导航已删除 -->

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 内容区域 -->
      <div class="content-area">
        <!-- 左侧区域：统计图表和表格 -->
        <div class="left-section">
          <div class="charts-container">
            <div class="chart-item">
              <div id="distributionChart" class="chart"></div>
            </div>
            <div class="chart-item">
              <div id="statusChart" class="chart"></div>
            </div>
          </div>
          <div class="table-container">
            <div class="table-header">
              <h3>当前电站运行状态监控</h3>
              <div class="table-controls">
                <button class="btn-refresh">刷新</button>
                <button class="btn-filter">筛选</button>
              </div>
            </div>
            <table class="operation-table">
              <thead>
                <tr>
                  <th>站名</th>
                  <th>状态</th>
                  <th>装机容量</th>
                  <th>当前发电</th>
                  <th>负载率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="station in stationOperationData" :key="station.name">
                  <td>{{ station.name }}</td>
                  <td>
                    <span
                      :class="['status-dot', station.status === '正常' ? 'normal' : station.status === '注意' ? 'attention' : 'warning']"></span>
                    {{ station.status }}
                  </td>
                  <td>{{ station.capacity }}</td>
                  <td>{{ station.generation }}</td>
                  <td>{{ station.load }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 中间区域：地图 -->
        <div class="center-section">
          <!-- 能源类型选择器 -->
          <div class="energy-type-selector">
            <button v-for="(config, type) in energyTypeConfig" :key="type"
              :class="['energy-type-btn', { active: currentEnergyType === type }]" :style="{ '--color': config.color }"
              @click="changeEnergyType(type as 'all' | 'hydro' | 'solar' | 'wind')">
              {{ config.name }}
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

        <!-- 右侧区域：天气预报和策略信息 -->
        <div class="right-section">
          <div class="weather-container">
            <h3>天气预报</h3>
            <div class="weather-forecast">
              <div class="weather-item" v-for="weather in weatherForecastData" :key="weather.day">
                <div class="weather-day">{{ weather.day }}</div>
                <div class="weather-icon">
                  <!-- 天气图标占位 -->
                </div>
                <div class="weather-temp">{{ weather.tempLow }}°/{{ weather.tempHigh }}°</div>
              </div>
            </div>
            <div class="temperature-chart">
              <!-- 简化的温度曲线图 -->
              <div class="chart-lines"></div>
              <div class="temp-labels">
                <span>13°</span><span>15°</span><span>16°</span><span>17°</span><span>19°</span><span>17°</span><span>16°</span>
              </div>
              <div class="weather-icons">
                <!-- 天气图标占位 -->
                <span class="weather-icon-text">雨</span>
                <span class="weather-icon-text">雨</span>
                <span class="weather-icon-text">晴</span>
                <span class="weather-icon-text">多云</span>
                <span class="weather-icon-text">雨</span>
                <span class="weather-icon-text">晴</span>
                <span class="weather-icon-text">晴</span>
              </div>
            </div>
          </div>
          <div class="strategy-container">
            <h3>告警信息</h3>
            <div class="strategy-list" @mouseenter="stopScrolling" @mouseleave="startScrolling">
              <div class="strategy-item" v-for="info in strategyInfo" :key="info.id">
                <div class="strategy-time">{{ info.time }}</div>
                <div class="strategy-content">
                  <span class="strategy-type">{{ info.type }}</span>
                  <span>{{ info.content }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.monitoring-container {
  width: 100%;
  height: 100vh;
  background-color: #1a1a2e;
  color: #fff;
  overflow: hidden;
}

/* 左侧导航样式 */
.side-nav {
  width: 180px;
  background-color: #16213e;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.logo-container {
  padding: 20px;
  text-align: center;
  border-bottom: 1px solid #333;
}

.logo {
  width: 120px;
  height: auto;
}

.side-nav nav {
  flex: 1;
  padding: 20px 0;
}

.side-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.side-nav li {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.side-nav>nav>ul>li>span {
  display: block;
  padding: 15px 20px;
  font-size: 14px;
}

.side-nav li:hover {
  background-color: #1e3a8a;
}

.side-nav li.active {
  background-color: #36CFC9;
  color: #000;
  font-weight: bold;
}

.sub-menu {
  display: none;
  background-color: #1e3a8a;
  font-size: 12px;
}

.side-nav li:hover .sub-menu {
  display: block;
}

.sub-menu li {
  padding: 10px 30px;
}

.sub-menu li:hover {
  background-color: #36CFC9;
  color: #000;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background-color: #16213e;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.weather-tabs {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.weather-tabs li {
  padding: 8px 16px;
  margin-right: 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.weather-tabs li:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.weather-tabs li.active {
  background-color: #36CFC9;
  color: #000;
  font-weight: bold;
}



/* 内容区域样式 */
.content-area {
  flex: 1;
  display: flex;
  gap: 15px;
  padding: 15px;
  overflow: hidden;
}

/* 左侧区域样式 */
.left-section {
  width: 30%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chart-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart {
  width: 100%;
  height: 200px;
}

.table-container {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.table-header h3 {
  margin: 0;
  color: #36CFC9;
  font-size: 16px;
}

.table-controls {
  display: flex;
  gap: 10px;
}

.btn-refresh,
.btn-filter {
  padding: 5px 10px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.operation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.operation-table th,
.operation-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.operation-table th {
  background-color: rgba(255, 255, 255, 0.1);
  font-weight: bold;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}

.status-dot.normal {
  background-color: #00B42A;
}

.status-dot.attention {
  background-color: #FF7D00;
}

.status-dot.warning {
  background-color: #F53F3F;
}

/* 中间区域样式 */
.center-section {
  color: #000;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.map {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  margin: 10px 0;
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
  box-shadow: 0 0 10px rgba(79, 172, 254, 0.5);
}

/* 地图控制按钮样式 */
.map-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
}

.map-controls .el-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  padding: 5px 10px;
  font-size: 12px;
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

/* 自定义标记样式 */
:deep(.custom-marker) {
  transition: all 0.3s ease;
}

:deep(.custom-marker:hover .marker-icon) {
  transform: scale(1.2) !important;
}

:deep(.custom-marker:hover .marker-label) {
  opacity: 1 !important;
}

/* 右侧区域样式 */
.right-section {
  width: 25%;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.weather-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.weather-container h3 {
  margin: 0 0 15px 0;
  color: #36CFC9;
  font-size: 16px;
}

.weather-forecast {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 15px;
}

.weather-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 10px;
  width: 30%;
}

.weather-day {
  font-size: 12px;
  margin-bottom: 5px;
}

.weather-icon img {
  width: 30px;
  height: 30px;
  margin-bottom: 5px;
}

.weather-temp {
  font-size: 12px;
  color: #aaa;
}

.temperature-chart {
  position: relative;
  height: 100px;
}

.chart-lines {
  height: 40px;
  background-image: linear-gradient(to right, transparent 0%, rgba(54, 207, 201, 0.2) 50%, transparent 100%);
  margin-bottom: 10px;
}

.temp-labels,
.weather-icons {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 5px;
}

.weather-icon-text {
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  margin: 0 2px;
  font-size: 12px;
  color: #333;
}

.strategy-container {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.strategy-container h3 {
  margin: 0 0 15px 0;
  color: #36CFC9;
  font-size: 16px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  position: relative;
  padding-bottom: 8px;
}

.strategy-container h3::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #36CFC9, transparent);
}

.strategy-list {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(54, 207, 201, 0.5) transparent;
  transition: all 0.3s ease;
}

.strategy-list::-webkit-scrollbar {
  width: 6px;
}

.strategy-list::-webkit-scrollbar-track {
  background: transparent;
}

.strategy-list::-webkit-scrollbar-thumb {
  background: rgba(54, 207, 201, 0.5);
  border-radius: 3px;
  transition: background 0.3s ease;
}

.strategy-list::-webkit-scrollbar-thumb:hover {
  background: rgba(54, 207, 201, 0.8);
}

.strategy-item {
  padding: 12px 15px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid #36CFC9;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.strategy-item:hover {
  background: linear-gradient(135deg, rgba(54, 207, 201, 0.1) 0%, rgba(54, 207, 201, 0.05) 100%);
  transform: translateX(5px);
  box-shadow: 0 3px 10px rgba(54, 207, 201, 0.2);
}

.strategy-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(54, 207, 201, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.strategy-item:hover::before {
  transform: translateX(100%);
}

.strategy-time {
  color: #aaa;
  margin-bottom: 6px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.strategy-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.strategy-type {
  color: #36CFC9;
  font-weight: bold;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 根据类型显示不同颜色 */
.strategy-item:nth-child(4n+1) {
  border-left-color: #36CFC9;
}

.strategy-item:nth-child(4n+2) {
  border-left-color: #FF7D00;
}

.strategy-item:nth-child(4n+2) .strategy-type {
  color: #FF7D00;
}

.strategy-item:nth-child(4n+3) {
  border-left-color: #F53F3F;
}

.strategy-item:nth-child(4n+3) .strategy-type {
  color: #F53F3F;
}

.strategy-item:nth-child(4n+4) {
  border-left-color: #00B42A;
}

.strategy-item:nth-child(4n+4) .strategy-type {
  color: #00B42A;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .content-area {
    flex-direction: column;
  }

  .left-section,
  .right-section {
    width: 100%;
  }

  .center-section {
    order: -1;
  }

  .charts-container {
    flex-direction: row;
  }

  .chart-item {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .side-nav {
    width: 60px;
  }

  .logo-container,
  .side-nav span {
    display: none;
  }

  .weather-tabs {
    flex-wrap: wrap;
  }

  .weather-tabs li {
    margin-bottom: 5px;
  }

  .charts-container {
    flex-direction: column;
  }
}
</style>
