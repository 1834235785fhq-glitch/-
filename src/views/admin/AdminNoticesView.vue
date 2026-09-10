<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Delete, Plus, Search, Warning } from '@element-plus/icons-vue'
import { api } from '@/api/client'
import type { Building } from '@/types'

interface Notice {
  id: number
  title: string
  summary: string
  category: string
  audience: string
  publishedAt: string
  publisher: string
  important: boolean
  readCount: number
}

const notices = ref<Notice[]>([])
const buildings = ref<Building[]>([])
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const keyword = ref('')
const category = ref('全部分类')
const form = reactive({ title: '', summary: '', category: '安全通知', audience: '全体学生', important: false })

const filtered = computed(() => notices.value.filter((item) => {
  const matchesCategory = category.value === '全部分类' || item.category === category.value
  const matchesKeyword = `${item.title}${item.summary}${item.publisher}`.includes(keyword.value.trim())
  return matchesCategory && matchesKeyword
}))
const importantCount = computed(() => notices.value.filter((item) => item.important).length)
const totalReads = computed(() => notices.value.reduce((sum, item) => sum + item.readCount, 0))

async function load() {
  loading.value = true
  try {
    const [noticeList, buildingList] = await Promise.all([
      api.get<Notice[]>('/api/admin/notices'),
      api.get<Building[]>('/api/buildings')
    ])
    notices.value = noticeList
    buildings.value = buildingList
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '通知数据加载失败') }
  finally { loading.value = false }
}

function openPublish() {
  Object.assign(form, { title: '', summary: '', category: '安全通知', audience: '全体学生', important: false })
  dialogVisible.value = true
}

async function publish() {
  if (!form.title.trim()) return ElMessage.warning('请输入通知标题')
  if (form.title.trim().length < 4) return ElMessage.warning('通知标题至少需要 4 个字')
  if (!form.summary.trim()) return ElMessage.warning('请输入通知内容')
  if (form.summary.trim().length < 10) return ElMessage.warning('通知内容至少需要 10 个字')
  submitting.value = true
  try {
    await api.post('/api/admin/notices', form)
    dialogVisible.value = false
    ElMessage.success('通知已发布，学生端现在可以查看')
    await load()
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '通知发布失败') }
  finally { submitting.value = false }
}

async function remove(item: Notice) {
  try {
    await ElMessageBox.confirm(`确定删除“${item.title}”吗？学生端将不再显示这条通知。`, '删除通知', { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' })
    await api.delete(`/api/admin/notices/${item.id}`)
    ElMessage.success('通知已删除')
    await load()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="page-heading">
      <div><h1>通知管理</h1><p>发布宿舍通知和安全提醒，学生端将实时看到最新内容。</p></div>
      <button class="primary-button" @click="openPublish"><el-icon><Plus /></el-icon>发布通知</button>
    </div>

    <section class="notice-stats">
      <article><i class="mint"><el-icon><Bell /></el-icon></i><div><span>已发布通知</span><strong>{{ notices.length }}</strong></div></article>
      <article><i class="amber"><el-icon><Warning /></el-icon></i><div><span>重要通知</span><strong>{{ importantCount }}</strong></div></article>
      <article><i class="blue">阅</i><div><span>累计阅读</span><strong>{{ totalReads }}</strong></div></article>
    </section>

    <section class="panel">
      <div class="filter-bar">
        <div class="search-box"><el-icon><Search /></el-icon><input v-model="keyword" class="filter-input" placeholder="搜索通知标题或内容" /></div>
        <select v-model="category" class="filter-input select"><option>全部分类</option><option>安全通知</option><option>生活服务</option><option>校园活动</option></select>
        <span class="result-count">共 {{ filtered.length }} 条</span>
      </div>
      <div v-loading="loading" class="notice-list">
        <article v-for="item in filtered" :key="item.id">
          <div class="notice-icon" :class="{ important: item.important }"><el-icon><Warning v-if="item.important"/><Bell v-else/></el-icon></div>
          <div class="notice-main"><div><span class="category">{{ item.category }}</span><span class="audience">发送给 {{ item.audience }}</span><b v-if="item.important">重要</b></div><h2>{{ item.title }}</h2><p>{{ item.summary }}</p></div>
          <div class="notice-meta"><span>{{ item.publishedAt }}</span><span>{{ item.publisher }} 发布</span><strong>{{ item.readCount }} 人已读</strong></div>
          <button class="delete-button" title="删除通知" @click="remove(item)"><el-icon><Delete /></el-icon></button>
        </article>
        <el-empty v-if="!loading && !filtered.length" description="暂无相关通知" :image-size="72" />
      </div>
    </section>

    <el-dialog v-model="dialogVisible" title="发布学生通知" width="min(600px, 94vw)" destroy-on-close>
      <div class="publish-form">
        <label><span>通知标题</span><input v-model="form.title" maxlength="50" placeholder="例如：今晚宿舍楼停水通知"/><small>{{ form.title.length }}/50</small></label>
        <div class="form-row">
          <label><span>通知分类</span><select v-model="form.category"><option>安全通知</option><option>生活服务</option><option>校园活动</option></select></label>
          <label><span>通知对象</span><select v-model="form.audience"><option>全体学生</option><option>男生宿舍</option><option>女生宿舍</option><option v-for="item in buildings" :key="item.id" :value="item.name.replaceAll(' ', '')">{{ item.name }}</option></select></label>
        </div>
        <label><span>通知内容</span><textarea v-model="form.summary" maxlength="300" placeholder="请填写时间、地点、注意事项等完整信息"/><small>{{ form.summary.length }}/300</small></label>
        <label class="important-switch"><el-switch v-model="form.important"/><div><strong>标记为重要通知</strong><span>学生端将使用醒目标识突出显示</span></div></label>
        <div class="publish-tip">发布后通知会立即出现在符合通知对象的学生端“通知公告”中。</div>
      </div>
      <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" :loading="submitting" @click="publish">确认发布</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.notice-stats{margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.notice-stats article{padding:17px 19px;border:1px solid var(--line);border-radius:11px;display:flex;align-items:center;gap:12px;background:white}.notice-stats i{width:37px;height:37px;border-radius:9px;display:grid;place-items:center;font-size:12px;font-style:normal;font-weight:600}.notice-stats i.mint{color:#18796e;background:#e8f5f2}.notice-stats i.amber{color:#b36e28;background:#fff1df}.notice-stats i.blue{color:#527ca6;background:#edf3fa}.notice-stats div{display:grid;gap:3px}.notice-stats span{color:#899590;font-size:9px}.notice-stats strong{font-size:19px}.search-box{position:relative}.search-box .el-icon{position:absolute;z-index:1;left:11px;top:10px;color:#93a09c}.search-box input{padding-left:33px}.filter-input.select{width:140px}.result-count{margin-left:auto;color:#8c9894;font-size:10px}.notice-list{min-height:180px}.notice-list>article{min-height:115px;padding:17px 19px;border-bottom:1px solid #edf0ef;display:grid;grid-template-columns:42px 1fr 105px 28px;align-items:center;gap:14px}.notice-list>article:last-of-type{border-bottom:0}.notice-icon{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;color:#287d72;background:#e8f4f1}.notice-icon.important{color:#bb702a;background:#fff0df}.notice-main{min-width:0}.notice-main>div{display:flex;align-items:center;gap:7px}.notice-main .category{color:#18786d;font-size:9px}.notice-main .audience{padding-left:7px;border-left:1px solid #dce3e1;color:#8b9693;font-size:9px}.notice-main b{padding:2px 6px;border-radius:4px;color:#b9652c;background:#fff0e6;font-size:8px}.notice-main h2{margin:7px 0 5px;font-size:13px}.notice-main p{margin:0;color:#75827e;font-size:10px;line-height:1.65}.notice-meta{display:grid;justify-items:end;gap:5px;color:#8b9692;font-size:9px}.notice-meta strong{color:#4c6963;font-weight:500}.delete-button{width:28px;height:28px;border:0;border-radius:6px;display:grid;place-items:center;color:#9aa5a1;background:transparent}.delete-button:hover{color:#ca5d52;background:#fff0ee}.publish-form{display:grid;gap:17px}.publish-form label{position:relative;display:grid;gap:7px}.publish-form label>span{color:#46534f;font-size:10px;font-weight:600}.publish-form input,.publish-form select,.publish-form textarea{width:100%;border:1px solid #dfe5e3;border-radius:8px;outline:0;color:#35433f;background:white;font-size:10px}.publish-form input,.publish-form select{height:40px;padding:0 11px}.publish-form textarea{height:120px;padding:11px;resize:vertical;line-height:1.7}.publish-form input:focus,.publish-form select:focus,.publish-form textarea:focus{border-color:#58ad9f;box-shadow:0 0 0 3px #e8f5f2}.publish-form label>small{position:absolute;right:9px;bottom:8px;color:#9da7a4;font-size:8px}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:13px}.publish-form .important-switch{display:flex;align-items:center;gap:10px}.important-switch>div{display:grid;gap:3px}.important-switch strong{font-size:10px}.important-switch div span{color:#8b9692;font-size:8px}.publish-tip{padding:10px 12px;border-left:3px solid #61b4a7;color:#71807c;background:#f2f8f6;font-size:9px;line-height:1.6}@media(max-width:680px){.notice-stats{grid-template-columns:1fr}.notice-list>article{grid-template-columns:40px 1fr 28px}.notice-meta{grid-column:2;grid-row:2;justify-items:start;display:flex}.delete-button{grid-column:3;grid-row:1}.form-row{grid-template-columns:1fr}.filter-input.select{width:100%}.result-count{display:none}}
</style>
