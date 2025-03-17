<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goToHome = () => {
  router.push('home')
}
</script>

<template>
  <h1 style="margin-top: 12, 5vh; text-align: center; color: #00bfff; font-size: 5vh">
    天穹安防系统
  </h1>
  <p style="text-align: center; color: #9fe9f0">天穹安防系统, 守护您的安全</p>
  <img
    id="logo"
    class="blinking-shadow"
    src="../assets/logo2.jpg"
    alt="logo"
    style="width: 20vw; margin: 10vh 40vw; border-radius: 100%"
    @click="goToHome"
  />
  <!-- <p style="text-align: center; position: relative; left: 1vw">开启您的旅途</p> -->
</template>

<style>
@keyframes shadowBlink {
  0% {
    box-shadow:
      0 0 20px #d28d61,
      0 0 40px #6e626c;
  }
  50% {
    box-shadow:
      0 0 20px #d28d61,
      0 0 40px #f16a1b;
  }
  100% {
    box-shadow:
      0 0 20px #d28d61,
      0 0 40px #6e626c;
  }
}

.blinking-shadow {
  display: inline-block;
  padding: 20px;
  /* border-radius: 10px;
  background-color: #3498db; */
  animation: shadowBlink 1.5s infinite alternate;
}

#logo {
  transition: background-color 1s;
  &:hover {
    cursor: pointer;
    background-color: #d28d61;
  }
}
</style>
