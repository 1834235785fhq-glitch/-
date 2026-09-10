<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Check, House, Lock, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const loading = ref(false)
const loginRole = ref<'student' | 'manager'>('student')
const form = reactive({ account: '', password: '', remember: true })

function chooseRole(role: 'student' | 'manager') {
  loginRole.value = role
  form.account = ''
  form.password = ''
}

async function submit() {
  loading.value = true
  try {
    await auth.login(form.account, form.password)
    ElMessage.success('欢迎回来')
    const requested = String(route.query.redirect ?? '')
    const target = auth.user.role === '宿管老师'
      ? '/admin/dashboard'
      : requested.startsWith('/admin') || !requested ? '/home' : requested
    await router.replace(target)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-showcase">
      <div class="showcase-glow glow-one" /><div class="showcase-glow glow-two" />
      <div class="login-brand"><span><el-icon><House /></el-icon></span><strong>智宿</strong></div>
      <div class="showcase-content">
        <div class="eyebrow">SMART CAMPUS · BETTER LIFE</div>
        <h1>宿舍生活，<br />简单一点。</h1>
        <p>报修、通知、调宿与生活缴费集中在一个地方，让校园住宿服务真正触手可及。</p>
        <div class="feature-list">
          <div><i><el-icon><Check /></el-icon></i><span><strong>宿舍服务一站办理</strong><small>报修、调宿和生活查询无需来回跑</small></span></div>
          <div><i><el-icon><Check /></el-icon></i><span><strong>处理进度随时掌握</strong><small>每一项申请都有清晰的状态反馈</small></span></div>
        </div>
      </div>
      <div class="showcase-footer">© 2026 智宿校园服务平台</div>
    </section>

    <section class="login-panel">
      <div class="login-box">
        <div class="mobile-brand"><span><el-icon><House /></el-icon></span><strong>智宿</strong></div>
        <div class="welcome"><span class="welcome-tag">智宿双端服务平台</span><h2>欢迎回来</h2><p>{{loginRole==='student'?'使用学号登录你的宿舍生活空间':'登录宿管工作台处理学生事务'}}</p></div>
        <div class="role-switch"><button :class="{active:loginRole==='student'}" @click="chooseRole('student')">学生登录</button><button :class="{active:loginRole==='manager'}" @click="chooseRole('manager')">宿管登录</button></div>
        <form @submit.prevent="submit">
          <label class="field"><span>{{loginRole==='student'?'学号':'宿管账号'}}</span><div><el-icon><User /></el-icon><input v-model="form.account" required autocomplete="username" :placeholder="loginRole==='student'?'请输入本人学号':'请输入宿管工作账号'" /></div></label>
          <label class="field"><span>密码</span><div><el-icon><Lock /></el-icon><input v-model="form.password" required type="password" autocomplete="current-password" placeholder="请输入登录密码" /></div></label>
          <div class="login-options"><label><input v-model="form.remember" type="checkbox" /> 记住登录状态</label><button type="button">忘记密码？</button></div>
          <button class="login-button" type="submit" :disabled="loading"><span>{{ loading ? '正在登录...' : loginRole==='student'?'进入智宿':'进入宿管工作台' }}</span><el-icon v-if="!loading"><ArrowRight /></el-icon></button>
        </form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(420px, 46%) 1fr; background: #f7f9f8; }
.login-showcase { position: relative; min-height: 100vh; padding: 38px 52px; overflow: hidden; display: flex; flex-direction: column; color: white; background: #0d302c; }
.login-showcase::after { content: ''; position: absolute; inset: 0; opacity: .12; background-image: linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(to bottom, transparent, #000 20%, #000 75%, transparent); }
.showcase-glow { position: absolute; border-radius: 50%; filter: blur(2px); }
.glow-one { width: 420px; height: 420px; left: -140px; bottom: 2%; background: radial-gradient(circle, rgba(64,194,171,.3), transparent 68%); }
.glow-two { width: 520px; height: 520px; right: -260px; top: -150px; background: radial-gradient(circle, rgba(105,218,198,.2), transparent 68%); }
.login-brand, .mobile-brand { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.login-brand span, .mobile-brand span { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; color: #0b4e47; background: #70d3c1; font-size: 20px; }
.login-brand strong, .mobile-brand strong { font-size: 20px; letter-spacing: 2px; }
.showcase-content { position: relative; z-index: 1; max-width: 460px; margin: auto 0; }
.eyebrow { margin-bottom: 22px; color: #70cfbf; font-size: 11px; font-weight: 600; letter-spacing: 2.5px; }
.showcase-content h1 { margin: 0; font-size: clamp(42px, 4.3vw, 64px); line-height: 1.22; letter-spacing: -2px; }
.showcase-content > p { max-width: 415px; margin: 25px 0 38px; color: #a8bfbb; font-size: 14px; line-height: 1.9; }
.feature-list { display: grid; gap: 20px; }
.feature-list > div { display: flex; align-items: center; gap: 13px; }
.feature-list i { width: 31px; height: 31px; flex: 0 0 31px; border-radius: 50%; display: grid; place-items: center; color: #73d6c4; background: rgba(105,211,192,.12); font-style: normal; }
.feature-list span { display: grid; gap: 4px; }
.feature-list strong { font-size: 13px; font-weight: 500; }
.feature-list small { color: #779b95; font-size: 11px; }
.showcase-footer { position: relative; z-index: 1; color: #5e817b; font-size: 10px; }
.login-panel { min-height: 100vh; padding: 40px; display: grid; place-items: center; }
.login-box { width: min(380px, 100%); }
.mobile-brand { display: none; margin-bottom: 44px; color: #173a35; }
.welcome-tag { display: inline-block; margin-bottom: 15px; padding: 5px 9px; border-radius: 5px; color: #137268; background: #e6f4f1; font-size: 10px; font-weight: 600; }
.welcome h2 { margin: 0; color: #172522; font-size: 29px; letter-spacing: -.7px; }
.welcome p { margin: 10px 0 34px; color: #899592; font-size: 13px; }
.role-switch { margin-bottom: 24px; padding: 4px; border-radius: 9px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #edf2f0; }
.role-switch button { height: 35px; border: 0; border-radius: 7px; color: #74817d; background: transparent; font-size: 11px; }
.role-switch button.active { color: #116f66; background: white; box-shadow: 0 2px 7px rgba(28,62,54,.08); font-weight: 600; }
.field { display: grid; gap: 8px; margin-bottom: 19px; }
.field > span { color: #42514d; font-size: 12px; font-weight: 600; }
.field > div { height: 45px; padding: 0 13px; border: 1px solid #dfe5e3; border-radius: 8px; display: flex; align-items: center; gap: 10px; color: #9aa6a3; background: white; transition: .2s; }
.field > div:focus-within { border-color: #58ad9f; box-shadow: 0 0 0 3px #e8f5f2; }
.field input { width: 100%; border: 0; outline: 0; color: #22312e; background: transparent; font-size: 13px; }
.login-options { margin: 2px 0 23px; display: flex; justify-content: space-between; align-items: center; color: #788582; font-size: 11px; }
.login-options label { display: flex; align-items: center; gap: 5px; }
.login-options input { accent-color: #0f766e; }
.login-options button { border: 0; color: #14766d; background: transparent; font-size: 11px; }
.login-button { width: 100%; height: 46px; padding: 0 17px; border: 0; border-radius: 8px; display: flex; justify-content: center; align-items: center; gap: 9px; color: white; background: #0f766e; box-shadow: 0 8px 20px rgba(15,118,110,.18); font-size: 13px; font-weight: 600; }
.login-button:hover { background: #0b625b; }
.login-button:disabled { opacity: .7; cursor: wait; }
@media (max-width: 800px) { .login-page { grid-template-columns: 1fr; } .login-showcase { display: none; } .mobile-brand { display: flex; } .login-panel { padding: 30px 22px; } }
</style>
