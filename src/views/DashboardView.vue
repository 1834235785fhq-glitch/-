<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowRight, Bell, House, MoreFilled, OfficeBuilding, Tools, TrendCharts, User, UserFilled, Warning } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api/client'
import type { Repair } from '@/types'

interface DashboardData { metrics:{occupied:number;capacity:number;availableBeds:number;occupancy:number;buildings:number;rooms:number;pendingRepairs:number;urgentRepairs:number;pendingTransfers:number;pendingLateReturns:number;unassignedStudents:number};buildingRates:Array<{id:number;name:string;gender:string;value:number}>;latestRepairs:Repair[];latestNotices:Array<{id:number;title:string;category:string;publishedAt:string}> }

const auth = useAuthStore()
const data=ref<DashboardData|null>(null)
const occupancy = computed(() => data.value?.metrics.occupancy ?? 0)
const bars = [68, 78, 62, 84, 71, 75, 89, 82, 76, 87, 92, 88]
const buildingRates = computed(() => data.value?.buildingRates.slice(0,4) ?? [])
onMounted(async()=>{data.value=await api.get<DashboardData>('/api/admin/dashboard')})
</script>

<template>
  <div>
    <div class="page-heading"><div><h1>下午好，{{auth.user.name}}</h1><p>这是今天的宿舍运营概况，有报修与晚归记录需要及时处理。</p></div><button class="date-button">2026年9月10日 · 星期四</button></div>

    <section class="metrics-grid">
      <article class="metric-card"><div class="metric-icon mint"><el-icon><UserFilled /></el-icon></div><div class="metric-main"><span>在住学生</span><strong>{{data?.metrics.occupied ?? 0}}</strong><small class="up">{{data?.metrics.unassignedStudents ?? 0}} 人待分配</small></div><div class="sparkline mint-line"><i v-for="h in [28,36,30,45,42,55,51,66,62,75]" :key="h" :style="{height: `${h}%`}" /></div></article>
      <article class="metric-card"><div class="metric-icon blue"><el-icon><House /></el-icon></div><div class="metric-main"><span>可用床位</span><strong>{{data?.metrics.availableBeds ?? 0}}</strong><small>总计 {{data?.metrics.capacity ?? 0}}</small></div><div class="ring" :style="{ '--value': `${occupancy * 3.6}deg` }"><b>{{ occupancy }}%</b></div></article>
      <article class="metric-card"><div class="metric-icon amber"><el-icon><Tools /></el-icon></div><div class="metric-main"><span>待处理报修</span><strong>{{data?.metrics.pendingRepairs ?? 0}}</strong><small class="down">{{data?.metrics.urgentRepairs ?? 0}} 项紧急</small></div><div class="metric-decoration"><Tools /></div></article>
      <article class="metric-card"><div class="metric-icon violet"><el-icon><OfficeBuilding /></el-icon></div><div class="metric-main"><span>宿舍楼栋</span><strong>{{data?.metrics.buildings ?? 0}}</strong><small>共 {{data?.metrics.rooms ?? 0}} 间房</small></div><div class="metric-decoration"><OfficeBuilding /></div></article>
    </section>

    <section class="dashboard-grid">
      <article class="panel trend-panel">
        <div class="panel-header"><div class="panel-title"><h2>入住率趋势</h2><p>最近 12 个月整体入住变化</p></div><div class="chart-legend"><i />入住率 <button>近一年⌄</button></div></div>
        <div class="chart-area">
          <div class="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
          <div class="bar-chart"><div v-for="(value, index) in bars" :key="index" class="bar-column"><div class="bar-track"><i :style="{height: `${value}%`}" /><b v-if="index === 10">{{ value }}%</b></div><span>{{ index + 1 }}月</span></div></div>
        </div>
      </article>
      <article class="panel occupancy-panel">
        <div class="panel-header"><div class="panel-title"><h2>楼栋入住率</h2><p>各楼栋实时入住情况</p></div><button class="text-button">查看全部 <el-icon><ArrowRight /></el-icon></button></div>
        <div class="rate-list"><div v-for="building in buildingRates" :key="building.name" class="rate-item"><div class="rate-name"><span>{{ building.name }}</span><small>{{ building.gender }}</small><strong>{{ building.value }}%</strong></div><div class="progress"><i :style="{width: `${building.value}%`}" /></div></div></div>
      </article>
    </section>

    <section class="bottom-grid">
      <article class="panel repair-panel"><div class="panel-header"><div class="panel-title"><h2>最新报修</h2><p>按提交时间排序</p></div><button class="text-button" @click="$router.push('/admin/repairs')">全部报修 <el-icon><ArrowRight /></el-icon></button></div><div class="repair-list"><div v-for="repair in data?.latestRepairs" :key="repair.id" class="repair-row"><div class="repair-symbol" :class="repair.priority === '紧急' ? 'urgent' : ''"><el-icon><Tools /></el-icon></div><div class="repair-info"><strong>{{ repair.title }}</strong><span>{{ repair.location }} · {{ repair.student }}</span></div><div class="repair-time"><span>{{ repair.submittedAt }}</span><b :class="repair.status === '待受理' ? 'pending' : ''">{{ repair.status }}</b></div><button><el-icon><MoreFilled /></el-icon></button></div></div></article>
      <article class="panel notice-panel"><div class="panel-header"><div class="panel-title"><h2>待办与提醒</h2><p>根据实时业务数据统计</p></div><button class="icon-button"><el-icon><Bell /></el-icon></button></div><div class="notice-list"><div><i class="orange"><el-icon><Warning /></el-icon></i><p><strong>{{data?.metrics.pendingTransfers ?? 0}} 条调宿申请待处理</strong><span>请核对原因并安排可用床位</span></p></div><div><i class="green"><el-icon><User /></el-icon></i><p><strong>{{data?.metrics.unassignedStudents ?? 0}} 名学生等待分配宿舍</strong><span>可前往学生管理办理入住</span></p></div><div><i class="blue"><el-icon><TrendCharts /></el-icon></i><p><strong>{{data?.metrics.pendingLateReturns ?? 0}} 条晚归记录待确认</strong><span>请及时联系学生核实情况</span></p></div></div></article>
    </section>
  </div>
</template>

<style scoped>
.date-button { height: 36px; padding: 0 13px; border: 1px solid var(--line); border-radius: 8px; color: #65736f; background: white; font-size: 11px; }
.metrics-grid { margin-bottom: 18px; display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
.metric-card { min-height: 132px; position: relative; overflow: hidden; padding: 21px; border: 1px solid var(--line); border-radius: 13px; display: flex; align-items: flex-start; gap: 13px; background: white; box-shadow: 0 4px 20px rgba(30,60,52,.025); }
.metric-icon { width: 37px; height: 37px; flex: 0 0 37px; border-radius: 9px; display: grid; place-items: center; font-size: 18px; }
.metric-icon.mint { color: #138575; background: #e5f5f1; }.metric-icon.blue { color: #487db3; background: #edf4fb; }.metric-icon.amber { color: #bd771b; background: #fff3df; }.metric-icon.violet { color: #775fa7; background: #f2eefa; }
.metric-main { position: relative; z-index: 1; display: grid; }
.metric-main > span { color: #778480; font-size: 11px; }
.metric-main strong { margin: 6px 0 3px; color: #20302d; font-size: 25px; line-height: 1; letter-spacing: -.5px; }
.metric-main small { color: #95a09d; font-size: 9px; }.metric-main small.up { color: #19816d; }.metric-main small.down { color: #d16454; }
.sparkline { position: absolute; right: 15px; bottom: 20px; width: 72px; height: 45px; display: flex; align-items: end; gap: 3px; }
.sparkline i { width: 5px; border-radius: 3px 3px 0 0; background: #a4ddd3; }
.ring { --value: 320deg; position: absolute; right: 17px; bottom: 18px; width: 51px; height: 51px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#5591c5 var(--value), #e9eff3 0); }
.ring::after { content: ''; position: absolute; width: 39px; height: 39px; border-radius: 50%; background: white; }.ring b { z-index: 1; font-size: 9px; }
.metric-decoration { position: absolute; right: -7px; bottom: -16px; width: 72px; color: #f0f3f2; transform: rotate(-8deg); }
.dashboard-grid { margin-bottom: 18px; display: grid; grid-template-columns: minmax(0,1.7fr) minmax(290px,.8fr); gap: 16px; }
.chart-legend { display: flex; align-items: center; gap: 6px; color: #73817d; font-size: 10px; }.chart-legend i { width: 7px; height: 7px; border-radius: 2px; background: #50ad9d; }.chart-legend button { margin-left: 13px; padding: 6px 9px; border: 1px solid var(--line); border-radius: 6px; color: #667470; background: white; font-size: 10px; }
.chart-area { height: 245px; padding: 21px 20px 17px; display: grid; grid-template-columns: 37px 1fr; }
.y-labels { padding-bottom: 24px; display: flex; flex-direction: column; justify-content: space-between; color: #a2aaa8; font-size: 8px; }
.bar-chart { border-bottom: 1px solid #e9edec; display: flex; align-items: stretch; gap: clamp(5px,1.3vw,15px); background: repeating-linear-gradient(to bottom, #edf0ef 0, #edf0ef 1px, transparent 1px, transparent 25%); }
.bar-column { min-width: 10px; flex: 1; display: grid; grid-template-rows: 1fr 22px; align-items: end; }
.bar-track { height: 100%; position: relative; display: flex; align-items: end; justify-content: center; }.bar-track i { width: min(22px,70%); border-radius: 4px 4px 0 0; background: linear-gradient(to top,#3e9c8d,#74c6b8); }.bar-track b { position: absolute; bottom: calc(92% + 4px); padding: 3px 5px; border-radius: 4px; color: white; background: #173d38; font-size: 8px; }
.bar-column > span { padding-top: 8px; text-align: center; color: #97a29f; font-size: 8px; }
.rate-list { padding: 20px; display: grid; gap: 21px; }
.rate-name { margin-bottom: 8px; display: flex; align-items: center; gap: 7px; }.rate-name span { font-size: 11px; font-weight: 600; }.rate-name small { padding: 2px 5px; border-radius: 4px; color: #6b7c78; background: #f0f3f2; font-size: 8px; }.rate-name strong { margin-left: auto; font-size: 11px; }
.progress { height: 6px; border-radius: 4px; overflow: hidden; background: #edf1f0; }.progress i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#2d9182,#68c4b4); }
.bottom-grid { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(290px,.8fr); gap: 16px; }
.repair-list { padding: 4px 20px; }.repair-row { min-height: 69px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #edf0ef; }.repair-row:last-child { border: 0; }.repair-symbol { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; color: #568578; background: #eef5f3; }.repair-symbol.urgent { color: #d06051; background: #fcedea; }.repair-info { min-width: 0; flex: 1; display: grid; gap: 4px; }.repair-info strong { font-size: 11px; }.repair-info span,.repair-time span { color: #899591; font-size: 9px; }.repair-time { width: 80px; display: grid; gap: 5px; justify-items: end; }.repair-time b { color: #4c857d; font-size: 9px; font-weight: 500; }.repair-time b.pending { color: #d36c55; }.repair-row > button { border: 0; color: #9ca6a3; background: transparent; }
.notice-list { padding: 7px 20px; }.notice-list > div { min-height: 67px; display: flex; align-items: center; gap: 11px; }.notice-list i { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; font-style: normal; }.notice-list i.orange { color: #c37a26; background: #fff2df; }.notice-list i.green { color: #238476; background: #e6f4f1; }.notice-list i.blue { color: #527eaa; background: #ebf2fa; }.notice-list p { margin: 0; display: grid; gap: 4px; }.notice-list strong { font-size: 10px; }.notice-list span { color: #8d9895; font-size: 9px; }
.text-button { display: inline-flex; align-items: center; gap: 4px; }
@media(max-width:1100px){.metrics-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:780px){.dashboard-grid,.bottom-grid{grid-template-columns:1fr}.occupancy-panel{order:-1}}
@media(max-width:520px){.metrics-grid{grid-template-columns:1fr 1fr;gap:10px}.metric-card{min-height:115px;padding:16px}.sparkline,.ring,.metric-decoration{display:none}.metric-main strong{font-size:22px}.chart-area{padding-left:10px;padding-right:10px}.bar-chart{gap:4px}.repair-time{display:none}}
</style>
