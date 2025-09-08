import { defineStore } from 'pinia'

// 定义地图标记数据接口
export interface MarkerData {
  id: string
  name: string
  coordinates: [number, number]
  type?: string
  color?: string
  isActive?: boolean
  description?: string
  createdAt?: string
}

// 定义地图配置接口
interface MapConfig {
  center: [number, number]
  zoom: number
  rotation: number
  viewMode: '2D' | '3D'
  terrain: boolean
}

// 常用地点预设 - 仅保留兴发集团相关电站
const COMMON_LOCATIONS = {
  // 水力发电站 - 兴发集团所属
  hydropower1: {
    name: '兴发集团兴山电站',
    coordinates: [110.7750, 31.2100] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '兴发集团在兴山县的主要水电站',
    capacity: '30MW'
  },
  hydropower2: {
    name: '兴发集团高阳电站',
    coordinates: [110.7600, 31.1950] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '兴发集团高阳水电站',
    capacity: '25MW'
  },
  hydropower3: {
    name: '兴发集团峡口电站',
    coordinates: [110.8050, 31.0080] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '兴发集团峡口水电站',
    capacity: '20MW'
  },
  hydropower4: {
    name: '兴发集团小溪河电站',
    coordinates: [110.8800, 31.1500] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '位于兴山县水月寺高岚村四组，成立于2018年',
    capacity: '15MW'
  },
  hydropower5: {
    name: '兴发集团满天星电站',
    coordinates: [110.8200, 31.2500] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '成立于2005年，主要从事水力发电业务',
    capacity: '18MW'
  },
  hydropower6: {
    name: '兴发集团王家岭电站',
    coordinates: [110.8100, 30.9800] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '位于兴山县峡口建阳坪村二组',
    capacity: '12MW'
  },
  // 新增电站 - 白鸡河电站
  hydropower7: {
    name: '兴发集团白鸡河电站',
    coordinates: [110.7400, 31.2300] as [number, number],
    type: 'hydropower',
    color: '#00BFFF',
    description: '成立于2002年3月，主要从事水力发电业务',
    capacity: '8MW'
  }
}

export const useMapStore = defineStore('map', {
  state: () => ({
    selectedMarkers: [] as MarkerData[],
    selectedLocation: null as MarkerData | null,
    mapConfig: {
      center: [110.8150, 31.1190] as [number, number], // 根据所有电站坐标计算的中心位置
      zoom: 11, // 调整为更合适的缩放级别，确保所有电站在5公里视野范围内可见
      rotation: 0,
      viewMode: '3D',
      terrain: false
    } as MapConfig,
    isCoordinatePickerEnabled: false,
    lastSelectedCoordinates: null as [number, number] | null
  }),

  getters: {
    // 获取激活的标记
    activeMarkers: (state) => state.selectedMarkers.filter(marker => marker.isActive),
    
    // 获取标记数量
    markerCount: (state) => state.selectedMarkers.length,
    
    // 按类型分组的标记
    markersByType: (state) => {
      const groups = {}
      state.selectedMarkers.forEach(marker => {
        const type = marker.type || 'default'
        if (!groups[type]) {
          groups[type] = []
        }
        groups[type].push(marker)
      })
      return groups
    },
    
    // 生成GeoJSON格式的数据
    markersAsGeoJSON: (state) => {
      return {
        type: 'FeatureCollection',
        features: state.selectedMarkers.map(marker => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: marker.coordinates
          },
          properties: {
            id: marker.id,
            name: marker.name,
            type: marker.type || 'default',
            color: marker.color || '#4facfe',
            description: marker.description || ''
          }
        }))
      }
    }
  },

  actions: {
    // 添加标记
    addMarker(marker: Omit<MarkerData, 'id' | 'createdAt'>) {
      const newMarker = {
        id: Date.now().toString(),
        ...marker,
        isActive: false,
        createdAt: new Date().toISOString()
      }
      this.selectedMarkers.push(newMarker)
      return newMarker
    },

    // 批量添加标记
    addMarkers(markers: Omit<MarkerData, 'id' | 'createdAt'>[]) {
      const newMarkers = markers.map(marker => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...marker,
        isActive: false,
        createdAt: new Date().toISOString()
      }))
      this.selectedMarkers.push(...newMarkers)
      return newMarkers
    },

    // 移除标记
    removeMarker(id: string) {
      const index = this.selectedMarkers.findIndex(marker => marker.id === id)
      if (index !== -1) {
        const removedMarker = this.selectedMarkers[index]
        this.selectedMarkers.splice(index, 1)
        // 如果移除的是当前选中的标记，清除选中状态
        if (this.selectedLocation && this.selectedLocation.id === id) {
          this.selectedLocation = null
        }
        return removedMarker
      }
      return null
    },

    // 选择标记
    selectLocation(marker: MarkerData | null) {
      // 取消所有标记的激活状态
      this.selectedMarkers.forEach(m => {
        m.isActive = false
      })
      
      // 如果传入null，则清除选中状态
      if (!marker) {
        this.selectedLocation = null
        return
      }
      
      // 激活选中的标记
      const target = this.selectedMarkers.find(m => m.id === marker.id)
      if (target) {
        target.isActive = true
        this.selectedLocation = target
        this.mapConfig.center = [...target.coordinates] as [number, number]
        this.lastSelectedCoordinates = [...target.coordinates] as [number, number]
      }
    },

    // 更新标记
    updateMarker(id: string, updates: Partial<MarkerData>) {
      const marker = this.selectedMarkers.find(m => m.id === id)
      if (marker) {
        Object.assign(marker, updates)
        // 如果更新的是当前选中的标记，同步更新选中状态
        if (this.selectedLocation && this.selectedLocation.id === id) {
          this.selectedLocation = { ...this.selectedLocation, ...updates }
        }
        return true
      }
      return false
    },

    // 清除所有标记
    clearAllMarkers() {
      this.selectedMarkers = []
      this.selectedLocation = null
    },

    // 切换坐标拾取模式
    toggleCoordinatePicker() {
      this.isCoordinatePickerEnabled = !this.isCoordinatePickerEnabled
      // 模式切换时，清除最后选中的坐标
      if (!this.isCoordinatePickerEnabled) {
        this.lastSelectedCoordinates = null
      }
    },

    // 启用坐标拾取模式
    enableCoordinatePicker() {
      this.isCoordinatePickerEnabled = true
    },

    // 禁用坐标拾取模式
    disableCoordinatePicker() {
      this.isCoordinatePickerEnabled = false
      this.lastSelectedCoordinates = null
    },

    // 记录最后选中的坐标
    setLastSelectedCoordinates(coordinates: [number, number]) {
      this.lastSelectedCoordinates = coordinates
      this.mapConfig.center = [...coordinates] as [number, number]
    },

    // 更新地图配置
    updateMapConfig(config: Partial<MapConfig>) {
      this.mapConfig = { ...this.mapConfig, ...config }
    },

    // 跳转到指定坐标
    flyTo(coordinates: [number, number], zoom?: number) {
      this.mapConfig.center = coordinates
      if (zoom !== undefined) {
        this.mapConfig.zoom = zoom
      }
    },

    // 添加预设地点
    addPresetLocation(locationType: keyof typeof COMMON_LOCATIONS) {
      const preset = COMMON_LOCATIONS[locationType]
      if (preset) {
        return (this as any).addMarker(preset)
      }
      return null
    },

    // 添加所有预设地点（避免重复添加）
    addAllPresetLocations() {
      // 获取现有标记的名称列表，用于去重
      const existingNames = new Set(this.selectedMarkers.map(marker => marker.name))
      
      // 过滤掉已存在的预设地点
      const newPresets = Object.values(COMMON_LOCATIONS).filter(preset => 
        !existingNames.has(preset.name)
      )
      
      if (newPresets.length > 0) {
        const addedMarkers = (this as any).addMarkers(newPresets)
        return {
          success: true,
          addedCount: newPresets.length,
          totalCount: Object.values(COMMON_LOCATIONS).length,
          markers: addedMarkers
        }
      } else {
        return {
          success: true,
          addedCount: 0,
          totalCount: Object.values(COMMON_LOCATIONS).length,
          message: '所有预设地点已存在，无需重复添加'
        }
      }
    },

    // 导入标记（从GeoJSON格式）
    importMarkersFromGeoJSON(geoJSON: any) {
      try {
        if (geoJSON.type === 'FeatureCollection' && Array.isArray(geoJSON.features)) {
          const markers = geoJSON.features.map((feature: any) => ({
            name: feature.properties.name || '未命名地点',
            coordinates: feature.geometry.coordinates as [number, number],
            type: feature.properties.type || 'default',
            color: feature.properties.color || '#4facfe',
            description: feature.properties.description || ''
          }))
          return (this as any).addMarkers(markers)
        }
      } catch (error) {
        console.error('导入标记失败:', error)
      }
      return []
    }
  },

  // 持久化存储已移除，以解决构建错误
})