<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Search, User } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Building, Room, Student } from '@/types'

interface RoomDetail { room: Room; building: Building; students: Student[] }

const buildings = ref<Building[]>([])
const rooms = ref<Room[]>([])
const selectedBuildingId = ref<number | null>(null)
const floor = ref(1)
const keyword = ref('')
const status = ref('')
const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const detail = ref<RoomDetail | null>(null)

const selectedBuilding = computed(() => buildings.value.find((item) => item.id === selectedBuildingId.value))
const summary = computed(() => ({
  available: rooms.value.filter((item) => item.status === '未住满').length,
  empty: rooms.value.filter((item) => item.status === '空闲').length,
  full: rooms.value.filter((item) => item.status === '已住满').length,
  repairing: rooms.value.filter((item) => item.status === '维修中').length
}))
const beds = computed(() => {
  if (!detail.value) return []
  return Array.from({ length: detail.value.room.capacity }, (_, index) => {
    const bedNo = `${index + 1}号床`
    return { bedNo, student: detail.value?.students.find((item) => item.bedNo === bedNo) ?? null }
  })
})

async function loadBuildings() {
  try {
    buildings.value = await api.get<Building[]>('/api/buildings')
    selectedBuildingId.value = buildings.value[0]?.id ?? null
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '楼栋数据加载失败') }
}

async function loadRooms() {
  if (!selectedBuildingId.value) return
  loading.value = true
  const params = new URLSearchParams({ buildingId: String(selectedBuildingId.value), floor: String(floor.value) })
  if (keyword.value.trim()) params.set('keyword', keyword.value.trim())
  if (status.value) params.set('status', status.value)
  try { rooms.value = await api.get<Room[]>(`/api/admin/rooms?${params}`) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '房间数据加载失败') }
  finally { loading.value = false }
}

async function openDetail(room: Room) {
  detailVisible.value = true
  detailLoading.value = true
  detail.value = null
  try { detail.value = await api.get<RoomDetail>(`/api/admin/rooms/${room.id}/students`) }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '住户信息加载失败') }
  finally { detailLoading.value = false }
}

function statusClass(value: string) { return { 已住满: 'full', 未住满: 'available', 空闲: 'empty', 维修中: 'repairing' }[value] }
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([selectedBuildingId, floor, status], loadRooms)
watch(keyword, () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadRooms, 250) })
onMounted(loadBuildings)
</script>

<template>
  <div>
    <div class="page-heading">
      <div><h1>房间管理</h1><p>{{ selectedBuilding?.name || '宿舍楼' }} · 按楼层查看房间，并可展开每个床位的学生信息。</p></div>
      <select v-model="selectedBuildingId" class="building-select"><option v-for="item in buildings" :key="item.id" :value="item.id">{{ item.name }}</option></select>
    </div>

    <section class="room-overview">
      <div><i class="green"/><span>未住满<strong>{{ summary.available }}</strong></span></div>
      <div><i class="gray"/><span>空闲<strong>{{ summary.empty }}</strong></span></div>
      <div><i class="blue"/><span>已住满<strong>{{ summary.full }}</strong></span></div>
      <div><i class="orange"/><span>维修中<strong>{{ summary.repairing }}</strong></span></div>
      <small>当前楼层共 {{ rooms.length }} 间</small>
    </section>

    <section class="panel">
      <div class="room-toolbar">
        <div class="floor-tabs"><button v-for="item in 5" :key="item" :class="{ active: floor === item }" @click="floor = item">{{ item }}层</button></div>
        <div class="toolbar-right">
          <select v-model="status" class="status-select"><option value="">全部状态</option><option>未住满</option><option>已住满</option><option>空闲</option><option>维修中</option></select>
          <div class="room-search"><el-icon><Search/></el-icon><input v-model="keyword" placeholder="搜索房间号"/></div>
        </div>
      </div>

      <div v-loading="loading" class="room-grid">
        <article v-for="room in rooms" :key="room.id" class="room-card" :class="statusClass(room.status)" @click="openDetail(room)">
          <header><div><span><el-icon><Grid/></el-icon></span><strong>{{ room.roomNo }}</strong></div><b>{{ room.status }}</b></header>
          <div class="bed-row"><span v-for="n in room.capacity" :key="n" :class="{ occupied: n <= room.occupied }"><i>{{ n }}</i></span></div>
          <footer><span>{{ room.occupied }} / {{ room.capacity }} 人 · 空余 {{ room.availableBeds }} 床</span><button>查看住户 →</button></footer>
        </article>
        <el-empty v-if="!loading && !rooms.length" class="room-empty" description="当前条件下没有房间" :image-size="70" />
      </div>
    </section>

    <el-dialog v-model="detailVisible" width="min(760px, 94vw)" class="resident-dialog">
      <template #header>
        <div v-if="detail" class="detail-title"><span><el-icon><Grid/></el-icon></span><div><h3>{{ detail.room.building }} · {{ detail.room.roomNo }}室</h3><p>{{ detail.room.floor }}层 · {{ detail.room.gender }}生宿舍 · 已住 {{ detail.room.occupied }}/{{ detail.room.capacity }} 人</p></div><b :class="statusClass(detail.room.status)">{{ detail.room.status }}</b></div>
        <span v-else>住户详情</span>
      </template>
      <div v-loading="detailLoading" class="bed-list">
        <article v-for="bed in beds" :key="bed.bedNo" :class="{ vacant: !bed.student }">
          <div class="bed-label"><strong>{{ bed.bedNo }}</strong><span>{{ bed.student ? '已入住' : '空床位' }}</span></div>
          <template v-if="bed.student">
            <i class="student-avatar" :class="{ female: bed.student.gender === '女' }">{{ bed.student.name.slice(-1) }}</i>
            <div class="resident-main"><strong>{{ bed.student.name }}</strong><span>{{ bed.student.studentNo }}</span></div>
            <div class="resident-info"><span>{{ bed.student.college }}</span><b>{{ bed.student.major }} · {{ bed.student.grade }}</b></div>
            <a :href="`tel:${bed.student.phone}`">{{ bed.student.phone }}</a>
          </template>
          <template v-else><div class="vacant-note"><el-icon><User /></el-icon><span>暂未分配学生</span></div></template>
        </article>
      </div>
      <div v-if="detail" class="manager-strip"><span>负责宿管</span><strong>{{ detail.building.manager }}</strong><b>{{ detail.building.phone }}</b></div>
    </el-dialog>
  </div>
</template>

<style scoped>
.building-select,.status-select{height:38px;padding:0 34px 0 12px;border:1px solid var(--line);border-radius:8px;color:#44534f;background:white;font-size:11px}.room-overview{margin-bottom:18px;padding:16px 20px;border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;gap:40px;background:white}.room-overview>div{display:flex;align-items:center;gap:9px}.room-overview i{width:8px;height:8px;border-radius:50%}.room-overview i.green{background:#55b09f}.room-overview i.gray{background:#bdc8c5}.room-overview i.blue{background:#6385bd}.room-overview i.orange{background:#d79541}.room-overview span{color:#6f7d79;font-size:11px}.room-overview strong{margin-left:8px;color:#263632;font-size:14px}.room-overview small{margin-left:auto;color:#94a09d;font-size:10px}.room-toolbar{min-height:63px;padding:12px 20px;border-bottom:1px solid #edf0ef;display:flex;justify-content:space-between;align-items:center;gap:15px}.floor-tabs{display:flex;gap:5px}.floor-tabs button{height:32px;padding:0 16px;border:0;border-radius:6px;color:#72807c;background:transparent;font-size:11px}.floor-tabs button.active{color:#126f66;background:#e6f3f0;font-weight:600}.toolbar-right{display:flex;gap:9px}.status-select{height:34px}.room-search{width:180px;height:34px;padding:0 10px;border:1px solid var(--line);border-radius:7px;display:flex;align-items:center;gap:7px;color:#98a29f}.room-search input{min-width:0;width:100%;border:0;outline:0;font-size:11px}.room-grid{min-height:190px;padding:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.room-card{padding:15px;border:1px solid #e4e9e7;border-top:3px solid #55af9f;border-radius:9px;background:#fff;cursor:pointer;transition:.18s ease}.room-card:hover{transform:translateY(-2px);border-color:#acd8d1;box-shadow:0 8px 22px rgba(36,88,79,.08)}.room-card.full{border-top-color:#6e97bd}.room-card.empty{border-top-color:#b4bfbc}.room-card.repairing{border-top-color:#d7923b;background:#fffdf8}.room-card header{display:flex;justify-content:space-between;align-items:center}.room-card header>div{display:flex;align-items:center;gap:8px}.room-card header span{width:27px;height:27px;border-radius:6px;display:grid;place-items:center;color:#267e72;background:#e8f4f1}.room-card header strong{font-size:14px}.room-card header>b,.detail-title>b{padding:3px 7px;border-radius:4px;color:#187968;background:#e8f5f1;font-size:9px;font-weight:500}.room-card.full header>b,.detail-title>b.full{color:#5078a1;background:#edf3f9}.room-card.empty header>b,.detail-title>b.empty{color:#72807d;background:#f0f3f2}.room-card.repairing header>b,.detail-title>b.repairing{color:#a76c21;background:#fff0da}.bed-row{margin:18px 0 15px;display:flex;gap:5px}.bed-row span{width:22px;height:22px;border:1px dashed #cbd4d2;border-radius:5px;display:grid;place-items:center;background:#f9fbfa}.bed-row span.occupied{border-style:solid;border-color:#b9dcd5;background:#e9f5f2}.bed-row i{color:#a1aaa8;font-size:8px;font-style:normal}.bed-row .occupied i{color:#277d71}.room-card footer{padding-top:11px;border-top:1px solid #edf0ef;display:flex;align-items:center;justify-content:space-between}.room-card footer span{color:#8c9895;font-size:9px}.room-card footer button{border:0;color:#16756b;background:transparent;font-size:9px}.room-empty{grid-column:1/-1}.detail-title{display:flex;align-items:center;gap:11px}.detail-title>span{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;color:#14776d;background:#e5f3f0}.detail-title>div{flex:1}.detail-title h3{margin:0 0 4px;font-size:15px}.detail-title p{margin:0;color:#87938f;font-size:10px}.bed-list{min-height:150px;display:grid;gap:8px}.bed-list article{min-height:65px;padding:10px 12px;border:1px solid #e5eae8;border-radius:9px;display:flex;align-items:center;gap:12px}.bed-list article.vacant{border-style:dashed;background:#fafcfb}.bed-label{width:48px;display:grid;gap:4px}.bed-label strong{font-size:11px}.bed-label span{color:#8e9996;font-size:8px}.student-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#446d9c;background:#eaf1f8;font-size:11px;font-style:normal;font-weight:600}.student-avatar.female{color:#a55f79;background:#f7eaf0}.resident-main{width:100px;display:grid;gap:4px}.resident-main strong{font-size:12px}.resident-main span,.resident-info span{color:#8b9793;font-size:9px}.resident-info{display:grid;gap:4px;flex:1}.resident-info b{color:#52605c;font-size:10px;font-weight:500}.bed-list a{color:#16766b;font-size:10px;text-decoration:none}.vacant-note{display:flex;align-items:center;gap:7px;color:#99a39f;font-size:10px}.manager-strip{margin-top:14px;padding:11px 14px;border-radius:8px;display:flex;align-items:center;gap:12px;color:#73817d;background:#f4f8f7;font-size:10px}.manager-strip strong{color:#354741}.manager-strip b{margin-left:auto;color:#16766b;font-weight:500}@media(max-width:1100px){.room-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:750px){.room-grid{grid-template-columns:repeat(2,1fr)}.room-toolbar{align-items:stretch;flex-direction:column}.floor-tabs{overflow-x:auto}.toolbar-right,.room-search{width:100%}.status-select{flex:1}.room-overview{gap:18px;overflow-x:auto}.resident-info{display:none}}@media(max-width:480px){.room-grid{grid-template-columns:1fr}.room-overview{display:grid;grid-template-columns:1fr 1fr}.room-overview small{display:none}.bed-list article{flex-wrap:wrap}.bed-list a{margin-left:60px}.building-select{max-width:130px}}
</style>
