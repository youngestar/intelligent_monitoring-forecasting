import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Ref } from 'vue'

interface User {
  userName: string
  password: string
}

export const useUserStore = defineStore(
  'user',
  () => {
    // 使用布尔值类型的 rememberMe，逻辑上更符合需求
    const rememberMe = ref<boolean>(false)

    // token 是字符串类型或 null，已经正确声明
    const token: Ref<string | null> = ref(null)

    // 将 userList 作为响应式数据，使用 Ref 包裹
    const userList: Ref<User[]> = ref([
      {
        userName: '例子',
        password: '123456',
      },
    ])

    // 添加新用户到 userList 中
    const addUser = (userName: string, password: string) => {
      userList.value.push({
        userName,
        password,
      })
    }

    // 模拟获取 token
    const getToken = () => {
      token.value = 'token'
    }

    return { userList, addUser, token, rememberMe, getToken }
  },
  {
    persist: [
      {
        pick: ['userList', 'rememberMe'],
        storage: localStorage,
      },
      {
        pick: ['token'],
        storage: sessionStorage,
      },
    ],
  },
)
