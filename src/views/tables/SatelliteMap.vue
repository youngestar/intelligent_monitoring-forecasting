<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useMapStore, type MarkerData } from '@/stores/map'
import MarkerManagement from '@/components/MarkerManagement.vue'
import Message from '@/components/ui/Message.vue'
import stationImg1 from '@/assets/电站1.jpg'
import stationImg2 from '@/assets/电站2.webp'
import stationImg3 from '@/assets/电站3.webp'
import stationImg4 from '@/assets/电站4.jpg'
import stationImg5 from '@/assets/电站5.png'
import stationImg6 from '@/assets/电站6.webp'

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
  TileLayer: { // 合并类型定义
    new(): any // 添加构造函数签名
    Satellite: any
    RoadNet: any
  }
}

declare global {
  interface Window {
    AMap: AMapInstance
    tempMarker: any
    removeMarker?: (id: string) => void
    _AMapSecurityConfig?: { // 添加安全配置属性
      securityJsCode: string
    }
  }
}

// 地图DOM引用
const mapRef = ref<HTMLDivElement | null>(null) // 允许null值
let mapInstance: any = null
let AMap: AMapInstance | null = null // 允许null值
let markers: Map<string, any> = new Map() // 存储地图标记实例

// 使用Pinia store
const mapStore = useMapStore()
// 类型断言，确保所有需要的方法可以被正确识别
const {
  toggleCoordinatePicker: storeToggleCoordinatePicker,
  removeMarker: storeRemoveMarker,
  addAllPresetLocations: storeAddAllPresetLocations,
  selectLocation: storeSelectLocation,
  addMarker: storeAddMarker
} = mapStore as any

// 计算属性 - 获取选中的电站
const selectedPowerStation = computed<MarkerData | null>(() => {
  const current = mapStore.selectedLocation
  return current // 直接返回选中的位置，确保右侧介绍栏能正确更新
})

// 监听selectedPowerStation变化，自动滚动到顶部
watch(selectedPowerStation, (newStation) => {
  if (newStation) {
    // 延迟一点时间，确保DOM已经更新
    setTimeout(() => {
      const powerStationInfo = document.querySelector('.power-station-info .info-body')
      if (powerStationInfo) {
        powerStationInfo.scrollTop = 0
      }
    }, 100)
  }
})

// 电站图片映射
const stationImages: Record<string, string> = {
  '兴发集团兴山电站': stationImg1,
  '兴发集团高阳电站': stationImg2,
  '兴发集团峡口电站': stationImg3,
  '兴发集团小溪河电站': stationImg4,
  '兴发集团满天星电站': stationImg5,
  '兴发集团王家岭电站': stationImg6
}

// 获取电站图片路径
const getStationImage = (stationName: string) => {
  return stationImages[stationName] || stationImg1
}

// 处理图片加载错误
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.src = '/src/assets/电站1.jpg'
}

// 获取电站概况
const getStationOverview = (stationName: string) => {
  const overviews: Record<string, string> = {
    '兴发集团兴山电站': '兴山电站是兴发集团在兴山县境内的主力电站之一，位于香溪河中游，装机容量较大，是该地区重要的电力供应来源。该电站建成于1995年，为兴山县的经济发展提供了稳定的电力保障。',
    '兴发集团高阳电站': '高阳电站位于兴山县高阳镇境内，是香溪河梯级开发中的重要组成部分，具有较好的水力资源条件。电站设计合理，运行稳定，为当地工业生产和居民生活提供了可靠的电力支持。',
    '兴发集团峡口电站': '峡口电站地处香溪河峡谷地带，水资源丰富，年发电量稳定，为当地工业生产和居民生活提供了可靠的电力保障。该电站在防洪、灌溉方面也发挥了重要作用。',
    '兴发集团小溪河电站': '小溪河电站位于香溪河支流小溪河上，是一座以发电为主，兼顾灌溉和防洪的小型水电站。电站采用了先进的水力发电技术，具有较高的发电效率。',
    '兴发集团满天星电站': '满天星电站是兴发集团近年来新建的电站项目，采用了先进的水力发电技术，具有较高的发电效率。该电站的建成进一步优化了兴山县的电源结构。',
    '兴发集团王家岭电站': '王家岭电站位于兴山县王家岭地区，是兴发集团电力布局中的重要节点，对优化当地电网结构具有重要意义。电站运行稳定，经济效益显著。',
    '兴发集团白鸡河电站': '白鸡河电站成立于2002年3月，位于兴山县境内的白鸡河上，是兴发集团电力布局中的重要组成部分。该电站以水力发电为主，运行稳定，为兴山县的经济发展提供了可靠的电力支持。'
  }
  return overviews[stationName] || '该电站是兴发集团在兴山县境内的重要电力设施之一，为当地经济发展提供了电力支持。'
}

// 获取电站技术参数
const getStationParams = (stationName: string) => {
  const params: Record<string, Record<string, string>> = {
    '兴发集团兴山电站': {
      '装机容量': '5.2万千瓦',
      '年均发电量': '约1.8亿千瓦时',
      '建成年份': '1995年',
      '坝高': '38米',
      '库容': '2500万立方米'
    },
    '兴发集团高阳电站': {
      '装机容量': '3.6万千瓦',
      '年均发电量': '约1.2亿千瓦时',
      '建成年份': '1998年',
      '坝高': '32米',
      '库容': '1800万立方米'
    },
    '兴发集团峡口电站': {
      '装机容量': '4.1万千瓦',
      '年均发电量': '约1.4亿千瓦时',
      '建成年份': '2002年',
      '坝高': '42米',
      '库容': '3100万立方米'
    },
    '兴发集团小溪河电站': {
      '装机容量': '1.5万千瓦',
      '年均发电量': '约0.5亿千瓦时',
      '建成年份': '2018年',
      '坝高': '25米',
      '库容': '800万立方米'
    },
    '兴发集团满天星电站': {
      '装机容量': '2.3万千瓦',
      '年均发电量': '约0.8亿千瓦时',
      '建成年份': '2005年',
      '坝高': '28米',
      '库容': '1200万立方米'
    },
    '兴发集团王家岭电站': {
      '装机容量': '1.3万千瓦',
      '年均发电量': '约0.4亿千瓦时',
      '建成年份': '2010年',
      '坝高': '22米',
      '库容': '600万立方米'
    },
    '兴发集团白鸡河电站': {
      '装机容量': '0.8万千瓦',
      '年均发电量': '约0.3亿千瓦时',
      '建成年份': '2002年',
      '坝高': '20米',
      '库容': '500万立方米'
    }
  }
  return params[stationName] || {
    '装机容量': '未知',
    '年均发电量': '未知',
    '建成年份': '未知',
    '坝高': '未知',
    '库容': '未知'
  }
}

// 计算兴发集团电站总数
const totalPowerStations = computed(() => {
  return mapStore.selectedMarkers.filter(marker => marker.type === 'powerStation' || marker.type === 'hydropower').length
})

// 配置项
const mapConfig = {
  apiKey: '1c8fb5781411703ac5c3343201e0ab99', // 请替换为您自己的API密钥
  securityConfig: {
    securityJsCode: '8468351a95a828e0700d4aaa085c3551' // 安全码
  }
}

// 加载高德地图API - 优化版本，确保加载所有必要的模块
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

    // 创建script标签加载高德地图API - 显式加载所有必要的模块
    const script = document.createElement('script')
    script.type = 'text/javascript'
    // 显式指定需要加载的模块，确保包含标准图层和卫星图层所需的所有组件
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

// 获取地点类型对应的图标
const getLocationIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'default': '📍',
    'school': '🏫',
    'hospital': '🏥',
    'restaurant': '🍽️',
    'store': '🏪',
    'park': '🌳',
    'government': '🏛️',
    'powerStation': '⚡'
  }
  return iconMap[type] || iconMap.default
}

// 添加标记到地图
const addMarkerToMap = (markerData: MarkerData) => {
  if (!AMap || !mapInstance) return

  const { coordinates, name, color = '#4facfe', isActive = false, type = 'default', description } = markerData

  // 创建自定义HTML标记
  const iconContent = `
    <div class="custom-marker" style="position: relative; display: inline-block;">
      <div class="marker-icon" style="
        background-color: ${color};
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
        transform: ${isActive ? 'scale(1.2)' : 'scale(1)'}
      ">
        ${getLocationIcon(type)}
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
      <div class="delete-btn" style="
        position: absolute;
        top: -10px;
        right: -10px;
        background-color: #ff4d4f;
        color: white;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.3s ease;
      " onclick="removeMarker('${markerData.id}')">×</div>
    </div>
  `

  const marker = new AMap.Marker({
    position: coordinates,
    content: iconContent,
    zIndex: isActive ? 1000 : 100,
    offset: new AMap.Pixel(-20, -20)
  })

  // 绑定点击事件
  marker.on('click', (e: any) => {
    // 检查e对象是否有stopPropagation方法，避免TypeError
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }

    // 查找mapStore中对应的标记，确保使用正确的对象实例
    const matchingMarker = mapStore.selectedMarkers.find(m => m.id === markerData.id)
    if (matchingMarker) {
      storeSelectLocation(matchingMarker)
    } else {
      // 如果找不到匹配的标记，先创建并添加到store中，然后再选择它
      const newMarker = storeAddMarker({
        name: markerData.name,
        coordinates: markerData.coordinates,
        type: markerData.type,
        color: markerData.color,
        description: markerData.description,
        isActive: true
      })
      storeSelectLocation(newMarker)
    }

    // 移除弹窗，信息已在右侧展示栏中显示
  })

  // 绑定鼠标悬停事件显示删除按钮
  marker.on('mouseover', () => {
    const content = marker.getContent()
    // 检查content是否为DOM元素且支持querySelector方法
    if (content && typeof content.querySelector === 'function') {
      const deleteBtn = content.querySelector('.delete-btn')
      if (deleteBtn) {
        deleteBtn.style.opacity = '1'
      }
    }
  })

  marker.on('mouseout', () => {
    const content = marker.getContent()
    // 检查content是否为DOM元素且支持querySelector方法
    if (content && typeof content.querySelector === 'function') {
      const deleteBtn = content.querySelector('.delete-btn')
      if (deleteBtn) {
        deleteBtn.style.opacity = '0'
      }
    }
  })

  marker.setMap(mapInstance)
  markers.set(markerData.id, marker)
}

// 获取类型标签
const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'default': '默认',
    'school': '学校/教学楼',
    'hospital': '医院',
    'restaurant': '餐厅/食堂',
    'store': '商店',
    'park': '公园/绿地',
    'government': '政府/机构',
    'powerStation': '电站'
  }
  return typeMap[type] || typeMap.default
}

// 添加已有标记
const addExistingMarkers = () => {
  mapStore.selectedMarkers.forEach(marker => {
    addMarkerToMap(marker)
  })
}

// 添加全部预设地点
const addAllPresetLocations = () => {
  const result = storeAddAllPresetLocations()

  if (result.addedCount > 0) {
    showMessage(`已成功添加${result.addedCount}个预设地点！`, 'success')
  } else {
    showMessage(result.message || '所有预设地点已存在，无需重复添加', 'info')
  }
}

// 显示消息
const messages = ref<Array<{
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>>([])

const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration?: number) => {
  const id = Date.now().toString()
  messages.value.push({
    id,
    message,
    type,
    duration
  })
}

const removeMessage = (id: string) => {
  messages.value = messages.value.filter(msg => msg.id !== id)
}

// 更新所有标记
const updateAllMarkers = () => {
  // 移除所有旧标记
  markers.forEach(marker => {
    marker.setMap(null)
  })
  markers.clear()

  // 添加新标记
  addExistingMarkers()
}

// 初始化地图
const initMap = async () => {
  try {
    // 加载高德地图API
    await loadMapScript()

    // 获取地图容器
    const mapContainer = mapRef.value
    if (!mapContainer || !AMap) return

    // 全新的地图初始化方法 - 手动控制图层显示
    // 1. 创建地图实例，使用默认配置
    mapInstance = new AMap.Map(mapContainer, {
      viewMode: '2D',
      center: [110.78, 31.20], // 湖北省宜昌市兴山县
      zoom: 10
    })

    // 移除点击空白处切换功能，改为使用按钮控制

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

    // 6. 添加自定义的图层切换按钮（优化版）
    const layerSwitchButton = document.createElement('div')
    layerSwitchButton.style.position = 'absolute'
    layerSwitchButton.style.top = '10px'
    layerSwitchButton.style.right = '150px'
    layerSwitchButton.style.zIndex = '100'
    layerSwitchButton.style.display = 'flex'
    layerSwitchButton.style.background = 'white'
    layerSwitchButton.style.borderRadius = '8px'
    layerSwitchButton.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'
    layerSwitchButton.style.overflow = 'hidden'

    // 创建按钮样式函数
    const createMapTypeButton = (text: string, isActive: boolean = false) => {
      const button = document.createElement('button')
      button.innerText = text
      button.style.padding = '8px 16px'
      button.style.border = 'none'
      button.style.background = 'transparent'
      button.style.color = isActive ? '#1677ff' : '#666'
      button.style.fontSize = '14px'
      button.style.cursor = 'pointer'
      button.style.transition = 'all 0.3s ease'
      button.style.fontWeight = isActive ? '500' : 'normal'
      button.style.outline = 'none'

      // 添加hover效果
      button.addEventListener('mouseenter', () => {
        if (!button.classList.contains('active')) {
          button.style.color = '#4096ff'
          button.style.background = 'rgba(22, 119, 255, 0.05)'
        }
      })

      button.addEventListener('mouseleave', () => {
        if (!button.classList.contains('active')) {
          button.style.color = '#666'
          button.style.background = 'transparent'
        }
      })

      return button
    }

    const normalBtn = createMapTypeButton('标准地图', true)
    const satelliteBtn = createMapTypeButton('卫星地图', false) // 默认标准地图为激活状态

    // 给激活的按钮添加特殊样式
    normalBtn.classList.add('active')
    normalBtn.style.background = 'rgba(22, 119, 255, 0.1)'
    normalBtn.style.color = '#1677ff'

    normalBtn.onclick = () => {
      // 隐藏卫星图层和路网图层，显示标准图层
      if (satelliteLayer) satelliteLayer.setMap(null)
      if (roadNetLayer) roadNetLayer.setMap(null)
      if (normalLayer) normalLayer.setMap(mapInstance)
      console.log('已切换到标准图层')

      // 更新按钮激活状态
      normalBtn.classList.add('active')
      satelliteBtn.classList.remove('active')
      normalBtn.style.background = 'rgba(22, 119, 255, 0.1)'
      normalBtn.style.color = '#1677ff'
      satelliteBtn.style.background = 'transparent'
      satelliteBtn.style.color = '#666'
    }
    layerSwitchButton.appendChild(normalBtn)

    satelliteBtn.onclick = () => {
      // 隐藏标准图层，显示卫星图层和路网图层
      if (normalLayer) normalLayer.setMap(null)
      if (satelliteLayer) satelliteLayer.setMap(mapInstance)
      if (roadNetLayer) roadNetLayer.setMap(mapInstance)
      console.log('已切换到卫星图层（带路网）')

      // 更新按钮激活状态
      satelliteBtn.classList.add('active')
      normalBtn.classList.remove('active')
      satelliteBtn.style.background = 'rgba(22, 119, 255, 0.1)'
      satelliteBtn.style.color = '#1677ff'
      normalBtn.style.background = 'transparent'
      normalBtn.style.color = '#666'
    }
    layerSwitchButton.appendChild(satelliteBtn)

    // 添加到地图容器
    mapContainer.appendChild(layerSwitchButton)

    // 创建电站总体介绍按钮
    const overviewButton = document.createElement('button')
    overviewButton.innerText = '电站总体介绍'
    overviewButton.style.position = 'absolute'
    overviewButton.style.top = '10px'
    overviewButton.style.right = '10px'
    overviewButton.style.zIndex = '100'
    overviewButton.style.padding = '8px 16px'
    overviewButton.style.border = 'none'
    overviewButton.style.background = 'rgba(255, 255, 255, 0.9)'
    overviewButton.style.borderRadius = '8px'
    overviewButton.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)'
    overviewButton.style.color = '#1677ff'
    overviewButton.style.fontSize = '14px'
    overviewButton.style.cursor = 'pointer'
    overviewButton.style.transition = 'all 0.3s ease'

    // 添加hover效果
    overviewButton.addEventListener('mouseenter', () => {
      overviewButton.style.background = 'rgba(22, 119, 255, 0.1)'
      overviewButton.style.transform = 'translateY(-2px)'
    })

    overviewButton.addEventListener('mouseleave', () => {
      overviewButton.style.background = 'rgba(255, 255, 255, 0.9)'
      overviewButton.style.transform = 'translateY(0)'
    })

    // 添加点击事件
    overviewButton.onclick = () => {
      // 点击按钮时，清除选中状态，显示整体信息
      storeSelectLocation(null)
    }

    // 将电站总体介绍按钮添加到地图容器
    mapContainer.appendChild(overviewButton)

    // 7. 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('地图完全加载完成')
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

    // 监听地图点击事件（用于坐标拾取）
    mapInstance.on('click', (e: any) => {
      if (mapStore.isCoordinatePickerEnabled) {
        const { lng, lat } = e.lnglat

        // 输出坐标信息到控制台
        console.log('坐标拾取:', {
          lng: lng.toFixed(6),
          lat: lat.toFixed(6),
          arrayFormat: `[${lng.toFixed(6)}, ${lat.toFixed(6)}]`,
          geoJsonFormat: JSON.stringify({
            type: 'Point',
            coordinates: [lng.toFixed(6), lat.toFixed(6)]
          }, null, 2)
        })

        // 创建临时标记
        if (window.tempMarker) {
          window.tempMarker.setMap(null)
        }

        if (AMap) {
          window.tempMarker = new AMap.Marker({
            position: [lng, lat],
            icon: new AMap.Icon({
              size: new AMap.Size(30, 30),
              image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
              imageSize: new AMap.Size(30, 30)
            }),
            title: `拾取点: ${lng.toFixed(6)}, ${lat.toFixed(6)}`
          })
        }
        window.tempMarker.setMap(mapInstance)

        // 5秒后自动移除临时标记
        setTimeout(() => {
          if (window.tempMarker && mapStore.isCoordinatePickerEnabled) {
            window.tempMarker.setMap(null)
            window.tempMarker = null
          }
        }, 5000)
      }
    })

    // 添加现有标记
    addExistingMarkers()

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('兴山县卫星地图加载完成')
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

// 切换坐标拾取模式
const toggleCoordinatePicker = () => {
  storeToggleCoordinatePicker()
  // 切换模式时清除临时标记
  if (window.tempMarker) {
    window.tempMarker.setMap(null)
    window.tempMarker = null
  }
}

// 处理窗口大小变化
const handleWindowResize = () => {
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 监听Pinia状态变化
watch(
  () => mapStore.selectedLocation,
  (newLocation) => {
    if (newLocation && mapInstance) {
      // 移动地图中心到选中地点
      mapInstance.setCenter(newLocation.coordinates)
    }
  }
)

watch(
  () => [...mapStore.selectedMarkers], // 创建新数组引用以确保监听生效
  () => {
    updateAllMarkers()
  },
  { deep: true, flush: 'post' }
)

// 组件挂载后初始化地图
onMounted(() => {
  // 挂载全局删除函数
  window.removeMarker = (id: string) => {
    const marker = markers.get(id)
    if (marker) {
      marker.setMap(null)
      markers.delete(id)
    }
    storeRemoveMarker(id)
  }

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
  if (window.tempMarker) {
    window.tempMarker.setMap(null)
    window.tempMarker = null
  }
  // 移除全局函数
  if (window.removeMarker) {
    delete window.removeMarker
  }
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="satellite-map-container">
    <div class="map-header">
      <h2>湖北兴发集团电站全景</h2>
      <!-- 地图控制面板 -->
      <div class="map-controls">
        <div class="control-group">
          <button class="toggle-picker-btn" :class="{ active: mapStore.isCoordinatePickerEnabled }"
            @click="toggleCoordinatePicker" title="点击开启地点标注模式，再点击地图获取精确坐标">
            {{ mapStore.isCoordinatePickerEnabled ? '退出地点标注' : '地点标注模式' }}
          </button>

          <!-- 预设地点按钮 -->
          <div class="preset-locations">
            <button class="preset-btn" @click="addAllPresetLocations">
              📍 标注所有兴发集团电站
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="map-main-content">
      <div ref="mapRef" class="map-content"></div>
      <!-- 兴发集团电站信息展示框 -->
      <div class="power-station-info">
        <div class="info-header">
          <h2>⚡ 兴发集团电站信息</h2>
          <div class="station-count">共 {{ mapStore.markerCount }} 个电站</div>
        </div>
        <div class="info-body">
          <div v-if="selectedPowerStation" class="selected-station-info">
            <!-- 电站图片 -->
            <div class="station-image-container">
              <img :src="getStationImage(selectedPowerStation.name)" :alt="selectedPowerStation.name"
                class="station-image" @error="handleImageError" />
            </div>

            <!-- 电站名称和坐标 -->
            <div class="station-header">
              <h3 class="station-name">{{ selectedPowerStation.name }}</h3>
              <p class="station-coordinates">
                📍 坐标: {{ selectedPowerStation.coordinates[0].toFixed(2) }}, {{
                  selectedPowerStation.coordinates[1].toFixed(2) }}
              </p>
            </div>

            <!-- 电站概况 -->
            <div class="info-section">
              <h4>📝 电站概况</h4>
              <p class="station-overview">{{ getStationOverview(selectedPowerStation.name) }}</p>
            </div>

            <!-- 技术参数 -->
            <div class="info-section">
              <h4>⚙️ 技术参数</h4>
              <div class="tech-params">
                <div v-for="(value, key) in getStationParams(selectedPowerStation.name)" :key="key" class="param-item">
                  <span class="param-key">{{ key }}:</span>
                  <span class="param-value">{{ value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 默认显示内容 -->
          <div v-else class="default-info">
            <div class="info-section">
              <h4>🏭 企业概况</h4>
              <p>湖北兴发化工集团股份有限公司（简称“兴发集团”）是一家以磷化工系列产品和电力生产为主业的上市公司，拥有丰富的水电资源，在兴山县境内建设了多个水电站。</p>
            </div>
            <div class="info-section">
              <h4>💧 电站分布</h4>
              <p>兴发集团在兴山县境内主要水电站分布在香溪河及其支流上，包括兴山电站、高阳电站、峡口电站、小溪河电站、满天星电站和王家岭电站等。</p>
            </div>
            <div class="info-section">
              <h4>🔋 发电能力</h4>
              <p>兴山县境内兴发集团所属水电站总装机容量约为18.02万千瓦，年发电量约为5亿千瓦时，为兴山县及周边地区的经济发展提供了稳定的电力供应。</p>
            </div>
            <div class="info-section">
              <h4>🌊 水资源利用</h4>
              <p>兴发集团积极响应国家节能减排政策，充分利用兴山县丰富的水资源进行水力发电，既满足了企业自身的用电需求，也为地方经济发展和环境保护做出了贡献。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 标记管理组件 -->
    <MarkerManagement />

    <!-- 消息组件 -->
    <Message v-for="msg in messages" :key="msg.id" :message="msg.message" :type="msg.type" :duration="msg.duration"
      @close="removeMessage(msg.id)" />
  </div>
</template>

<style scoped>
.satellite-map-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0D1136 0%, #1A2151 100%);
  color: #000;
  padding: 20px;
  box-sizing: border-box;
}

/* 选中电站信息样式 */
.selected-station-info {
  width: 100%;
}

/* 电站图片容器 */
.station-image-container {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 10px;
  margin-bottom: -10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background-color: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 电站图片 */
.station-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.station-image:hover {
  transform: scale(1.05);
}

/* 电站头部信息 */
.station-header {
  margin-bottom: 20px;
}

.station-name {
  font-size: 1.4em;
  color: #fff;
  margin-bottom: 8px;
  font-weight: 600;
}

.station-coordinates {
  font-size: 0.9em;
  color: #7d736c;
  background-color: #1486ff;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 4px solid #764ba2;
}

/* 电站概况 */
.station-overview {
  line-height: 1.6;
  color: #495057;
  text-align: justify;
}

/* 技术参数 */
.tech-params {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #28a745;
}

.param-key {
  font-weight: 500;
  color: #fff;
}

.param-value {
  color: #007bff;
  font-weight: 600;
}

/* 确保内容不溢出 */
/* 修改主体信息高度 */
.info-body {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
  padding-right: 8px;
  margin-top: 20px;
}

.info-body::-webkit-scrollbar {
  width: 6px;
}

.info-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.info-body::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.info-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .station-image-container {
    height: 150px;
  }

  .station-name {
    font-size: 1.2em;
  }

  .tech-params {
    grid-template-columns: 1fr;
  }

  .info-body {
    max-height: calc(100vh - 250px);
  }
}

.map-main-content {
  display: flex;
  gap: 20px;
  width: 100%;
  margin-top: 20px;
}

.map-header {
  text-align: center;
  margin-bottom: 20px;
}

.map-header h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 15px 0;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.map-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  margin-bottom: -15px;
}

.control-group {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.toggle-picker-btn,
.back-btn,
.preset-btn {
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.toggle-picker-btn {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.toggle-picker-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.toggle-picker-btn.active {
  background: linear-gradient(45deg, #ff4d4f 0%, #b31d1d 100%);
  box-shadow: 0 4px 15px rgba(255, 77, 79, 0.3);
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.preset-locations {
  display: flex;
  justify-content: center;
}

.preset-btn {
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  font-weight: 500;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.preset-btn:hover {
  background: linear-gradient(45deg, #3da8fe 0%, #00d9fe 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.map-content {
  height: 800px;
  width: 70%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
  position: relative;
}

/* 电站信息展示框样式 */
.power-station-info {
  width: 30%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
  color: white;
  overflow-y: auto;
  height: 760px;
  display: flex;
  flex-direction: column;
}

/* 选中电站信息样式 */
.selected-station-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex-grow: 1;
}

/* 电站图片容器样式 */
.station-image-container {
  width: 100%;
  height: 200px;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 191, 255, 0.1);
}

.station-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.station-image:hover {
  transform: scale(1.05);
}

/* 电站名称部分样式 */
.station-name-section {
  text-align: center;
  padding: 15px 0;
}

.station-name-section h4 {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 10px 0;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.station-coordinates {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

/* 技术参数样式 */
.tech-params {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  border: 1px solid rgba(0, 191, 255, 0.2);
  transition: all 0.3s ease;
}

.param-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(0, 191, 255, 0.4);
}

.param-label {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.param-value {
  font-weight: 600;
  color: #4facfe;
}

/* 提示文本样式 */
.tips-text {
  text-align: center;
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  padding: 15px;
  background: rgba(0, 191, 255, 0.1);
  border-radius: 8px;
  border: 1px dashed rgba(0, 191, 255, 0.3);
}

.info-section {
  margin-bottom: 25px;
}

/* 确保内容不会溢出 */
.info-section p {
  word-wrap: break-word;
  word-break: break-word;
  line-height: 1.6;
  margin: 0;
}

.info-section h4 {
  margin: 0 0 10px 0;
  font-size: larger;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.info-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  transition: transform 0.3s ease;
}

.info-section:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.08);
}

.info-section h4 {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 10px 0;
  color: #4facfe;
}

.info-section p {
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
}

.map-tips {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
  border-left: 4px solid #4facfe;
}

.map-tips p {
  margin: 5px 0;
  font-size: 14px;
  line-height: 1.5;
}

.picker-tip {
  color: #ffa500;
  font-weight: 500;
  margin-top: 10px !important;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

/* 自定义标记样式 */
:deep(.custom-marker) {
  transition: all 0.3s ease;
}

:deep(.custom-marker:hover .marker-icon) {
  transform: scale(1.2) !important;
}

:deep(.custom-marker:hover .delete-btn) {
  opacity: 1 !important;
}

/* 自定义信息窗口样式 */
:deep(.custom-info-window) {
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #4facfe;
}

:deep(.info-window-header) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

:deep(.info-window-header h3) {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

:deep(.info-window-content p) {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

:deep(.info-window-content .description) {
  color: #333;
  font-weight: 500;
}

:deep(.info-window-content .coordinates) {
  font-family: monospace;
}
</style>
