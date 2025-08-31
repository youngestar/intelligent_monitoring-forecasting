<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
  TileLayer: {
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
const mapRef = ref<HTMLDivElement>(null)
let mapInstance: any = null
let AMap: AMapInstance = null

// 配置项
const mapConfig = {
  center: [110.78, 31.20], // 兴山县中心点坐标
  zoom: 10, // 初始缩放级别
  satellite: true, // 启用卫星图层
  apiKey: '1c8fb5781411703ac5c3343201e0ab99' // 请替换为您自己的API密钥
}

// 加载高德地图API
const loadMapScript = () => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载过高德地图API
    if (window.AMap) {
      AMap = window.AMap
      resolve(AMap)
      return
    }

    // 创建script标签加载高德地图API
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.Satellite,AMap.MapType`
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
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      mapStyle: 'amap://styles/whitesmoke', // 设置地图样式
      viewMode: '3D', // 使用3D视图
      pitch: 30 // 设置俯仰角
    })

    // 添加卫星图层
    const satelliteLayer = new AMap.TileLayer.Satellite()
    satelliteLayer.setMap(mapInstance)

    // 添加路网图层（可选，显示道路等信息）
    const roadNetLayer = new AMap.TileLayer.RoadNet()
    roadNetLayer.setMap(mapInstance)

    // 添加地图控件
    mapInstance.addControl(new AMap.Scale()) // 比例尺
    mapInstance.addControl(new AMap.ToolBar()) // 工具栏
    mapInstance.addControl(new AMap.MapType()) // 地图类型切换

    // 添加兴山县标记
    const marker = new AMap.Marker({
      position: mapConfig.center,
      title: '湖北省宜昌市兴山县',
      icon: new AMap.Icon({
        size: new AMap.Size(40, 50),
        image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        imageSize: new AMap.Size(40, 50)
      })
    })
    marker.setMap(mapInstance)

    // 添加信息窗口
    const infoWindow = new AMap.InfoWindow({
      content: `<div style="padding: 10px;"><h3>兴山县</h3><p>位于湖北省宜昌市，长江三峡的西首</p><p>被誉为"三峡明珠·神仙故里"</p></div>`,
      offset: new AMap.Pixel(0, -30)
    })

    // 绑定点击事件
    marker.on('click', () => {
      infoWindow.open(mapInstance, mapConfig.center)
    })

    // 自动打开信息窗口
    infoWindow.open(mapInstance, mapConfig.center)

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

// 处理窗口大小变化
const handleWindowResize = () => {
  if (mapInstance) {
    mapInstance.resize()
  }
}

// 组件挂载后初始化地图
onMounted(() => {
  initMap()
  window.addEventListener('resize', handleWindowResize)
})

// 组件卸载前销毁地图实例
onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="satellite-map-container">
    <div class="map-header">
      <h2>湖北省宜昌市兴山县卫星地图</h2>
      <p class="map-description">通过高德地图API获取的真实卫星地图数据</p>
    </div>
    <div ref="mapRef" class="map-content"></div>
    <div class="map-tips">
      <p>💡 提示：</p>
      <p>1. 请先在高德地图开放平台申请API密钥，并替换代码中的apiKey</p>
      <p>2. 使用鼠标滚轮可以缩放地图，拖动可以平移地图</p>
      <p>3. 右上角工具栏可以切换地图类型和视角</p>
    </div>
  </div>
</template>

<style scoped>
.satellite-map-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0D1136 0%, #1A2151 100%);
  color: #fff;
  padding: 20px;
  box-sizing: border-box;
}

.map-header {
  text-align: center;
  margin-bottom: 20px;
}

.map-header h2 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 10px 0;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.map-description {
  font-size: 16px;
  color: #b3b3b3;
  margin: 0;
}

.map-content {
  flex: 1;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
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
</style>
