<template>
  <el-form ref="formRef" :model="form" :rules="formRules">
    <h1>数据更替</h1>
    <el-form-item prop="echartsType">
      <span>
        <el-icon>
          <Files />
        </el-icon>图表类型
      </span>
      <el-select v-model="form.echartsType" placeholder="请选择图表类型">
        <el-option v-for="item in echartsTypeOptions" :key="item" :value="item">
        </el-option>
      </el-select>
    </el-form-item>
    <el-form-item prop="title">
      <span>
        <el-icon>
          <Star />
        </el-icon>
        图表标题
      </span>
      <el-input v-model="form.title" maxlength="20" show-word-limit placeholder="请填写标题" />
    </el-form-item>
    <el-form-item prop="xAxis">
      <span>
        <el-icon>
          <Right />
        </el-icon>
        x轴内容
      </span>
      <el-input v-model="form.xAxis" maxlength="50" :rows="3" type="textarea" show-word-limit
        placeholder="请以 标签-数据-数据-数据... 的形式填写 x 轴的内容" />
    </el-form-item>
    <el-form-item prop="yAxis">
      <span>
        <el-icon>
          <Top />
        </el-icon>
        y轴内容
      </span>
      <el-input v-model="form.yAxis" maxlength="50" :rows="3" type="textarea" show-word-limit
        placeholder="请以 标签-数据-数据-数据... 的形式填写 y 轴的内容" />
    </el-form-item>
    <el-form-item prop="legend">
      <span>
        <el-icon>
          <Discount />
        </el-icon>
        图例标签内容
      </span>
      <el-input-tag v-model="form.legend" placeholder="请输入图例内容,每输入完成一项后请按 回车键" aria-label="请输入图例内容,每输入完成一项后请按 回车"
        :max="8" />
    </el-form-item>
    <el-form-item prop="data" v-if="form.legend.length !== 0">
      <span>
        <el-icon>
          <More />
        </el-icon>
        图例具体数据
      </span>
      <el-input-tag v-model="form.data" placeholder="请以 [数据1, 数据2, 数据3, 数据4...] 的方式输入每个图例对应的具体数据内容,每输入完成一项后请按 回车键"
        aria-label="请以 [数据1, 数据2, 数据3, 数据4...] 的方式输入每个图例的具体数据内容,每输入完成一项后请按 回车键" :max="form.legend.length" />
    </el-form-item>
    <div id="button">
      <el-button @click="submit(formRef)" type="primary">
        提交数据
      </el-button>
      <el-button @click="resetForm" type="danger">
        重置已填写数据
      </el-button>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { Files, Star, Right, Top, Discount, More } from '@element-plus/icons-vue';
import type { FormRules, FormInstance } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';

const echartsTypeOptions = ref([
  '漏洞维护',
  '态势感知',
  '灾备机制',
  '流量分析',
  '基线排查',
  '攻击溯源',
  '日常运维',
  '权限抑制',
])

const formRef = ref<FormInstance>();

const validateEchartsType = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请填写图表类型'));
  } else {
    callback();
  }
}

const validateTitle = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请填写图表标题'));
  } else {
    callback();
  }
}

const validateXAxis = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请填写x轴内容'));
  } else {
    callback();
  }
}

const validateYAxis = (rule: any, value: any, callback: any) => {
  if (!value) {
    callback(new Error('请填写y轴内容'));
  } else {
    callback();
  }
}

const validateLegend = (rule: any, value: any, callback: any) => {
  if (value.length === 0) {
    callback(new Error('请填写图例内容'));
  } else {
    callback();
  }
}

const validateData = (rule: any, value: any, callback: any) => {
  if (value.length === 0) {
    callback(new Error('请填写总体数据'));
  } else {
    callback();
  }
}

const form = reactive({
  echartsType: '',
  title: '',
  xAxis: '',
  yAxis: '',
  legend: [],
  data: [],
})

const formRules = reactive<FormRules<typeof form>>({
  echartsType: [{ validator: validateEchartsType, trigger: 'blur' }],
  title: [{ validator: validateTitle, trigger: 'blur' }],
  xAxis: [{ validator: validateXAxis, trigger: 'blur' }],
  yAxis: [{ validator: validateYAxis, trigger: 'blur' }],
  legend: [{ validator: validateLegend, trigger: 'blur' }],
  data: [{ validator: validateData, trigger: 'blur' }],
})

const submit = (formEI: FormInstance | undefined) => {
  if (!formEI) return;
  formEI.validate((valid) => {
    if (valid) {
      ElMessage({
        type: 'success',
        message: '提交成功',
      });
    }
    else {
      ElMessage({
        type: 'error',
        message: '提交失败',
      });
    }
  })
}

const resetForm = () => {
  if (!formRef.value) return;
  ElMessageBox.confirm(
    '要重置数据吗',
    'Warning',
    {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning',
    }
  ).then(() => {
    formRef.value?.resetFields();
    ElMessage({
      type: 'success',
      message: '重置成功',
    })
  }).catch(() => {
    return;
  })
}
</script>

<style scoped>
h1 {
  font-size: 3.5vh;
  text-align: center;
  margin-top: 3vh;
  margin-bottom: -2vh;
}

.el-form {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  width: 60%;
  margin: 1vh auto;
  /* 背景黑色卡片 */
  background-color: rgba(0, 0, 0, 0.3);
  border: 0.25vh solid #fff;
  border-radius: 2vh;
  font-size: 1.5vh;

  &::before {
    position: absolute;
    top: 0;
    left: 0;
    content: '';
    height: 100%;
    width: 100%;
    background-image: url(../assets/img1.gif);
    background-size: cover;
    opacity: 0.5;
    z-index: -1;
  }
}

/*
.el-select .el-input__inner {
    font-size: 100px;
}

.el-select-dropdown {
    height: 10vh;
}
.el-select-dropdown__item {
    font-size: 1.5vh;
    padding: 2.5vh 0;
}
.el-tag {
            font-size: 1.5vh;
} */
.el-form-item {
  width: 96%;
  margin: 4vh auto;
  background-image: url(../assets/img5.gif);
  background-size: cover;
  border-radius: 0.5vh 0.5vh 0 0;

  /* {
        font-size: 1.5vh;
        border-radius: 0 0 0.5vh 0.5vh;
    }
    .el-input-tag {
        padding: 0.6vh 0;
    } */
  span {
    margin-left: 1.5vh;
    font-size: 1.5vh;
    padding: 0.5vh 0;

    .el-icon {
      position: relative;
      top: 0.25vh;
      right: 0.2vh;
    }
  }
}

#button {
  display: flex;
  justify-content: space-between;
  margin: 0 5vh;
  padding-bottom: 5vh;

  .el-button {
    font-size: 1.5vh;
    padding: 1.5vh 1vh;
    border-radius: 0.5vh;
  }
}
</style>
