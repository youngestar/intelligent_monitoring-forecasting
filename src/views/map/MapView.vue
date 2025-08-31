<template>
  <div class="map-container">
    <div class="header">
      <h1>中国安全事件地图</h1>
      <p>展示中国各地区安全事件分布情况</p>
    </div>

    <div class="chart-section">
      <ChinaMap :height="'70vh'" :width="'100%'" />
    </div>

    <div class="control-panel">
      <h3>操作说明</h3>
      <ul>
        <li>🖱️ 鼠标拖拽：平移地图</li>
        <li>🖱️ 滚轮缩放：放大缩小地图</li>
        <li>🖱️ 点击省份：查看详细数据</li>
        <li>🎨 颜色越深：安全事件越多</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import ChinaMap from '@/components/ChinaMap.vue'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  // 在组件挂载后，可以添加一些初始化逻辑
  console.log('地图视图已加载')
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
}

.header {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header h1 {
  font-size: 2rem;
  margin: 0 0 10px 0;
  color: #00ddff;
  text-shadow: 0 0 10px rgba(0, 221, 255, 0.5);
}

.header p {
  font-size: 1rem;
  color: #9fe9f0;
  margin: 0;
}

.chart-section {
  flex: 1;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.control-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 15px 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.control-panel h3 {
  margin: 0 0 10px 0;
  color: #00ddff;
  font-size: 1.2rem;
}

.control-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.control-panel li {
  font-size: 0.9rem;
  color: #9fe9f0;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header h1 {
    font-size: 1.5rem;
  }

  .control-panel ul {
    flex-direction: column;
    gap: 8px;
  }

  .chart-section {
    padding: 10px;
  }
}
</style>
