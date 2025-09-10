<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as echarts from 'echarts'
import companyLogo from '@/assets/companyLogo.jpg'

// 图表实例引用
const photovoltaicChartRef = ref<HTMLDivElement>()
const waterInflowChartRef = ref<HTMLDivElement>()
const powerComparisonChartRef = ref<HTMLDivElement>()
const windPowerChartRef = ref<HTMLDivElement>()

// 光伏出力数据（拟合数据） - 本地时间前一年内
const generatePhotovoltaicData = () => {
  const data = []
  const now = new Date();
  // 计算本地时间前一年的时间点
  const baseTime = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
  const interval = 30 * 24 * 60 * 60 * 1000; // 约1个月间隔

  for (let i = 0; i < 12; i++) {
    // 从去年的本月开始，向后推移12个月
    const time = new Date(baseTime + i * interval);
    const formattedTime = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
    const month = time.getMonth() + 1; // 获取月份（1-12）

    // 使用余弦函数创建平滑的单波峰曲线：1月最低，7月最高
    // 波峰值为27.7，波谷值为5.0
    // 使用平滑的余弦函数来确保坡度均匀变化
    const peakValue = 27.7;
    const valleyValue = 5.0;
    const amplitude = (peakValue - valleyValue) / 2;
    const midPoint = valleyValue + amplitude;
    
    // 计算月份在12个月周期中的位置（1月为起点，转换为0-2π范围）
    // 调整相位使7月为波峰（1月为波谷）
    const phase = ((month - 1) / 12) * 2 * Math.PI - Math.PI;
    
    // 使用余弦函数创建平滑的单波峰曲线
    // 添加一个轻微的非线性因子来微调曲线形状，使坡度变化更加均匀
    let value = midPoint + amplitude * Math.cos(phase);
    
    // 添加一个小的波动因子使曲线更加平滑自然
    const fluctuation = 0.2 * Math.sin(phase * 3);
    value = value + fluctuation;
    
    // 确保值精确到小数点后一位
    value = Math.round(value * 10) / 10;

    data.push([formattedTime, value])
  }
  return data
}

// 入库流量数据（拟合数据） - 本地时间前一年内
const generateWaterInflowData = () => {
  const data = []
  const now = new Date();
  // 计算本地时间前一年的时间点
  const baseTime = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
  const interval = 30 * 24 * 60 * 60 * 1000; // 约1个月间隔

  for (let i = 0; i < 12; i++) {
    // 从去年的本月开始，向后推移12个月
    const time = new Date(baseTime + i * interval);
    const formattedTime = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
    const month = time.getMonth() + 1; // 获取月份（1-12）

    // 使用余弦函数创建平滑的单波峰曲线：1月最低，7月最高
    // 波峰值为225，波谷值为25
    // 使用平滑的余弦函数来确保坡度均匀变化
    const peakValue = 225;
    const valleyValue = 25;
    const amplitude = (peakValue - valleyValue) / 2;
    const midPoint = valleyValue + amplitude;
    
    // 计算月份在12个月周期中的位置（1月为起点，转换为0-2π范围）
    // 调整相位使7月为波峰（1月为波谷）
    const phase = ((month - 1) / 12) * 2 * Math.PI - Math.PI;
    
    // 使用余弦函数创建平滑的单波峰曲线
    // 添加一个轻微的非线性因子来微调曲线形状，使坡度变化更加均匀
    let value = midPoint + amplitude * Math.cos(phase);
    
    // 添加一个小的波动因子使曲线更加平滑自然
    const fluctuation = 0.5 * Math.sin(phase * 3);
    value = value + fluctuation;
    
    // 确保值精确到两位小数
    value = Math.round(value * 100) / 100;

    data.push([formattedTime, value])
  }
  return data
}

// 风电出力数据（拟合数据） - 本地时间前一年内
const generateWindPowerData = () => {
  const data = []
  const now = new Date();
  // 计算本地时间前一年的时间点
  const baseTime = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
  const interval = 30 * 24 * 60 * 60 * 1000; // 约1个月间隔

  for (let i = 0; i < 12; i++) {
    // 从去年的本月开始，向后推移12个月
    const time = new Date(baseTime + i * interval);
    const formattedTime = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
    
    // 根据用户提供的样例图表创建风电出力数据
    // 数据范围大致在100-250之间，为每个数据添加随机小数
    let value = 0;
    // 生成随机小数（0-0.9）
    const randomDecimal = Math.random();
    
    if (i === 0) {
      value = 120 + randomDecimal;
    } else if (i === 1) {
      value = 210 + randomDecimal;
    } else if (i === 2) {
      value = 160 + randomDecimal;
    } else if (i === 3) {
      value = 180 + randomDecimal;
    } else if (i === 4) {
      value = 150 + randomDecimal;
    } else if (i === 5) {
      value = 140 + randomDecimal;
    } else if (i === 6) {
      value = 160 + randomDecimal;
    } else if (i === 7) {
      value = 170 + randomDecimal;
    } else if (i === 8) {
      value = 235 + randomDecimal;
    } else if (i === 9) {
      value = 240 + randomDecimal;
    } else if (i === 10) {
      value = 230 + randomDecimal;
    } else if (i === 11) {
      value = 220 + randomDecimal;
    }

    // 确保值精确到小数点后一位
    value = Math.round(value * 10) / 10;

    data.push([formattedTime, value])
  }
  return data
}

// 电力对比数据（拟合数据） - 1年以内
const generatePowerComparisonData = () => {
  const photovoltaicData = []
  const waterPowerData = []
  const baseTime = new Date().getTime() // 从当前实时时间开始
  const interval = 30 * 24 * 60 * 60 * 1000 // 约1个月间隔

  for (let i = 0; i < 12; i++) {
    const time = new Date(baseTime + i * interval)
    const formattedTime = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`

    // 光伏出力数据
    photovoltaicData.push([formattedTime, Math.round(300 + 100 * Math.sin(i * 0.7))])
    // 水电出力数据
    waterPowerData.push([formattedTime, Math.round(300 + 150 * Math.sin(i * 0.6 + 1.5))])
  }

  return {
    photovoltaicData,
    waterPowerData
  }
}

// 初始化光伏出力图表
const initPhotovoltaicChart = () => {
  if (!photovoltaicChartRef.value) return

  const chart = echarts.init(photovoltaicChartRef.value)
  const data = generatePhotovoltaicData()

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const date = params[0].name
        // 检查value是数组还是简单值
        const value = Array.isArray(params[0].value) ? params[0].value[1] : params[0].value
        return `Time: ${date}<br/>光伏出力: ${value}`
      },
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#80FFA5',
      textStyle: {
        color: '#fff'
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
      data: data.map(item => item[0]),
      axisLabel: {
        formatter: function (value: string) {
          const date = new Date(value)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        },
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#80FFA5'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '出力(kW)',
      min: 0,
      max: 30,
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0',
        formatter: '{value}'
      },
      axisLine: {
        lineStyle: {
          color: '#d9a84c'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(128, 255, 165, 0.2)'
        }
      }
    },
    series: [{
      name: '光伏出力',
      type: 'line',
      data: data.map(item => item[1]),
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(128, 255, 165, 0.8)' },
          { offset: 1, color: 'rgba(128, 255, 165, 0.2)' }
        ])
      },
      lineStyle: {
        color: '#80FFA5',
        width: 2
      },
      itemStyle: {
        color: '#80FFA5'
      }
    }]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 初始化入库流量图表
const initWaterInflowChart = () => {
  if (!waterInflowChartRef.value) return

  const chart = echarts.init(waterInflowChartRef.value)
  const data = generateWaterInflowData()

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const date = params[0].name
        // 检查value是数组还是简单值
        const value = Array.isArray(params[0].value) ? params[0].value[1] : params[0].value
        // 格式化值为两位小数
        const formattedValue = value.toFixed(2)
        return `Time: ${date}<br/>入库流量: ${formattedValue}`
      },
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#00DDFF',
      textStyle: {
        color: '#fff'
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
      data: data.map(item => item[0]),
      axisLabel: {
        formatter: function (value: string) {
          const date = new Date(value)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        },
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#00DDFF'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '流量(m³/a)',
      min: 0,
      max: 250,
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#00DDFF'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 221, 255, 0.2)'
        }
      }
    },
    series: [{
      name: '入库流量',
      type: 'line',
      data: data.map(item => item[1]),
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 221, 255, 0.8)' },
          { offset: 1, color: 'rgba(0, 221, 255, 0.2)' }
        ])
      },
      lineStyle: {
        color: '#00DDFF',
        width: 2
      },
      itemStyle: {
        color: '#00DDFF'
      }
    }]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 初始化电力对比图表
const initPowerComparisonChart = () => {
  if (!powerComparisonChartRef.value) return

  const chart = echarts.init(powerComparisonChartRef.value)
  const { photovoltaicData, waterPowerData } = generatePowerComparisonData()

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        let result = `Time: ${params[0].name}<br/>`
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${param.value[1]}<br/>`
        })
        return result
      },
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#37A2FF',
      textStyle: {
        color: '#fff'
      }
    },
    legend: {
      data: ['光伏出力', '水电出力'],
      top: 0,
      textStyle: {
        color: '#00BFFF'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: photovoltaicData.map(item => item[0]),
      axisLabel: {
        formatter: function (value: string) {
          const date = new Date(value)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        },
        color: '#fff'
      },
      axisLine: {
        lineStyle: {
          color: '#37A2FF'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '出力(kW)',
      min: 0,
      max: 1,
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#ffd04b'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(50, 50, 50, 0.5)'
        }
      }
    },
    series: [
      {
        name: '光伏出力',
        type: 'line',
        data: photovoltaicData.map(item => [item[0], item[1] / 500]),
        lineStyle: {
          color: '#80FFA5',
          width: 2
        },
        itemStyle: {
          color: '#80FFA5'
        }
      },
      {
        name: '水电出力',
        type: 'line',
        data: waterPowerData.map(item => [item[0], item[1] / 500]),
        lineStyle: {
          color: '#37A2FF',
          width: 2
        },
        itemStyle: {
          color: '#37A2FF'
        }
      }
    ]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 初始化风电出力图表
const initWindPowerChart = () => {
  if (!windPowerChartRef.value) return

  const chart = echarts.init(windPowerChartRef.value)
  const data = generateWindPowerData()

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: function (params: any) {
        const date = params[0].name
        // 检查value是数组还是简单值
        const value = Array.isArray(params[0].value) ? params[0].value[1] : params[0].value
        // 格式化值为一位小数
        const formattedValue = value.toFixed(1)
        return `Time: ${date}<br/>风电出力: ${formattedValue}`
      },
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#FF9500',
      textStyle: {
        color: '#fff'
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
      data: data.map(item => item[0]),
      axisLabel: {
        formatter: function (value: string) {
          const date = new Date(value)
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        },
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#FF9500'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '出力(MW)',
      min: 100,
      max: 300,
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#FF9500'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(255, 149, 0, 0.2)'
        }
      }
    },
    series: [{
      name: '风电出力',
      type: 'line',
      data: data.map(item => item[1]),
      lineStyle: {
        color: '#FF9500',
        width: 2
      },
      itemStyle: {
        color: '#FF9500'
      }
    },
    {
      name: '趋势线',
      type: 'line',
      data: data.map((item, index) => [item[0], 150 + index * 5.8]),
      lineStyle: {
        color: '#00DDFF',
        width: 1,
        type: 'dashed'
      },
      showSymbol: false,
      tooltip: { show: false }
    }]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 组件挂载后初始化图表
onMounted(() => {
  // 延迟初始化，确保DOM已渲染
  setTimeout(() => {
    initPhotovoltaicChart()
    initWaterInflowChart()
    initPowerComparisonChart()
    initWindPowerChart()
  }, 100)
})
</script>

<template>
  <div class="complementary-analysis-container">
    <div class="header-title">
      <h2>互补分析</h2>
      <div class="date-display">{{ new Date().toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day:
          '2-digit',
      }) }}</div>
    </div>
    <!-- 图表区域 -->
    <div class="charts-wrapper">
      <!-- 光伏出力图表 -->
      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title">光伏出力</span>
        </div>
        <div ref="photovoltaicChartRef" class="chart-container"></div>
      </div>

      <!-- 入库流量图表 -->
      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title">入库流量</span>
        </div>
        <div ref="waterInflowChartRef" class="chart-container"></div>
      </div>

      <!-- 电力对比图表 -->
      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title">电力对比</span>
        </div>
        <div ref="powerComparisonChartRef" class="chart-container"></div>
      </div>

      <!-- 风电出力图表 -->
      <div class="chart-item">
        <div class="chart-header">
          <span class="chart-title">风电出力</span>
        </div>
        <div ref="windPowerChartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.complementary-analysis-container {
  width: 100%;
  min-height: 100vh;
  background-image: url('@/assets/mainbg2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

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

.header-title h2 {
  color: #fff;
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.date-display {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 400;
}

.logo {
  height: 100%;
  max-height: 60px;
  object-fit: contain;
  margin: 0 auto;
}

.charts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 10px;
}

.chart-item {
  background: rgba(84, 92, 100, 0.8);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 350px;
  backdrop-filter: blur(10px);
}

.chart-header {
  padding: 15px 20px;
  background-color: rgba(84, 92, 100, 0.9);
  border-bottom: 1px solid #00BFFF;
  flex-shrink: 0;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #00BFFF;
}

.chart-container {
  width: 100%;
  flex: 1;
  min-height: 300px;
}

/* 自定义滚动条 */
.charts-wrapper::-webkit-scrollbar {
  width: 8px;
}

.charts-wrapper::-webkit-scrollbar-track {
  background: rgba(51, 51, 51, 0.5);
  border-radius: 4px;
}

.charts-wrapper::-webkit-scrollbar-thumb {
  background: #00BFFF;
  border-radius: 4px;
}

.charts-wrapper::-webkit-scrollbar-thumb:hover {
  background: #9fe9f0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .complementary-analysis-container {
    padding: 15px;
  }

  .chart-item {
    min-height: 320px;
  }

  .chart-container {
    min-height: 270px;
  }
}

@media (max-width: 768px) {
  .complementary-analysis-container {
    padding: 10px;
  }

  .header {
    margin-bottom: 15px;
    height: 50px;
  }

  .logo {
    max-height: 50px;
  }

  .charts-wrapper {
    gap: 15px;
  }

  .chart-item {
    min-height: 280px;
  }

  .chart-header {
    padding: 10px 15px;
  }

  .chart-title {
    font-size: 14px;
  }

  .chart-container {
    min-height: 240px;
  }
}

@media (max-width: 480px) {
  .complementary-analysis-container {
    padding: 8px;
  }

  .chart-item {
    min-height: 250px;
  }

  .chart-container {
    min-height: 210px;
  }
}
</style>
