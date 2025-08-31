<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
// 按需引入 echarts 核心模块
import * as echarts from 'echarts/core'
// 引入需要的组件
import {
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  GeoComponent
} from 'echarts/components'
// 引入地图图表
import { MapChart } from 'echarts/charts'
// 引入 Canvas 渲染器
import { CanvasRenderer } from 'echarts/renderers'

// 注册必须的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  GeoComponent,
  MapChart,
  CanvasRenderer
])

// 使用 ref 创建一个响应式的 DOM 引用
const chartRef = ref(null)
let myChart = null
let option = null

// 导入兴山县地图数据
import xingshanMapData from '@/assets/xingshan-county.json'

// 模拟兴山县各地区数据
const xingshanData = [
  { name: '兴山县', value: 80 },
  { name: '古夫镇', value: 30 },
  { name: '昭君镇', value: 25 },
  { name: '峡口镇', value: 20 }
]

// 初始化图表的函数
const initChart = async () => {
  // 获取图表容器的 DOM 元素
  const chartDom = chartRef.value
  if (!chartDom) return

  // 初始化 ECharts 实例
  myChart = echarts.init(chartDom)

  try {
    // 注册地图数据
    echarts.registerMap('xingshan', xingshanMapData)

    // 配置图表选项
    option = {
      title: {
        text: '湖北省宜昌市兴山县地图',
        subtext: '示例数据展示',
        left: 'center',
        textStyle: {
          color: '#fff',
          fontSize: 20
        },
        subtextStyle: {
          color: '#ccc',
          fontSize: 14
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function (params) {
          return `${params.name}: ${params.value || 0} 个单位`
        },
        textStyle: {
          fontSize: 14,
          color: '#333'
        },
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#00BFFF',
        borderWidth: 1
      },
      visualMap: {
        min: 0,
        max: 100,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        textStyle: {
          color: '#fff'
        },
        calculable: true,
        inRange: {
          color: ['#e6f7ff', '#bae7ff', '#91d5ff', '#69c0ff', '#40a9ff', '#1890ff', '#096dd9']
        }
      },
      series: [
        {
          name: '示例数据',
          type: 'map',
          map: 'xingshan',
          emphasis: {
            label: {
              show: true,
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16
            },
            itemStyle: {
              areaColor: '#3274ff',
              borderColor: '#fff',
              borderWidth: 2
            }
          },
          select: {
            label: {
              show: true,
              color: '#fff',
              fontWeight: 'bold'
            },
            itemStyle: {
              areaColor: '#1890ff',
              borderColor: '#fff'
            }
          },
          roam: true, // 启用缩放和平移
          label: {
            show: true,
            color: '#fff',
            fontSize: 14,
            fontWeight: 'normal'
          },
          data: xingshanData,
          // 设置地图投影方式和中心点
          geoIndex: 0,
          // 调整地图中心点和缩放级别
          zoom: 10,
          center: [110.78, 31.20]
        }
      ]
    }

    // 应用配置项
    myChart.setOption(option)
  } catch (error) {
    console.error('地图初始化失败:', error)
    // 当无法加载地图数据时，显示提示信息
    if (myChart) {
      myChart.setOption({
        title: {
          text: '兴山县地图数据加载失败',
          left: 'center',
          top: 'center',
          textStyle: {
            color: '#fff',
            fontSize: 16
          }
        },
        graphic: [
          {
            type: 'text',
            left: 'center',
            top: '60%',
            style: {
              text: '请检查地图数据文件是否正确',
              fill: '#fff',
              fontSize: 14
            }
          }
        ]
      })
    }
  }
}

// 处理窗口大小变化的函数
const handleWindowResize = () => {
  if (myChart) {
    myChart.resize()
  }
}

// 在组件挂载后初始化图表并监听窗口大小变化
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleWindowResize)
})

// 在组件卸载前销毁图表实例并移除事件监听器
onBeforeUnmount(() => {
  if (myChart) {
    myChart.dispose()
  }
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div class="xingshan-map-container">
    <div class="map-header">
      <h1>湖北省宜昌市兴山县地图</h1>
      <router-link to="/satelliteMap" class="satellite-map-link">
        <button class="satellite-btn">
          查看卫星地图
        </button>
      </router-link>
    </div>
    <div ref="chartRef" :style="{ width: '100%', height: '80vh' }"></div>
  </div>
</template>

<style scoped>
.xingshan-map-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0D1136 0%, #1A2151 100%);
}

.map-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.map-header h1 {
  margin: 0;
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.satellite-btn {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.satellite-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.satellite-btn:active {
  transform: translateY(0);
}

:deep(.echarts) {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 191, 255, 0.15);
  border: 1px solid rgba(0, 191, 255, 0.3);
}
</style>
