<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = () => {
  router.push('login')
}
</script>

<template>
  <div id="home">
    <img id="logo" class="blinking-shadow" src="@/assets/companyLogo.jpg" alt="logo" style="
        width: 10vw;
        margin: 23vh calc(45vw - 8.5px);
        margin-bottom: 1.5vh;
        border-radius: 100%;
      " @click="goToLogin" />
    <p style="text-align: center; color: #fff; font-size: 4vh">风光水储多能互补协同优化决策支撑平台</p>
    <button id="mainButton" @click="goToLogin">开启您的旅途</button>
  </div>
</template>

<style scoped>
#home {
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  background-image: url('@/assets/mainbg2.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

@keyframes shadowBlink {
  0% {
    box-shadow:
      0 0 20px #d9a84c,
      0 0 40px #d6b77d;
  }

  50% {
    box-shadow:
      0 0 10px #d9a84c,
      0 0 20px #ce8e17;
  }

  100% {
    box-shadow:
      0 0 20px #d9a84c,
      0 0 40px #d6b77d;
  }
}

.blinking-shadow {
  display: inline-block;
  padding: 5px;
  /* border-radius: 10px;
  background-color: #3498db; */
  animation: shadowBlink 3s infinite alternate;
}

#mainButton {
  width: 10vw;
  height: 4vw;
  margin: 4vh 45vw;
  font-size: 2vh;
  font-weight: bold;
  letter-spacing: 0.15vw;
  background-color: #d9a84c;
  color: #333;
  border-radius: 5vw;
  transition:
    color 0.5s,
    box-shadow 0.5s;

  &:hover {
    color: #fff;
    cursor: pointer;
    box-shadow: 0 0 10px #d9a84c;
  }
}

#logo {
  transition: background-color 1s;

  &:hover {
    cursor: pointer;
    background-color: #d9a84c;
  }
}
</style>
