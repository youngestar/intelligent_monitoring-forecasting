<script setup lang="ts">
// 直接导入并使用我们改进后的卫星地图组件
import SatelliteMap from './SatelliteMap.vue'
</script>

<template>
  <div class="home-map-container">
    <SatelliteMap />
  </div>
</template>

<style scoped>
.home-map-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
</style>
