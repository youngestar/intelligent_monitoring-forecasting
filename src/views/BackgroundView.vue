<script lang="ts" setup>
import { UploadFilled, Picture } from '@element-plus/icons-vue';
import { ref } from 'vue';

const color1 = ref('rgba(0, 0, 0, 0.3)');
const color2 = ref('rgba(0, 0, 0, 0.3)');
const color3 = ref('rgba(0, 0, 0, 0.5)');
</script>

<template>
  <el-form>
    <h1 style="text-align: center;">背景修改</h1>
    <el-form-item>
      <span class="bgtitle">
        <el-icon>
          <Picture></Picture>
        </el-icon>
        上传日志记录-主背景图
      </span>
      <el-upload drag action="/" multiple style="width: 100%;">
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          拖拽文件到这里或者 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持 5 M 以下的 .jpg 或 .png文件
          </div>
        </template>
      </el-upload>
      <span>当前主背景图片略缩预览</span>
      <img src="../assets/mainbg2.jpg" alt="">
    </el-form-item>
    <el-form-item>
      <span class="bgtitle">
        <el-icon>
          <Picture></Picture>
        </el-icon>
        上传日志记录-中间栏上图背景图
      </span>
      <el-upload drag action="/" multiple style="width: 100%;">
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          拖拽文件到这里或者 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持 5 M 以下的 .jpg 或 .png文件
          </div>
        </template>
      </el-upload>
      <span>当前中间栏上图背景图片略缩预览</span>
      <img src="../assets/img4.gif" alt="">
      <div style="margin-left: 10vh;">
        <span>覆盖颜色设置</span>
        <el-color-picker v-model="color1" show-alpha />
      </div>
    </el-form-item>
    <el-form-item>
      <span class="bgtitle">
        <el-icon>
          <Picture></Picture>
        </el-icon>
        上传日志记录-中间栏下图背景图
      </span>
      <el-upload drag action="/" multiple style="width: 100%;">
        <el-icon class="el-icon--upload">
          <UploadFilled />
        </el-icon>
        <div class="el-upload__text">
          拖拽文件到这里或者 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            只支持 5 M 以下的 .jpg 或 .png文件
          </div>
        </template>
      </el-upload>
      <span>当前中间栏下图背景图片略缩预览</span>
      <img src="../assets/img2.gif" alt="">
      <div style="margin-left: 10vh;">
        <span>覆盖颜色设置</span>
        <el-color-picker v-model="color2" show-alpha />
      </div>
    </el-form-item>
    <el-form-item>
      <div>
        <div class="bgtitle">
          <el-icon style="position: relative; top: 0.25vh; margin-left: 1vh;">
            <Picture></Picture>
          </el-icon>
          左右栏小图背景颜色调整
          <el-color-picker v-model="color3" show-alpha style="margin-left: 2vh; position: relative; top: 0.25vh;" />
        </div>
      </div>
    </el-form-item>
    <div style="display: flex; justify-content: center;">
      <el-button type="primary">
        恢复默认设置
      </el-button>
    </div>
  </el-form>
</template>

<style scoped>
.el-form {
  width: 60vw;
  margin: auto;
  padding: 3vh 0;
  /* background-image: url(../assets/img5.gif); */
  background-size: cover;
  border: 0.25vh solid #fff;
  border-radius: 2vh;

  .el-upload__tip {
    color: #fff;
    font-weight: bold;
  }

  .el-form-item {
    width: 96%;
    margin: 4vh auto;

    .bgtitle {
      margin-right: 0;
      width: 58vw;
      height: 4vh;
      background-image: url(../assets/img5.gif);
      background-size: cover;
      border-radius: 1vh 1vh 0 0;
    }

    span {
      margin-right: 2vh;
      padding-left: 1vh;

      .el-icon {
        position: relative;
        top: 0.25vh;
      }
    }

    img {
      width: 40vh;
      border: 1.5px solid #fff;
      border-radius: 1vh;
    }
  }
}
</style>
