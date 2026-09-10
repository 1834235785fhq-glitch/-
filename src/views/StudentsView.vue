<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Plus, Search, Upload } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Student } from '@/types'

interface AvailableRoom { id: number; building: string; roomNo: string; capacity: number; occupied: number }
interface StudentPage { list: Student[]; total: number; page: number; pageSize: number }
interface StudentDetail { student:Student;room:{roomNo:string;floor:number;capacity:number;occupied:number}|null;building:{name:string;manager:string;phone:string}|null;repairs:Array<{id:number;title:string;status:string}>;lateReturns:Array<{id:number;returnDate:string;status:string}>;transfers:Array<{id:number;status:string;currentRoom:string;targetRoom?:string}>;rechargeRecords:Array<{id:number;amount:number;createdAt:string}>;utilityBalance:number }

const students = ref<Student[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('全部状态')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const checkInVisible = ref(false)
const submitting = ref(false)
const currentStudent = ref<Student | null>(null)
const availableRooms = ref<AvailableRoom[]>([])
const selectedRoomId = ref<number | null>(null)
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<StudentDetail | null>(null)
async function loadStudents() {
  loading.value = true
  const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize.value) })
  if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
  if (status.value !== '全部状态') params.set('status', status.value)
  try {
    const result = await api.get<StudentPage>(`/api/students?${params}`)
    students.value = result.list
    total.value = result.total
  }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '学生数据加载失败') }
  finally { loading.value = false }
}

async function openCheckIn(student: Student) {
  currentStudent.value = student
  selectedRoomId.value = null
  checkInVisible.value = true
  try { availableRooms.value = await api.get<AvailableRoom[]>(`/api/rooms/available?gender=${encodeURIComponent(student.gender)}`) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '可用房间加载失败') }
}

async function openDetail(student:Student){detailVisible.value=true;detailLoading.value=true;detail.value=null;try{detail.value=await api.get<StudentDetail>(`/api/admin/students/${student.id}`)}catch(error){ElMessage.error(error instanceof Error?error.message:'学生详情加载失败')}finally{detailLoading.value=false}}

async function submitCheckIn() {
  if (!currentStudent.value || !selectedRoomId.value) return ElMessage.warning('请选择一个可用房间')
  submitting.value = true
  try {
    await api.post('/api/check-ins', { studentId: currentStudent.value.id, roomId: selectedRoomId.value })
    ElMessage.success('宿舍分配成功')
    checkInVisible.value = false
    await loadStudents()
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '宿舍分配失败') }
  finally { submitting.value = false }
}

function planned(name: string) { ElMessage.info(`${name}将在下一次迭代中完成`) }
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value = 1; loadStudents() }, 250) })
watch(status, () => { page.value = 1; loadStudents() })
watch(page, loadStudents)
onMounted(loadStudents)
</script>

<template>
  <div>
    <div class="page-heading"><div><h1>学生管理</h1><p>查看学生档案，办理入住、退宿与宿舍调整。</p></div><div class="heading-actions"><button class="outline-button" @click="planned('批量导入')"><el-icon><Upload /></el-icon>批量导入</button><button class="primary-button" @click="planned('新增学生')"><el-icon><Plus /></el-icon>新增学生</button></div></div>
    <section class="panel">
      <div class="filter-bar"><div class="search-box"><el-icon><Search /></el-icon><input v-model="keyword" class="filter-input" placeholder="搜索姓名、学号或学院" /></div><select v-model="status" class="filter-input select"><option>全部状态</option><option>已入住</option><option>未入住</option></select><button class="export" @click="planned('数据导出')"><el-icon><Download /></el-icon>导出</button></div>
      <div v-loading="loading" class="table-wrap"><table class="data-table"><thead><tr><th>学生</th><th>学号</th><th>院系专业</th><th>年级</th><th>宿舍</th><th>联系电话</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="student in students" :key="student.id"><td><div class="student-cell"><i :class="student.gender==='女'?'female':''">{{student.name.slice(-1)}}</i><b>{{student.name}}</b></div></td><td>{{student.studentNo}}</td><td><div class="college"><b>{{student.college}}</b><span>{{student.major}}</span></div></td><td>{{student.grade}}</td><td class="table-primary">{{student.room}}</td><td>{{student.phone}}</td><td><span class="status-pill" :class="student.status==='已入住'?'status-success':'status-neutral'">{{student.status}}</span></td><td><button class="link-action" @click="openDetail(student)">详情</button><button v-if="student.status==='未入住'" class="link-action strong" @click="openCheckIn(student)">分配宿舍</button><button v-else class="link-action" @click="planned('调宿')">调宿</button></td></tr></tbody></table></div>
      <div class="pagination"><span>共 {{ total }} 条数据</span><el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" background /></div>
    </section>

    <el-dialog v-model="detailVisible" title="学生综合档案" width="min(760px,94vw)"><div v-loading="detailLoading" class="detail-wrap"><template v-if="detail"><div class="detail-profile"><i>{{detail.student.name.slice(-1)}}</i><div><h3>{{detail.student.name}}</h3><span>{{detail.student.studentNo}} · {{detail.student.college}} · {{detail.student.major}}</span></div><b>{{detail.student.status}}</b></div><div class="detail-metrics"><article><span>当前宿舍</span><strong>{{detail.student.room}}</strong><small>{{detail.student.bedNo}}</small></article><article><span>水电余额</span><strong>¥{{detail.utilityBalance.toFixed(2)}}</strong><small>{{detail.rechargeRecords.length}} 条充值记录</small></article><article><span>报修记录</span><strong>{{detail.repairs.length}}</strong><small>{{detail.repairs.filter(i=>i.status!=='已完成').length}} 条处理中</small></article><article><span>晚归登记</span><strong>{{detail.lateReturns.length}}</strong><small>{{detail.transfers.length}} 条调宿记录</small></article></div><div class="detail-sections"><section><h4>住宿信息</h4><p v-if="detail.room">{{detail.building?.name}} {{detail.room.roomNo}}室 · {{detail.room.floor}}层 · {{detail.student.bedNo}}<br>宿管：{{detail.building?.manager}} {{detail.building?.phone}}</p><p v-else>暂未分配宿舍</p></section><section><h4>最近业务记录</h4><p v-if="detail.transfers[0]">调宿：{{detail.transfers[0].status}} · {{detail.transfers[0].currentRoom}}<template v-if="detail.transfers[0].targetRoom"> → {{detail.transfers[0].targetRoom}}</template></p><p v-if="detail.repairs[0]">报修：{{detail.repairs[0].title}} · {{detail.repairs[0].status}}</p><p v-if="!detail.transfers.length&&!detail.repairs.length">暂无业务记录</p></section></div></template></div></el-dialog>

    <el-dialog v-model="checkInVisible" title="分配宿舍" width="min(560px, 92vw)">
      <div v-if="currentStudent" class="student-summary"><div class="summary-avatar">{{currentStudent.name.slice(-1)}}</div><div><strong>{{currentStudent.name}}</strong><span>{{currentStudent.studentNo}} · {{currentStudent.college}}</span></div><b>{{currentStudent.gender}}生</b></div>
      <div class="dialog-label">选择可用房间</div>
      <div v-if="availableRooms.length" class="available-grid"><button v-for="room in availableRooms" :key="room.id" :class="{selected:selectedRoomId===room.id}" @click="selectedRoomId=room.id"><div><strong>{{room.roomNo}}</strong><span>{{room.building}}</span></div><small>剩余 {{room.capacity-room.occupied}} 个床位</small></button></div>
      <el-empty v-else description="暂无符合性别要求的可用房间" :image-size="70" />
      <div class="business-tip">系统将在提交时再次校验学生入住状态、宿舍类型和实时床位数量。</div>
      <template #footer><el-button @click="checkInVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitCheckIn">确认分配</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.heading-actions{display:flex;gap:9px}.outline-button,.export{height:39px;padding:0 14px;border:1px solid var(--line);border-radius:8px;display:flex;align-items:center;gap:6px;color:#576662;background:white;font-size:12px}.export{height:36px;margin-left:auto}.search-box{position:relative}.search-box .el-icon{position:absolute;z-index:1;left:11px;top:10px;color:#93a09c}.search-box input{padding-left:33px}.filter-input.select{width:140px}.student-cell{display:flex;align-items:center;gap:9px}.student-cell i{width:31px;height:31px;border-radius:50%;display:grid;place-items:center;color:#3f6a9c;background:#e8f0f9;font-style:normal;font-size:11px;font-weight:600}.student-cell i.female{color:#a4627a;background:#f8eaf0}.student-cell b,.college b{font-weight:600}.college{display:grid;gap:3px}.college span{color:#909b98;font-size:9px}.link-action{margin-right:9px;padding:0;border:0;color:#63736f;background:transparent;font-size:11px}.link-action.strong{color:#08766b;font-weight:600}.student-summary{margin-bottom:22px;padding:14px;border-radius:9px;display:flex;align-items:center;gap:11px;background:#f5f8f7}.summary-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;color:#1c746b;background:#daefeb;font-weight:600}.student-summary>div:nth-child(2){display:grid;gap:4px;flex:1}.student-summary strong{font-size:13px}.student-summary span{color:#7e8b87;font-size:10px}.student-summary>b{padding:4px 7px;border-radius:5px;color:#4d6c66;background:white;font-size:9px}.dialog-label{margin-bottom:10px;color:#42514d;font-size:12px;font-weight:600}.available-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.available-grid button{padding:12px;border:1px solid #e0e6e4;border-radius:8px;display:flex;align-items:center;justify-content:space-between;text-align:left;background:white}.available-grid button.selected{border-color:#178477;background:#eff9f7;box-shadow:0 0 0 2px #d8eeea}.available-grid button>div{display:grid;gap:2px}.available-grid strong{font-size:13px}.available-grid span,.available-grid small{color:#899591;font-size:9px}.available-grid button.selected strong{color:#0d746a}.business-tip{margin-top:18px;padding:10px 12px;border-left:3px solid #62b7aa;color:#778480;background:#f4f8f7;font-size:10px;line-height:1.6}.detail-wrap{min-height:180px}.detail-profile{padding:15px;border-radius:10px;display:flex;align-items:center;gap:12px;background:#f4f8f7}.detail-profile>i{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;color:#176f66;background:#dcedea;font-style:normal;font-weight:700}.detail-profile>div{display:grid;gap:4px;flex:1}.detail-profile h3{margin:0;font-size:14px}.detail-profile span{color:#7d8a86;font-size:9px}.detail-profile>b{color:#17766b;font-size:9px}.detail-metrics{margin:13px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.detail-metrics article{padding:12px;border:1px solid #e2e8e6;border-radius:8px;display:grid;gap:5px}.detail-metrics span,.detail-metrics small{color:#8b9692;font-size:8px}.detail-metrics strong{font-size:12px}.detail-sections{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detail-sections section{padding:13px;border:1px solid #e5eae8;border-radius:8px}.detail-sections h4{margin:0 0 8px;font-size:10px}.detail-sections p{margin:4px 0;color:#6f7d79;font-size:9px;line-height:1.8}@media(max-width:600px){.outline-button{display:none}.filter-input.select{width:100%}.export{margin-left:0}.available-grid{grid-template-columns:1fr}.detail-metrics{grid-template-columns:1fr 1fr}.detail-sections{grid-template-columns:1fr}}
</style>
