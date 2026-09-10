<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'
import {
  ArrowDown, Bell, Calendar, ChatLineSquare, Close, DataBoard, Finished, House,
  Menu, Moon, MoonNight, OfficeBuilding, Search, Sort, Tools, UserFilled,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const collapsed = ref(false)
const mobileOpen = ref(false)
const passwordDialog = ref<InstanceType<typeof ChangePasswordDialog> | null>(null)
const pageTitle = computed(() => String(route.meta.title ?? '工作台'))

const menus = [
  { label: '工作台', path: '/admin/dashboard', icon: DataBoard },
  { section: '宿舍资源' },
  { label: '楼栋管理', path: '/admin/buildings', icon: OfficeBuilding },
  { label: '房间管理', path: '/admin/rooms', icon: House },
  { section: '学生事务' },
  { label: '学生管理', path: '/admin/students', icon: UserFilled },
  { label: '调宿处理', path: '/admin/transfers', icon: Sort },
  { label: '晚归管理', path: '/admin/late-returns', icon: MoonNight, badge: 1 },
  { label: '报修管理', path: '/admin/repairs', icon: Tools, badge: 6 },
  { label: '卫生检查', path: '/admin/dashboard', icon: Finished },
  { label: '通知管理', path: '/admin/notices', icon: ChatLineSquare },
]

function navigate(path?: string) {
  if (!path) return
  router.push(path)
  mobileOpen.value = false
}

function logout() {
  auth.logout()
  router.replace('/login')
}
function handleCommand(command:string){if(command==='password')passwordDialog.value?.open();else logout()}
</script>

<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <div v-if="mobileOpen" class="mobile-overlay" @click="mobileOpen = false" />
    <aside class="sidebar" :class="{ 'mobile-open': mobileOpen }">
      <div class="brand">
        <div class="brand-mark"><el-icon><House /></el-icon></div>
        <div class="brand-copy"><strong>智宿</strong><span>SMART DORM</span></div>
        <button class="mobile-close" @click="mobileOpen = false"><el-icon><Close /></el-icon></button>
      </div>
      <nav class="nav-list">
        <template v-for="(item, index) in menus" :key="index">
          <div v-if="item.section" class="nav-section">{{ item.section }}</div>
          <button v-else class="nav-item" :class="{ active: route.path === item.path }" @click="navigate(item.path)">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
            <b v-if="item.badge" class="nav-badge">{{ item.badge }}</b>
          </button>
        </template>
      </nav>
      <div class="sidebar-foot">
        <div class="semester-card">
          <el-icon><Calendar /></el-icon>
          <div><span>当前学期</span><strong>2026 秋季学期</strong></div>
        </div>
      </div>
    </aside>

    <main class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button menu-button" @click="mobileOpen = true"><el-icon><Menu /></el-icon></button>
          <button class="icon-button desktop-toggle" @click="collapsed = !collapsed"><el-icon><Menu /></el-icon></button>
          <div class="breadcrumb"><span>智宿</span><i>/</i><strong>{{ pageTitle }}</strong></div>
        </div>
        <div class="topbar-actions">
          <label class="global-search"><el-icon><Search /></el-icon><input placeholder="搜索学生、房间或报修单" /><kbd>⌘ K</kbd></label>
          <button class="icon-button"><el-icon><Moon /></el-icon></button>
          <button class="icon-button notification"><el-icon><Bell /></el-icon><i /></button>
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-entry">
              <div class="avatar">{{ auth.user.initials }}</div>
              <div class="user-copy"><strong>{{ auth.user.name }}</strong><span>{{ auth.user.role }}</span></div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="password">修改密码</el-dropdown-item><el-dropdown-item command="logout" divided>退出登录</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
      </header>
      <div class="page-container"><router-view /></div>
      <ChangePasswordDialog ref="passwordDialog" />
    </main>
  </div>
</template>
