<script setup lang="ts">
import { Operation, Menu, Document, Switch, User } from '@element-plus/icons-vue'
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useChatStore } from '../../stores/chat'
import { useUserStore } from '../../stores/login'

// 使用 store
const chatStore = useChatStore()
const userStore = useUserStore()

// 路由配置
const router = useRouter()
const route = useRoute()
const turnTo = async (name: string): Promise<void> => {
  try {
    // chat 路由跳转到第一条对话
    if (name === 'chat') {
      router.push({
        name,
        params: {
          chatName: '新对话',
        },
      })
    } else {
      router.push({
        name,
      })
    }
    nowActive.value = name
    drawer.value = false
  } catch (error: unknown) {
    console.error(error)
  }
}

// 抽屉
const drawer = ref(false)
const nowActive = ref('home')
</script>

<template>
  <el-button color="#00DDFF" type="primary" large id="menuButton" @click="drawer = true" v-show="userStore.token">
    <el-icon size="2.5vh">
      <Menu />
    </el-icon>
  </el-button>
  <el-drawer id="drawer" v-model="drawer" title="I am the title" :direction="'ltr'" style="background-color: #545c64">
    <template #header>
      <h4 style="color: #fff">
        <el-icon style="position: relative; top: 2px">
          <Operation />
        </el-icon>
        请选择界面
      </h4>
    </template>
    <template #default>
      <el-menu active-text-color="#ffd04b" background-color="#545c64" :default-active="nowActive" text-color="#fff"
        @select="turnTo" unique-opened="true">
        <el-menu-item index="home">
          <el-icon>
            <Document />
          </el-icon>
          <span style=" font-size: large;">首页</span>
        </el-menu-item>

        <!-- 融合预测 -->
        <el-sub-menu index="fusionForecasting">
          <template #title>
            <el-icon>
              <Document />
            </el-icon>
            <span style=" font-size: large;">融合预测</span>
          </template>
          <el-menu-item index="fusionForecasting">预测概览</el-menu-item>
          <el-menu-item index="energyForecasting">能源预测</el-menu-item>
          <el-menu-item index="lightForecasting">光照预测</el-menu-item>
          <el-menu-item index="waterForecasting">水资源预测</el-menu-item>
          <el-menu-item index="windForecasting">风力预测</el-menu-item>
        </el-sub-menu>

        <!-- 资源监控 -->
        <el-sub-menu index="resourceMonitoring">
          <template #title>
            <el-icon>
              <Operation />
            </el-icon>
            <span style=" font-size: large;">资源监控</span>
          </template>
          <el-menu-item index="resourceMonitoring">监控概览</el-menu-item>
          <el-menu-item index="energyStorage">储能监控</el-menu-item>
          <el-menu-item index="lightResource">光照资源</el-menu-item>
          <el-menu-item index="waterResource">水资源监控</el-menu-item>
          <el-menu-item index="windResource">风力资源监控</el-menu-item>
        </el-sub-menu>

        <!-- 调度计划 -->
        <el-sub-menu index="dispatchPlan">
          <template #title>
            <el-icon>
              <Switch />
            </el-icon>
            <span style=" font-size: large;">调度计划</span>
          </template>
          <el-menu-item index="complementaryAnalysis">互补分析</el-menu-item>
          <el-menu-item index="complementaryScheduling">互补调度</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </template>
  </el-drawer>
  <router-view></router-view>
</template>

<style scoped>
#menuButton {
  position: absolute;
  top: 0;
  right: 2%;
  width: 6vh;
  height: 4vh;
  margin-top: -2.1%;
  z-index: 100;
  /* outline: 2px solid #02a6b5; */
  transition:
    box-shadow 0.5s,
    margin-top 0.5s;
  border-radius: 0 0 0vh 0vh;

  &:hover {
    box-shadow: 0 0px 6px 1.5px rgba(255, 255, 255, 0.8);
    margin-top: 0;
  }

  &::after {
    content: 'Menu';
    position: absolute;
    top: 3.9vh;
    height: 2.1vh;
    width: 6vh;
    background-color: #00ddff;
    border-radius: 0vh 0 1vh 1vh;
    font-size: 1.8vh;
  }
}

.el-drawer {
  background-color: pink;

  &::before {
    content: '111';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: black;
  }
}
</style>

<style>
/* 通用样式 */
.title {
  font-size: 1.6vh;
  margin-left: 1em;
  margin-top: 1em;
}
</style>
