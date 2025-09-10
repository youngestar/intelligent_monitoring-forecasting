<template>
  <div class="wind-forecasting-container">
    <!-- 头部标题 -->
    <div class="header-title">
      <h2>风能预测与分析</h2>
      <div class="date-display">{{ currentDate }}</div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧面板 -->
      <div class="left-panel">
        <!-- 今日预测风电总量卡片 -->
        <div class="total-forecast-card">
          <div class="card-title">今日预测风电总量</div>
          <div class="forecast-value">
            <span class="value">{{ totalWindPowerForecast }}</span>
            <span class="unit">万千瓦时</span>
          </div>
          <div class="growth-info">
            <span class="growth-label">环比昨日</span>
            <span class="growth-value positive">+12.5%</span>
          </div>
        </div>

        <!-- 风向与风速分布 -->
        <div class="wind-distribution-card">
          <div class="card-title">风向与风速分布</div>
          <div id="windDirectionChart" class="chart-container"></div>
        </div>

        <!-- 风力发电站状态 -->
        <div class="wind-stations-card">
          <div class="card-title">风力发电站状态</div>
          <div class="stations-grid">
            <div class="station-item" v-for="station in windStationsData" :key="station.id">
              <div class="station-name">{{ station.name }}</div>
              <div class="station-info">
                <span class="current-wind">{{ station.currentWind }} m/s</span>
                <span class="status-indicator" :class="station.status"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 发电效率排名 -->
        <div class="efficiency-ranking-card">
          <div class="card-title">发电效率排名</div>
          <div id="efficiencyRankingChart" class="chart-container"></div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <!-- 地图区域 -->
        <div class="map-section">
          <div class="map-controls">
            <div class="energy-type-selector">
              <button v-for="type in windFarmTypes" :key="type.value"
                :class="['energy-type-btn', { active: selectedWindType === type.value }]"
                @click="changeWindType(type.value)">
                {{ type.label }}
              </button>
            </div>
            <div class="map-toolbar">
              <button class="toolbar-btn" @click="mapZoomIn">
                <Plus />
              </button>
              <button class="toolbar-btn" @click="mapZoomOut">
                <Minus />
              </button>
              <button class="toolbar-btn" @click="resetMap">
                <Refresh />
              </button>
            </div>
            <div class="layer-switch-container">
              <button :class="['layer-btn', 'toolbar-btn', { active: currentMapLayer === 'normal' }]"
                @click="switchMapLayer('normal')">
                <MapLocation />
              </button>
              <button :class="['layer-btn', 'toolbar-btn', { active: currentMapLayer === 'satellite' }]"
                @click="switchMapLayer('satellite')">
                <PictureOutline />
              </button>
            </div>
          </div>
          <div id="windMap" class="map-container" ref="mapRef"></div>
        </div>

        <!-- 风电预测趋势图 -->
        <div class="forecast-trend-card">
          <div class="card-title">未来24小时风电预测趋势</div>
          <div id="forecastTrendChart" class="chart-container"></div>
        </div>

        <!-- 风速变化图表 -->
        <div class="wind-speed-card">
          <div class="card-title">重点区域风速变化</div>
          <div id="windSpeedChart" class="chart-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as echarts from 'echarts';
import { Plus, Minus, Refresh, MapLocation, Picture as PictureOutline } from '@element-plus/icons-vue';

// 使用全局类型定义

// 声明AMap全局变量类型
interface AMapInstance {
  Map: any
  Marker: any
  InfoWindow: any
  ToolBar: any
  Scale: any
  TileLayer: {
    Satellite: any
  }
  Size: any
  Pixel: any
  Icon: any
}

// 日期显示
const currentDate = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
});

// 总预测风电总量
const totalWindPowerForecast = ref('892.5');

// 风电场类型
const windFarmTypes = [
  { label: '所有风电场', value: 'all' },
  { label: '山地风电', value: 'mountain' },
  { label: '平原风电', value: 'plain' },
  { label: '海上风电', value: 'offshore' }
];

// 选中的风电场类型
const selectedWindType = ref('all');

// 风电场数据
const windStationsData = ref([
  { id: 1, name: '大岭风电场', currentWind: '8.2', status: 'normal' },
  { id: 2, name: '东湖风电场', currentWind: '6.5', status: 'normal' },
  { id: 3, name: '三峡风电场', currentWind: '7.8', status: 'normal' },
  { id: 4, name: '西陵风电场', currentWind: '5.3', status: 'attention' },
  { id: 5, name: '高岚风电场', currentWind: '9.1', status: 'warning' },
  { id: 6, name: '昭君风电场', currentWind: '6.9', status: 'normal' }
]);

// 图表实例
let windDirectionChart: echarts.ECharts | null = null;
let efficiencyRankingChart: echarts.ECharts | null = null;
let forecastTrendChart: echarts.ECharts | null = null;
let windSpeedChart: echarts.ECharts | null = null;
let mapInstance: any | null = null;

// 风向风速数据
const windDirectionData = [
  { value: 30, name: '东北' },
  { value: 45, name: '东' },
  { value: 60, name: '东南' },
  { value: 75, name: '南' },
  { value: 40, name: '西南' },
  { value: 30, name: '西' },
  { value: 20, name: '西北' },
  { value: 25, name: '北' }
];

// 发电效率排名数据
const efficiencyData = [
  { name: '大岭风电场', value: 92 },
  { name: '三峡风电场', value: 88 },
  { name: '昭君风电场', value: 85 },
  { name: '东湖风电场', value: 82 },
  { name: '西陵风电场', value: 78 },
  { name: '高岚风电场', value: 75 }
];

// 未来24小时预测数据
const forecastTrendData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  power: Math.round(Math.random() * 40 + 20),
  windSpeed: (Math.random() * 6 + 4).toFixed(1)
}));

// 重点区域风速数据
const windSpeedDataByRegion = [
  {
    name: '兴山县',
    data: [5.2, 5.8, 6.3, 6.9, 7.2, 6.8, 6.4, 6.1]
  },
  {
    name: '秭归县',
    data: [6.5, 6.9, 7.3, 7.8, 8.1, 7.7, 7.2, 6.8]
  },
  {
    name: '夷陵区',
    data: [4.8, 5.2, 5.6, 6.0, 6.3, 5.9, 5.5, 5.1]
  },
  {
    name: '点军区',
    data: [5.6, 6.1, 6.5, 7.0, 7.3, 6.8, 6.4, 6.0]
  }
];

// 风电场位置数据
const windFarmLocations = [
  { id: 1, name: '大岭风电场', type: 'mountain', capacity: '120', x: 110.72, y: 31.24, status: 'normal' },
  { id: 2, name: '东湖风电场', type: 'plain', capacity: '80', x: 110.81, y: 31.18, status: 'normal' },
  { id: 3, name: '三峡风电场', type: 'mountain', capacity: '150', x: 110.88, y: 31.05, status: 'normal' },
  { id: 4, name: '西陵风电场', type: 'plain', capacity: '60', x: 110.75, y: 31.12, status: 'attention' },
  { id: 5, name: '高岚风电场', type: 'mountain', capacity: '100', x: 110.95, y: 31.20, status: 'warning' },
  { id: 6, name: '昭君风电场', type: 'mountain', capacity: '90', x: 110.68, y: 31.28, status: 'normal' }
];

// 初始化所有图表
const initCharts = () => {
  initWindDirectionChart();
  initEfficiencyRankingChart();
  initForecastTrendChart();
  initWindSpeedChart();
};

// 初始化风向分布图
const initWindDirectionChart = () => {
  const chartDom = document.getElementById('windDirectionChart');
  if (chartDom) {
    windDirectionChart = echarts.init(chartDom);

    const option = {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}%'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2,
            color: function (params: any) {
              const colorList = ['#36CFC9', '#5B8FF9', '#5D7092', '#F6BD16', '#F08664', '#D9D9D9', '#868484', '#5B8FF9'];
              return colorList[params.dataIndex];
            }
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: windDirectionData
        }
      ]
    };

    windDirectionChart.setOption(option);
  }
};

// 初始化发电效率排名图表
const initEfficiencyRankingChart = () => {
  const chartDom = document.getElementById('efficiencyRankingChart');
  if (chartDom) {
    efficiencyRankingChart = echarts.init(chartDom);

    const option = {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
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
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      },
      yAxis: {
        type: 'category',
        data: efficiencyData.map(item => item.name).reverse()
      },
      series: [
        {
          type: 'bar',
          data: efficiencyData.map(item => item.value).reverse(),
          itemStyle: {
            color: function (params: any) {
              const value = params.value;
              if (value >= 90) return '#00B42A';
              else if (value >= 80) return '#1890FF';
              else if (value >= 70) return '#FF7D00';
              else return '#F53F3F';
            },
            borderRadius: [0, 4, 4, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%'
          }
        }
      ]
    };

    efficiencyRankingChart.setOption(option);
  }
};

// 初始化预测趋势图
const initForecastTrendChart = () => {
  const chartDom = document.getElementById('forecastTrendChart');
  if (chartDom) {
    forecastTrendChart = echarts.init(chartDom);

    const option = {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['预测发电量(万千瓦时)', '风速(m/s)'],
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
        boundaryGap: false,
        data: forecastTrendData.map(item => item.time),
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        axisLabel: {
          color: '#ddd'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '发电量',
          axisLine: {
            lineStyle: {
              color: '#36CFC9'
            }
          },
          axisLabel: {
            color: '#ddd'
          }
        },
        {
          type: 'value',
          name: '风速',
          axisLine: {
            lineStyle: {
              color: '#5B8FF9'
            }
          },
          axisLabel: {
            color: '#ddd'
          }
        }
      ],
      series: [
        {
          name: '预测发电量(万千瓦时)',
          type: 'line',
          data: forecastTrendData.map(item => item.power),
          smooth: true,
          itemStyle: {
            color: '#36CFC9'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(54, 207, 201, 0.5)' },
              { offset: 1, color: 'rgba(54, 207, 201, 0.1)' }
            ])
          }
        },
        {
          name: '风速(m/s)',
          type: 'line',
          yAxisIndex: 1,
          data: forecastTrendData.map(item => item.windSpeed),
          smooth: true,
          itemStyle: {
            color: '#5B8FF9'
          }
        }
      ]
    };

    forecastTrendChart.setOption(option);
  }
};

// 初始化风速变化图表
const initWindSpeedChart = () => {
  const chartDom = document.getElementById('windSpeedChart');
  if (chartDom) {
    windSpeedChart = echarts.init(chartDom);

    const option = {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: windSpeedDataByRegion.map(item => item.name),
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
        data: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        axisLabel: {
          color: '#ddd'
        }
      },
      yAxis: {
        type: 'value',
        name: '风速(m/s)',
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        axisLabel: {
          color: '#ddd'
        }
      },
      series: windSpeedDataByRegion.map((item, index) => {
        const colors = ['#36CFC9', '#5B8FF9', '#F6BD16', '#F08664'];
        return {
          name: item.name,
          type: 'line',
          data: item.data,
          smooth: true,
          itemStyle: {
            color: colors[index % colors.length]
          }
        };
      })
    };

    windSpeedChart.setOption(option);
  }
};

// 地图配置项
const mapConfig = {
  // 使用与FusionForecasting.vue相同的有效API密钥
  apiKey: '1c8fb5781411703ac5c3343201e0ab99',
  securityConfig: {
    securityJsCode: '8468351a95a828e0700d4aaa085c3551'
  },
  center: [110.78, 31.17], // 湖北省宜昌市兴山县中心坐标
  zoom: 11
};

// 地图相关变量
const mapRef = ref<HTMLDivElement | null>(null);
let AMap: AMapInstance | null = null;
// mapInstance变量已在文件上方声明
let normalLayer: any = null;
let satelliteLayer: any = null;
let markers = new Map<string, any>(); // 用于存储和管理地图标记
// 当前地图图层类型
const currentMapLayer = ref<'normal' | 'satellite'>('normal');

// 加载高德地图API
const loadMapScript = () => {
  return new Promise((resolve, reject) => {
    // 设置安全配置
    window._AMapSecurityConfig = mapConfig.securityConfig;

    // 检查是否已经加载过高德地图API
    if (window.AMap) {
      AMap = window.AMap;
      console.log('AMap API already loaded');
      resolve(AMap);
      return;
    }

    // 创建script标签加载高德地图API
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${mapConfig.apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.TileLayer,AMap.TileLayer.Satellite`;
    script.onload = () => {
      AMap = window.AMap;
      console.log('AMap API loaded successfully');
      resolve(AMap);
    };
    script.onerror = (error) => {
      reject(new Error('高德地图API加载失败: ' + (error instanceof Error ? error.message : '未知错误')));
    };
    document.head.appendChild(script);
  });
};

// 初始化地图
const initMap = async () => {
  try {
    // 加载高德地图API
    await loadMapScript();

    // 获取地图容器
    const mapContainer = mapRef.value;
    if (!mapContainer || !AMap) return;

    // 创建地图实例
    mapInstance = new AMap.Map(mapContainer, {
      center: mapConfig.center,
      zoom: mapConfig.zoom,
      viewMode: '3D',
      buildingAnimation: true,
      showLabel: true,
      mapStyle: 'amap://styles/darkblue', // 暗色地图主题
      features: ['road', 'point', 'bg']
    });

    // 添加基础控件
    mapInstance.addControl(new AMap.ToolBar({
      position: 'RB'
    }));
    mapInstance.addControl(new AMap.Scale({
      position: 'RB'
    }));

    // 创建并管理图层
    normalLayer = new (AMap.TileLayer as any)();
    satelliteLayer = new (AMap.TileLayer.Satellite as any)();

    // 初始显示标准图层
    normalLayer.setMap(mapInstance);

    // 初始化标记
    updateWindFarmMarkers();

    // 监听地图加载完成事件
    mapInstance.on('complete', () => {
      console.log('兴山县风电场地图加载完成');
    });

  } catch (error) {
    console.error('地图初始化失败:', error);
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
      `;
    }
  }
};

// 创建信息窗口内容
interface FarmData {
  name: string;
  x: number;
  y: number;
  type: string;
  capacity: number | string;
  status: string;
}

const createInfoWindowContent = (farm: FarmData) => {
  return `
    <div style="width: 280px; padding: 12px; background-color: rgba(255, 255, 255, 0.95); border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);">
      <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #262626;">${farm.name}</h3>
      <div style="margin-bottom: 8px; font-size: 12px; color: #8c8c8c;">坐标: ${farm.x.toFixed(6)}, ${farm.y.toFixed(6)}</div>
      <div style="margin-bottom: 4px; font-size: 14px;"><span style="color: #1890ff; font-weight: 500;">类型: </span>${farm.type === 'mountain' ? '山地风电' : farm.type === 'plain' ? '平原风电' : '海上风电'}</div>
      <div style="margin-bottom: 4px; font-size: 14px;"><span style="color: #52c41a; font-weight: 500;">装机容量: </span>${farm.capacity} MW</div>
      <div style="margin-bottom: 4px; font-size: 14px;"><span style="color: ${farm.status === 'normal' ? '#52c41a' : farm.status === 'attention' ? '#faad14' : '#ff4d4f'}; font-weight: 500;">状态: </span>${farm.status === 'normal' ? '正常' : farm.status === 'attention' ? '注意' : '警告'}</div>
    </div>
  `;
};

// 更新风电场标记
const updateWindFarmMarkers = () => {
  // 清除现有标记
  if (mapInstance) {
    mapInstance.clearMap();
  }

  // 筛选符合当前类型的风电场
  const filteredFarms = selectedWindType.value === 'all'
    ? windFarmLocations
    : windFarmLocations.filter(farm => farm.type === selectedWindType.value);

  // 添加新标记
  // 先清除现有标记
  markers.forEach(marker => {
    if (marker && typeof marker.setMap === 'function') {
      marker.setMap(null);
    }
  });
  markers.clear();

  // 遍历农场数据添加新标记
  filteredFarms.forEach(farm => {
    if (!mapInstance || !window.AMap || !AMap || !AMap.Marker) return;

    // 根据状态设置图标颜色
    let iconColor = '#00B42A'; // 绿色，正常状态
    let statusText = '正常';
    if (farm.status === 'attention') {
      iconColor = '#FF7D00'; // 橙色，注意状态
      statusText = '注意';
    } else if (farm.status === 'warning') {
      iconColor = '#F53F3F'; // 红色，警告状态
      statusText = '警告';
    }

    // 使用 FusionForecasting 风格的自定义 HTML 标记方式
    // 这种方式比 SVG 数据 URL 更简单可靠，且易于样式控制
    const markerContent = `
      <div class="custom-marker" style="position: relative; display: inline-block;">
        <div class="marker-icon" style="
          background-color: ${iconColor};
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
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
          pointer-events: none;
        ">
          ${farm.name}: ${statusText}
        </div>
      </div>
    `;

    // 创建标记点并添加到地图
    try {
      const marker = new AMap.Marker({
        position: [farm.x, farm.y],
        title: `${farm.name} - 状态: ${statusText}`,
        content: markerContent, // 使用HTML内容作为标记
        offset: AMap.Pixel ? new AMap.Pixel(-18, -18) : [-18, -18],
        // 添加动画效果
        animation: 'AMAP_ANIMATION_DROP',
        // 提升点击优先级
        zIndex: 100
      });

      // 添加标记到地图
      mapInstance.add(marker);

      // 将标记存储到Map中以便管理
      markers.set(farm.id.toString(), marker);

      // 创建信息窗口
      let infoWindow: any = null;
      if (AMap && AMap.InfoWindow) {
        infoWindow = new AMap.InfoWindow({
          content: createInfoWindowContent(farm),
          offset: AMap.Pixel ? new AMap.Pixel(0, -30) : [0, -30],
          closeWhenClickMap: true
        });
      }

      // 点击标记显示信息窗口
      if (marker.on && infoWindow) {
        marker.on('click', (e: any) => {
          // 阻止事件冒泡，避免触发地图点击事件
          if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
          }
          infoWindow.open(mapInstance, marker.getPosition());
        });

        // 绑定鼠标悬停事件 - 放大效果
        marker.on('mouseover', () => {
          const iconElement = (marker as any)._content?.querySelector('.marker-icon');
          if (iconElement) {
            iconElement.style.transform = 'scale(1.2)';
            iconElement.style.zIndex = '100';
          }
        });

        // 鼠标离开时恢复原始大小
        marker.on('mouseout', () => {
          const iconElement = (marker as any)._content?.querySelector('.marker-icon');
          if (iconElement) {
            iconElement.style.transform = 'scale(1)';
            iconElement.style.zIndex = '10';
          }
        });
      }
    } catch (error) {
      console.error('创建标记失败:', error);
    }
  });
};

// 切换风电场类型
const changeWindType = (type: string) => {
  selectedWindType.value = type;
  updateWindFarmMarkers();
};

// 地图缩放
const mapZoomIn = () => {
  if (mapInstance) {
    const currentZoom = mapInstance.getZoom();
    if (currentZoom < 18) {
      mapInstance.setZoom(currentZoom + 1);
    }
  }
};

const mapZoomOut = () => {
  if (mapInstance) {
    const currentZoom = mapInstance.getZoom();
    if (currentZoom > 3) {
      mapInstance.setZoom(currentZoom - 1);
    }
  }
};

// 重置地图
const resetMap = () => {
  if (mapInstance) {
    mapInstance.setCenter(mapConfig.center);
    mapInstance.setZoom(mapConfig.zoom);
  }
};

// 切换地图图层
const changeMapLayer = (layerType: 'normal' | 'satellite') => {
  if (!mapInstance || !normalLayer || !satelliteLayer) return;

  currentMapLayer.value = layerType;

  if (layerType === 'normal') {
    // 切换到标准地图图层
    satelliteLayer.setMap(null);
    normalLayer.setMap(mapInstance);
  } else {
    // 切换到卫星地图图层
    normalLayer.setMap(null);
    satelliteLayer.setMap(mapInstance);
  }
};

defineExpose({ changeMapLayer });

// 图层切换按钮点击事件处理
const switchMapLayer = (layerType: 'normal' | 'satellite') => {
  changeMapLayer(layerType);
};

// 处理窗口大小变化
const handleResize = () => {
  // 重新调整图表大小
  if (windDirectionChart) windDirectionChart.resize();
  if (efficiencyRankingChart) efficiencyRankingChart.resize();
  if (forecastTrendChart) forecastTrendChart.resize();
  if (windSpeedChart) windSpeedChart.resize();

  // 重新调整地图大小
  if (mapInstance) {
    mapInstance.resize();
  }
};

// 组件挂载时初始化
onMounted(() => {
  initCharts();
  initMap();
  window.addEventListener('resize', handleResize);
});

// 组件卸载时清理
onUnmounted(() => {
  // 销毁图表实例
  if (windDirectionChart) windDirectionChart.dispose();
  if (efficiencyRankingChart) efficiencyRankingChart.dispose();
  if (forecastTrendChart) forecastTrendChart.dispose();
  if (windSpeedChart) windSpeedChart.dispose();

  // 移除事件监听
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.wind-forecasting-container {
  width: 100%;
  height: 100%;
  background-image: url('@/assets/mainbg2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: #fff;
  padding: 15px;
  overflow: auto;
  box-sizing: border-box;
}

.header-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-title h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #36CFC9;
}

.date-display {
  font-size: 16px;
  color: #aaa;
}

.main-content {
  display: flex;
  gap: 15px;
  overflow: visible;
}

.left-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 15px;
  overflow: visible;
}

.left-panel {
  width: 40%;
}

.right-panel {
  width: 60%;
}

.total-forecast-card,
.wind-distribution-card,
.wind-stations-card,
.efficiency-ranking-card,
.map-section,
.forecast-trend-card,
.wind-speed-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.map-section {
  color: #000;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #36CFC9;
  border-bottom: 2px solid rgba(54, 207, 201, 0.3);
  padding-bottom: 10px;
}

.forecast-value {
  display: flex;
  align-items: baseline;
  margin: 15px 0;
}

.forecast-value .value {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin-right: 10px;
}

.forecast-value .unit {
  font-size: 20px;
  color: #aaa;
}

.growth-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.growth-label {
  font-size: 14px;
  color: #aaa;
}

.growth-value {
  font-size: 16px;
  font-weight: 600;
}

.growth-value.positive {
  color: #00B42A;
}

.growth-value.negative {
  color: #F53F3F;
}

.chart-container {
  width: 100%;
  height: 200px;
}

.stations-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.station-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.station-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.station-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.station-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-wind {
  font-size: 16px;
  font-weight: 600;
  color: #36CFC9;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.normal {
  background-color: #00B42A;
}

.status-indicator.attention {
  background-color: #FF7D00;
}

.status-indicator.warning {
  background-color: #F53F3F;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.energy-type-selector {
  display: flex;
  gap: 10px;
}

.energy-type-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.energy-type-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.energy-type-btn.active {
  background: #36CFC9;
  border-color: #36CFC9;
  color: #000;
}

.map-toolbar {
  display: flex;
  gap: 10px;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.toolbar-btn.active {
  background: #36CFC9;
  color: #000;
  border-color: #36CFC9;
}

.layer-switch-container {
  display: flex;
  gap: 10px;
}

.layer-btn {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #000;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.layer-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.layer-btn.active {
  background: #36CFC9;
  color: #000;
  border-color: #36CFC9;
}

.map-container {
  width: 100%;
  height: 350px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100%;
  }

  .map-container {
    height: 300px;
  }
}

@media (max-width: 768px) {
  .wind-forecasting-container {
    padding: 10px;
  }

  .header-title h2 {
    font-size: 20px;
  }

  .chart-container {
    height: 150px;
  }

  .stations-grid {
    grid-template-columns: 1fr;
  }

  .energy-type-selector {
    flex-wrap: wrap;
  }
}
</style>
