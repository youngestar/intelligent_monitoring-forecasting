<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore, type MarkerData } from '@/stores/map'

// 使用Pinia store
const mapStore = useMapStore()

// 类型选项
const typeOptions = [
  { label: '默认', value: 'default', icon: '📍' },
  { label: '学校/教学楼', value: 'school', icon: '🏫' },
  { label: '医院', value: 'hospital', icon: '🏥' },
  { label: '餐厅/食堂', value: 'restaurant', icon: '🍽️' },
  { label: '商店', value: 'store', icon: '🏪' },
  { label: '公园/绿地', value: 'park', icon: '🌳' },
  { label: '政府/机构', value: 'government', icon: '🏛️' }
]

// 计算属性：当前选中的标记信息
const selectedMarkerInfo = computed(() => {
  return mapStore.selectedLocation
    ? {
      name: mapStore.selectedLocation.name,
      coordinates: mapStore.selectedLocation.coordinates.join(', '),
      type: mapStore.selectedLocation.type,
      color: mapStore.selectedLocation.color
    }
    : null
})

// 获取图标
const getIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'default': '📍',
    'school': '🏫',
    'hospital': '🏥',
    'restaurant': '🍽️',
    'store': '🏪',
    'park': '🌳',
    'government': '🏛️'
  }
  return iconMap[type] || iconMap.default
}
</script>

<template>
  <div class="marker-management-container">
    <!-- 当前选中标记信息 -->
    <div class="marker-management-header" v-if="selectedMarkerInfo">
      <h3>当前选中电站</h3>
    </div>
    <div class="selected-marker-section" v-if="selectedMarkerInfo">
      <div class="selected-marker-header">
        <h4>当前选中地点</h4>
        <span class="selected-icon">{{ getIcon(selectedMarkerInfo.type) }}</span>
      </div>
      <div class="selected-marker-info">
        <p><strong>名称：</strong>{{ selectedMarkerInfo.name }}</p>
        <p><strong>坐标：</strong>{{ selectedMarkerInfo.coordinates }}</p>
        <p><strong>类型：</strong> 兴发集团电站</p>
        <p><strong>颜色：</strong><span class="color-swatch" :style="{ backgroundColor: selectedMarkerInfo.color }"></span>
        </p>
      </div>
    </div>

    <!-- 标记列表 -->
    <div class="marker-list-section" v-if="mapStore.selectedMarkers.length > 0">
      <h4>地点标记列表 ({{ mapStore.selectedMarkers.length }})</h4>
      <div class="marker-list">
        <div v-for="marker in mapStore.selectedMarkers" :key="marker.id" class="marker-item"
          :class="{ active: marker.isActive }">
          <div class="marker-item-icon" :style="{ backgroundColor: marker.color }">
            {{ getIcon(marker.type) }}
          </div>
          <div class="marker-item-info">
            <h5>{{ marker.name }}</h5>
            <p>{{ marker.coordinates.join(', ') }}</p>
          </div>
          <div class="marker-item-actions">
            <button class="select-btn" @click="mapStore.selectLocation(marker)" title="选中此地点">
              🔍
            </button>
            <button class="delete-btn" @click="mapStore.removeMarker(marker.id)" title="删除此地点">
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marker-management-container {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.marker-management-header {
  text-align: center;
  margin-bottom: 20px;
}

.marker-management-header h3 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.marker-management-header p {
  font-size: 14px;
  color: #b3b3b3;
  margin: 0;
}

.marker-form-section {
  margin-bottom: 30px;
}

.marker-form-section h4 {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 15px 0;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.marker-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
  color: #fff;
}

.form-group input,
.form-group select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  color: #fff;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #4facfe;
  box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.2);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #fff;
  transform: scale(1.2);
}

.add-marker-btn {
  grid-column: span 2;
  background: linear-gradient(45deg, #4facfe 0%, #00f2fe 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.add-marker-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 172, 254, 0.4);
}

.selected-marker-section {
  background: rgba(79, 172, 254, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  border-left: 4px solid #4facfe;
}

.selected-marker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.selected-marker-header h4 {
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  color: #fff;
}

.selected-icon {
  font-size: 20px;
}

.selected-marker-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #ddd;
}

.color-swatch {
  position: relative;
  top: 5px;
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-left: 5px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.clear-all-btn,
.toggle-picker-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-all-btn:hover:not(:disabled),
.toggle-picker-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.clear-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-picker-btn.active {
  background: linear-gradient(45deg, #ff4d4f 0%, #b31d1d 100%);
  border-color: #ff4d4f;
}

.marker-list-section h4 {
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 15px 0;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 8px;
}

.marker-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.marker-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s ease;
}

.marker-item:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.marker-item.active {
  background: rgba(79, 172, 254, 0.1);
  border-color: #4facfe;
}

.marker-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.marker-item-info {
  flex: 1;
  min-width: 0;
}

.marker-item-info h5 {
  font-size: 15px;
  font-weight: 500;
  margin: 0 0 3px 0;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.marker-item-info p {
  font-size: 12px;
  color: #999;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.marker-item-actions {
  display: flex;
  gap: 5px;
}

.select-btn,
.delete-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: none;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.select-btn:hover {
  background: rgba(79, 172, 254, 0.3);
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.3);
}

/* 滚动条样式 */
.marker-list::-webkit-scrollbar {
  width: 6px;
}

.marker-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.marker-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.marker-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .marker-form {
    grid-template-columns: 1fr;
  }

  .add-marker-btn {
    grid-column: span 1;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
