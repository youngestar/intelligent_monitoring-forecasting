import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
// pinia 持久化插件
import piniaPersist from 'pinia-plugin-persistedstate'
// 创建 pinia 实例
const pinia = createPinia()

// 使用 persistedstate 插件
pinia.use(piniaPersist)

import App from './App.vue'
import router from './router'

const app = createApp(App)

// 将 pinia 实例传递给 Vue 应用
app.use(pinia) // 这里使用已经创建的 pinia 实例
app.use(router)

app.mount('#app')
