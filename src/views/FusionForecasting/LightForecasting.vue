
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
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

// 地图相关变量
const mapRef = ref<HTMLDivElement | null>(null)
let mapInstance: any = null
let AMap: AMapInstance | null = null
let markers: Map<string, any> = new Map() // 存储地图标记实例
let normalLayer: any = null
let satelliteLayer: any = null
// 当前地图图层类型
const currentMapLayer = ref<'normal' | 'satellite'>('normal')

// 区域特定数据 - 灯光预测专用数据
const regionSpecificData = {
  '古夫镇': {
    lightTypeData: [
      { name: '道路照明', value: 45, color: '#FFD700' },
      { name: '公共场所', value: 30, color: '#FF9E01' },
      { name: '景观照明', value: 25, color: '#FF6B6B' }
    ],
    lightIntensityData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [85, 70, 20, 10, 15, 10, 30, 75]
    },
    energyConsumptionData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [210, 195, 205, 200, 230, 240, 220],
      forecast: [205, 190, 200, 195, 225, 235, 215]
    },
    lightCoverageData: [
      { name: '主要道路', value: 95 },
      { name: '次要道路', value: 85 },
      { name: '背街小巷', value: 75 },
      { name: '公园广场', value: 90 },
      { name: '社区区域', value: 80 }
    ]
  },
  '昭君镇': {
    lightTypeData: [
      { name: '道路照明', value: 40, color: '#FFD700' },
      { name: '公共场所', value: 35, color: '#FF9E01' },
      { name: '景观照明', value: 25, color: '#FF6B6B' }
    ],
    lightIntensityData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [80, 65, 15, 8, 12, 8, 25, 70]
    },
    energyConsumptionData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [180, 165, 175, 170, 200, 210, 190],
      forecast: [175, 160, 170, 165, 195, 205, 185]
    },
    lightCoverageData: [
      { name: '主要道路', value: 92 },
      { name: '次要道路', value: 82 },
      { name: '背街小巷', value: 72 },
      { name: '公园广场', value: 88 },
      { name: '社区区域', value: 78 }
    ]
  },
  '峡口镇': {
    lightTypeData: [
      { name: '道路照明', value: 48, color: '#FFD700' },
      { name: '公共场所', value: 28, color: '#FF9E01' },
      { name: '景观照明', value: 24, color: '#FF6B6B' }
    ],
    lightIntensityData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      intensity: [88, 72, 22, 12, 18, 12, 32, 78]
    },
    energyConsumptionData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [220, 205, 215, 210, 240, 250, 230],
      forecast: [215, 200, 210, 205, 235, 245, 225]
    },
    lightCoverageData: [
      { name: '主要道路', value: 96 },
      { name: '次要道路', value: 88 },
      { name: '背街小巷', value: 78 },
      { name: '公园广场', value: 92 },
      { name: '社区区域', value: 82 }
    ]
  }
}

// 定义灯光数据类型接口
interface LightItem {
  name: string;
  count: number;
  brightness: number;
  energyEfficiency?: number;
  status?: number;
  coordinates: number[];
}

interface LightDataType {
  street: LightItem[];
  public: LightItem[];
  landscape: LightItem[];
  [key: string]: LightItem[];
}

// 详细的灯光数据评估
const lightData: LightDataType = {
  // 道路照明数据
  street: [
    { name: '古夫镇', count: 120, brightness: 85, energyEfficiency: 75, coordinates: [110.79, 31.17] },
    { name: '昭君镇', count: 95, brightness: 80, energyEfficiency: 78, coordinates: [110.68, 31.09] },
    { name: '峡口镇', count: 110, brightness: 88, energyEfficiency: 72, coordinates: [110.72, 31.01] },
    { name: '南阳镇', count: 70, brightness: 75, energyEfficiency: 70, coordinates: [110.94, 31.21] },
    { name: '黄粮镇', count: 85, brightness: 82, energyEfficiency: 76, coordinates: [110.86, 31.12] },
    { name: '水月寺镇', count: 65, brightness: 78, energyEfficiency: 73, coordinates: [111.02, 31.07] },
    { name: '高桥乡', count: 55, brightness: 72, energyEfficiency: 68, coordinates: [110.61, 31.01] },
    { name: '榛子乡', count: 60, brightness: 70, energyEfficiency: 65, coordinates: [110.93, 31.33] }
  ],
  // 公共场所照明数据
  public: [
    { name: '古夫镇', count: 45, brightness: 90, energyEfficiency: 68, coordinates: [110.78, 31.16] },
    { name: '昭君镇', count: 38, brightness: 88, energyEfficiency: 70, coordinates: [110.67, 31.10] },
    { name: '峡口镇', count: 42, brightness: 92, energyEfficiency: 66, coordinates: [110.71, 31.02] },
    { name: '南阳镇', count: 30, brightness: 85, energyEfficiency: 65, coordinates: [110.93, 31.20] },
    { name: '黄粮镇', count: 35, brightness: 87, energyEfficiency: 67, coordinates: [110.85, 31.11] },
    { name: '水月寺镇', count: 28, brightness: 83, energyEfficiency: 64, coordinates: [111.01, 31.08] },
    { name: '高桥乡', count: 25, brightness: 80, energyEfficiency: 63, coordinates: [110.62, 31.00] },
    { name: '榛子乡', count: 22, brightness: 78, energyEfficiency: 62, coordinates: [110.92, 31.32] }
  ],
  // 景观照明数据
  landscape: [
    { name: '古夫镇', count: 30, brightness: 95, energyEfficiency: 60, coordinates: [110.77, 31.15] },
    { name: '昭君镇', count: 25, brightness: 92, energyEfficiency: 62, coordinates: [110.66, 31.09] },
    { name: '峡口镇', count: 28, brightness: 96, energyEfficiency: 58, coordinates: [110.70, 31.03] },
    { name: '南阳镇', count: 15, brightness: 90, energyEfficiency: 55, coordinates: [110.92, 31.22] },
    { name: '黄粮镇', count: 20, brightness: 91, energyEfficiency: 57, coordinates: [110.84, 31.13] },
    { name: '水月寺镇', count: 18, brightness: 88, energyEfficiency: 56, coordinates: [111.00, 31.09] },
    { name: '高桥乡', count: 12, brightness: 85, energyEfficiency: 54, coordinates: [110.63, 31.02] },
    { name: '榛子乡', count: 10, brightness: 82, energyEfficiency: 53, coordinates: [110.91, 31.31] }
  ]
}

// 当前显示的灯光类型
const currentLightType = ref<keyof LightTypeConfigs>('street')

// 灯光类型配置接口
interface LightTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface LightTypeConfigs {
  street: LightTypeConfig;
  public: LightTypeConfig;
  landscape: LightTypeConfig;
  [key: string]: LightTypeConfig;
}

// 灯光类型配置
const lightTypeConfig: LightTypeConfigs = {
  street: { name: '道路照明', color: '#FFD700', unit: '盏', field: 'count', icon: '💡' },
  public: { name: '公共场所照明', color: '#FF9E01', unit: '盏', field: 'count', icon: '🏢' },
  landscape: { name: '景观照明', color: '#FF6B6B', unit: '盏', field: 'count', icon: '✨' }
}

// 灯光类型数据
let lightTypeData = [
  { name: '道路照明', value: 45, color: '#FFD700' },
  { name: '公共场所', value: 30, color: '#FF9E01' },
  { name: '景观照明', value: 25, color: '#FF6B6B' }
]

// 灯光强度数据
let lightIntensityData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  intensity: [85, 70, 20, 10, 15, 10, 30, 75]
}

// 能源消耗数据
let energyConsumptionData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  actual: [210, 195, 205, 200, 230, 240, 220],
  forecast: [205, 190, 200, 195, 225, 235, 215]
}

// 灯光覆盖数据
let lightCoverageData = [
  { name: '主要道路', value: 95 },
  { name: '次要道路', value: 85 },
  { name: '背街小巷', value: 75 },
  { name: '公园广场', value: 90 },
  { name: '社区区域', value: 80 }
]

// 原始数据备份
const originalData = {
  lightTypeData: JSON.parse(JSON.stringify(lightTypeData)),
  lightIntensityData: JSON.parse(JSON.stringify(lightIntensityData)),
  energyConsumptionData: JSON.parse(JSON.stringify(energyConsumptionData)),
  lightCoverageData: JSON.parse(JSON.stringify(lightCoverageData))
}

// 初始化所有图表
const initCharts = () => {
  initLightTypeChart()
  initLightIntensityChart()
  initEnergyConsumptionChart()
  initLightCoverageChart()
}

// 初始化灯光类型图表
const initLightTypeChart = () => {
  const chart = echarts.init(document.getElementById('lightTypeChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: lightTypeData.map(item => item.color),
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
        name: '灯光类型分布',
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
        data: lightTypeData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化灯光强度图表
const initLightIntensityChart = () => {
  const chart = echarts.init(document.getElementById('lightIntensityChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: lightIntensityData.time,
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
        name: '灯光强度',
        type: 'line',
        data: lightIntensityData.intensity,
        smooth: true,
        lineStyle: {
          color: '#FFD700',
          width: 3
        },
        itemStyle: {
          color: '#FFD700',
          borderColor: '#FFD700',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 215, 0, 0.5)' },
            { offset: 1, color: 'rgba(255, 215, 0, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化能源消耗图表
const initEnergyConsumptionChart = () => {
  const chart = echarts.init(document.getElementById('energyConsumptionChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['实际消耗', '预测消耗'],
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
      data: energyConsumptionData.time,
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
        name: '实际消耗',
        type: 'bar',
        data: energyConsumptionData.actual,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FF9E01' },
            { offset: 1, color: '#FFD700' }
          ])
        }
      },
      {
        name: '预测消耗',
        type: 'line',
        data: energyConsumptionData.forecast,
        smooth: true,
        lineStyle: {
          color: '#FF6B6B',
          width: 2
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化灯光覆盖图表
const initLightCoverageChart = () => {
  const chart = echarts.init(document.getElementById('lightCoverageChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
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
      data: lightCoverageData.map(item => item.name),
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
        name: '覆盖度',
        type: 'bar',
        data: lightCoverageData.map(item => item.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#4facfe' },
            { offset: 1, color: '#00f2fe' }
          ]),
          borderRadius: [4, 4, 0, 0]
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
      zoom: 10,
      mapStyle: 'amap://styles/darkblue', // 使用深色地图样式，更适合显示灯光数据
    })

    // 添加基础控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar())

    // 创建并管理图层
    normalLayer = new (AMap.TileLayer as any)()
    satelliteLayer = new (AMap.TileLayer.Satellite as any)()

    // 初始显示标准图层
    normalLayer.setMap(mapInstance)
    // 添加灯光站点标记
    updateLightMarkers()

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

// 添加灯光站点标记
const updateLightMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  const config = lightTypeConfig[currentLightType.value]
  const data = lightData[currentLightType.value]

  // 为每个站点添加标记
  data.forEach((item: LightItem, index: number) => {
    if (item.count > 0) { // 只有当站点数量大于0时才显示标记
      // 创建自定义HTML标记，模拟灯光效果
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
            box-shadow: 0 0 20px ${config.color};
            animation: pulse 2s infinite;
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
      markers.set(`${currentLightType.value}-${item.name}`, marker)
    }
  })
}

// 创建信息窗口内容
const createInfoWindowContent = (item: any, config: any) => {
  // 根据不同灯光类型显示不同的详细信息
  let detailInfo = ''
  if (currentLightType.value === 'street') {
    detailInfo = `
      <p><strong>路灯数量:</strong> ${item.count}盏</p>
      <p><strong>平均亮度:</strong> ${item.brightness}%</p>
      <p><strong>能源效率:</strong> ${item.energyEfficiency}%</p>
    `
  } else if (currentLightType.value === 'public') {
    detailInfo = `
      <p><strong>照明设施数量:</strong> ${item.count}盏</p>
      <p><strong>平均亮度:</strong> ${item.brightness}%</p>
      <p><strong>能源效率:</strong> ${item.energyEfficiency}%</p>
    `
  } else if (currentLightType.value === 'landscape') {
    detailInfo = `
      <p><strong>景观灯数量:</strong> ${item.count}盏</p>
      <p><strong>平均亮度:</strong> ${item.brightness}%</p>
      <p><strong>能源效率:</strong> ${item.energyEfficiency}%</p>
    `
  }

  return `
    <div class="custom-info-window" style="padding: 12px; background-color: rgba(255, 255, 255, 0.95); border: 1px solid ${config.color};">
      <div class="info-window-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">${config.icon} ${item.name}${config.name}</h3>
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

// 切换灯光类型
const changeLightType = (type: keyof LightTypeConfigs) => {
  currentLightType.value = type
  updateLightMarkers()
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
}

// 更新所有图表数据
const updateAllCharts = () => {
  // 根据选中的区域获取对应的数据
  const regionData = selectedRegion.value ? regionSpecificData[selectedRegion.value as keyof typeof regionSpecificData] : null
  
  if (regionData) {
    // 更新各数据集
    lightTypeData = JSON.parse(JSON.stringify(regionData.lightTypeData))
    lightIntensityData = JSON.parse(JSON.stringify(regionData.lightIntensityData))
    energyConsumptionData = JSON.parse(JSON.stringify(regionData.energyConsumptionData))
    lightCoverageData = JSON.parse(JSON.stringify(regionData.lightCoverageData))
  } else {
    // 恢复原始数据
    lightTypeData = JSON.parse(JSON.stringify(originalData.lightTypeData))
    lightIntensityData = JSON.parse(JSON.stringify(originalData.lightIntensityData))
    energyConsumptionData = JSON.parse(JSON.stringify(originalData.energyConsumptionData))
    lightCoverageData = JSON.parse(JSON.stringify(originalData.lightCoverageData))
  }
  
  // 重新渲染所有图表
  renderAllCharts()
}

// 重新渲染所有图表
const renderAllCharts = () => {
  initLightTypeChart()
  initLightIntensityChart()
  initEnergyConsumptionChart()
  initLightCoverageChart()
}

// 监听选中区域变化
watch(selectedRegion, () => {
  // 这里可以添加额外的处理逻辑
})

// 监听灯光类型变化，更新标记
watch(currentLightType, () => {
  updateLightMarkers()
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

<template>
  <div class="light-forecasting-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-area">
        <!-- 今日照明预测卡片 -->
        <div class="forecast-card">
          <h2 class="card-title">今日照明预测</h2>
          <div class="forecast-value">
            <span class="value">228</span>
            <span class="unit">千瓦时</span>
          </div>
          <div class="forecast-details">
            <span class="detail-item">较昨日 <span class="decrease">-2.5%</span></span>
            <span class="detail-item">较上周 <span class="increase">+3.8%</span></span>
          </div>
        </div>

        <!-- 中心布局容器 -->
        <div class="center-layout">
          <!-- 左侧内容 -->
          <div class="left-content">
            <!-- 灯光类型分析和灯光强度 -->
            <div class="stats-grid">
              <!-- 灯光类型分析 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>灯光类型分析</h3>
                </div>
                <div class="stat-content">
                  <div class="resource-item" v-for="resource in lightTypeData" :key="resource.name">
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

              <!-- 灯光强度 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>灯光强度变化</h3>
                </div>
                <div class="stat-content">
                  <div id="lightIntensityChart" class="chart-container"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 兴山县灯光分布地图 -->
          <div class="map-card">
            <!-- 灯光类型选择器 -->
            <div class="light-type-selector">
              <button v-for="(config, type) in lightTypeConfig" :key="type"
                :class="['light-type-btn', { active: currentLightType === type }]"
                :style="{ '--color': config.color }" @click="changeLightType(type)">
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
              <!-- 灯光类型分布图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>灯光类型分布</h3>
                  <div class="chart-tabs">
                    <button class="tab-btn active">按比例</button>
                  </div>
                </div>
                <div id="lightTypeChart" class="chart-container"></div>
              </div>

              <!-- 能源消耗监测图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>能源消耗监测</h3>
                </div>
                <div id="energyConsumptionChart" class="chart-container"></div>
              </div>

              <!-- 一排显示的图表 -->
              <div class="charts-row">
                <!-- 灯光覆盖图表 -->
                <div class="chart-card row-chart">
                  <div class="chart-header">
                    <h3>灯光覆盖情况</h3>
                  </div>
                  <div id="lightCoverageChart" class="chart-container row-chart-container"></div>
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
.light-forecasting-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1B2A 0%, #2D2E46 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 添加灯光脉冲动画 */
@keyframes pulse {
  0% {
    box-shadow: 0 0 5px var(--color, #FFD700), 0 0 10px var(--color, #FFD700);
  }
  50% {
    box-shadow: 0 0 20px var(--color, #FFD700), 0 0 30px var(--color, #FFD700);
  }
  100% {
    box-shadow: 0 0 5px var(--color, #FFD700), 0 0 10px var(--color, #FFD700);
  }
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

/* 今日照明预测卡片 */
.forecast-card {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  background: linear-gradient(45deg, #FFD700, #FF9E01);
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

/* 灯光类型分析内容 */
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
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  width: 100%;
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

/* 灯光类型选择器样式 */
.light-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  justify-content: center;
}

.light-type-btn {
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

.light-type-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.light-type-btn:hover::before {
  left: 100%;
}

.light-type-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.light-type-btn.active {
  background: var(--color);
  color: #fff;
  border-color: var(--color);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
}

/* 自定义标记样式 */
:deep(.custom-marker) {
  transition: all 0.3s ease;
}

:deep(.custom-marker:hover .marker-icon) {
  transform: scale(1.2) !important;
  animation-duration: 1s !important;
}

:deep(.custom-marker:hover .marker-label) {
  display: block !important;
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
  background: #FFD700;
  color: #000;
  border-color: #FFD700;
}

.chart-container {
  width: 100%;
  height: 250px;
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
}

@media (max-width: 1024px) {
  .map-card {
    width: 100%;
  }

  #map {
    height: 450px;
  }

  .light-type-selector {
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
  .charts-row {
    width: 100%;
    margin-left: 0;
  }
}
</style>
