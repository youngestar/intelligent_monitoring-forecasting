<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import companyLogo from '@/assets/companyLogo.jpg'
import { ElTable, ElTableColumn, ElTabPane, ElTabs, ElButton, ElCard, ElDivider, ElInputNumber, ElSwitch, ElPopover, ElForm, ElFormItem, ElDialog, ElSlider, ElInput } from 'element-plus'

// 图表实例引用
const powerComparisonChartRef = ref<HTMLDivElement>()
const waterStorageChartRef = ref<HTMLDivElement>()
const loadChartRef = ref<HTMLDivElement>()
const integratedDispatchChartRef = ref<HTMLDivElement>()

// 当前活动的标签页
const activeTab = ref('realtime')

// 起调水位
const startLevel = ref<number>(3000)

// 表单数据
const formData = ref({
  loadData: true,
  inflowData: true,
  photovoltaicData: true,
  windData: true,
  energyStorageData: true
})

// 手动调参配置
const paramsConfig = ref({
  // 电力对比图表参数
  powerComparison: {
    photovoltaicAmplitude: 800, // 光伏出力振幅
    waterPowerAmplitude: 300, // 水电出力振幅
    windPowerAmplitude: 200, // 风电出力振幅
    energyStorageAmplitude: 100, // 储能出力振幅
    loadAmplitude: 500, // 负荷振幅
    randomFactor: 0.2 // 随机波动因子
  },
  // 水位图表参数
  waterLevel: {
    fluctuationRange: 5, // 水位波动范围
    randomRange: 2, // 随机波动范围
    trendFactor: 0.5 // 趋势因子
  },
  // 负荷图表参数
  load: {
    baseLoad: 2500, // 基础负荷
    amplitude: 500, // 负荷振幅
    forecastAccuracy: 0.95 // 预测准确率 (0-1)
  },
  // 综合调度图表参数
  integratedDispatch: {
    efficiencyFactor: 1.0, // 效率因子
    deviationFactor: 0.02 // 偏差因子
  }
})

// 调参对话框状态
const paramDialogVisible = ref(false)
const currentChartType = ref('powerComparison')

// 打开调参对话框
const openParamDialog = (chartType: string) => {
  currentChartType.value = chartType
  paramDialogVisible.value = true
}

// 处理对话框关闭
const handleClose = () => {
  paramDialogVisible.value = false
}

// 保存参数
const saveParameters = () => {
  console.log('保存参数', paramsConfig.value)
  paramDialogVisible.value = false
  // 更新图表
  updateAllCharts()
}

// 更新所有图表
const updateAllCharts = () => {
  setTimeout(() => {
    initPowerComparisonChart()
    initWaterLevelChart()
    initLoadChart()
    initIntegratedDispatchChart()
  }, 100)
}

// 监听表单数据变化，更新图表
watch(formData, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log('表单数据变化，更新图表')
    setTimeout(() => {
      initPowerComparisonChart()
      initWaterLevelChart()
      initLoadChart()
      initIntegratedDispatchChart()
    }, 100)
  }
}, { deep: true })

// 监听参数配置变化，更新图表
watch(paramsConfig, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log('参数配置变化，更新图表')
    updateAllCharts()
  }
}, { deep: true })

// 监听起调水位变化，更新水位图表
watch(startLevel, (newValue, oldValue) => {
  if (newValue !== oldValue) {
    console.log(`起调水位变化为${newValue}，更新水位图表`)
    setTimeout(() => {
      initWaterLevelChart()
    }, 100)
  }
})

// 生成电力对比数据 - 根据标签页类型、表单选项和手动参数返回不同的数据
const generatePowerComparisonData = (tabType: string) => {
  const times = []
  const photovoltaicData = []
  const waterPowerData = []
  const windPowerData = []
  const energyStorageData = []
  const totalLoadData = []

  const { photovoltaicAmplitude, waterPowerAmplitude, windPowerAmplitude, energyStorageAmplitude, loadAmplitude, randomFactor } = paramsConfig.value.powerComparison

  if (tabType === 'realtime') {
    // 实时调度 - 小时级数据，波动较大
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)

      // 实时数据波动较大
      photovoltaicData.push(formData.value.photovoltaicData ? (i >= 6 && i <= 18 ? Math.round(1000 + photovoltaicAmplitude * Math.sin((i - 6) * Math.PI / 12) + (Math.random() - 0.5) * photovoltaicAmplitude * randomFactor * 2) : 0) : 0)
      waterPowerData.push(Math.round(1200 + waterPowerAmplitude * Math.sin(i * Math.PI / 12) + (Math.random() - 0.5) * waterPowerAmplitude * randomFactor))
      windPowerData.push(formData.value.windData ? Math.round(500 + windPowerAmplitude * Math.sin((i + 3) * Math.PI / 12) + (Math.random() - 0.5) * windPowerAmplitude * randomFactor * 1.5) : 0)
      energyStorageData.push(formData.value.energyStorageData ? Math.round(300 + energyStorageAmplitude * Math.sin((i + 9) * Math.PI / 12) + (Math.random() - 0.5) * energyStorageAmplitude * randomFactor) : 0)
      totalLoadData.push(formData.value.loadData ? Math.round(2500 + loadAmplitude * Math.sin((i - 3) * Math.PI / 12) + (Math.random() - 0.5) * loadAmplitude * randomFactor) : 0)
    }
  } else if (tabType === 'shortterm') {
    // 短期调度 - 日级数据，较平滑，预报性
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)

      // 预报数据较平滑
      photovoltaicData.push(formData.value.photovoltaicData ? (i >= 6 && i <= 18 ? Math.round(1000 + photovoltaicAmplitude * Math.sin((i - 6) * Math.PI / 12)) : 0) : 0)
      waterPowerData.push(Math.round(1200 + waterPowerAmplitude * Math.sin(i * Math.PI / 12)))
      windPowerData.push(formData.value.windData ? Math.round(500 + windPowerAmplitude * Math.sin((i + 3) * Math.PI / 12)) : 0)
      energyStorageData.push(formData.value.energyStorageData ? Math.round(300 + energyStorageAmplitude * Math.sin((i + 9) * Math.PI / 12)) : 0)
      totalLoadData.push(formData.value.loadData ? Math.round(2500 + loadAmplitude * Math.sin((i - 3) * Math.PI / 12)) : 0)
    }
  } else if (tabType === 'longterm') {
    // 中长期调度 - 周级或月级数据，统计特性
    const dailyData = 24
    for (let i = 0; i < dailyData; i++) {
      const time = `${Math.floor(i / 4).toString().padStart(2, '0')}:${Math.floor(i % 4) * 15}0`
      times.push(time)

      // 中长期数据更加平稳，体现趋势
      photovoltaicData.push(formData.value.photovoltaicData ? (i >= 6 && i <= 18 ? Math.round(1000 + photovoltaicAmplitude * Math.sin((i - 6) * Math.PI / 12) * (0.8 + Math.random() * 0.4)) : 0) : 0)
      waterPowerData.push(Math.round(1200 + waterPowerAmplitude * Math.sin(i * Math.PI / 12) * (0.85 + Math.random() * 0.3)))
      windPowerData.push(formData.value.windData ? Math.round(500 + windPowerAmplitude * Math.sin((i + 3) * Math.PI / 12) * (0.8 + Math.random() * 0.4)) : 0)
      energyStorageData.push(formData.value.energyStorageData ? Math.round(300 + energyStorageAmplitude * Math.sin((i + 9) * Math.PI / 12) * (0.9 + Math.random() * 0.2)) : 0)
      totalLoadData.push(formData.value.loadData ? Math.round(2500 + loadAmplitude * Math.sin((i - 3) * Math.PI / 12) * (0.9 + Math.random() * 0.2)) : 0)
    }
  }

  return { times, photovoltaicData, waterPowerData, windPowerData, energyStorageData, totalLoadData }
}

// 生成水位数据 - 根据标签页类型和手动参数返回不同的数据
const generateWaterLevelData = (tabType: string) => {
  const times = []
  const data = []

  const { fluctuationRange, randomRange, trendFactor } = paramsConfig.value.waterLevel

  if (tabType === 'realtime') {
    // 实时调度 - 水位变化较频繁
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)
      data.push(startLevel.value + Math.round(fluctuationRange * Math.sin(i * Math.PI / 12) + (Math.random() - 0.5) * randomRange))
    }
  } else if (tabType === 'shortterm') {
    // 短期调度 - 水位变化较平缓，预报性
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)
      data.push(startLevel.value + Math.round(fluctuationRange * Math.sin(i * Math.PI / 12)))
    }
  } else if (tabType === 'longterm') {
    // 中长期调度 - 水位变化趋势明显，波动小
    for (let i = 0; i < 24; i++) {
      const time = `${Math.floor(i / 4).toString().padStart(2, '0')}:${Math.floor(i % 4) * 15}0`
      times.push(time)
      // 中长期水位变化趋势更明显
      const baseLevel = startLevel.value - 3 + Math.floor(i / 6) * trendFactor
      data.push(baseLevel + Math.round((fluctuationRange * 0.4) * Math.sin(i * Math.PI / 12)))
    }
  }

  return { times, data }
}

// 生成负荷数据 - 根据标签页类型和表单选项返回不同的数据
const generateLoadData = (tabType: string) => {
  const times = []
  const loadData = []
  const forecastData = []

  if (!formData.value.loadData) {
    // 如果负荷数据选项未开启，返回空数据
    if (tabType === 'longterm') {
      for (let i = 0; i < 24; i++) {
        const time = `${Math.floor(i / 4).toString().padStart(2, '0')}:${Math.floor(i % 4) * 15}0`
        times.push(time)
        loadData.push(0)
        forecastData.push(0)
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const time = `${i.toString().padStart(2, '0')}:00`
        times.push(time)
        loadData.push(0)
        forecastData.push(0)
      }
    }
    return { times, loadData, forecastData }
  }

  const { baseLoad, amplitude, forecastAccuracy } = paramsConfig.value.load

  if (tabType === 'realtime') {
    // 实时调度 - 负荷波动较大，预测准确率高
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)

      // 实际负荷波动较大
      loadData.push(Math.round(baseLoad + amplitude * Math.sin((i - 3) * Math.PI / 12) + (Math.random() - 0.5) * amplitude * 0.3))
      // 预测负荷（实时预测精度高）
      const accuracyRange = 1 - forecastAccuracy
      forecastData.push(Math.round(loadData[i] * (forecastAccuracy + Math.random() * accuracyRange * 0.5)))
    }
  } else if (tabType === 'shortterm') {
    // 短期调度 - 负荷预测精度适中
    for (let i = 0; i < 24; i++) {
      const time = `${i.toString().padStart(2, '0')}:00`
      times.push(time)

      // 实际负荷
      loadData.push(Math.round(baseLoad + amplitude * Math.sin((i - 3) * Math.PI / 12)))
      // 预测负荷（短期预测与实际有一定差异）
      const accuracyRange = 1 - forecastAccuracy
      forecastData.push(Math.round(loadData[i] * (forecastAccuracy * 0.95 + Math.random() * accuracyRange)))
    }
  } else if (tabType === 'longterm') {
    // 中长期调度 - 负荷预测更加关注趋势
    for (let i = 0; i < 24; i++) {
      const time = `${Math.floor(i / 4).toString().padStart(2, '0')}:${Math.floor(i % 4) * 15}0`
      times.push(time)

      // 中长期预测负荷
      const baseLoadValue = baseLoad + amplitude * Math.sin((i - 3) * Math.PI / 12)
      forecastData.push(Math.round(baseLoadValue))
      // 实际负荷（用于比较）
      loadData.push(Math.round(baseLoadValue * (forecastAccuracy * 0.9 + Math.random() * (1 - forecastAccuracy))))
    }
  }

  return { times, loadData, forecastData }
}

// 生成综合调度数据 - 根据标签页类型、表单选项和手动参数返回不同的数据
const generateIntegratedDispatchData = (tabType: string) => {
  // 根据表单选项过滤数据
  const generateFilteredData = (baseData: any[]) => {
    const filteredData = baseData.filter(item => {
      if (item.name === '光伏发电' && !formData.value.photovoltaicData) return false
      if (item.name === '风电发电' && !formData.value.windData) return false
      if (item.name === '储能出力' && !formData.value.energyStorageData) return false
      return true
    })

    // 计算调整后的发电总量
    if (filteredData.length > 0 && filteredData[0].name === '发电总量') {
      let totalPlanned = 0
      let totalActual = 0

      filteredData.forEach(item => {
        if (item.name !== '发电总量') {
          totalPlanned += item.value
          totalActual += item.actual
        }
      })

      if (totalPlanned > 0 && totalActual > 0) {
        filteredData[0].value = totalPlanned
        filteredData[0].actual = totalActual
      }
    }

    return filteredData
  }

  const { efficiencyFactor, deviationFactor } = paramsConfig.value.integratedDispatch

  if (tabType === 'realtime') {
    // 实时调度 - 小时级数据，数值较小
    const baseData = [
      { name: '发电总量', value: 3875.3 * efficiencyFactor, unit: 'kWh', actual: 3825.7 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '水电发电', value: 1967.8 * efficiencyFactor, unit: 'kWh', actual: 1948.9 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '光伏发电', value: 1045.6 * efficiencyFactor, unit: 'kWh', actual: 1029.8 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '风电发电', value: 897.6 * efficiencyFactor, unit: 'kWh', actual: 875.4 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '储能出力', value: 164.1 * efficiencyFactor, unit: 'kWh', actual: 171.6 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) }
    ]
    return generateFilteredData(baseData)
  } else if (tabType === 'shortterm') {
    // 短期调度 - 日级数据，数值适中
    const baseData = [
      { name: '发电总量', value: 89753.1 * efficiencyFactor, unit: 'kWh', actual: 88257.6 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '水电发电', value: 45678.9 * efficiencyFactor, unit: 'kWh', actual: 44892.3 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '光伏发电', value: 23456.7 * efficiencyFactor, unit: 'kWh', actual: 22987.6 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '风电发电', value: 18976.5 * efficiencyFactor, unit: 'kWh', actual: 18543.2 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '储能出力', value: 1641.0 * efficiencyFactor, unit: 'kWh', actual: 1834.5 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) }
    ]
    return generateFilteredData(baseData)
  } else if (tabType === 'longterm') {
    // 中长期调度 - 周级或月级数据，数值较大
    const baseData = [
      { name: '发电总量', value: 628271.7 * efficiencyFactor, unit: 'kWh', actual: 617803.2 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '水电发电', value: 319752.3 * efficiencyFactor, unit: 'kWh', actual: 314246.1 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '光伏发电', value: 164196.9 * efficiencyFactor, unit: 'kWh', actual: 160913.2 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '风电发电', value: 132835.5 * efficiencyFactor, unit: 'kWh', actual: 129802.4 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
      { name: '储能出力', value: 11487.0 * efficiencyFactor, unit: 'kWh', actual: 12841.5 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) }
    ]
    return generateFilteredData(baseData)
  }

  // 默认返回短期调度数据
  const baseData = [
    { name: '发电总量', value: 89753.1 * efficiencyFactor, unit: 'kWh', actual: 88257.6 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
    { name: '水电发电', value: 45678.9 * efficiencyFactor, unit: 'kWh', actual: 44892.3 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
    { name: '光伏发电', value: 23456.7 * efficiencyFactor, unit: 'kWh', actual: 22987.6 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
    { name: '风电发电', value: 18976.5 * efficiencyFactor, unit: 'kWh', actual: 18543.2 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) },
    { name: '储能出力', value: 1641.0 * efficiencyFactor, unit: 'kWh', actual: 1834.5 * efficiencyFactor * (1 + (Math.random() - 0.5) * deviationFactor) }
  ]
  return generateFilteredData(baseData)
}

// 初始化电力对比图表
const initPowerComparisonChart = () => {
  if (!powerComparisonChartRef.value) return

  const chart = echarts.init(powerComparisonChartRef.value)
  const { times, photovoltaicData, waterPowerData, windPowerData, energyStorageData, totalLoadData } = generatePowerComparisonData(activeTab.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#37A2FF',
      textStyle: {
        color: '#fff'
      }
    },
    legend: {
      data: ['光伏出力', '水电出力', '风电出力', '储能出力', '总负荷'],
      textStyle: {
        color: '#00BFFF'
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
      data: times,
      axisLabel: {
        color: '#9fe9f0'
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
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#37A2FF'
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
        data: photovoltaicData,
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
        data: waterPowerData,
        lineStyle: {
          color: '#00DDFF',
          width: 2
        },
        itemStyle: {
          color: '#00DDFF'
        }
      },
      {
        name: '风电出力',
        type: 'line',
        data: windPowerData,
        lineStyle: {
          color: '#37A2FF',
          width: 2
        },
        itemStyle: {
          color: '#37A2FF'
        }
      },
      {
        name: '储能出力',
        type: 'line',
        data: energyStorageData,
        lineStyle: {
          color: '#FFBF00',
          width: 2
        },
        itemStyle: {
          color: '#FFBF00'
        }
      },
      {
        name: '总负荷',
        type: 'line',
        data: totalLoadData,
        lineStyle: {
          color: '#FF0087',
          width: 3,
          type: 'dashed'
        },
        itemStyle: {
          color: '#FF0087'
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

// 初始化水位图表
const initWaterLevelChart = () => {
  if (!waterStorageChartRef.value) return

  const chart = echarts.init(waterStorageChartRef.value)
  const { times, data } = generateWaterLevelData(activeTab.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
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
      data: times,
      axisLabel: {
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
      name: '水位(m)',
      min: startLevel.value - 10,
      max: startLevel.value + 10,
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
          color: 'rgba(50, 50, 50, 0.5)'
        }
      }
    },
    series: [
      {
        name: '水位',
        type: 'line',
        data: data,
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
      }
    ]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 初始化负荷图表
const initLoadChart = () => {
  if (!loadChartRef.value) return

  const chart = echarts.init(loadChartRef.value)
  const { times, loadData, forecastData } = generateLoadData(activeTab.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#FF0087',
      textStyle: {
        color: '#fff'
      }
    },
    legend: {
      data: ['实际负荷', '预测负荷'],
      textStyle: {
        color: '#00BFFF'
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
      data: times,
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#FF0087'
        }
      }
    },
    yAxis: {
      type: 'value',
      name: '负荷(kW)',
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#FF0087'
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
        name: '实际负荷',
        type: 'line',
        data: loadData,
        lineStyle: {
          color: '#FF0087',
          width: 2
        },
        itemStyle: {
          color: '#FF0087'
        }
      },
      {
        name: '预测负荷',
        type: 'line',
        data: forecastData,
        lineStyle: {
          color: '#FFBF00',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#FFBF00'
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

// 初始化综合调度图表
const initIntegratedDispatchChart = () => {
  if (!integratedDispatchChartRef.value) return

  const chart = echarts.init(integratedDispatchChartRef.value)
  const data = generateIntegratedDispatchData(activeTab.value)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(51, 51, 51, 0.8)',
      borderColor: '#37A2FF',
      textStyle: {
        color: '#fff'
      },
      formatter: function (params: any) {
        const name = params[0].name
        const planned = params[0].value
        const actual = params[1].value
        const unit = params[0].seriesName
        return `${name}<br/>计划${unit}: ${planned}<br/>实际${unit}: ${actual}`
      }
    },
    legend: {
      data: ['计划值', '实际值'],
      textStyle: {
        color: '#00BFFF'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      nameTextStyle: {
        color: '#9fe9f0'
      },
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#37A2FF'
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(50, 50, 50, 0.5)'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        color: '#9fe9f0'
      },
      axisLine: {
        lineStyle: {
          color: '#37A2FF'
        }
      }
    },
    series: [
      {
        name: '计划值',
        type: 'bar',
        data: data.map(item => item.value),
        itemStyle: {
          color: '#37A2FF'
        },
        barWidth: 20
      },
      {
        name: '实际值',
        type: 'bar',
        data: data.map(item => item.actual),
        itemStyle: {
          color: '#00DDFF'
        },
        barWidth: 20
      }
    ]
  }

  chart.setOption(option)

  // 响应式调整
  window.addEventListener('resize', () => {
    chart.resize()
  })
}

// 综合调度数据表数据
const dispatchTableData = ref([
  {
    time: '00:00',
    waterPower: 1250,
    photovoltaic: 0,
    windPower: 450,
    energyStorage: 320,
    totalOutput: 2020,
    load: 2200,
    balance: -180
  },
  {
    time: '01:00',
    waterPower: 1220,
    photovoltaic: 0,
    windPower: 420,
    energyStorage: 280,
    totalOutput: 1920,
    load: 2100,
    balance: -180
  },
  {
    time: '02:00',
    waterPower: 1200,
    photovoltaic: 0,
    windPower: 400,
    energyStorage: 250,
    totalOutput: 1850,
    load: 2000,
    balance: -150
  },
  {
    time: '03:00',
    waterPower: 1180,
    photovoltaic: 0,
    windPower: 380,
    energyStorage: 220,
    totalOutput: 1780,
    load: 1900,
    balance: -120
  },
  {
    time: '04:00',
    waterPower: 1150,
    photovoltaic: 0,
    windPower: 360,
    energyStorage: 200,
    totalOutput: 1710,
    load: 1800,
    balance: -90
  },
  {
    time: '05:00',
    waterPower: 1120,
    photovoltaic: 0,
    windPower: 340,
    energyStorage: 180,
    totalOutput: 1640,
    load: 1850,
    balance: -210
  },
  {
    time: '06:00',
    waterPower: 1100,
    photovoltaic: 50,
    windPower: 320,
    energyStorage: 160,
    totalOutput: 1630,
    load: 2000,
    balance: -370
  },
  {
    time: '07:00',
    waterPower: 1080,
    photovoltaic: 300,
    windPower: 300,
    energyStorage: 140,
    totalOutput: 1820,
    load: 2200,
    balance: -380
  }
])

// 执行分析
const performAnalysis = () => {
  console.log('执行互补调度分析')
  // 根据当前表单选项和起调水位重新生成并更新图表
  setTimeout(() => {
    initPowerComparisonChart()
    initWaterLevelChart()
    initLoadChart()
    initIntegratedDispatchChart()
  }, 100)
}

// 重置参数
const resetParameters = () => {
  console.log('重置参数')
  startLevel.value = 3000
  // 重置表单选项
  formData.value = {
    loadData: true,
    inflowData: true,
    photovoltaicData: true,
    windData: true,
    energyStorageData: true
  }
  // 重置后更新图表
  setTimeout(() => {
    initPowerComparisonChart()
    initWaterLevelChart()
    initLoadChart()
    initIntegratedDispatchChart()
  }, 100)
}

// 退参
const exitParameters = () => {
  console.log('退参')
  // 这里可以添加退参逻辑
}

// 组件挂载后初始化图表
onMounted(() => {
  // 延迟初始化，确保DOM已渲染
  setTimeout(() => {
    initPowerComparisonChart()
    initWaterLevelChart()
    initLoadChart()
    initIntegratedDispatchChart()
  }, 100)
})

// 监听标签页切换
const handleTabChange = (tabName: any) => {
  activeTab.value = tabName
  console.log(`切换到${tabName}标签页，更新图表数据`)
  // 切换标签页时重新初始化所有图表，使用对应的标签页数据
  setTimeout(() => {
    initPowerComparisonChart()
    initWaterLevelChart()
    initLoadChart()
    initIntegratedDispatchChart()
  }, 100)
}
</script>

<template>
  <div class="complementary-scheduling-container">

    <!-- 标签页和数据选择融合区域 -->
    <div class="tabs-data-container">
      <!-- 标签页切换 -->
      <div class="tabs-section">
        <ElTabs v-model="activeTab" @tab-change="handleTabChange" class="custom-tabs">
          <ElTabPane label="实时调度" name="realtime"></ElTabPane>
          <ElTabPane label="短期调度" name="shortterm"></ElTabPane>
          <ElTabPane label="中长期调度" name="longterm"></ElTabPane>
        </ElTabs>
      </div>

      <!-- 数据选择和操作区 -->
      <div class="data-selection">
        <ElForm :model="formData" inline class="data-form">
          <ElFormItem label="起调水位/m:" class="level-item">
            <ElInputNumber v-model="startLevel" :min="2800" :max="3200" :step="10" class="level-input" />
          </ElFormItem>
          <ElFormItem label="负荷数据">
            <ElSwitch v-model="formData.loadData" active-color="#00BFFF" inactive-color="#666" />
          </ElFormItem>
          <ElFormItem label="入库流量">
            <ElSwitch v-model="formData.inflowData" active-color="#00BFFF" inactive-color="#666" />
          </ElFormItem>
          <ElFormItem label="光伏数据">
            <ElSwitch v-model="formData.photovoltaicData" active-color="#00BFFF" inactive-color="#666" />
          </ElFormItem>
          <ElFormItem label="风电数据">
            <ElSwitch v-model="formData.windData" active-color="#00BFFF" inactive-color="#666" />
          </ElFormItem>
          <ElFormItem label="储能数据">
            <ElSwitch v-model="formData.energyStorageData" active-color="#00BFFF" inactive-color="#666" />
          </ElFormItem>
        </ElForm>

        <div class="action-buttons">
          <ElButton type="primary" @click="performAnalysis" class="analysis-btn">分析</ElButton>
          <ElButton @click="resetParameters" class="reset-btn">重置</ElButton>
          <ElButton @click="exitParameters" class="exit-btn">退参</ElButton>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <!-- 电力对比图表 -->
      <ElCard class="chart-card">
        <template #header>
          <div class="card-header">
            <span class="chart-title">出力负荷对比</span>
            <span class="config-icon" @click="openParamDialog('powerComparison')">⚙</span>
          </div>
        </template>
        <div ref="powerComparisonChartRef" class="chart-container"></div>
      </ElCard>

      <!-- 水位图表 -->
      <ElCard class="chart-card">
        <template #header>
          <div class="card-header">
            <span class="chart-title">水位变化</span>
            <span class="config-icon" @click="openParamDialog('waterLevel')">⚙</span>
          </div>
        </template>
        <div ref="waterStorageChartRef" class="chart-container"></div>
      </ElCard>

      <!-- 负荷图表 -->
      <ElCard class="chart-card">
        <template #header>
          <div class="card-header">
            <span class="chart-title">负荷预测与实际</span>
            <span class="config-icon" @click="openParamDialog('load')">⚙</span>
          </div>
        </template>
        <div ref="loadChartRef" class="chart-container"></div>
      </ElCard>

      <!-- 综合调度图表 -->
      <ElCard class="chart-card">
        <template #header>
          <div class="card-header">
            <span class="chart-title">水电光互补量</span>
            <span class="config-icon" @click="openParamDialog('integratedDispatch')">⚙</span>
          </div>
        </template>
        <div ref="integratedDispatchChartRef" class="chart-container"></div>
      </ElCard>
    </div>
  </div>

  <!-- 手动调参对话框 -->
  <ElDialog v-model="paramDialogVisible" :title="''" width="50%" id="input-dialog" :before-close="handleClose">
    <div v-if="currentChartType === 'powerComparison'" class="param-content">
      <h3>出力负荷对比图表参数</h3>
      <ElFormItem label="光伏出力振幅">
        <ElSlider v-model="paramsConfig.powerComparison.photovoltaicAmplitude" :min="100" :max="2000" :step="50" />
        <ElInputNumber v-model="paramsConfig.powerComparison.photovoltaicAmplitude" :min="100" :max="2000" :step="50"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="水电出力振幅">
        <ElSlider v-model="paramsConfig.powerComparison.waterPowerAmplitude" :min="50" :max="1000" :step="25" />
        <ElInputNumber v-model="paramsConfig.powerComparison.waterPowerAmplitude" :min="50" :max="1000" :step="25"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="风电出力振幅">
        <ElSlider v-model="paramsConfig.powerComparison.windPowerAmplitude" :min="50" :max="1000" :step="25" />
        <ElInputNumber v-model="paramsConfig.powerComparison.windPowerAmplitude" :min="50" :max="1000" :step="25"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="储能出力振幅">
        <ElSlider v-model="paramsConfig.powerComparison.energyStorageAmplitude" :min="20" :max="500" :step="10" />
        <ElInputNumber v-model="paramsConfig.powerComparison.energyStorageAmplitude" :min="20" :max="500" :step="10"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="负荷振幅">
        <ElSlider v-model="paramsConfig.powerComparison.loadAmplitude" :min="100" :max="2000" :step="50" />
        <ElInputNumber v-model="paramsConfig.powerComparison.loadAmplitude" :min="100" :max="2000" :step="50"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="随机波动因子">
        <ElSlider v-model="paramsConfig.powerComparison.randomFactor" :min="0" :max="1" :step="0.05" />
        <ElInputNumber v-model="paramsConfig.powerComparison.randomFactor" :min="0" :max="1" :step="0.05"
          class="param-input" />
      </ElFormItem>
    </div>

    <div v-else-if="currentChartType === 'waterLevel'" class="param-content">
      <h3>水位变化图表参数</h3>
      <ElFormItem label="水位波动范围">
        <ElSlider v-model="paramsConfig.waterLevel.fluctuationRange" :min="1" :max="20" :step="1" />
        <ElInputNumber v-model="paramsConfig.waterLevel.fluctuationRange" :min="1" :max="20" :step="1"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="随机波动范围">
        <ElSlider v-model="paramsConfig.waterLevel.randomRange" :min="0" :max="10" :step="0.5" />
        <ElInputNumber v-model="paramsConfig.waterLevel.randomRange" :min="0" :max="10" :step="0.5"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="趋势因子">
        <ElSlider v-model="paramsConfig.waterLevel.trendFactor" :min="0" :max="2" :step="0.1" />
        <ElInputNumber v-model="paramsConfig.waterLevel.trendFactor" :min="0" :max="2" :step="0.1"
          class="param-input" />
      </ElFormItem>
    </div>

    <div v-else-if="currentChartType === 'load'" class="param-content">
      <h3>负荷预测与实际图表参数</h3>
      <ElFormItem label="基础负荷">
        <ElSlider v-model="paramsConfig.load.baseLoad" :min="1000" :max="5000" :step="100" />
        <ElInputNumber v-model="paramsConfig.load.baseLoad" :min="1000" :max="5000" :step="100" class="param-input" />
      </ElFormItem>
      <ElFormItem label="负荷振幅">
        <ElSlider v-model="paramsConfig.load.amplitude" :min="100" :max="2000" :step="50" />
        <ElInputNumber v-model="paramsConfig.load.amplitude" :min="100" :max="2000" :step="50" class="param-input" />
      </ElFormItem>
      <ElFormItem label="预测准确率">
        <ElSlider v-model="paramsConfig.load.forecastAccuracy" :min="0.5" :max="1" :step="0.01" />
        <ElInputNumber v-model="paramsConfig.load.forecastAccuracy" :min="0.5" :max="1" :step="0.01"
          class="param-input" />
      </ElFormItem>
    </div>

    <div v-else-if="currentChartType === 'integratedDispatch'" class="param-content">
      <h3>水电光互补量图表参数</h3>
      <ElFormItem label="效率因子">
        <ElSlider v-model="paramsConfig.integratedDispatch.efficiencyFactor" :min="0.5" :max="2" :step="0.05" />
        <ElInputNumber v-model="paramsConfig.integratedDispatch.efficiencyFactor" :min="0.5" :max="2" :step="0.05"
          class="param-input" />
      </ElFormItem>
      <ElFormItem label="偏差因子">
        <ElSlider v-model="paramsConfig.integratedDispatch.deviationFactor" :min="0" :max="0.2" :step="0.01" />
        <ElInputNumber v-model="paramsConfig.integratedDispatch.deviationFactor" :min="0" :max="0.2" :step="0.01"
          class="param-input" />
      </ElFormItem>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <ElButton @click="paramDialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="saveParameters">保存参数</ElButton>
      </span>
    </template>
  </ElDialog>
</template>

<style scoped>
.complementary-scheduling-container {
  width: 100%;
  min-height: 100vh;
  background-color: #0D1136;
  padding: 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: rgba(84, 92, 100, 0.8);
  border-radius: 8px;
  border: 1px solid #00BFFF;
}

.logo {
  height: 60px;
  object-fit: contain;
}

.title-wrapper {
  text-align: center;
}

.main-title {
  color: #00BFFF;
  font-size: 28px;
  font-weight: bold;
  margin: 0;
}

.subtitle {
  color: #9fe9f0;
  font-size: 14px;
  margin-top: 5px;
}

.user-info {
  color: #fff;
  font-size: 14px;
}

/* 标签页和数据选择融合容器 */
.tabs-data-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  width: 100%;
}

/* 标签页区域 */
.tabs-section {
  flex: 0 0 auto;
  background: rgba(84, 92, 100, 0.8);
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #00BFFF;
}

.custom-tabs {
  --el-tabs-active-color: #00BFFF;
  --el-tabs-nav-background-color: transparent;
  --el-tabs-header-border-bottom: none;
  --el-tabs-text-color-primary: #fff;
  color: #fff;
}

.custom-tabs .el-tabs__item {
  color: #fff !important;
  font-size: 16px;
}

.custom-tabs .el-tabs__item.is-active {
  color: #00BFFF;
  font-weight: bold;
}

.custom-tabs .el-tabs__active-bar {
  background-color: #00BFFF;
}

/* 数据选择和操作区 */
.data-selection {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(84, 92, 100, 0.8);
  border-radius: 8px;
  padding: 15px 20px;
  border: 1px solid #00BFFF;
  flex-wrap: wrap;
  gap: 15px;
  min-width: 0;
}

.data-form {
  --el-form-item-label-color: #fff;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.data-form .el-form-item__label {
  color: #fff !important;
  font-size: 14px;
}

.level-item {
  margin-right: 20px;
}

.level-input .el-input-number__decrease,
.level-input .el-input-number__increase {
  background-color: rgba(0, 191, 255, 0.2);
  border-color: #00BFFF;
}

.level-input .el-input__inner {
  background-color: rgba(51, 51, 51, 0.5);
  border-color: #00BFFF;
  color: #fff;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.analysis-btn {
  background-color: #00BFFF;
  border-color: #00BFFF;
}

.analysis-btn:hover {
  background-color: #9fe9f0;
  border-color: #9fe9f0;
}

.reset-btn,
.exit-btn {
  background-color: rgba(51, 51, 51, 0.5);
  border-color: #00BFFF;
  color: #fff;
}

.reset-btn:hover,
.exit-btn:hover {
  background-color: rgba(0, 191, 255, 0.2);
  border-color: #00BFFF;
}

/* 图表网格 */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

/* 图表卡片 */
.chart-card {
  background: rgba(84, 92, 100, 0.8);
  border: 1px solid #00BFFF;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: rgba(84, 92, 100, 0.9);
  border-bottom: 1px solid #00BFFF;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  color: #00BFFF;
}

.config-icon {
  font-size: 18px;
  cursor: pointer;
  color: #9fe9f0;
}

.config-icon:hover {
  color: #00BFFF;
}

.chart-container {
  width: 100%;
  height: 300px;
  flex: 1;
  min-height: 0;
}

/* 数据表区域 */
.tables-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.table-card {
  background: rgba(84, 92, 100, 0.8);
  border: 1px solid #00BFFF;
  border-radius: 8px;
  overflow: hidden;
}

.table-container {
  max-height: 400px;
  overflow-y: auto;
}

/* 自定义表格样式 */
.custom-table {
  background-color: transparent;
  color: #fff;
}

.custom-table .el-table__header {
  background-color: rgba(0, 191, 255, 0.2);
}

.custom-table .el-table__header th {
  background-color: rgba(0, 191, 255, 0.2);
  color: #00BFFF;
  border-bottom: 1px solid #00BFFF;
}

.custom-table .el-table__body tr {
  border-bottom: 1px solid rgba(0, 191, 255, 0.2);
}

.custom-table .el-table__body td {
  background-color: transparent;
  color: #9fe9f0;
  border-bottom: 1px solid rgba(0, 191, 255, 0.1);
}

.custom-table .el-table__body tr:hover>td {
  background-color: rgba(0, 191, 255, 0.1);
}

.custom-table .el-table__empty-block {
  background-color: transparent;
}

.custom-table .el-table__empty-text {
  color: #9fe9f0;
}

/* 自定义表格滚动条 */
.table-container::-webkit-scrollbar {
  width: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: rgba(51, 51, 51, 0.5);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #00BFFF;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #9fe9f0;
}

/* 正负值颜色 */
.positive {
  color: #80FFA5;
}

.negative {
  color: #FF0087;
}

/* 调参对话框样式 - 终极修复版 */
/* 覆盖Element Plus对话框背景的全局解决方案 */
:deep(.el-dialog__wrapper),
:deep(.el-dialog__wrapper.is-fullscreen .el-dialog) {
  /* 遮罩层背景 */
  color: #fff !important;
  background: rgba(0, 0, 0, 0.5) !important;
  /* 强制穿透所有可能的样式隔离 */
}


/* 增强对话框头部样式特异性 */
:deep(.el-dialog__header) {
  background: rgba(84, 92, 100, 0.9) !important;
  border-bottom: 1px solid #00BFFF !important;
  padding: 15px 20px !important;
}

/* 增强对话框标题样式特异性 */
:deep(.el-dialog__title) {
  color: #00BFFF !important;
  font-size: 18px !important;
  font-weight: bold !important;
}

/* 增强对话框内容区域样式 */
:deep(.el-dialog__body) {
  color: #fff !important;
  padding: 20px !important;
}

/* 参数内容区域 */
.param-content {
  padding: 20px 0;
  color: #fff !important;
}

.param-content h3 {
  color: #00BFFF !important;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: bold;
}

/* 增强滑块样式特异性 */
:deep(.el-slider__bar) {
  background-color: #00BFFF !important;
}

:deep(.el-slider__button) {
  border-color: #00BFFF !important;
  background-color: #fff !important;
}

:deep(.el-slider__button:hover) {
  border-color: #9fe9f0 !important;
  background-color: #fff !important;
}

/* 确保所有表单标签颜色正确 */
:deep(.el-form-item__label) {
  color: #fff !important;
}


/* 配置图标样式优化 */
.config-icon {
  cursor: pointer;
  font-size: 18px;
  margin-left: 10px;
  transition: transform 0.2s;
}

.config-icon:hover {
  transform: rotate(30deg);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .data-selection {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .complementary-scheduling-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .main-title {
    font-size: 24px;
  }

  .chart-container {
    height: 250px;
  }
}
</style>

<style>
#input-dialog {
  background-image: url(@/assets/img2.gif);
  background-size: cover;
  border: 2px solid #02a6b5;

  p {
    color: #fff;
    font-weight: bold;
  }
}
</style>
