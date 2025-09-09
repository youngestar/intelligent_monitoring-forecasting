<script setup lang="ts">
import { reactive, ref, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormRules, FormInstance } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/login'
import router from '@/router'

// 记住我选项
const rememberMe: Ref<boolean> = ref(false)
// 现在浏览页面
const nowView: Ref<'login' | 'register'> = ref('login')
// 使用 store
const userStore = useUserStore()

// 登录表单验证
const loginFormRef = ref<FormInstance>()

// 用户名验证
const validateName = (rule: any, value: string, callback: (error?: string | Error) => void) => {
  if (value === '') {
    callback('请填写用户名')
  } else if (nowView.value === 'login') {
    if (userStore.userList.find((user) => user.userName === loginForm.name)) {
      callback()
    } else {
      callback('没有找到此用户')
    }
  } else if (nowView.value === 'register') {
    callback()
  } else {
    callback('当前状态发生未知错误,请刷新并反馈')
  }
}

// 密码验证
const validatePassword = (rule: any, value: string, callback: (error?: string | Error) => void) => {
  const redex = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/
  if (value === '') {
    callback('请填写密码')
  } else if (value.length < 6) {
    callback('密码不能小于 6 位')
  } else if (!redex.test(value)) {
    callback('密码应同时包含: 数字, 大写字母, 小写字母, 标点符号')
  } else if (nowView.value === 'login') {
    const user = userStore.userList.find((user) => user.userName === loginForm.name)
    if (user?.password === loginForm.password) {
      callback()
    } else {
      callback('密码错误')
    }
  } else if (nowView.value === 'register') {
    callback()
  } else {
    callback('当前状态发生未知错误,请刷新并反馈')
  }
}

const loginForm = reactive({
  name: '',
  password: '',
})

const loginRules = reactive<FormRules<typeof loginForm>>({
  name: [{ validator: validateName, trigger: 'submit' }],
  password: [{ validator: validatePassword, trigger: 'submit' }],
})

// 登录函数
const login = (formEI: FormInstance | undefined) => {
  if (!formEI) return
  formEI.validate((valid) => {
    if (valid) {
      // 传递用户名给getToken函数，以便在右上角显示
      userStore.getToken(loginForm.name)
      ElMessage({
        message: '登录成功',
        type: 'success',
      })
      router.push({ name: 'home' })
    } else {
      ElMessage({
        message: '登录失败',
        type: 'error',
      })
    }
  })
}

// 注册表单验证
const registerFormRef = ref<FormInstance>()

// 密码二次填写验证
const validateCheckPassword = (
  rule: any,
  value: string,
  callback: (error?: string | Error) => void,
) => {
  if (value === '') {
    callback('请再次填写密码')
  } else if (value !== registerForm.password) {
    callback('两次填写的密码不一致')
  } else {
    callback()
  }
}

const registerForm = reactive({
  name: '',
  password: '',
  checkPassword: '',
})

const registerRules = reactive<FormRules<typeof registerForm>>({
  name: [{ validator: validateName, trigger: 'submit' }],
  password: [{ validator: validatePassword, trigger: 'submit' }],
  checkPassword: [{ validator: validateCheckPassword, trigger: 'submit' }],
})

// 注册函数
const register = (formEI: FormInstance | undefined) => {
  if (!formEI) return
  formEI.validate((valid) => {
    if (valid) {
      userStore.addUser(registerForm.name, registerForm.password)
      ElMessage({
        type: 'success',
        message: '注册成功',
      })
      nowView.value = 'login'
    } else {
      ElMessage({
        type: 'error',
        message: '注册失败',
      })
    }
  })
}
</script>

<template>
  <div id="home">
    <img id="logo" class="blinking-shadow" src="@/assets/companyLogo.jpg" alt="logo" style="
        width: 10vw;
        margin: 18vh calc(45vw - 8.5px);
        margin-bottom: 20px;
        border-radius: 100%;
      " />
    <p style="text-align: center; color: #fff; font-size: 3vh; font-weight: 600;">风光水储多能互补协同优化决策支撑平台</p>
    <div id="login" v-show="nowView === 'login'">
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="auto" id="loginForm"
        :autocomplete="rememberMe === false ? 'off' : 'true'" style="width: 90%" @submit.prevent="login(loginFormRef)">
        <el-form-item prop="name">
          <el-input v-model="loginForm.name" :maxlength="12" placeholder="用户名">
            <template #prefix>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" show-password :maxlength="12" placeholder="密码">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-checkbox label="记住我" v-model="rememberMe" />
          <el-button type="primary" text @click="nowView = 'register'" style="margin-left: 200px">
            立刻注册
          </el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width: 80%; margin: 0 10%" @click="login(loginFormRef)">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    <div id="register" v-show="nowView === 'register'">
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="auto" id="registerForm"
        @submit.prevent="register(registerFormRef)">
        <el-form-item prop="name">
          <el-input v-model="registerForm.name" :maxlength="12" placeholder="用户名">
            <template #prefix>
              <el-icon>
                <User />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="registerForm.password" type="password" show-password :maxlength="12" placeholder="密码">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="checkPassword">
          <el-input v-model="registerForm.checkPassword" type="password" show-password :maxlength="12"
            placeholder="请再次确认密码">
            <template #prefix>
              <el-icon>
                <Lock />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button @click="register(registerFormRef)" type="primary" style="width: 80%; margin: 0 10%">
            注册
          </el-button>
          <span style="font-size: 14px; margin-left: 10%; color: #000">
            或者
            <el-link type="primary" @click="nowView = 'login'" style="position: relative; bottom: 1.5px">
              现在登录!
            </el-link>
          </span>
        </el-form-item>
      </el-form>
    </div>
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

  #login {
    width: 400px;
    height: 250px;
    margin: auto;
    background-color: #fff;
    border-radius: 10px;

    #loginForm {
      margin: 25px;
      position: relative;
      top: 25px;
    }
  }

  #register {
    width: 400px;
    height: 250px;
    margin: auto;
    background-color: #fff;
    border-radius: 10px;

    #registerForm {
      margin: 25px;
      position: relative;
      top: 25px;
    }
  }
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
