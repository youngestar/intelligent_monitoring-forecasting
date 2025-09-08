<template>
  <div class="dispatch-plan-container">
    <div class="header-title">
      <h1 class="main-title">资源调度分布图</h1>
      <div class="date-display">{{ currentDate }}</div>
    </div>
    <div class="main-content">
      <!-- 地图主体区域 -->
      <div class="map-area">
        <div ref="mapRef" class="map-content"></div>
      </div>
      <!-- 资源调度图表面板 -->
      <div class="charts-panel">
        <div class="panel-header">
          <h3>资源调度分析</h3>
        </div>
        <div class="charts-container">
          <!-- 资源分布图表 -->
          <div class="chart-item">
            <h4>各类资源分布占比</h4>
            <div ref="resourceDistributionChartRef" class="chart"></div>
          </div>
          <!-- 发电能力图表 -->
          <div class="chart-item">
            <h4>各电站发电能力对比</h4>
            <div ref="powerGenerationChartRef" class="chart"></div>
          </div>
          <!-- 调度效率图表 -->
          <div class="chart-item">
            <h4>调度效率分析</h4>
            <div ref="dispatchEfficiencyChartRef" class="chart"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMapStore } from '@/stores/map'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'

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

declare global {
  interface Window {
    AMap: AMapInstance
  }
}

// 地图DOM引用
const mapRef = ref<HTMLDivElement | null>(null)
// 图表DOM引用
const resourceDistributionChartRef = ref<HTMLDivElement | null>(null)
const powerGenerationChartRef = ref<HTMLDivElement | null>(null)
const dispatchEfficiencyChartRef = ref<HTMLDivElement | null>(null)

let mapInstance: any = null
let AMap: AMapInstance | null = null
let markers: Map<string, any> = new Map()

// 图表实例
let resourceDistributionChart: any = null
let powerGenerationChart: any = null
let dispatchEfficiencyChart: any = null

// 使用Pinia store
const mapStore = useMapStore()

// 当前日期
const currentDate = ref('')

// 更新当前日期
const updateCurrentDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  currentDate.value = `${year}-${month}-${day}`
}

// 组件挂载后初始化地图
onMounted(() => {
  updateCurrentDate()
  initMap()
  window.addEventListener('resize', handleWindowResize)
})

// 组件卸载前销毁地图实例
onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  markers.clear()
  window.removeEventListener('resize', handleWindowResize)
})

// 初始化地图
const initMap = async () => {
  try {
    await loadAMapAPI()
    if (!AMap || !mapRef.value) return

    // 创建地图实例 - 使用2D视图确保稳定显示
    mapInstance = new AMap.Map(mapRef.value, {
      center: mapStore.mapConfig.center,
      zoom: mapStore.mapConfig.zoom,
      viewMode: '2D', // 明确使用2D模式以确保稳定显示
      terrain: false,
      showLabel: true,
      rotateEnable: true,
      pitchEnable: false, // 在2D模式下禁用倾斜
      defaultCursor: 'grab',
      draggingCursor: 'grabbing'
    })

    // 添加地图控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar({
      position: 'RB'
    }))
    mapInstance.addControl(new AMap.MapType({
      defaultType: 0,
      showRoad: true
    }))

    // 手动添加标准图层确保显示地名等信息
    let normalLayer = new AMap.TileLayer() // 使用标准地图图层
    normalLayer.setMap(mapInstance)
    console.log('标准图层已添加并显示')

    // 加载并添加所有预设电站标记
    await addAllPowerStations()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('调度方案地图加载完成')
    })
  } catch (error) {
    console.error('地图初始化失败:', error)
    if (mapRef.value) {
      mapRef.value.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #f00;">
          <div>
            <h3>地图加载失败</h3>
            <p>请检查网络连接是否正常</p>
          </div>
        </div>
      `
    }
  }
}

// 加载高德地图API
const loadAMapAPI = (): Promise<AMapInstance> => {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      AMap = window.AMap
      resolve(AMap)
      return
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    // 使用配置的API密钥
    script.src = `https://webapi.amap.com/maps?v=2.0&key=86e53e2c27b8d346a9bceb5b88c3bba1&plugin=AMap.Scale,AMap.ToolBar,AMap.MapType,AMap.TileLayer,AMap.TileLayer.Satellite`
    script.onload = () => {
      AMap = window.AMap
      resolve(AMap)
    }
    script.onerror = (error) => {
      reject(new Error('高德地图API加载失败: ' + (error instanceof Error ? error.message : '未知错误')))
    }
    document.head.appendChild(script)
  })
}

// 添加所有电站标记
const addAllPowerStations = async () => {
  // 调用store中的方法添加所有预设地点
  await mapStore.addAllPresetLocations()
  // 遍历store中的所有标记并添加到地图上
  mapStore.selectedMarkers.forEach(marker => {
    addMarkerToMap(marker)
  })
}

// 添加标记到地图
const addMarkerToMap = (markerData: any) => {
  if (!AMap || !mapInstance) return

  const { coordinates, name, color = '#4facfe', isActive = false, type = 'default', description } = markerData

  // 根据资源类型设置不同的图标
  let iconSymbol = '⚡' // 默认电力图标
  if (type.includes('hydro') || type.includes('water')) {
    iconSymbol = '💧' // 水电资源图标
  } else if (type.includes('solar') || type.includes('photovoltaic')) {
    iconSymbol = '☀️' // 光伏资源图标
  } else if (type.includes('wind')) {
    iconSymbol = '💨' // 风电资源图标
  } else if (type.includes('storage')) {
    iconSymbol = '🔋' // 储能资源图标
  } else if (type.includes('substation')) {
    iconSymbol = '🏭' // 变电站图标
  }

  // 创建自定义HTML标记
  const iconContent = `
    <div class="custom-marker" style="position: relative; display: inline-block;">
      <div class="marker-icon" style="
        background-color: ${color};
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.3s ease;
        transform: ${isActive ? 'scale(1.2)' : 'scale(1)'}
      ">
        ${iconSymbol}
      </div>
      ${isActive ? `
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
          ${name}
        </div>
      ` : ''}
    </div>
  `

  const marker = new AMap.Marker({
    position: coordinates,
    content: iconContent,
    zIndex: isActive ? 1000 : 100,
    offset: new AMap.Pixel(-18, -18)
  })

  // 绑定点击事件
  marker.on('click', () => {
    mapStore.selectLocation(markerData)
    // 更新标记样式
    updateMarkerStyles(markerData.id, true)
    // 显示信息窗口
    showInfoWindow(markerData, marker)
    // 更新图表数据
    updateChartsByMarker(markerData)
  })

  marker.setMap(mapInstance)
  markers.set(markerData.id, marker)
}

// 更新标记样式
const updateMarkerStyles = (id: string, isActive: boolean) => {
  const marker = markers.get(id)
  if (!marker) return

  // 获取标记数据
  const markerData = mapStore.selectedMarkers.find(m => m.id === id)
  if (!markerData) return

  const { name, color = '#4facfe', type = 'default' } = markerData

  // 根据资源类型设置不同的图标
  let iconSymbol = '⚡' // 默认电力图标
  if (type.includes('hydro') || type.includes('water')) {
    iconSymbol = '💧' // 水电资源图标
  } else if (type.includes('solar') || type.includes('photovoltaic')) {
    iconSymbol = '☀️' // 光伏资源图标
  } else if (type.includes('wind')) {
    iconSymbol = '💨' // 风电资源图标
  } else if (type.includes('storage')) {
    iconSymbol = '🔋' // 储能资源图标
  }

  const iconContent = `
    <div class="custom-marker" style="position: relative; display: inline-block;">
      <div class="marker-icon" style="
        background-color: ${color};
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.3s ease;
        transform: ${isActive ? 'scale(1.2)' : 'scale(1)'}
      ">
        ${iconSymbol}
      </div>
      ${isActive ? `
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
          ${name}
        </div>
      ` : ''}
    </div>
  `

  marker.setContent(iconContent)
  marker.setzIndex(isActive ? 1000 : 100)
}

// 显示信息窗口
const showInfoWindow = (markerData: any, marker: any) => {
  if (!AMap || !mapInstance) return

  const { name, coordinates, description, type = 'default', capacity = '-' } = markerData

  // 根据类型添加资源信息
  let resourceTypeInfo = ''
  if (type.includes('hydro') || type.includes('water')) {
    resourceTypeInfo = '类型: 水电资源'
  } else if (type.includes('solar') || type.includes('photovoltaic')) {
    resourceTypeInfo = '类型: 光伏资源'
  } else if (type.includes('wind')) {
    resourceTypeInfo = '类型: 风电资源'
  } else if (type.includes('storage')) {
    resourceTypeInfo = '类型: 储能资源'
  } else if (type.includes('substation')) {
    resourceTypeInfo = '类型: 变电站'
  } else {
    resourceTypeInfo = '类型: 电力资源'
  }

  const infoWindow = new AMap.InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">${resourceTypeInfo}</p>
          <p class="capacity">装机容量: ${capacity}</p>
          <p class="coordinates">坐标: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}</p>
          ${description ? `<p class="description">${description}</p>` : ''}
        </div>
      </div>
    `,
    isCustom: true,
    autoMove: true,
    offset: new AMap.Pixel(0, -30)
  })

  infoWindow.open(mapInstance, marker.getPosition())
}

// 处理窗口大小变化
const handleWindowResize = () => {
  if (mapInstance) {
    mapInstance.resize()
  }
  // 调整图表大小
  if (resourceDistributionChart) {
    resourceDistributionChart.resize()
  }
  if (powerGenerationChart) {
    powerGenerationChart.resize()
  }
  if (dispatchEfficiencyChart) {
    dispatchEfficiencyChart.resize()
  }
}

// 根据标记更新图表数据
const updateChartsByMarker = (markerData: any) => {
  if (!markerData) return

  const { name, type, capacity } = markerData

  // 提取数字容量值
  const capacityValue = typeof capacity === 'string' && capacity.includes('MW')
    ? parseFloat(capacity)
    : (typeof capacity === 'number' ? capacity : 0)

  // 根据资源类型获取相关数据
  let typeData = {
    name: '电力资源',
    color: '#4facfe',
    relatedStations: []
  }

  if (type.includes('hydro') || type.includes('water')) {
    typeData = {
      name: '水电',
      color: '#4facfe',
      relatedStations: [
        { name: '古洞口', capacity: 120 },
        { name: '南阳河', capacity: 85 },
        { name: '白沙河', capacity: 90 },
        { name: '高岚河', capacity: 65 },
        { name: '平邑口', capacity: 75 },
        { name: '龙门河', capacity: 50 }
      ]
    }
  } else if (type.includes('solar') || type.includes('photovoltaic')) {
    typeData = {
      name: '光伏',
      color: '#00f2fe',
      relatedStations: [
        { name: '东津光伏', capacity: 100 },
        { name: '襄州光伏', capacity: 80 },
        { name: '老河口光伏', capacity: 60 },
        { name: '枣阳光伏', capacity: 40 },
        { name: '谷城光伏', capacity: 35 }
      ]
    }
  } else if (type.includes('wind')) {
    typeData = {
      name: '风电',
      color: '#a8edea',
      relatedStations: [
        { name: '丹江口风电', capacity: 70 },
        { name: '保康风电', capacity: 55 },
        { name: '南漳风电', capacity: 45 }
      ]
    }
  } else if (type.includes('storage')) {
    typeData = {
      name: '储能',
      color: '#fed6e3',
      relatedStations: [
        { name: '市区储能', capacity: 30 },
        { name: '襄州储能', capacity: 25 },
        { name: '老河口储能', capacity: 20 }
      ]
    }
  } else if (type.includes('substation')) {
    typeData = {
      name: '变电站',
      color: '#ff9a8b',
      relatedStations: [
        { name: '襄阳变电站', capacity: 200 },
        { name: '樊城变电站', capacity: 180 },
        { name: '襄城变电站', capacity: 160 }
      ]
    }
  }

  // 更新资源分布图表
  if (resourceDistributionChart) {
    const resourceOption = {
      series: [{
        data: [
          { value: type.includes('hydro') || type.includes('water') ? 60 : 45, name: '水电', itemStyle: { color: '#4facfe' } },
          { value: type.includes('solar') || type.includes('photovoltaic') ? 40 : 25, name: '光伏', itemStyle: { color: '#00f2fe' } },
          { value: type.includes('wind') ? 30 : 20, name: '风电', itemStyle: { color: '#a8edea' } },
          { value: type.includes('storage') ? 20 : 10, name: '储能', itemStyle: { color: '#fed6e3' } },
          { value: type.includes('substation') ? 15 : 0, name: '变电站', itemStyle: { color: '#ff9a8b' } }
        ].filter(item => item.value > 0)
      }]
    }
    resourceDistributionChart.setOption(resourceOption)
  }

  // 更新发电能力图表
  if (powerGenerationChart) {
    const stationNames = typeData.relatedStations.map(station => station.name)
    const capacities = typeData.relatedStations.map(station => station.capacity)

    const powerOption = {
      title: {
        text: `${typeData.name}电站发电能力`,
        left: 'center',
        textStyle: {
          color: '#fff',
          fontSize: 14
        }
      },
      xAxis: {
        data: stationNames
      },
      series: [{
        data: capacities,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: typeData.color },
            { offset: 1, color: 'rgba(0, 0, 0, 0.3)' }
          ])
        }
      }]
    }
    powerGenerationChart.setOption(powerOption)
  }

  // 更新调度效率图表
  if (dispatchEfficiencyChart) {
    // 生成与所选标记相关的模拟数据
    const baseUtilization = type.includes('hydro') ? 85 :
      type.includes('solar') ? 75 :
        type.includes('wind') ? 70 :
          type.includes('storage') ? 90 : 80

    const baseResponse = type.includes('hydro') ? 90 :
      type.includes('solar') ? 85 :
        type.includes('wind') ? 80 :
          type.includes('storage') ? 95 : 85

    const baseStability = type.includes('hydro') ? 88 :
      type.includes('solar') ? 82 :
        type.includes('wind') ? 75 :
          type.includes('storage') ? 92 : 80

    // 生成6个月的数据
    const generateData = (base: number) => {
      return Array.from({ length: 6 }, (_, i) => {
        const variation = Math.random() * 10 - 5 // -5% 到 +5% 的随机变化
        return Math.max(0, Math.min(100, base + variation))
      })
    }

    const efficiencyOption = {
      title: {
        text: `${name}调度效率分析`,
        left: 'center',
        textStyle: {
          color: '#fff',
          fontSize: 14
        }
      },
      series: [
        {
          data: generateData(baseUtilization)
        },
        {
          data: generateData(baseResponse)
        },
        {
          data: generateData(baseStability)
        }
      ]
    }
    dispatchEfficiencyChart.setOption(efficiencyOption)
  }
}

// 初始化资源分布图表
const initResourceDistributionChart = () => {
  if (!resourceDistributionChartRef.value) return

  try {
    // 检查DOM元素宽高
    if (!resourceDistributionChartRef.value.clientWidth || !resourceDistributionChartRef.value.clientHeight) {
      console.warn('资源分布图表DOM宽高为0，稍后重试')
      setTimeout(initResourceDistributionChart, 200)
      return
    }

    // 设置默认宽高
    resourceDistributionChartRef.value.style.width = '100%'
    resourceDistributionChartRef.value.style.height = '250px'

    // 初始化图表
    resourceDistributionChart = echarts.init(resourceDistributionChartRef.value)

    // 配置图表选项
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        data: ['水电', '光伏', '风电', '储能'],
        textStyle: {
          color: '#fff'
        }
      },
      series: [
        {
          name: '资源分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '40%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#0D1136',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '16',
              fontWeight: 'bold',
              color: '#fff'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            {
              value: 45,
              name: '水电',
              itemStyle: { color: '#4facfe' }
            },
            {
              value: 25,
              name: '光伏',
              itemStyle: { color: '#00f2fe' }
            },
            {
              value: 20,
              name: '风电',
              itemStyle: { color: '#a8edea' }
            },
            {
              value: 10,
              name: '储能',
              itemStyle: { color: '#fed6e3' }
            }
          ]
        }
      ]
    }

    // 设置图表选项
    resourceDistributionChart.setOption(option)
  } catch (error) {
    console.error('资源分布图表初始化失败:', error)
    setTimeout(initResourceDistributionChart, 500)
  }
}

// 初始化发电能力图表
const initPowerGenerationChart = () => {
  if (!powerGenerationChartRef.value) return

  try {
    // 检查DOM元素宽高
    if (!powerGenerationChartRef.value.clientWidth || !powerGenerationChartRef.value.clientHeight) {
      console.warn('发电能力图表DOM宽高为0，稍后重试')
      setTimeout(initPowerGenerationChart, 200)
      return
    }

    // 设置默认宽高
    powerGenerationChartRef.value.style.width = '100%'
    powerGenerationChartRef.value.style.height = '250px'

    // 初始化图表
    powerGenerationChart = echarts.init(powerGenerationChartRef.value)

    // 配置图表选项
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
        data: ['古洞口', '南阳河', '白沙河', '高岚河', '平邑口', '龙门河'],
        axisLabel: {
          color: '#fff',
          rotate: 45
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: '装机容量(MW)',
        nameTextStyle: {
          color: '#fff'
        },
        axisLabel: {
          color: '#fff'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      series: [
        {
          name: '装机容量',
          type: 'bar',
          data: [120, 85, 90, 65, 75, 50],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4facfe' },
              { offset: 1, color: '#00f2fe' }
            ])
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: '#4facfe' },
                { offset: 1, color: '#00f2fe' }
              ]),
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }

    // 设置图表选项
    powerGenerationChart.setOption(option)
  } catch (error) {
    console.error('发电能力图表初始化失败:', error)
    setTimeout(initPowerGenerationChart, 500)
  }
}

// 初始化调度效率图表
const initDispatchEfficiencyChart = () => {
  if (!dispatchEfficiencyChartRef.value) return

  try {
    // 检查DOM元素宽高
    if (!dispatchEfficiencyChartRef.value.clientWidth || !dispatchEfficiencyChartRef.value.clientHeight) {
      console.warn('调度效率图表DOM宽高为0，稍后重试')
      setTimeout(initDispatchEfficiencyChart, 200)
      return
    }

    // 设置默认宽高
    dispatchEfficiencyChartRef.value.style.width = '100%'
    dispatchEfficiencyChartRef.value.style.height = '250px'

    // 初始化图表
    dispatchEfficiencyChart = echarts.init(dispatchEfficiencyChartRef.value)

    // 配置图表选项
    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['利用率', '响应时间', '稳定性'],
        textStyle: {
          color: '#fff'
        },
        bottom: 10
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
        data: ['1月', '2月', '3月', '4月', '5月', '6月'],
        axisLabel: {
          color: '#fff'
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: {
          color: '#fff',
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.3)'
          }
        }
      },
      series: [
        {
          name: '利用率',
          type: 'line',
          smooth: true,
          data: [65, 72, 78, 82, 88, 90],
          lineStyle: {
            color: '#4facfe',
            width: 3
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(79, 172, 254, 0.5)' },
              { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
            ])
          },
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#4facfe'
          }
        },
        {
          name: '响应时间',
          type: 'line',
          smooth: true,
          data: [80, 85, 83, 88, 92, 94],
          lineStyle: {
            color: '#00f2fe',
            width: 3
          },
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#00f2fe'
          }
        },
        {
          name: '稳定性',
          type: 'line',
          smooth: true,
          data: [75, 78, 82, 85, 87, 90],
          lineStyle: {
            color: '#fed6e3',
            width: 3
          },
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: {
            color: '#fed6e3'
          }
        }
      ]
    }

    // 设置图表选项
    dispatchEfficiencyChart.setOption(option)
  } catch (error) {
    console.error('调度效率图表初始化失败:', error)
    setTimeout(initDispatchEfficiencyChart, 500)
  }
}

// 初始化所有图表
const initAllCharts = () => {
  initResourceDistributionChart()
  initPowerGenerationChart()
  initDispatchEfficiencyChart()
}

// 监听地图标记变化，更新图表数据
watch(() => mapStore.selectedMarkers, (newMarkers) => {
  // 这里可以根据选中的标记更新图表数据
  console.log('标记数据更新:', newMarkers)
}, { deep: true })

// 组件挂载后初始化
onMounted(() => {
  initMap()
  // 延迟初始化图表，确保DOM已经渲染完成
  setTimeout(initAllCharts, 300)
  window.addEventListener('resize', handleWindowResize)
})

// 组件卸载前清理资源
onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  if (resourceDistributionChart) {
    resourceDistributionChart.dispose()
    resourceDistributionChart = null
  }
  if (powerGenerationChart) {
    powerGenerationChart.dispose()
    powerGenerationChart = null
  }
  if (dispatchEfficiencyChart) {
    dispatchEfficiencyChart.dispose()
    dispatchEfficiencyChart = null
  }
  markers.clear()
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped>
.dispatch-plan-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0D1136 0%, #1A2151 100%);
  color: #000;
  padding: 20px;
  box-sizing: border-box;
}

.map-header {
  text-align: center;
  margin-bottom: 20px;
}

.map-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.main-content {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.map-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.map-content {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
  position: relative;
  min-height: 0;
}

.charts-panel {
  width: 450px;
  /* 增加右栏宽度 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
  overflow-y: auto;
}

.panel-header {
  margin-bottom: 20px;
  text-align: center;
}

.panel-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #00BFFF;
}

.charts-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(0, 191, 255, 0.2);
}

.chart-item h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  color: #4facfe;
  text-align: center;
}

.chart {
  width: 100%;
  height: 250px;
  border-radius: 6px;
}

/* 自定义滚动条样式 */
.charts-panel::-webkit-scrollbar {
  width: 6px;
}

.charts-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.charts-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 191, 255, 0.5);
  border-radius: 3px;
}

.charts-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 191, 255, 0.7);
}

/* 自定义标记样式 */
:deep(.custom-marker) {
  transition: all 0.3s ease;
}

:deep(.custom-marker:hover .marker-icon) {
  transform: scale(1.2) !important;
}

/* 自定义信息窗口样式 */
:deep(.custom-info-window) {
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #4facfe;
  border-radius: 8px;
  min-width: 200px;
}

/* 标题样式 */
.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
}

.main-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #fff;
}

.date-display {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 400;
}

:deep(.info-window-header h3) {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

:deep(.info-window-content p) {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

:deep(.info-window-content .resource-type) {
  font-weight: 600;
  color: #4facfe;
}

:deep(.info-window-content .capacity) {
  font-style: italic;
}

:deep(.info-window-content .coordinates) {
  font-family: monospace;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .charts-panel {
    width: 400px;
  }
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }

  .charts-panel {
    width: 100%;
    max-height: 500px;
  }

  .map-content {
    height: 400px;
  }
}

@media (max-width: 768px) {
  .dispatch-plan-container {
    padding: 10px;
  }

  .header-title h1 {
    font-size: 20px;
  }

  .charts-panel {
    padding: 15px;
  }

  .map-content {
    height: 300px;
  }

  .chart {
    height: 200px;
  }
}
</style>
