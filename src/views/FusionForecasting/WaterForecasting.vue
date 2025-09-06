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

// 区域特定数据 - 水资源预测专用数据
const regionSpecificData = {
  '古夫镇': {
    waterSourceData: [
      { name: '地表水', value: 60, color: '#4facfe' },
      { name: '地下水', value: 30, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [120, 118, 116, 115, 117, 119, 121, 120.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [8500, 8300, 8400, 8600, 8700, 8200, 8100],
      forecast: [8400, 8200, 8300, 8500, 8600, 8100, 8000]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.5, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.2, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.15, standard: 0 - 0.5 },
      { name: 'COD', value: 12, standard: 0 - 30 },
      { name: '总磷', value: 0.08, standard: 0 - 0.2 }
    ]
  },
  '昭君镇': {
    waterSourceData: [
      { name: '地表水', value: 55, color: '#4facfe' },
      { name: '地下水', value: 35, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [118, 116, 114, 113, 115, 117, 119, 118.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [7800, 7600, 7700, 7900, 8000, 7500, 7400],
      forecast: [7700, 7500, 7600, 7800, 7900, 7400, 7300]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.4, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.0, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.16, standard: 0 - 0.5 },
      { name: 'COD', value: 13, standard: 0 - 30 },
      { name: '总磷', value: 0.09, standard: 0 - 0.2 }
    ]
  },
  '峡口镇': {
    waterSourceData: [
      { name: '地表水', value: 65, color: '#4facfe' },
      { name: '地下水', value: 25, color: '#00f2fe' },
      { name: '其他水源', value: 10, color: '#00a2ff' }
    ],
    waterLevelData: {
      time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
      level: [122, 120, 118, 117, 119, 121, 123, 122.5]
    },
    waterUsageData: {
      time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      actual: [9000, 8800, 8900, 9100, 9200, 8700, 8600],
      forecast: [8900, 8700, 8800, 9000, 9100, 8600, 8500]
    },
    waterQualityData: [
      { name: 'PH值', value: 7.6, standard: 6.5 - 8.5 },
      { name: '溶解氧', value: 8.3, standard: 5 - 14.6 },
      { name: '氨氮', value: 0.14, standard: 0 - 0.5 },
      { name: 'COD', value: 11, standard: 0 - 30 },
      { name: '总磷', value: 0.07, standard: 0 - 0.2 }
    ]
  }
}

// 定义水资源数据类型接口
interface WaterItem {
  name: string;
  storage: number;
  flow: number;
  quality: number;
  status?: number;
  coordinates: number[];
}

interface WaterDataType {
  river: WaterItem[];
  reservoir: WaterItem[];
  well: WaterItem[];
  [key: string]: WaterItem[];
}

// 详细的水资源数据评估
const waterData: WaterDataType = {
  // 河流数据
  river: [
    { name: '古夫河', storage: 12500, flow: 120, quality: 92, coordinates: [110.78, 31.18] },
    { name: '香溪河', storage: 9800, flow: 95, quality: 88, coordinates: [110.69, 31.10] },
    { name: '峡口河', storage: 11200, flow: 110, quality: 94, coordinates: [110.73, 31.02] },
    { name: '南阳河', storage: 8500, flow: 85, quality: 86, coordinates: [110.95, 31.22] },
    { name: '黄粮河', storage: 9200, flow: 90, quality: 89, coordinates: [110.87, 31.13] },
    { name: '水月寺河', storage: 8100, flow: 80, quality: 87, coordinates: [111.03, 31.08] },
    { name: '高桥河', storage: 7500, flow: 75, quality: 85, coordinates: [110.60, 31.00] },
    { name: '榛子河', storage: 7800, flow: 78, quality: 84, coordinates: [110.94, 31.34] }
  ],
  // 水库数据
  reservoir: [
    { name: '香溪河水库', storage: 55000, flow: 250, quality: 95, coordinates: [110.79, 31.15] },
    { name: '昭君水库', storage: 42000, flow: 220, quality: 93, coordinates: [110.67, 31.08] },
    { name: '峡口水库', storage: 52000, flow: 240, quality: 96, coordinates: [110.71, 31.04] },
    { name: '南阳水库', storage: 35000, flow: 180, quality: 92, coordinates: [110.96, 31.20] },
    { name: '黄粮水库', storage: 38000, flow: 190, quality: 93, coordinates: [110.85, 31.11] },
    { name: '水月寺水库', storage: 32000, flow: 170, quality: 91, coordinates: [111.01, 31.09] },
    { name: '高桥水库', storage: 30000, flow: 160, quality: 90, coordinates: [110.62, 31.01] },
    { name: '榛子水库', storage: 28000, flow: 150, quality: 89, coordinates: [110.92, 31.32] }
  ],
  // 水井数据
  well: [
    { name: '古夫镇水井', storage: 8500, flow: 45, quality: 90, coordinates: [110.77, 31.16] },
    { name: '昭君镇水井', storage: 7800, flow: 42, quality: 89, coordinates: [110.66, 31.09] },
    { name: '峡口镇水井', storage: 8200, flow: 44, quality: 91, coordinates: [110.70, 31.03] },
    { name: '南阳镇水井', storage: 6500, flow: 38, quality: 88, coordinates: [110.94, 31.21] },
    { name: '黄粮镇水井', storage: 7200, flow: 40, quality: 89, coordinates: [110.86, 31.12] },
    { name: '水月寺镇水井', storage: 6200, flow: 37, quality: 87, coordinates: [111.02, 31.07] },
    { name: '高桥乡水井', storage: 5800, flow: 35, quality: 86, coordinates: [110.61, 31.02] },
    { name: '榛子乡水井', storage: 5500, flow: 34, quality: 85, coordinates: [110.93, 31.33] }
  ]
}

// 当前显示的水资源类型
const currentWaterType = ref<keyof WaterTypeConfigs>('river')

// 水资源类型配置接口
interface WaterTypeConfig {
  name: string;
  color: string;
  unit: string;
  field: string;
  icon: string;
}

interface WaterTypeConfigs {
  river: WaterTypeConfig;
  reservoir: WaterTypeConfig;
  well: WaterTypeConfig;
  [key: string]: WaterTypeConfig;
}

// 水资源类型配置
const waterTypeConfig: WaterTypeConfigs = {
  river: { name: '河流', color: '#4facfe', unit: '万立方米', field: 'storage', icon: '🌊' },
  reservoir: { name: '水库', color: '#00f2fe', unit: '万立方米', field: 'storage', icon: '🏞️' },
  well: { name: '水井', color: '#00a2ff', unit: '万立方米', field: 'storage', icon: '💧' }
}

// 水源类型数据
let waterSourceData = [
  { name: '地表水', value: 60, color: '#4facfe' },
  { name: '地下水', value: 30, color: '#00f2fe' },
  { name: '其他水源', value: 10, color: '#00a2ff' }
]

// 水位数据
let waterLevelData = {
  time: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  level: [120, 118, 116, 115, 117, 119, 121, 120.5]
}

// 用水量数据
let waterUsageData = {
  time: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  actual: [8500, 8300, 8400, 8600, 8700, 8200, 8100],
  forecast: [8400, 8200, 8300, 8500, 8600, 8100, 8000]
}

// 水质数据
let waterQualityData = [
  { name: 'PH值', value: 7.5, standard: '6.5-8.5' },
  { name: '溶解氧', value: 8.2, standard: '5-14.6' },
  { name: '氨氮', value: 0.15, standard: '0-0.5' },
  { name: 'COD', value: 12, standard: '0-30' },
  { name: '总磷', value: 0.08, standard: '0-0.2' }
]

// 原始数据备份
const originalData = {
  waterSourceData: JSON.parse(JSON.stringify(waterSourceData)),
  waterLevelData: JSON.parse(JSON.stringify(waterLevelData)),
  waterUsageData: JSON.parse(JSON.stringify(waterUsageData)),
  waterQualityData: JSON.parse(JSON.stringify(waterQualityData))
}

// 初始化所有图表
const initCharts = () => {
  initWaterSourceChart()
  initWaterLevelChart()
  initWaterUsageChart()
}

// 初始化水源类型图表
const initWaterSourceChart = () => {
  const chart = echarts.init(document.getElementById('waterSourceChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: waterSourceData.map(item => item.color),
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
        name: '水源类型分布',
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
        data: waterSourceData.map(item => ({ value: item.value, name: item.name }))
      }
    ]
  }
  chart.setOption(option)
}

// 初始化水位图表
const initWaterLevelChart = () => {
  const chart = echarts.init(document.getElementById('waterLevelChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: '{b}: {c}米'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: waterLevelData.time,
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
        color: '#fff',
        formatter: '{value}m'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '水位',
        type: 'line',
        data: waterLevelData.level,
        smooth: true,
        lineStyle: {
          color: '#4facfe',
          width: 3
        },
        itemStyle: {
          color: '#4facfe',
          borderColor: '#4facfe',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(79, 172, 254, 0.5)' },
            { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
          ])
        }
      }
    ]
  }
  chart.setOption(option)
}

// 初始化用水量图表
const initWaterUsageChart = () => {
  const chart = echarts.init(document.getElementById('waterUsageChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].name + '<br/>'
        params.forEach((item: any) => {
          result += item.marker + item.seriesName + ': ' + item.value + ' 立方米<br/>'
        })
        return result
      }
    },
    legend: {
      data: ['实际用水量', '预测用水量'],
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
      boundaryGap: true,
      data: waterUsageData.time,
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
        color: '#fff',
        formatter: '{value} 立方米'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    series: [
      {
        name: '实际用水量',
        type: 'bar',
        data: waterUsageData.actual,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00f2fe' },
            { offset: 1, color: '#4facfe' }
          ])
        },
        // 设置柱状图宽度
        barWidth: '30%',
        // 设置柱状图间距
        barGap: '0%',
        barCategoryGap: '40%'
      },
      {
        name: '预测用水量',
        type: 'line',
        data: waterUsageData.forecast.map((value, index) => {
          // 为折线图数据点添加位置偏移
          return {
            value: value,
            itemStyle: {
              color: '#00a2ff'
            },
            // 向右偏移
            offset: [15, 0]
          };
        }),
        smooth: true,
        lineStyle: {
          color: '#00a2ff',
          width: 2
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
  chart.setOption(option)
}

// 初始化水质图表
const initWaterQualityChart = () => {
  const chart = echarts.init(document.getElementById('waterQualityChart') as HTMLElement)
  const option: EChartsOption = {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const item = waterQualityData.find(item => item.name === params[0].name)
        return `${params[0].name}<br/>${params[0].marker} 当前值: ${params[0].value}<br/>标准范围: ${item?.standard}`
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
      data: waterQualityData.map(item => item.name),
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
        name: '水质指标',
        type: 'bar',
        data: waterQualityData.map(item => item.value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#7fbf00' },
            { offset: 1, color: '#5fb236' }
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
      mapStyle: 'amap://styles/darkblue', // 使用深色地图样式，更适合显示水资源数据
    })

    // 添加基础控件
    mapInstance.addControl(new AMap.Scale())
    mapInstance.addControl(new AMap.ToolBar())

    // 创建并管理图层
    normalLayer = new (AMap.TileLayer as any)()
    satelliteLayer = new (AMap.TileLayer.Satellite as any)()

    // 初始显示标准图层
    normalLayer.setMap(mapInstance)
    // 添加水资源站点标记
    updateWaterMarkers()

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

// 添加水资源站点标记
const updateWaterMarkers = () => {
  if (!AMap || !mapInstance) return

  // 清除现有标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  const config = waterTypeConfig[currentWaterType.value]
  const data = waterData[currentWaterType.value]

  // 为每个站点添加标记
  data.forEach((item: WaterItem, index: number) => {
    if (item.storage > 0) { // 只有当存储量大于0时才显示标记
      // 创建自定义HTML标记，模拟水资源效果
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
            animation: waterPulse 2s infinite;
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
      markers.set(`${currentWaterType.value}-${item.name}`, marker)
    }
  })
}

// 创建信息窗口内容
const createInfoWindowContent = (item: any, config: any) => {
  // 根据不同水资源类型显示不同的详细信息
  let detailInfo = ''
  if (currentWaterType.value === 'river') {
    detailInfo = `
      <p><strong>河流储水量:</strong> ${item.storage}万立方米</p>
      <p><strong>流量:</strong> ${item.flow}立方米/秒</p>
      <p><strong>水质指数:</strong> ${item.quality}/100</p>
    `
  } else if (currentWaterType.value === 'reservoir') {
    detailInfo = `
      <p><strong>水库储水量:</strong> ${item.storage}万立方米</p>
      <p><strong>出库流量:</strong> ${item.flow}立方米/秒</p>
      <p><strong>水质指数:</strong> ${item.quality}/100</p>
    `
  } else if (currentWaterType.value === 'well') {
    detailInfo = `
      <p><strong>地下水储量:</strong> ${item.storage}万立方米</p>
      <p><strong>涌水量:</strong> ${item.flow}立方米/小时</p>
      <p><strong>水质指数:</strong> ${item.quality}/100</p>
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

// 切换水资源类型
const changeWaterType = (type: keyof WaterTypeConfigs) => {
  currentWaterType.value = type
  updateWaterMarkers()
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
    waterSourceData = JSON.parse(JSON.stringify(regionData.waterSourceData))
    waterLevelData = JSON.parse(JSON.stringify(regionData.waterLevelData))
    waterUsageData = JSON.parse(JSON.stringify(regionData.waterUsageData))
    waterQualityData = JSON.parse(JSON.stringify(regionData.waterQualityData))
  } else {
    // 恢复原始数据
    waterSourceData = JSON.parse(JSON.stringify(originalData.waterSourceData))
    waterLevelData = JSON.parse(JSON.stringify(originalData.waterLevelData))
    waterUsageData = JSON.parse(JSON.stringify(originalData.waterUsageData))
    waterQualityData = JSON.parse(JSON.stringify(originalData.waterQualityData))
  }

  // 重新渲染所有图表
  renderAllCharts()
}

// 重新渲染所有图表
const renderAllCharts = () => {
  initWaterSourceChart()
  initWaterLevelChart()
  initWaterUsageChart()
}

// 监听选中区域变化
watch(selectedRegion, () => {
  // 这里可以添加额外的处理逻辑
})

// 监听水资源类型变化，更新标记
watch(currentWaterType, () => {
  updateWaterMarkers()
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
  <div class="water-forecasting-container">
    <!-- 主要内容区域 -->
    <div class="main-content">
      <div class="content-area">
        <!-- 今日水资源预测卡片 -->
        <div class="forecast-card">
          <h2 class="card-title">今日水资源预测</h2>
          <div class="forecast-value">
            <span class="value">126.5</span>
            <span class="unit">米</span>
          </div>
          <div class="forecast-details">
            <span class="detail-item">较昨日 <span class="increase">+1.2%</span></span>
            <span class="detail-item">较上周 <span class="decrease">-0.8%</span></span>
          </div>
        </div>

        <!-- 中心布局容器 -->
        <div class="center-layout">
          <!-- 左侧内容 -->
          <div class="left-content">
            <!-- 水源类型分析和水位变化 -->
            <div class="stats-grid">
              <!-- 水源类型分析 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>水源类型分析</h3>
                </div>
                <div class="stat-content">
                  <div class="resource-item" v-for="resource in waterSourceData" :key="resource.name">
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

              <!-- 水位变化 -->
              <div class="stat-card">
                <div class="stat-header">
                  <h3>水位变化趋势</h3>
                </div>
                <div class="stat-content">
                  <div id="waterLevelChart" class="chart-container"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 兴山县水资源分布地图 -->
          <div class="map-card">
            <!-- 水资源类型选择器 -->
            <div class="water-type-selector">
              <button v-for="(config, type) in waterTypeConfig" :key="type"
                :class="['water-type-btn', { active: currentWaterType === type }]" :style="{ '--color': config.color }"
                @click="changeWaterType(type)">
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
              <!-- 水源类型分布图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>水源类型分布</h3>
                  <div class="chart-tabs">
                    <button class="tab-btn active">按比例</button>
                  </div>
                </div>
                <div id="waterSourceChart" class="chart-container"></div>
              </div>

              <!-- 用水量监测图表 -->
              <div class="chart-card">
                <div class="chart-header">
                  <h3>用水量监测</h3>
                </div>
                <div id="waterUsageChart" class="chart-container"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.water-forecasting-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1A1B2A 0%, #1E3A8A 100%);
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 添加水资源脉冲动画 */
@keyframes waterPulse {
  0% {
    box-shadow: 0 0 5px var(--color, #4facfe), 0 0 10px var(--color, #4facfe);
  }

  50% {
    box-shadow: 0 0 20px var(--color, #4facfe), 0 0 30px var(--color, #4facfe);
  }

  100% {
    box-shadow: 0 0 5px var(--color, #4facfe), 0 0 10px var(--color, #4facfe);
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

/* 今日水资源预测卡片 */
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

/* 水源类型分析内容 */
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

/* 水资源类型选择器样式 */
.water-type-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  justify-content: center;
}

.water-type-btn {
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

.water-type-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.5s;
}

.water-type-btn:hover::before {
  left: 100%;
}

.water-type-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.water-type-btn.active {
  background: var(--color);
  color: #fff;
  border-color: var(--color);
  box-shadow: 0 0 15px rgba(79, 172, 254, 0.5);
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
  background: #4facfe;
  color: #fff;
  border-color: #4facfe;
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

  .water-type-selector {
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
