<template>
  <el-row>
    <!-- 对话菜单 -->
    <el-col id="mainLeft" :span="5">
      <div type="primary" id="addChatButton" @click="addNewChat">
        <span style="margin-left: 10px;">
          <el-icon style="top: 0.2vh; margin-right: 2.5px;">
            <Plus />
          </el-icon>
          添加新对话
        </span>
      </div>
      <!-- 对话操作菜单 -->
      <el-menu v-model="isViewingChat" default-active="0" @select="selectChat" style="height: calc(100vh - 94px);">
        <el-menu-item v-for="(item, index) in allChats" :key="index" :index="index + ''">
          <el-icon>
            <img src="../assets/message.svg" alt="message" width="17px" style="margin-right: 5px;">
          </el-icon>
          <span>{{ item.title }}</span>
          <div style="position: absolute; right: 12px;">
            <el-popover placement="left" width="22.5vh" trigger="click" @hide="editChatName(index)">
              <template #reference>
                <!-- 注意阻止冒泡 -->
                <el-button type="primary" circle>
                  <el-icon style="position: relative; left: 0.25vh;">
                    <Edit />
                  </el-icon>
                </el-button>
              </template>
              <el-input placeholder="请输入新名字" v-model="interimName" maxlength="12">
              </el-input>
            </el-popover>
            <!-- 注意阻止冒泡 -->
            <el-button type="danger" circle @click.stop="deleteChat(index)" v-if="index !== 0">
              <el-icon style="position: relative; left: 0.25vh;">
                <Delete />
              </el-icon>
            </el-button>
          </div>
        </el-menu-item>
      </el-menu>
    </el-col>
    <el-col id="mainRight" :span="19">
      <div id="topTitle">
        {{ allChats[isViewingChat].title }}
      </div>
      <el-scrollbar height="80vh" always>
        <!-- 对话内容展示 -->
        <div id="chatContent" style="white-space: pre-wrap">
          <div v-for="(item, index) in chatHistory" :key="index">
            <div v-if="item.role === 'user'" class="user">
              {{ item.content }}
            </div>
            <div v-if="item.role !== 'user'" v-html="renderMarkdown(item.content as string)" class="system">
            </div>
          </div>
          <div v-show="allChats[isViewingChat].isSending" class="system">
            <el-icon id="loading">
              <img src="@/assets/loading.svg" alt="loading" width="25px">
            </el-icon>
          </div>
        </div>
      </el-scrollbar>
      <!-- 对话输入框 -->
      <el-form-item id="mainInput">
        <span>
          <el-icon style="position: relative; top: 0.25vh;">
            <img src="@/assets/robot.svg" alt="robot" width="16px">
          </el-icon>
          智能小助手
        </span>
        <el-input v-model="nowChat" :autosize="{ minRows: 2, maxRows: 10 }" size="large" type="textarea"
          placeholder="请输入你的问题吧" style="position: relative; font-size: 1.8vh;" resize="none"
          @keyup.enter="sendChat(nowChat)">
        </el-input>
        <el-button type="primary" :color="inputButtonColor" style="position: absolute; right: 1.5%; bottom: 0.5vh;"
          circle @click="sendChat(nowChat)">
          <el-icon :size="25" color="#fff">
            <Top />
          </el-icon>
        </el-button>
      </el-form-item>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { Top, Plus, Edit, Delete } from '@element-plus/icons-vue';
import { useChatStore } from "@/stores/chat";
import { ref, watch, onUnmounted, computed } from "vue";
import { ElMessage } from 'element-plus'
import type { Ref } from 'vue';
import OpenAI from "openai";
import { marked } from 'marked';
import router from '@/router';

// 对话分区接口
interface allChat {
  isSending: boolean,
  title: string,
  history: OpenAI.ChatCompletionMessageParam[],
}
type StreamController = AbortController | null;

// 获取密钥
const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
// 调用 store
const chatStore = useChatStore();
// 当前对话序号, 用以储存当前正在浏览的对话
const isViewingChat: Ref<number> = ref(0);
// 临时名称
const interimName = ref<string>('');

// 总对话储存
// 每个对话会有 title 和 history, 对话之间隔离, 通过操作可以添加新的对话
const allChats: Ref<allChat[]> = ref(chatStore.allChats);

// 历史对话储存, 涉及: 总对话对象数组ref, 当前浏览页面数字ref; 储存位置: 对象数组 中对象的 history 属性中
// 注意: 使用 computed 以做到及时更新
const chatHistory = computed(() => {
  return allChats.value[isViewingChat.value].history;
});
// 总对话切换函数
const selectChat = (index: number) => {
  // 消息未发送完成, 阻止重新导航
  if (allChats.value[isViewingChat.value].isSending === true && index !== isViewingChat.value) {
    ElMessage({
      message: '当前有消息在响应哦, 请等一下吧',
    })
    return;
  }
  // 菜单重新导航
  else {
    isViewingChat.value = index;
    router.replace({
      name: 'chat',
      params: {
        chatName: allChats.value[index].title,
      }
    })
  }
}

// 添加新对话函数
const addNewChat = () => {
  // 消息数量过多时阻止添加
  if (allChats.value.length >= 15) {
    ElMessage({
      message: '对话数量太多啦, 请删除一些吧',
    })
    return;
  }
  chatStore.addNewChat();
}

// 对话改名函数
const editChatName = (index: number) => {
  if (!interimName.value.trim()) return;
  chatStore.editChatName(interimName.value, index)
  interimName.value = '';
}

// 对话删除函数
const deleteChat = (index: number) => {
  // 判断是否删除当前对话
  if (index == isViewingChat.value) {
    if (allChats.value[isViewingChat.value].isSending === true) {
      // 消息未发送完成, 阻止删除
      ElMessage({
        message: '当前有消息在响应哦, 请等一下吧',
      })
      return;
    }
    isViewingChat.value--;
  }
  chatStore.deleteChat(index);
}

// 输入框绑定
const nowChat = ref<string>('');
// 输入框按钮颜色检测
const inputButtonColor = ref('rgb(199.5, 201, 204)');
watch(nowChat, (newValue) => {
  inputButtonColor.value = newValue === '' ? 'rgb(199.5, 201, 204)' : '';
})
// 使用 AbortController 便于流式响应检测及中断
const abortController = ref<StreamController>(null);
// 检测消息是否发送完成
// const isSending = ref<boolean>(false);

// ai 模型创建及调用部分
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
});

// 发送请求函数
async function chatWithModel(chatMessage: string): Promise<void> {
  // 中断未结束流式响应
  abortController.value?.abort();
  const controller = new AbortController();
  abortController.value = controller;
  // 添加到历史对话
  chatHistory.value.push(
    {
      role: 'user',
      content: chatMessage,
    },
  );
  let role = null;
  try {
    const stream = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: chatHistory.value,
      store: true,
      stream: true,
    }, {
      // 绑定中止信号
      signal: controller.signal,
    });
    // 提取流式响应数据
    for await (const chunk of stream) {
      const response = chunk.choices[0];
      // 尝试获取 role
      if (!role && response?.delta?.role) {
        role = response?.delta?.role;
        chatHistory.value.push({
          role: role,
          content: '',
          tool_call_id: response?.delta?.tool_calls?.[0]?.id ?? '', // 新增 tool_call_id，默认为空字符串
        })
        allChats.value[isViewingChat.value].isSending = false;
        // console.log('获取到role');
      }
      else {
        // console.log('获取role失败');
      }
      const delta = response?.delta?.content;
      if (delta) {
        // 使用了类型断言,可能导致错误请注意
        chatHistory.value.at(-1)!.content += delta;
      }
    }
    // console.log(chatHistory.value);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message?.includes('abort')) {
        // 使用了类型断言,可能导致错误请注意
        chatHistory.value.at(-2)!.content += '(该对话被中断)';
        return;
      }
    }
    console.error('请求出错:', error);
  }
}

// 发送输入框内容
async function sendChat(chatMessage: string): Promise<void> {
  if (chatMessage.trim() === '') {
    return;
  }
  // 设置状态为发送中
  allChats.value[isViewingChat.value].isSending = true;
  chatWithModel(chatMessage.trim());
  nowChat.value = '';
}

// 转化获取内容为 md 格式
function renderMarkdown(markdown: string) {
  return marked(markdown);
}

// chatWithModel("你好!现在开始,每次请求后你将回复我一个报数,从 1 开始,每次 +1");

onUnmounted(() => {
  abortController.value?.abort();
});
</script>

<style scoped>
body {
  margin: 0;
}

body {
  overflow: hidden;
  padding: 0;

  #mainLeft {
    height: 100%;
    background-color: #fff;
  }

  #mainRight {
    #topTitle {
      height: 5vh;
      margin: 0 auto;
      color: #fff;
      text-align: center;
      line-height: 5vh;
      font-size: 3vh;
      font-weight: bold;
    }

    position: relative;
    height: 100%;

    /* background-color: pink; */
    #chatContent {
      max-height: 100vh;
      width: 60%;
      margin: 0 auto;
      background-color: blue;

      .user {
        float: right;
        clear: both;
        width: auto;
        max-width: 60%;
        line-height: 2vh;
        margin: 2vh 0;
        padding: 1.5vh;
        background-color: #fff;
        border-radius: 1.2vh;
        color: #000;
      }

      .system {
        position: relative;
        width: auto;
        width: 100%;
        padding: 1.5vh;
        margin: 2vh 0;
        /* background-color: #fff; */
        color: #fff;
        float: left;

        &::before {
          content: '';
          position: absolute;
          left: -6vh;
          width: 5vh;
          height: 5vh;
          border-radius: 100%;
          background-image: url(../assets/头像.jpg);
          background-size: cover;
        }
      }
    }

    #mainInput {
      position: absolute;
      bottom: -10vh;
      width: 60%;
      margin: 0 20%;

      span {
        padding-left: 1.2vh;
        width: 100%;
        font-size: 1.6vh;
        background-image: url(../assets/img5.gif);
        background-size: cover;
        border-radius: 0.5vh 0.5vh 0 0;
      }
    }
  }
}

#addChatButton {
  width: 95%;
  height: 40px;
  margin-top: 10px;
  margin-bottom: 10px;
  margin-left: 6px;
  background-color: #d7e4fc;
  border: 1px solid #b4ccfc;
  border-radius: 3px;
  font-size: 16px;
  font-weight: bold;
  color: #1965fc;
  line-height: 40px;

  &:hover {
    background-color: #e2eaf9;
    color: #4481fa;
    cursor: pointer;
  }
}

#loading {
  position: relative;
  top: 1vh;
  font-size: 2.5vh;
  animation: loading 2s linear infinite;
}

@keyframes loading {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
