import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录' } },
    {
      path: '/', component: () => import('@/layouts/StudentLayout.vue'), meta: { requiresAuth: true, role: '学生' },
      children: [
        { path: '', redirect: '/home' },
        { path: 'home', name: 'home', component: () => import('@/views/student/StudentHomeView.vue'), meta: { title: '首页' } },
        { path: 'my-dorm', name: 'my-dorm', component: () => import('@/views/student/MyDormView.vue'), meta: { title: '我的宿舍' } },
        { path: 'my-repairs', name: 'my-repairs', component: () => import('@/views/student/StudentRepairsView.vue'), meta: { title: '在线报修' } },
        { path: 'transfer', name: 'transfer', component: () => import('@/views/student/TransferView.vue'), meta: { title: '调宿申请' } },
        { path: 'late-return', name: 'late-return', component: () => import('@/views/student/LateReturnView.vue'), meta: { title: '晚归登记' } },
        { path: 'life', name: 'life', component: () => import('@/views/student/LifeServicesView.vue'), meta: { title: '宿舍生活' } },
        { path: 'notices', name: 'notices', component: () => import('@/views/student/NoticesView.vue'), meta: { title: '通知公告' } },
        { path: 'profile', name: 'profile', component: () => import('@/views/student/ProfileView.vue'), meta: { title: '个人中心' } },
      ],
    },
    {
      path: '/admin', component: () => import('@/layouts/DashboardLayout.vue'), meta: { requiresAuth: true, role: '宿管老师' },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        { path: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '管理工作台' } },
        { path: 'buildings', component: () => import('@/views/BuildingsView.vue'), meta: { title: '楼栋管理' } },
        { path: 'rooms', component: () => import('@/views/RoomsView.vue'), meta: { title: '房间管理' } },
        { path: 'students', component: () => import('@/views/StudentsView.vue'), meta: { title: '学生管理' } },
        { path: 'transfers', component: () => import('@/views/admin/TransfersView.vue'), meta: { title: '调宿处理' } },
        { path: 'repairs', component: () => import('@/views/RepairsView.vue'), meta: { title: '报修管理' } },
        { path: 'late-returns', component: () => import('@/views/admin/LateReturnsView.vue'), meta: { title: '晚归管理' } },
        { path: 'notices', component: () => import('@/views/admin/AdminNoticesView.vue'), meta: { title: '通知管理' } },
      ],
    },
    { path: '/dashboard', redirect: '/home' },
    { path: '/buildings', redirect: '/home' },
    { path: '/rooms', redirect: '/my-dorm' },
    { path: '/students', redirect: '/home' },
    { path: '/repairs', redirect: '/my-repairs' },
    { path: '/inspections', redirect: '/life' },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

router.beforeEach((to) => {
  document.title = `${String(to.meta.title ?? '智宿生活')} · 智宿`
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.role && auth.user.role !== to.meta.role) return auth.user.role === '宿管老师' ? '/admin/dashboard' : '/home'
  if (to.name === 'login' && auth.isAuthenticated) return auth.user.role === '宿管老师' ? '/admin/dashboard' : '/home'
})

export default router
