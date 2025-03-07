<template>
  <el-row>
    <el-col :span="7">
      <div class="container">
        <div class="container-footer">
          <!-- 漏洞维护 -->
          <VulnerabilityManagement></VulnerabilityManagement>
        </div>
      </div>
      <div class="container">
        <div class="container-footer">
          <!-- 灾备机制 -->
          <DisasterRecovery></DisasterRecovery>
        </div>
      </div>
      <div class="container">
        <div class="container-footer">
          <!-- 态势感知 -->
          <SituationalAwareness></SituationalAwareness>
        </div>
      </div>
    </el-col>
    <el-col :span="10">
      <div id="mainTitle" style="display: flex; justify-content: space-between;">
        <span>
          <Loading></Loading>
        </span>
        <span>日志记录</span>
        <span>
          <Loading></Loading>
        </span>
      </div>
      <div id="mainTop">
        <div class="mainTop-footer"></div>
        <!-- 日常运维 -->
        <DailyOperations></DailyOperations>
      </div>
      <div id="mainBottom">
        <div class="mainBottom-footer">
          <div class="mainBottom-img">
            <!-- 权限抑制 -->
            <PrivilegeRestriction></PrivilegeRestriction>
          </div>
        </div>
      </div>
    </el-col>
    <el-col :span="7">
      <div class="container">
        <div class="container-footer">
          <!-- 攻击溯源 -->
          <AttackAttribution></AttackAttribution>
        </div>
      </div>
      <div class="container">
        <div class="container-footer">
          <!-- 基线排查 -->
          <BaselineAudit></BaselineAudit>
        </div>
      </div>
      <div class="container">
        <div class="container-footer">
          <!-- 流量分析 -->
          <TrafficAnalysis></TrafficAnalysis>
        </div>
      </div>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
// 组件引用
import Loading from '@/components/Loading.vue';
import DisasterRecovery from '@/components/DisasterRecovery.vue';
import SituationalAwareness from '@/components/SituationalAwareness.vue';
import VulnerabilityManagement from '@/components/VulnerabilityManagement.vue';
import DailyOperations from '@/components/DailyOperations.vue';
import PrivilegeRestriction from '@/components/PrivilegeRestriction.vue';
import AttackAttribution from '@/components/AttackAttribution.vue';
import BaselineAudit from '@/components/BaselineAudit.vue';
import TrafficAnalysis from '@/components/TrafficAnalysis.vue';
</script>

<style scoped>
.el-col {
  width: 100%;
  height: 95vh;
  /* border: 1px solid #fff; */
}

#mainTitle {
  position: relative;
  width: 96%;
  height: 7vh;
  margin: auto;
  padding: 0 2%;
  text-align: center;
  font-size: 5vh;
  border-bottom: 0.1em solid #02a6b5;
}

#mainTop {
  position: relative;
  width: 96%;
  margin: 0.5vh auto;
  height: 58%;
  margin-top: 1.5%;
  /* 背景黑色卡片 */
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(56, 209, 163, 0.17);

  /* 背景图片设置 */
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url(../assets/img4.gif);
    background-size: cover;
    opacity: 0.3;
    /* 设置透明度，取值范围 0 - 1，0 为完全透明，1 为完全不透明 */
    z-index: -1;
    /* 确保伪元素在内容下方 */
  }

  .mainTop-footer {
    position: absolute;
    width: 100%;
    height: 100%;

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      content: '';
      width: 2.5vw;
      height: 2.5vh;
      border-top: 0.4vh solid #02a6b5;
      border-left: 0.4vh solid #02a6b5;
    }

    &::after {
      position: absolute;
      bottom: 0;
      right: 0;
      content: '';
      width: 2.5vw;
      height: 2.5vh;
      border-bottom: 0.4vh solid #02a6b5;
      border-right: 0.4vh solid #02a6b5;
    }
  }
}

#mainBottom {
  position: relative;
  width: 96%;
  height: 33.3%;
  margin: 1vh auto;
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(56, 209, 163, 0.17);

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 1.5vw;
    height: 1.5vh;
    border-top: 0.3vh solid #02a6b5;
    border-left: 0.3vh solid #02a6b5;
    content: "";
  }

  &::after {
    position: absolute;
    top: 0;
    right: 0;
    width: 1.5vw;
    height: 1.5vh;
    border-top: 0.3vh solid #02a6b5;
    border-right: 0.3vh solid #02a6b5;
    content: "";
  }

  .mainBottom-img::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url(../assets/img2.gif);
    background-size: cover;
    opacity: 0.4;
    /* 设置透明度，取值范围 0 - 1，0 为完全透明，1 为完全不透明 */
    z-index: -1;
    /* 确保伪元素在内容下方 */
  }

  .mainBottom-footer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .mainBottom-footer::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1.5vw;
    height: 1.5vh;
    border-bottom: 0.3vh solid #02a6b5;
    border-left: 0.3vh solid #02a6b5;
  }

  .mainBottom-footer::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 1.5vw;
    height: 1.5vh;
    border-bottom: 0.3vh solid #02a6b5;
    border-right: 0.3vh solid #02a6b5;
  }
}

.container {
  position: relative;
  width: 100%;
  height: 33%;
  margin-top: 1.5%;
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(56, 209, 163, 0.17);

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    width: 1vh;
    height: 1vh;
    border-top: 0.25vh solid #02a6b5;
    border-left: 0.25vh solid #02a6b5;
    content: "";
  }

  &::after {
    position: absolute;
    top: 0;
    right: 0;
    width: 1vh;
    height: 1vh;
    border-top: 0.25vh solid #02a6b5;
    border-right: 0.25vh solid #02a6b5;
    content: "";
  }
}

.container-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;

  &::before {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 1vh;
    height: 1vh;
    border-bottom: 0.25vh solid #02a6b5;
    border-left: 0.25vh solid #02a6b5;
    content: "";
  }

  &::after {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 1vh;
    height: 1vh;
    border-bottom: 0.25vh solid #02a6b5;
    border-right: 0.25vh solid #02a6b5;
    content: "";
  }
}
</style>

<style>
body {
  width: 100%;
  height: 100%;
  background-image: url(../assets/mainbg2.jpg);
  background-size: cover;
  color: #fff;
}
</style>
