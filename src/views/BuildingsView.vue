<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Search } from '@element-plus/icons-vue'
import type { Building } from '@/types'
import { api } from '@/api/client'

const rows = ref<Building[]>([])
const loading = ref(true)
const keyword = ref('')
const campus = ref('全部校区')
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', campus: '东校区', gender: '男生' as '男生' | '女生', floors: 6, rooms: 100, capacity: 600, manager: '', phone: '', status: '正常使用' as Building['status'] })
const filteredRows = computed(() => rows.value.filter((item) => (campus.value === '全部校区' || item.campus === campus.value) && `${item.name}${item.manager}`.includes(keyword.value.trim())))

async function loadBuildings() {
  loading.value = true
  try { rows.value = await api.get<Building[]>('/api/buildings') }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '楼栋数据加载失败') }
  finally { loading.value = false }
}

function openCreate() { editingId.value = null; Object.assign(form, { name: '', campus: '东校区', gender: '男生', floors: 6, rooms: 100, capacity: 600, manager: '', phone: '', status: '正常使用' }); dialogVisible.value = true }
function openEdit(row: Building) { editingId.value = row.id; Object.assign(form, row); dialogVisible.value = true }
async function save() {
  if (!form.name.trim() || !form.manager.trim()) return ElMessage.warning('请填写楼栋名称和宿管员')
  try {
    if (editingId.value) await api.put(`/api/buildings/${editingId.value}`, form)
    else await api.post('/api/buildings', form)
    dialogVisible.value = false
    ElMessage.success(editingId.value ? '楼栋信息已更新' : '楼栋创建成功')
    await loadBuildings()
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '保存失败') }
}
async function remove(row: Building) {
  try { await ElMessageBox.confirm(`确定删除“${row.name}”吗？`, '删除确认', { type: 'warning' }); await api.delete(`/api/buildings/${row.id}`); await loadBuildings(); ElMessage.success('删除成功') } catch (error) { if (error instanceof Error) ElMessage.error(error.message) }
}

onMounted(loadBuildings)
</script>

<template>
  <div>
    <div class="page-heading"><div><h1>楼栋管理</h1><p>维护校区宿舍楼基础资料及入住容量。</p></div><button class="primary-button" @click="openCreate"><el-icon><Plus /></el-icon>新增楼栋</button></div>
    <section class="panel">
      <div class="filter-bar"><div class="search-box"><el-icon><Search /></el-icon><input v-model="keyword" class="filter-input" placeholder="搜索楼栋或宿管员" /></div><select v-model="campus" class="filter-input select"><option>全部校区</option><option>东校区</option><option>西校区</option></select><button class="reset-button" @click="keyword='';campus='全部校区'">重置</button></div>
      <div v-loading="loading" class="table-wrap"><table class="data-table"><thead><tr><th>楼栋名称</th><th>校区 / 类型</th><th>规模</th><th>入住情况</th><th>宿管员</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.id"><td><span class="building-cell"><i>{{ row.name.slice(0,1) }}</i><b>{{ row.name }}</b></span></td><td>{{ row.campus }} · {{ row.gender }}</td><td>{{ row.floors }} 层 / {{ row.rooms }} 间</td><td><div class="occupancy-cell"><span><b>{{ row.occupied }}</b> / {{ row.capacity }} 人</span><i><em :style="{width:`${row.occupied/row.capacity*100}%`}" /></i></div></td><td><div class="manager-cell"><b>{{ row.manager }}</b><span>{{ row.phone }}</span></div></td><td><span class="status-pill" :class="row.status==='正常使用'?'status-success':'status-warning'">{{ row.status }}</span></td><td><div class="actions"><button @click="openEdit(row)"><el-icon><Edit /></el-icon></button><button class="danger" @click="remove(row)"><el-icon><Delete /></el-icon></button></div></td></tr><tr v-if="!loading && !filteredRows.length"><td colspan="7" class="empty-row">没有找到符合条件的楼栋</td></tr></tbody></table></div>
      <div class="pagination"><span>共 {{ filteredRows.length }} 条数据</span><div class="page-buttons"><button>‹</button><button class="active">1</button><button>›</button></div></div>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑楼栋' : '新增楼栋'" width="min(520px, 92vw)">
      <el-form label-position="top"><div class="form-grid"><el-form-item label="楼栋名称"><el-input v-model="form.name" placeholder="例如：松园 3 号楼" /></el-form-item><el-form-item label="所属校区"><el-select v-model="form.campus"><el-option label="东校区" value="东校区"/><el-option label="西校区" value="西校区"/></el-select></el-form-item><el-form-item label="住宿类型"><el-radio-group v-model="form.gender"><el-radio value="男生">男生</el-radio><el-radio value="女生">女生</el-radio></el-radio-group></el-form-item><el-form-item label="楼层数量"><el-input-number v-model="form.floors" :min="1" :max="30" /></el-form-item><el-form-item label="房间数量"><el-input-number v-model="form.rooms" :min="1" /></el-form-item><el-form-item label="床位容量"><el-input-number v-model="form.capacity" :min="1" /></el-form-item><el-form-item label="宿管员"><el-input v-model="form.manager" /></el-form-item><el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item></div></el-form>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-box{position:relative}.search-box .el-icon{position:absolute;z-index:1;left:11px;top:10px;color:#93a09c}.search-box input{padding-left:33px}.filter-input.select{width:140px}.reset-button{height:36px;padding:0 13px;border:1px solid var(--line);border-radius:7px;color:#687672;background:white;font-size:12px}.building-cell{display:flex;align-items:center;gap:10px}.building-cell i{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:#18766b;background:#e5f4f1;font-style:normal;font-weight:600}.building-cell b{font-weight:600}.occupancy-cell{display:grid;gap:6px}.occupancy-cell span{font-size:10px}.occupancy-cell>i{width:110px;height:4px;border-radius:3px;background:#edf1f0;overflow:hidden}.occupancy-cell em{display:block;height:100%;background:#52ae9f}.manager-cell{display:grid;gap:3px}.manager-cell b{font-weight:500}.manager-cell span{color:#929d9a;font-size:9px}.actions{display:flex;gap:5px}.actions button{width:29px;height:29px;border:1px solid var(--line);border-radius:6px;color:#64736f;background:white}.actions button.danger:hover{color:#c5554c;border-color:#f0c7c2}.empty-row{text-align:center!important;color:#9aa5a2!important;padding:45px!important}.form-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:16px}.el-select,.el-input-number{width:100%}@media(max-width:600px){.form-grid{grid-template-columns:1fr}.filter-input.select{width:calc(50% - 5px)}.reset-button{flex:1}}
</style>
