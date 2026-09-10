<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, RefreshRight, Search, User, Warning } from '@element-plus/icons-vue'
import { api } from '@/api/client'

interface Transfer {
  id: number; studentId: number; studentName: string; studentNo: string; gender: '男' | '女'; college: string; phone: string
  currentRoom: string; preferredArea: string; reason: string; status: string; createdAt: string
  targetRoom?: string; targetBed?: string; remark?: string; handledBy?: string; handledAt?: string
}
interface AvailableRoom { id: number; building: string; roomNo: string; capacity: number; occupied: number }

const list = ref<Transfer[]>([])
const rooms = ref<AvailableRoom[]>([])
const loading = ref(false)
const submitting = ref(false)
const active = ref('全部')
const keyword = ref('')
const dialogVisible = ref(false)
const current = ref<Transfer | null>(null)
const selectedRoomId = ref<number | null>(null)
const remark = ref('')
const filtered = computed(() => list.value.filter((item) => (active.value === '全部' || item.status === active.value) && `${item.studentName}${item.studentNo}${item.currentRoom}${item.reason}`.includes(keyword.value.trim())))

async function load() {
  loading.value = true
  try { list.value = await api.get<Transfer[]>('/api/admin/transfers') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '调宿申请加载失败') }
  finally { loading.value = false }
}

async function openProcess(item: Transfer) {
  current.value = item
  selectedRoomId.value = null
  remark.value = ''
  dialogVisible.value = true
  try {
    const result = await api.get<AvailableRoom[]>(`/api/rooms/available?gender=${encodeURIComponent(item.gender)}`)
    rooms.value = result.filter((room) => `${room.building} ${room.roomNo}` !== item.currentRoom)
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '可用房间加载失败') }
}

async function approve() {
  if (!current.value || !selectedRoomId.value) return ElMessage.warning('请选择目标房间')
  submitting.value = true
  try {
    await api.patch(`/api/admin/transfers/${current.value.id}/approve`, { roomId: selectedRoomId.value, remark: remark.value })
    ElMessage.success('调宿已批准，等待学生确认搬迁')
    dialogVisible.value = false
    await load()
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '办理失败') }
  finally { submitting.value = false }
}

async function reject(item: Transfer) {
  try {
    const result = await ElMessageBox.prompt('请填写驳回原因，学生端可以看到该说明。', '驳回调宿申请', { inputPlaceholder: '例如：当前暂无符合条件的空余床位', inputValidator: (value) => value.trim().length >= 4 || '请至少填写 4 个字' })
    await api.patch(`/api/admin/transfers/${item.id}/reject`, { remark: result.value })
    ElMessage.success('申请已驳回')
    await load()
  } catch (error) { if (error !== 'cancel' && error !== 'close') ElMessage.error(error instanceof Error ? error.message : '操作失败') }
}

function statusClass(status: string) { return status === '已完成' ? 'status-success' : status === '已驳回' ? 'status-danger' : 'status-warning' }
onMounted(load)
</script>
<style scoped>.transfer-summary{grid-template-columns:repeat(4,1fr)!important}.transfer-summary .blue{color:#527fa8}@media(max-width:850px){.transfer-summary{grid-template-columns:1fr 1fr!important}}@media(max-width:500px){.transfer-summary{grid-template-columns:1fr!important}}</style>

<template>
  <div>
    <div class="page-heading"><div><h1>调宿处理</h1><p>审核学生调宿申请，核对床位后完成宿舍迁移。</p></div></div>
    <section class="transfer-summary">
      <article><span>待处理</span><strong class="amber">{{ list.filter(i => i.status === '审核中').length }}</strong><small>需要核对申请原因与床位</small></article>
      <article><span>待搬迁</span><strong class="blue">{{ list.filter(i => i.status === '待搬迁').length }}</strong><small>等待学生确认搬迁完成</small></article>
      <article><span>已完成</span><strong class="green">{{ list.filter(i => i.status === '已完成').length }}</strong><small>宿舍和床位已完成迁移</small></article>
      <article><span>已驳回</span><strong class="red">{{ list.filter(i => i.status === '已驳回').length }}</strong><small>不符合当前调宿条件</small></article>
    </section>
    <section class="panel">
      <div class="transfer-tabs"><button v-for="tab in ['全部','审核中','待搬迁','已完成','已驳回']" :key="tab" :class="{ active: active === tab }" @click="active = tab">{{ tab }}<b v-if="tab === '审核中'">{{ list.filter(i => i.status === tab).length }}</b></button></div>
      <div class="filter-bar"><div class="search-box"><el-icon><Search /></el-icon><input v-model="keyword" class="filter-input" placeholder="搜索学生、学号或宿舍" /></div><span class="total">共 {{ filtered.length }} 条申请</span></div>
      <div v-loading="loading" class="table-wrap"><table class="data-table"><thead><tr><th>申请学生</th><th>当前宿舍</th><th>意向区域</th><th>申请原因</th><th>申请日期</th><th>状态</th><th>操作</th></tr></thead><tbody>
        <tr v-for="item in filtered" :key="item.id"><td><div class="student-cell"><i><el-icon><User /></el-icon></i><span><strong>{{ item.studentName }}</strong><small>{{ item.studentNo }} · {{ item.college }}</small></span></div></td><td>{{ item.currentRoom }}</td><td class="table-primary">{{ item.preferredArea }}</td><td><p class="reason">{{ item.reason }}</p></td><td>{{ item.createdAt }}</td><td><span class="status-pill" :class="statusClass(item.status)">{{ item.status }}</span></td><td><template v-if="item.status === '审核中'"><button class="link-action strong" @click="openProcess(item)">办理</button><button class="link-action reject" @click="reject(item)">驳回</button></template><button v-else class="link-action" @click="current=item;dialogVisible=true">查看</button></td></tr>
        <tr v-if="!loading && !filtered.length"><td colspan="7" class="empty-row">当前没有相关调宿申请</td></tr>
      </tbody></table></div>
    </section>

    <el-dialog v-model="dialogVisible" :title="current?.status === '审核中' ? '办理调宿申请' : '调宿申请详情'" width="min(680px, 94vw)">
      <div v-if="current" class="process-dialog">
        <div class="applicant"><i>{{ current.studentName.slice(-1) }}</i><div><strong>{{ current.studentName }}</strong><span>{{ current.studentNo }} · {{ current.phone }}</span></div><b>{{ current.gender }}生</b></div>
        <div class="application-detail"><div><span>当前宿舍</span><strong>{{ current.currentRoom }}</strong></div><el-icon><RefreshRight /></el-icon><div><span>意向区域</span><strong>{{ current.preferredArea }}</strong></div></div>
        <div class="reason-box"><span>申请原因</span><p>{{ current.reason }}</p></div>
        <template v-if="current.status === '审核中'">
          <label class="field-label">选择目标房间 <small>仅显示同性别且仍有空床的房间</small></label>
          <div class="room-options"><button v-for="room in rooms" :key="room.id" :class="{ selected: selectedRoomId === room.id }" @click="selectedRoomId = room.id"><span><strong>{{ room.roomNo }}</strong><small>{{ room.building }}</small></span><b>余 {{ room.capacity-room.occupied }} 床</b></button></div>
          <label class="remark"><span>处理备注（选填）</span><textarea v-model="remark" maxlength="150" placeholder="填写搬迁时间或其他注意事项" /></label>
          <div class="process-tip"><el-icon><Warning /></el-icon><span>确认后系统会释放原床位、占用新床位，并同步更新学生端“我的宿舍”。</span></div>
        </template>
        <div v-else class="result-box"><el-icon><Check /></el-icon><div><strong>{{ current.status }}</strong><span v-if="current.targetRoom">已安排至 {{ current.targetRoom }} {{ current.targetBed }}</span><span v-if="current.remark">处理说明：{{ current.remark }}</span><small>{{ current.handledBy }} · {{ current.handledAt }}</small></div></div>
      </div>
      <template #footer><el-button @click="dialogVisible=false">关闭</el-button><el-button v-if="current?.status === '审核中'" type="primary" :loading="submitting" @click="approve">确认调宿</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.transfer-summary{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.transfer-summary article{padding:18px;border:1px solid var(--line);border-radius:11px;display:grid;grid-template-columns:1fr auto;background:white}.transfer-summary span{color:#71807c;font-size:10px}.transfer-summary strong{grid-row:1/3;grid-column:2;align-self:center;font-size:24px}.transfer-summary small{margin-top:7px;color:#98a29f;font-size:8px}.transfer-summary .amber{color:#bd792e}.transfer-summary .green{color:#178072}.transfer-summary .red{color:#c36359}.transfer-tabs{height:55px;padding:0 19px;border-bottom:1px solid #edf0ef;display:flex;align-items:center;gap:8px}.transfer-tabs button{height:32px;padding:0 13px;border:0;border-radius:6px;color:#71807c;background:transparent;font-size:10px}.transfer-tabs button.active{color:#14776d;background:#e8f4f1;font-weight:600}.transfer-tabs b{margin-left:6px;padding:1px 5px;border-radius:7px;color:white;background:#db715f;font-size:8px}.search-box{position:relative}.search-box .el-icon{position:absolute;z-index:1;left:11px;top:10px;color:#93a09c}.search-box input{padding-left:33px}.total{margin-left:auto;color:#8c9794;font-size:9px}.student-cell{display:flex;align-items:center;gap:9px}.student-cell i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;color:#34766d;background:#e8f3f1}.student-cell span{display:grid;gap:3px}.student-cell strong{font-size:10px}.student-cell small{color:#8d9895;font-size:8px}.reason{max-width:220px;margin:0;overflow:hidden;color:#6e7c78;font-size:9px;line-height:1.5;text-overflow:ellipsis;white-space:nowrap}.link-action{margin-right:9px;padding:0;border:0;color:#64736f;background:transparent;font-size:10px}.link-action.strong{color:#0e776c;font-weight:600}.link-action.reject{color:#b56459}.status-warning{color:#aa7029;background:#fff2de}.status-danger{color:#b45d55;background:#fff0ee}.applicant{padding:13px;border-radius:9px;display:flex;align-items:center;gap:10px;background:#f5f8f7}.applicant>i{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;color:#176f67;background:#ddefeb;font-style:normal;font-weight:600}.applicant>div{display:grid;gap:4px;flex:1}.applicant span{color:#83908c;font-size:9px}.applicant>b{padding:4px 7px;border-radius:5px;color:#527068;background:white;font-size:8px}.application-detail{margin:14px 0;padding:13px;border:1px solid #e4e9e7;border-radius:9px;display:grid;grid-template-columns:1fr 30px 1fr;align-items:center}.application-detail>div{display:grid;gap:5px}.application-detail span,.reason-box>span{color:#8a9692;font-size:8px}.application-detail strong{font-size:11px}.application-detail .el-icon{color:#47a394}.reason-box{margin-bottom:16px;padding:12px;border-radius:8px;background:#fbfcfc}.reason-box p{margin:6px 0 0;color:#52605c;font-size:10px;line-height:1.7}.field-label{margin-bottom:8px;display:block;font-size:10px;font-weight:600}.field-label small{margin-left:7px;color:#929d99;font-size:8px;font-weight:400}.room-options{max-height:180px;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.room-options button{padding:10px;border:1px solid #e0e6e4;border-radius:8px;display:flex;align-items:center;justify-content:space-between;text-align:left;background:white}.room-options button.selected{border-color:#198276;background:#eff8f6;box-shadow:0 0 0 2px #dcefeb}.room-options button span{display:grid;gap:2px}.room-options strong{font-size:11px}.room-options small,.room-options b{color:#8b9692;font-size:8px}.room-options button.selected strong{color:#12756b}.remark{margin-top:15px;display:grid;gap:7px}.remark>span{font-size:10px;font-weight:600}.remark textarea{height:65px;padding:9px;border:1px solid #dfe5e3;border-radius:8px;resize:none;outline:0;font-size:9px}.process-tip{margin-top:13px;padding:9px 11px;border-radius:7px;display:flex;gap:7px;color:#8a744e;background:#fff8ea;font-size:8px;line-height:1.6}.result-box{padding:16px;border-radius:9px;display:flex;gap:10px;color:#19766c;background:#eef8f5}.result-box>div{display:grid;gap:4px}.result-box span,.result-box small{color:#6f7e79;font-size:9px}@media(max-width:700px){.transfer-summary{grid-template-columns:1fr}.room-options{grid-template-columns:1fr 1fr}.application-detail{grid-template-columns:1fr}.application-detail>.el-icon{display:none}}
</style>
