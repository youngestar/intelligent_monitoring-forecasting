<template>
  <p class="title" style="position: relative; top: 3vh">地图展示 - 中国各地区安全事件分布</p>
  <div ref="chartRef" :style="{ width: props.width, height: props.height }" style="position: relative; top: 2vh"></div>
</template>

<script setup lang="ts">
// props 传参
const props = withDefaults(
  defineProps<{
    height: string // 必传，类型为 string
    width?: string // 可选，类型为 string
  }>(),
  {
    height: '50vh',
    width: '100%', // 默认值（如果未传 width，则使用 '100%'）
  },
)

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

// 模拟中国各省份安全事件数据
const securityEventData = [
  { name: '北京', value: 85 },
  { name: '天津', value: 45 },
  { name: '河北', value: 65 },
  { name: '山西', value: 55 },
  { name: '内蒙古', value: 40 },
  { name: '辽宁', value: 70 },
  { name: '吉林', value: 50 },
  { name: '黑龙江', value: 45 },
  { name: '上海', value: 90 },
  { name: '江苏', value: 80 },
  { name: '浙江', value: 85 },
  { name: '安徽', value: 60 },
  { name: '福建', value: 75 },
  { name: '江西', value: 55 },
  { name: '山东', value: 75 },
  { name: '河南', value: 65 },
  { name: '湖北', value: 70 },
  { name: '湖南', value: 60 },
  { name: '广东', value: 95 },
  { name: '广西', value: 50 },
  { name: '海南', value: 35 },
  { name: '重庆', value: 70 },
  { name: '四川', value: 75 },
  { name: '贵州', value: 45 },
  { name: '云南', value: 55 },
  { name: '西藏', value: 20 },
  { name: '陕西', value: 65 },
  { name: '甘肃', value: 40 },
  { name: '青海', value: 25 },
  { name: '宁夏', value: 35 },
  { name: '新疆', value: 50 },
  { name: '台湾', value: 60 },
  { name: '香港', value: 80 },
  { name: '澳门', value: 50 }
]

// 导入地图数据
import chinaMapData from '@/assets/china-map.json'

// 初始化图表的函数
const initChart = async () => {
  // 获取图表容器的 DOM 元素
  const chartDom = chartRef.value
  if (!chartDom) return

  // 初始化 ECharts 实例
  myChart = echarts.init(chartDom)

  try {
    // 注册地图数据，使用as any避免JSON数据的类型检查问题
    echarts.registerMap('china', chinaMapData as any)

    // 配置图表选项
    option = {
      tooltip: {
        trigger: 'item',
        formatter: function (params) {
          return `${params.name}: ${params.value || 0} 件安全事件`
        },
        textStyle: {
          fontSize: 12
        },
        extraCssText: 'width: auto; height: auto;'
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
          name: '安全事件',
          type: 'map',
          map: 'china',
          emphasis: {
            label: {
              show: true,
              color: '#fff'
            },
            itemStyle: {
              areaColor: '#3274ff'
            }
          },
          select: {
            label: {
              show: true,
              color: '#fff'
            },
            itemStyle: {
              areaColor: '#1890ff'
            }
          },
          roam: true, // 启用缩放和平移
          label: {
            show: false,
            color: '#fff'
          },
          data: securityEventData,
          // 设置地图投影方式和中心点
          geoIndex: 0
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
          text: '地图数据加载失败',
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

// 调整图表配置以适应窗口大小的函数
const adjustChartOptions = () => {
  if (!option || !myChart) return

  const scaleFactor = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  const minFontSize = 8

  // 调整提示框字体大小
  option.tooltip.textStyle.fontSize = Math.max(minFontSize, 12 * scaleFactor)

  const tooltipLegendSize = Math.max(minFontSize, 14 * scaleFactor)
  option.tooltip.extraCssText = `
        width: auto;
        height: auto;
        .echarts-tooltip .echarts-tooltip-series-label span {
            width: ${tooltipLegendSize}px;
            height: ${tooltipLegendSize}px;
        }
    `

  // 调整视觉映射组件的字体大小
  if (option.visualMap) {
    option.visualMap.textStyle.fontSize = Math.max(minFontSize, 12 * scaleFactor)
    option.visualMap.itemWidth = Math.max(minFontSize, 20 * scaleFactor)
    option.visualMap.itemHeight = Math.max(minFontSize, 140 * scaleFactor)
    option.visualMap.bottom = 10 * scaleFactor
    option.visualMap.width = `${Math.max(20, 60 * scaleFactor)}%`
  }

  // 更新图表配置
  myChart.setOption(option)
}

// 处理窗口大小变化的函数
const handleWindowResize = () => {
  if (myChart) {
    myChart.resize()
    adjustChartOptions()
  }
}

// 在组件挂载后初始化图表并监听窗口大小变化
onMounted(() => {
  initChart()
  window.addEventListener('resize', handleWindowResize)
  // 延迟调整以确保组件已完全渲染
  setTimeout(adjustChartOptions, 100)
})

// 在组件卸载前销毁图表实例并移除事件监听器
onBeforeUnmount(() => {
  if (myChart) {
    myChart.dispose()
  }
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped>
/* 可以在这里添加组件的样式 */
.title {
  font-size: 1.6vh;
  margin-left: 1em;
  margin-top: 1em;
}
</style>
