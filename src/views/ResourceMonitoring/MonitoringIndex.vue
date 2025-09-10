<script setup lang="ts">
import { onMounted, onUnmounted, ref, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { ElMessage } from 'element-plus'
import axios from 'axios'



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

// 天气雷达类型配置
const weatherRadarConfig = {
  satellite: { name: '卫星云图', color: '#FF6B6B', icon: '☁️' },
  radar: { name: '雷达回波', color: '#4ECDC4', icon: '🌩️' },
  lightning: { name: '三维闪电', color: '#FFD166', icon: '⚡' }
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

// 和风天气API配置 - 从环境变量获取或使用默认值
const QWEATHER_API_KEY = import.meta.env.VITE_QWEATHER_API_KEY || 'kt78kybf36'
const QWEATHER_API_BASE_URL = import.meta.env.VITE_QWEATHER_API_BASE_URL || 'https://kt78kybf36.re.qweatherapi.com/v7' // 使用用户提供的正确API主机地址
const LOCATION_ID = '101200507' // 湖北省宜昌市兴山县的LocationID

// 天气图标映射
const weatherIconMap: Record<string, string> = {
  '100': '☀️', // 晴
  '101': '🌤️', // 多云
  '102': '⛅', // 少云
  '103': '☁️', // 晴间多云
  '104': '☁️', // 阴
  '200': '🌫️', // 薄雾
  '201': '🌫️', // 雾
  '202': '🌫️', // 霾
  '203': '🌫️', // 扬沙
  '204': '🌫️', // 浮尘
  '205': '🌫️', // 沙尘暴
  '300': '🌦️', // 阵雨
  '301': '🌧️', // 强阵雨
  '302': '⛈️', // 雷阵雨
  '303': '⛈️', // 强雷阵雨
  '304': '⛈️', // 雷阵雨伴有冰雹
  '305': '🌧️', // 小雨
  '306': '🌧️', // 中雨
  '307': '🌧️', // 大雨
  '308': '🌧️', // 暴雨
  '309': '🌧️', // 大暴雨
  '310': '🌧️', // 特大暴雨
  '311': '🌧️', // 冻雨
  '312': '🌧️', // 小到中雨
  '313': '🌧️', // 中到大雨
  '314': '🌧️', // 大到暴雨
  '400': '🌨️', // 小雪
  '401': '🌨️', // 中雪
  '402': '🌨️', // 大雪
  '403': '🌨️', // 暴雪
  '404': '🌨️', // 雨夹雪
  '405': '🌨️', // 雨雪天气
  '406': '🌨️', // 阵雨夹雪
  '407': '🌨️', // 阵雪
  '408': '🌨️', // 小到中雪
  '409': '🌨️', // 中到大雪
  '410': '🌨️', // 大到暴雪
  '500': '🌬️', // 大风
  '501': '💨', // 烈风
  '502': '🌀', // 狂风
  '503': '🌀', // 暴风
  '504': '🌀', // 台风
  '507': '💨', // 龙卷风
  '508': '💨', // 无风
  '509': '💨', // 微风
  '510': '💨', // 和风
  '511': '💨', // 清风
  '512': '🌬️', // 强风
  '513': '🌬️', // 疾风
  '900': '🌡️', // 热
  '901': '🥶', // 冷
  '999': '❓'  // 未知
}

// 从weather.json加载天气数据
import weatherDataJson from '@/assets/weather.json'

// 获取天气数据
const fetchWeatherData = async () => {
  try {
    console.log('尝试从weather.json加载天气数据')
    // 首先尝试从weather.json加载数据
    return getWeatherDataFromJson()
  } catch (error) {
    console.error('从weather.json获取天气数据失败:', error)
    // 如果加载失败，使用模拟数据
    return getMockWeatherData()
  }
}

// 从JSON文件获取天气数据
const getWeatherDataFromJson = () => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  const result: any[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(now)
    date.setDate(now.getDate() + i)
    const dayName = i === 0 ? '今天' : weekdays[date.getDay()]

    // 格式化日期为YYYY-MM-DD格式
    const dateStr = date.toISOString().split('T')[0]

    // 在weather.json中查找对应的日期数据
    const jsonWeather = weatherDataJson.weather_data.find((item: any) => item.date === dateStr)

    if (jsonWeather) {
      // 从JSON中提取数据并转换为需要的格式
      // 解析温度范围
      const tempMatch = jsonWeather.temperature.match(/(\d+)℃~(\d+)℃/)
      const tempLow = tempMatch ? parseInt(tempMatch[1]) : getRandomTemp(16, 20)
      const tempHigh = tempMatch ? parseInt(tempMatch[2]) : getRandomTemp(25, 32)

      // 解析风速
      const windMatch = jsonWeather.wind.match(/(.*) (\d+)级/)
      const windDir = windMatch ? windMatch[1] : getRandomWindDir()
      const windScale = windMatch ? windMatch[2] : getRandomWindScale()

      // 根据天气描述选择图标
      const icon = getWeatherIcon(jsonWeather.weather)

      result.push({
        day: dayName,
        tempLow,
        tempHigh,
        icon,
        description: jsonWeather.weather,
        windDir,
        windScale: windScale + '级',
        humidity: getRandomHumidity(50, 90),
        precipitation: getRandomPrecipitation(0, 20)
      })
    } else {
      // 日期不存在时使用虚拟随机天气数据
      const weatherIcons = ['☀️', '⛅', '☁️', '🌧️', '🌦️']
      const weatherDescriptions = ['晴', '多云', '阴', '小雨', '雷阵雨']
      const windDirections = ['东北风', '东南风', '西南风', '西北风', '东风', '南风', '北风']

      const randomIndex = Math.floor(Math.random() * weatherIcons.length)

      result.push({
        day: dayName,
        tempLow: getRandomTemp(16, 20),
        tempHigh: getRandomTemp(25, 32),
        icon: weatherIcons[randomIndex],
        description: weatherDescriptions[randomIndex],
        windDir: windDirections[Math.floor(Math.random() * windDirections.length)],
        windScale: getRandomWindScale() + '级',
        humidity: getRandomHumidity(50, 90),
        precipitation: getRandomPrecipitation(0, 20)
      })
    }
  }

  return result
}

// 根据天气描述获取图标
const getWeatherIcon = (weather: string) => {
  // 处理复合天气描述，优先匹配更具体的情况
  if (weather.includes('晴转多云') || weather.includes('多云转晴')) return '🌤️' // 晴间多云
  if (weather.includes('小雨')) return '🌦️' // 小雨
  if (weather.includes('中雨')) return '🌧️' // 中雨
  if (weather.includes('大雨')) return '⛈️' // 大雨/雷阵雨
  
  // 处理单一天气描述
  if (weather.includes('晴')) return '☀️' // 晴天
  if (weather.includes('多云')) return '⛅' // 多云
  if (weather.includes('阴')) return '☁️' // 阴天
  if (weather.includes('雨')) return '🌧️' // 雨（通用）
  if (weather.includes('雪')) return '🌨️' // 雪
  
  return '❓' // 未知天气类型
}

// 生成随机温度
const getRandomTemp = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成随机风向
const getRandomWindDir = () => {
  const directions = ['东北风', '东南风', '西南风', '西北风', '东风', '南风', '北风']
  return directions[Math.floor(Math.random() * directions.length)]
}

// 生成随机风力等级
const getRandomWindScale = () => {
  return Math.floor(Math.random() * 5) + 1 // 1-5级
}

// 生成随机湿度
const getRandomHumidity = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// 生成随机降水量
const getRandomPrecipitation = (min: number, max: number) => {
  return Math.round(Math.random() * (max - min) + min * 10) / 10
}

// 处理天气API返回的数据
const processWeatherApiResponse = (apiData: any) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()

  // 转换API返回的数据格式为我们需要的格式
  return apiData.daily.map((day: any, index: number) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    const dayName = index === 0 ? '今天' : weekdays[date.getDay()]

    return {
      day: dayName,
      tempLow: parseInt(day.tempMin),
      tempHigh: parseInt(day.tempMax),
      icon: weatherIconMap[day.iconDay] || '❓',
      description: day.textDay,
      windDir: day.windDirDay,
      windScale: day.windScaleDay + '级',
      humidity: parseInt(day.humidity),
      precipitation: parseFloat(day.precip)
    }
  })
}

// 获取模拟天气数据（确保数据完整性）
const getMockWeatherData = () => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const now = new Date()
  const weatherIcons = ['🌧️', '🌧️', '☀️', '⛅', '🌧️', '☀️', '☀️']
  const weatherDescriptions = ['大雨', '小雨', '晴', '多云', '雷阵雨', '晴', '晴']
  const windDirections = ['东北风', '东南风', '西南风', '西北风', '东风', '南风', '北风']
  const windScales = ['3-4级', '2-3级', '1-2级', '2-3级', '3-4级', '2-3级', '1-2级']
  const weatherData = [
    { tempLow: 18, tempHigh: 28, icon: weatherIcons[0], description: weatherDescriptions[0], windDir: windDirections[0], windScale: windScales[0], humidity: 85, precipitation: 15.2 },
    { tempLow: 17, tempHigh: 27, icon: weatherIcons[1], description: weatherDescriptions[1], windDir: windDirections[1], windScale: windScales[1], humidity: 75, precipitation: 5.6 },
    { tempLow: 16, tempHigh: 26, icon: weatherIcons[2], description: weatherDescriptions[2], windDir: windDirections[2], windScale: windScales[2], humidity: 60, precipitation: 0 },
    { tempLow: 18, tempHigh: 29, icon: weatherIcons[3], description: weatherDescriptions[3], windDir: windDirections[3], windScale: windScales[3], humidity: 65, precipitation: 0 },
    { tempLow: 19, tempHigh: 28, icon: weatherIcons[4], description: weatherDescriptions[4], windDir: windDirections[4], windScale: windScales[4], humidity: 80, precipitation: 12.8 },
    { tempLow: 17, tempHigh: 26, icon: weatherIcons[5], description: weatherDescriptions[5], windDir: windDirections[5], windScale: windScales[5], humidity: 55, precipitation: 0 },
    { tempLow: 16, tempHigh: 25, icon: weatherIcons[6], description: weatherDescriptions[6], windDir: windDirections[6], windScale: windScales[6], humidity: 50, precipitation: 0 }
  ]

  return weatherData.map((weather, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    const dayName = index === 0 ? '今天' : weekdays[date.getDay()]
    return { ...weather, day: dayName }
  })
}

const weatherForecastData = ref<any[]>([])

// 天气数据更新定时器
let weatherUpdateTimer: number | null = null

// 初始化天气数据
const initWeatherData = async () => {
  try {
    const data = await fetchWeatherData()
    weatherForecastData.value = data
    // 更新温度曲线图
    if (tempChart) {
      updateTempChart()
    }
  } catch (error) {
    console.error('初始化天气数据失败:', error)
  }
}

// 创建温度曲线图
let tempChart: any = null
const initTempChart = () => {
  const chartDom = document.getElementById('tempChart')
  if (!chartDom) return

  tempChart = echarts.init(chartDom)

  // 获取温度数据
  const xAxisData = weatherForecastData.value.map(item => item.day)
  const highTempData = weatherForecastData.value.map(item => item.tempHigh)
  const lowTempData = weatherForecastData.value.map(item => item.tempLow)

  const option: EChartsOption = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#36CFC9',
      borderWidth: 1,
      textStyle: {
        color: '#fff',
        fontSize: 12
      },
      formatter: function (params: any) {
        let result = params[0].name + '<br/>'
        params.forEach((param: any) => {
          result += param.marker + param.seriesName + ': ' + param.value + '°C<br/>'
        })
        return result
      }
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      axisLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.2)'
        }
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 10,
        formatter: '{value}°'
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      min: Math.min(...lowTempData) - 2,
      max: Math.max(...highTempData) + 2
    },
    series: [
      {
        name: '最高温度',
        type: 'line',
        data: highTempData,
        smooth: true,
        lineStyle: {
          color: '#FF7D00',
          width: 2
        },
        itemStyle: {
          color: '#FF7D00'
        },
        showSymbol: true,
        symbolSize: 6,
        emphasis: {
          itemStyle: {
            borderWidth: 2
          }
        }
      },
      {
        name: '最低温度',
        type: 'line',
        data: lowTempData,
        smooth: true,
        lineStyle: {
          color: '#4FACFE',
          width: 2
        },
        itemStyle: {
          color: '#4FACFE'
        },
        showSymbol: true,
        symbolSize: 6,
        emphasis: {
          itemStyle: {
            borderWidth: 2
          }
        }
      }
    ]
  }

  tempChart.setOption(option)
}

// 更新温度曲线图
const updateTempChart = () => {
  if (tempChart) {
    const xAxisData = weatherForecastData.value.map(item => item.day)
    const highTempData = weatherForecastData.value.map(item => item.tempHigh)
    const lowTempData = weatherForecastData.value.map(item => item.tempLow)

    tempChart.setOption({
      xAxis: {
        data: xAxisData
      },
      yAxis: {
        min: Math.min(...lowTempData) - 2,
        max: Math.max(...highTempData) + 2
      },
      series: [
        {
          data: highTempData
        },
        {
          data: lowTempData
        }
      ]
    })
  }
}

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

// 处理温度图表大小变化
const handleTempChartResize = () => {
  if (tempChart) {
    tempChart.resize()
  }
}

// 组件挂载时启动滚动和初始化数据
onMounted(() => {
  initCharts()
  initMap()
  // 初始化天气数据
  initWeatherData()
  // 延迟初始化温度曲线图，确保DOM已加载完成
  setTimeout(() => {
    initTempChart()
  }, 500)

  // 监听窗口大小变化，重新调整图表大小
  window.addEventListener('resize', handleTempChartResize)
  window.addEventListener('resize', handleResize)
  setTimeout(startScrolling, 1000) // 延迟1秒启动滚动，确保DOM已加载完成

  // 设置每小时更新天气数据
  weatherUpdateTimer = window.setInterval(initWeatherData, 3600000)
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 销毁图表实例
  if (distributionChart) distributionChart.dispose()
  if (statusChart) statusChart.dispose()
  if (tempChart) tempChart.dispose()

  // 停止滚动
  stopScrolling()

  // 清除天气数据更新定时器
  if (weatherUpdateTimer) {
    clearInterval(weatherUpdateTimer)
    weatherUpdateTimer = null
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', handleTempChartResize)
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
      offset: AMap.Pixel ? new AMap.Pixel(-20, -20) : [-20, -20]
    })

    // 绑定点击事件 - 显示信息窗口
    marker.on('click', (e: any) => {
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation()
      }
      showInfoWindow(station, marker)
    })

    // 绑定鼠标悬停事件 - 显示标签
    marker.on('mouseover', () => {
      const content = marker.getContent()
      // 检查content是否为DOM元素且支持querySelector方法
      if (content && typeof content.querySelector === 'function') {
        const label = content.querySelector('.marker-label')
        if (label) {
          label.style.opacity = '1'
        }
      }
    })

    marker.on('mouseout', () => {
      const content = marker.getContent()
      // 检查content是否为DOM元素且支持querySelector方法
      if (content && typeof content.querySelector === 'function') {
        const label = content.querySelector('.marker-label')
        if (label) {
          label.style.opacity = '0'
        }
      }
    })

    marker.setMap(mapInstance)
    markers.set(`${station.type}-${station.name}`, marker)
  })
}

// 显示信息窗口
const showInfoWindow = (station: any, marker: any) => {
  if (!mapInstance) return

  // 根据类型添加资源信息
  let resourceTypeInfo = ''
  if (station.type.includes('hydro') || station.type.includes('water')) {
    resourceTypeInfo = '类型: 水电资源'
  } else if (station.type.includes('solar') || station.type.includes('photovoltaic')) {
    resourceTypeInfo = '类型: 光伏资源'
  } else if (station.type.includes('wind')) {
    resourceTypeInfo = '类型: 风电资源'
  } else {
    resourceTypeInfo = '类型: 电力资源'
  }

  const details = stationDetailData[station.name] || { capacity: 0, generation: 0, load: 0 }

  const infoWindow = new (AMap as any).InfoWindow({
    content: `
      <div class="custom-info-window">
        <div class="info-window-header">
          <h3>${station.name}</h3>
        </div>
        <div class="info-window-content">
          <p class="resource-type">${resourceTypeInfo}</p>
          <p class="resource-status">状态: <span style="color: ${station.status === 'normal' ? '#00B42A' : station.status === 'attention' ? '#FF7D00' : '#F53F3F'}">${station.status === 'normal' ? '正常' : station.status === 'attention' ? '注意' : '警告'}</span></p>
          <p class="resource-capacity">装机容量: ${details.capacity}MW</p>
          <p class="resource-generation">当前发电: ${details.generation}MW</p>
          <p class="resource-load">负载率: ${details.load}%</p>
          <p class="resource-coordinates">坐标: ${station.coordinates[0].toFixed(4)}, ${station.coordinates[1].toFixed(4)}</p>
        </div>
      </div>
    `,
    size: new (AMap as any).Size(320, 200),
    offset: AMap.Pixel ? new AMap.Pixel(0, -50) : [0, -50]
  })

  infoWindow.open(mapInstance, station.coordinates)
}

// 创建信息窗口内容 - 为了兼容原有代码结构保留此函数名，但内部调用showInfoWindow
const createInfoWindowContent = (station: any) => {
  // 这里返回的内容实际上不会被使用，因为我们在点击事件中直接调用了showInfoWindow
  return ''
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
        radius: '50%',
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
        radius: '50%',
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

// 刷新电站状态数据
const refreshStationData = () => {
  // 模拟数据刷新过程
  // 在实际应用中，这里应该调用API获取最新数据

  // 显示加载状态
  const refreshBtn = document.querySelector('.btn-refresh') as HTMLButtonElement | null
  if (refreshBtn) {
    refreshBtn.innerHTML = '刷新中...'
    refreshBtn.disabled = true
  }

  // 模拟网络请求延迟
  setTimeout(() => {
    // 随机更新一些电站状态
    stationOperationData.forEach(station => {
      // 随机决定是否更新该电站的状态
      if (Math.random() > 0.7) {
        // 定义可能的状态
        const statuses = ['正常', '注意', '警告']
        // 随机选择一个新状态（但不能与当前状态相同）
        let newStatus = station.status
        while (newStatus === station.status) {
          newStatus = statuses[Math.floor(Math.random() * statuses.length)]
        }
        station.status = newStatus
      }

      // 随机更新负载率
      if (Math.random() > 0.5) {
        const currentLoad = parseInt(station.load)
        const change = Math.floor(Math.random() * 11) - 5 // -5 到 +5 的随机变化
        const newLoad = Math.max(0, Math.min(100, currentLoad + change))
        station.load = `${newLoad}%`
      }
    })

    // 更新电站统计数据
    const normalCount = stationOperationData.filter(s => s.status === '正常').length
    const attentionCount = stationOperationData.filter(s => s.status === '注意').length
    const warningCount = stationOperationData.filter(s => s.status === '警告').length

    stationStatusData.normal = normalCount
    stationStatusData.attention = attentionCount
    stationStatusData.warning = warningCount

    // 重新初始化状态图表以显示更新后的数据
    initStatusChart()

    // 恢复按钮状态
    if (refreshBtn) {
      refreshBtn.innerHTML = '刷新'
      refreshBtn.disabled = false
    }

    // 显示刷新成功的提示
    ElMessage.success('电站状态数据已刷新')
  }, 1000)
}




</script>

<template>
  <div class="monitoring-container">
    <!-- 左侧导航已删除 -->

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部标题 -->
      <div class="header-title">
        <h2>资源监测</h2>
        <div class="date-display">{{ new Date().toLocaleString('zh-CN', {
          year: 'numeric', month: '2-digit', day:
            '2-digit'
        }) }}</div>
      </div>

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
                <button class="btn-refresh" @click="refreshStationData">刷新</button>
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
            <button v-for="(config, type) in weatherRadarConfig" :key="type"
              :class="['energy-type-btn']" :style="{ '--color': config.color }"
              @click="() => {}">
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
                <div class="weather-icon">{{ weather.icon }}</div>
                <div class="weather-desc">{{ weather.description }}</div>
                <div class="weather-temp">{{ weather.tempLow }}°/{{ weather.tempHigh }}°</div>
                <div v-if="weather.windDir" class="weather-wind">{{ weather.windDir }} {{ weather.windScale }}</div>
              </div>
            </div>
            <div class="temperature-chart">
              <!-- 使用echarts实现的温度曲线图 -->
              <div id="tempChart" class="temp-chart"></div>
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
  background-image: url('@/assets/mainbg2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: #fff;
  overflow: hidden;
}

/* 顶部标题样式 */
.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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
  overflow: auto;
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
  max-height: 95vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(54, 207, 201, 0.5) transparent;
}

.right-section::-webkit-scrollbar {
  width: 6px;
}

.right-section::-webkit-scrollbar-track {
  background: transparent;
}

.right-section::-webkit-scrollbar-thumb {
  background-color: rgba(54, 207, 201, 0.5);
  border-radius: 3px;
}

.right-section::-webkit-scrollbar-thumb:hover {
  background-color: rgba(54, 207, 201, 0.8);
}

.weather-container {
  height: 45vh;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.weather-container h3 {
  margin: 0 0 15px 0;
  color: #36CFC9;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.weather-forecast {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.weather-item {
  flex: 1;
  min-width: 80px;
  text-align: center;
  padding: 15px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.weather-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(54, 207, 201, 0.2);
}

.weather-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(54, 207, 201, 0.1), transparent);
  transition: left 0.5s ease;
}

.weather-item:hover::before {
  left: 100%;
}

.weather-day {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
  font-weight: 500;
}

.weather-icon {
  font-size: 32px;
  margin-bottom: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 40px;
}

.weather-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
}

.weather-wind {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}

.weather-temp {
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

.temperature-chart {
  position: relative;
  height: 180px;
  margin-top: 10px;
  padding: 10px 5px;
}

.temp-chart {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.weather-icon-text {
  display: inline-block;
  padding: 5px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  margin: 0 2px;
  transition: all 0.3s ease;
}

.weather-icon-text:hover {
  transform: scale(1.2);
  background: rgba(255, 255, 255, 0.1);
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
