<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Calendar } from '@element-plus/icons-vue'
const route=useRoute()
</script>
<template><div><div class="page-heading"><div><h1>{{route.meta.title}}</h1><p>该业务模块已列入下一阶段迭代计划。</p></div></div><section class="panel placeholder"><div class="placeholder-icon"><el-icon><Calendar/></el-icon></div><h2>{{route.meta.title}}即将上线</h2><p>目前已完成产品结构与基础路由，后续将接入业务表单、状态流转和数据统计。</p><button class="primary-button" @click="$router.push('/dashboard')">返回工作台</button></section></div></template>
<style scoped>.placeholder{min-height:430px;padding:60px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.placeholder-icon{width:70px;height:70px;border-radius:20px;display:grid;place-items:center;color:#14766c;background:#e6f4f1;font-size:31px}.placeholder h2{margin:22px 0 8px;font-size:20px}.placeholder p{max-width:420px;margin:0 0 25px;color:#84918d;font-size:12px;line-height:1.8}</style>
