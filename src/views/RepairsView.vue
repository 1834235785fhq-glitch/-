<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Repair, RepairStatus } from '@/types'

const repairs = ref<Repair[]>([])
const loading = ref(true)
const keyword = ref('')
const active = ref('全部')
const tabs = ['全部','待受理','已受理','维修中','已完成']
const filtered = computed(() => repairs.value.filter((item) => (active.value==='全部'||item.status===active.value) && `${item.title}${item.orderNo}${item.location}`.includes(keyword.value.trim())))
const statusClass=(status:string)=>({待受理:'status-danger',已受理:'status-info',维修中:'status-warning',已完成:'status-success'}[status]??'status-neutral')
async function loadRepairs(){ loading.value=true; try{ repairs.value=await api.get<Repair[]>('/api/repairs') }catch(error){ElMessage.error(error instanceof Error?error.message:'工单加载失败')}finally{loading.value=false} }
async function advance(item:Repair){
  const next:Partial<Record<RepairStatus,RepairStatus>>={待受理:'已受理',已受理:'维修中',维修中:'已完成'}
  const nextStatus=next[item.status]
  if(!nextStatus)return ElMessage.info('该工单已完成')
  try{await api.patch(`/api/repairs/${item.id}/status`,{status:nextStatus});ElMessage.success(`工单已更新为“${nextStatus}”`);await loadRepairs()}catch(error){ElMessage.error(error instanceof Error?error.message:'状态更新失败')}
}
function handle(title:string){ElMessage.info(`${title}功能将在下一次迭代中完成`) }
onMounted(loadRepairs)
</script>

<template><div><div class="page-heading"><div><h1>报修管理</h1><p>跟进学生报修工单，记录受理、维修和完成情况。</p></div><button class="primary-button" @click="handle('新建报修')"><el-icon><Plus /></el-icon>新建报修</button></div><section class="repair-summary"><div><span>待受理</span><strong class="red">{{repairs.filter(i=>i.status==='待受理').length}}</strong><small>需要宿管及时响应</small></div><div><span>处理中</span><strong class="amber">{{repairs.filter(i=>i.status==='已受理'||i.status==='维修中').length}}</strong><small>已受理或维修中</small></div><div><span>已完成</span><strong class="green">{{repairs.filter(i=>i.status==='已完成').length}}</strong><small>历史完成工单</small></div></section><section class="panel"><div class="repair-tabs"><button v-for="tab in tabs" :key="tab" :class="{active:active===tab}" @click="active=tab">{{tab}}<b v-if="tab==='待受理'">{{repairs.filter(i=>i.status==='待受理').length}}</b></button></div><div class="filter-bar"><div class="search-box"><el-icon><Search /></el-icon><input v-model="keyword" class="filter-input" placeholder="搜索工单、故障或位置" /></div><select class="filter-input select"><option>全部类型</option><option>水电维修</option><option>门窗维修</option><option>空调维修</option></select></div><div v-loading="loading" class="table-wrap"><table class="data-table"><thead><tr><th>工单编号</th><th>报修内容</th><th>位置</th><th>提交人</th><th>提交时间</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in filtered" :key="item.id"><td class="order-no">{{item.orderNo}}</td><td><div class="repair-title"><b>{{item.title}}</b><span>{{item.category}}</span></div></td><td>{{item.location}}</td><td>{{item.student}}</td><td>{{item.submittedAt}}</td><td><span class="priority" :class="{urgent:item.priority==='紧急'}">{{item.priority}}</span></td><td><span class="status-pill" :class="statusClass(item.status)">{{item.status}}</span></td><td><button class="link-action" @click="advance(item)">{{item.status==='待受理'?'受理':item.status==='已受理'?'开始维修':item.status==='维修中'?'完成':'查看'}}</button></td></tr><tr v-if="!loading&&!filtered.length"><td colspan="8" class="empty-row">当前分类暂无工单</td></tr></tbody></table></div><div class="pagination"><span>共 {{filtered.length}} 条数据</span><div class="page-buttons"><button>‹</button><button class="active">1</button><button>›</button></div></div></section></div></template>

<style scoped>.repair-summary{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.repair-summary>div{padding:18px 21px;border:1px solid var(--line);border-radius:12px;display:grid;grid-template-columns:1fr auto;align-items:center;background:white}.repair-summary span{color:#75827f;font-size:11px}.repair-summary strong{grid-row:1/3;grid-column:2;font-size:25px}.repair-summary small{margin-top:5px;color:#98a19f;font-size:9px}.red{color:#c75b50}.amber{color:#bd7c27}.green{color:#19806e}.repair-tabs{height:54px;padding:0 20px;border-bottom:1px solid #edf0ef;display:flex;align-items:end;gap:24px}.repair-tabs button{height:43px;padding:0 2px;border:0;border-bottom:2px solid transparent;color:#7a8783;background:transparent;font-size:11px}.repair-tabs button.active{border-bottom-color:var(--primary);color:var(--primary);font-weight:600}.repair-tabs b{margin-left:5px;padding:1px 5px;border-radius:8px;color:#c75d51;background:#fbe9e7;font-size:8px}.search-box{position:relative}.search-box .el-icon{position:absolute;z-index:1;left:11px;top:10px;color:#93a09c}.search-box input{padding-left:33px}.filter-input.select{width:140px}.order-no{color:#55716b;font-family:monospace}.repair-title{display:grid;gap:3px}.repair-title b{color:#263532;font-weight:600}.repair-title span{color:#909b98;font-size:9px}.priority{padding:3px 7px;border-radius:4px;color:#6b7774;background:#f0f2f2;font-size:9px}.priority.urgent{color:#c9564b;background:#fceae8}.link-action{padding:0;border:0;color:#14756c;background:transparent;font-size:11px}.empty-row{text-align:center!important;color:#9aa5a2!important;padding:45px!important}@media(max-width:600px){.repair-summary{grid-template-columns:1fr}.repair-tabs{gap:15px;overflow-x:auto}.filter-input.select{width:100%}}</style>
