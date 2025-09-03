<template>
  <div v-if="visible" class="message-container" :class="type">
    <div class="message-content">
      <span class="message-icon">{{ getIcon() }}</span>
      <span class="message-text">{{ message }}</span>
      <button class="message-close" @click="close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}>()

defineEmits<{
  close: []
}>()

const visible = ref(false)

// 获取对应类型的图标
const getIcon = () => {
  const { type } = defineProps()
  const iconMap: Record<string, string> = {
    'success': '✓',
    'error': '×',
    'warning': '⚠️',
    'info': 'ℹ️'
  }
  return iconMap[type || 'info']
}

// 关闭消息
const close = () => {
  visible.value = false
  const emit = defineEmits()
  emit('close')
}

// 组件挂载后显示消息
onMounted(() => {
  visible.value = true
  const { duration } = defineProps()
  
  // 设置自动关闭定时器
  if (duration !== 0) {
    setTimeout(() => {
      close()
    }, duration || 3000)
  }
})
</script>

<style scoped>
.message-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.message-content {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  min-width: 280px;
  max-width: 400px;
}

/* 成功消息样式 */
.message-container.success .message-content {
  background-color: #f0f9eb;
  border-left: 4px solid #52c41a;
}

.message-container.success .message-icon {
  color: #52c41a;
}

/* 错误消息样式 */
.message-container.error .message-content {
  background-color: #fff2f0;
  border-left: 4px solid #ff4d4f;
}

.message-container.error .message-icon {
  color: #ff4d4f;
}

/* 警告消息样式 */
.message-container.warning .message-content {
  background-color: #fffbe6;
  border-left: 4px solid #faad14;
}

.message-container.warning .message-icon {
  color: #faad14;
}

/* 信息消息样式 */
.message-container.info .message-content {
  background-color: #e6f7ff;
  border-left: 4px solid #1890ff;
}

.message-container.info .message-icon {
  color: #1890ff;
}

.message-icon {
  font-size: 18px;
  margin-right: 10px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.message-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.message-close:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #666;
}
</style>