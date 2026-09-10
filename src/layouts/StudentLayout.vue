<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ArrowDown, Bell, ChatLineSquare, Close, Coin, House, Menu, Message, MoonNight, Notebook, Setting, SwitchButton, Tools, User } from '@element-plus/icons-vue'
import ChangePasswordDialog from '@/components/ChangePasswordDialog.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)
const passwordDialog=ref<InstanceType<typeof ChangePasswordDialog>|null>(null)
const nav = [
  { label: '首页', path: '/home', icon: House },
  { label: '我的宿舍', path: '/my-dorm', icon: Notebook },
  { label: '在线报修', path: '/my-repairs', icon: Tools },
  { label: '调宿申请', path: '/transfer', icon: Message },
  { label: '晚归登记', path: '/late-return', icon: MoonNight },
  { label: '宿舍生活', path: '/life', icon: Coin },
  { label: '通知公告', path: '/notices', icon: ChatLineSquare, dot: true },
]
function go(path:string){router.push(path);mobileOpen.value=false}
function logout(){auth.logout();router.replace('/login')}
function handleCommand(command:string){if(command==='logout')logout();else if(command==='password')passwordDialog.value?.open();else go('/profile')}
</script>

<template>
  <div class="student-shell">
    <header class="student-header">
      <div class="student-header-inner">
        <button class="student-menu" @click="mobileOpen=true"><el-icon><Menu/></el-icon></button>
        <button class="student-brand" @click="go('/home')"><span><el-icon><House/></el-icon></span><div><strong>智宿</strong><small>校园宿舍生活</small></div></button>
        <nav class="student-nav"><button v-for="item in nav" :key="item.path" :class="{active:route.path===item.path}" @click="go(item.path)"><el-icon><component :is="item.icon"/></el-icon>{{item.label}}<i v-if="item.dot"/></button></nav>
        <div class="student-actions"><button class="round-button" @click="go('/notices')"><el-icon><Bell/></el-icon><i/></button><el-dropdown trigger="click" @command="handleCommand"><div class="student-user"><span>{{auth.user.initials}}</span><div><strong>{{auth.user.name}}</strong><small>{{auth.user.studentNo ?? auth.user.role}}</small></div><el-icon><ArrowDown/></el-icon></div><template #dropdown><el-dropdown-menu><el-dropdown-item command="profile"><el-icon><User/></el-icon>个人中心</el-dropdown-item><el-dropdown-item command="password"><el-icon><Setting/></el-icon>修改密码</el-dropdown-item><el-dropdown-item command="logout" divided><el-icon><SwitchButton/></el-icon>退出登录</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
      </div>
    </header>
    <div v-if="mobileOpen" class="student-overlay" @click="mobileOpen=false"/>
    <aside class="student-drawer" :class="{open:mobileOpen}"><div class="drawer-head"><span>智宿服务</span><button @click="mobileOpen=false"><el-icon><Close/></el-icon></button></div><button v-for="item in nav" :key="item.path" :class="{active:route.path===item.path}" @click="go(item.path)"><el-icon><component :is="item.icon"/></el-icon>{{item.label}}</button><button @click="go('/profile')"><el-icon><Setting/></el-icon>个人中心</button></aside>
    <main class="student-main"><router-view/></main>
    <footer class="student-footer"><span>智宿 · 让校园生活更简单</span><span>服务时间 08:00—22:00</span></footer>
    <ChangePasswordDialog ref="passwordDialog" />
  </div>
</template>

<style scoped>
.student-shell{min-height:100vh;background:#f5f7f6}.student-header{height:70px;position:sticky;top:0;z-index:20;border-bottom:1px solid #e4eae7;background:rgba(255,255,255,.94);backdrop-filter:blur(14px)}.student-header-inner{max-width:1240px;height:100%;margin:auto;padding:0 24px;display:flex;align-items:center}.student-brand{margin-right:48px;padding:0;border:0;display:flex;align-items:center;gap:10px;background:transparent;text-align:left}.student-brand>span{width:37px;height:37px;border-radius:11px;display:grid;place-items:center;color:white;background:#128074;font-size:20px}.student-brand>div{display:grid}.student-brand strong{font-size:18px;letter-spacing:1px}.student-brand small{margin-top:1px;color:#93a09c;font-size:8px;letter-spacing:1.2px}.student-nav{height:100%;display:flex;align-items:stretch;gap:5px}.student-nav button{position:relative;padding:0 14px;border:0;border-bottom:2px solid transparent;display:flex;align-items:center;gap:6px;color:#64736f;background:transparent;font-size:12px}.student-nav button:hover{color:#14776d}.student-nav button.active{border-bottom-color:#168579;color:#0d746a;font-weight:600}.student-nav button i{position:absolute;top:18px;right:8px;width:5px;height:5px;border-radius:50%;background:#ed705e}.student-actions{margin-left:auto;display:flex;align-items:center;gap:14px}.round-button{position:relative;width:36px;height:36px;border:1px solid #e4e8e7;border-radius:50%;display:grid;place-items:center;color:#61706c;background:white}.round-button i{position:absolute;top:6px;right:6px;width:6px;height:6px;border:1px solid white;border-radius:50%;background:#ef6b59}.student-user{padding-left:14px;border-left:1px solid #e5e9e8;display:flex;align-items:center;gap:9px;outline:0;cursor:pointer}.student-user>span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;color:#176b62;background:#dcefeb;font-size:12px;font-weight:600}.student-user>div{display:grid}.student-user strong{font-size:11px}.student-user small{margin-top:2px;color:#929d9a;font-size:8px}.student-user>.el-icon{color:#9da6a4;font-size:10px}.student-main{max-width:1200px;min-height:calc(100vh - 130px);margin:0 auto;padding:30px 24px 50px}.student-footer{max-width:1200px;margin:auto;padding:20px 24px;border-top:1px solid #e2e7e5;display:flex;justify-content:space-between;color:#98a29f;font-size:9px}.student-menu{display:none;margin-right:10px;border:0;background:transparent;font-size:20px}.student-drawer,.student-overlay{display:none}@media(max-width:980px){.student-brand{margin-right:20px}.student-nav button{padding:0 8px}.student-nav button .el-icon{display:none}}@media(max-width:760px){.student-menu{display:block}.student-header-inner{padding:0 15px}.student-nav{display:none}.student-brand{margin-right:0}.student-user>div,.student-user>.el-icon{display:none}.student-user{padding-left:8px}.student-main{padding:22px 15px 40px}.student-footer{padding:18px 15px}.student-overlay{display:block;position:fixed;inset:0;z-index:29;background:rgba(9,31,28,.42)}.student-drawer{position:fixed;inset:0 auto 0 0;z-index:30;width:250px;padding:15px;display:flex;flex-direction:column;gap:4px;background:#10332f;transform:translateX(-100%);transition:.25s}.student-drawer.open{transform:translateX(0)}.drawer-head{height:52px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;color:white;font-weight:600}.drawer-head button{border:0;color:white;background:transparent}.student-drawer>button{height:44px;padding:0 13px;border:0;border-radius:8px;display:flex;align-items:center;gap:11px;color:#a8c0bb;background:transparent}.student-drawer>button.active{color:white;background:rgba(74,196,176,.18)}.student-footer span:last-child{display:none}}
</style>
