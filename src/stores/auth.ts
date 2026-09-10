import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api/client'

const TOKEN_KEY = 'smart-dormitory-token'
const USER_KEY = 'smart-dormitory-user'

interface SessionUser {
  id?: number
  studentId?: number
  studentNo?: string
  name: string
  role: string
  initials: string
  permissions?: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const savedUser = localStorage.getItem(USER_KEY)
  const user = ref<SessionUser>(savedUser ? JSON.parse(savedUser) : { name: '同学', role: '学生', initials: '同' })
  const isAuthenticated = computed(() => Boolean(token.value))

  async function login(account: string, password: string) {
    if (!account.trim() || !password.trim()) throw new Error('请输入账号和密码')
    const result = await api.post<{ token: string; user: typeof user.value }>('/api/auth/login', { account, password })
    token.value = result.token
    user.value = result.user
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(result.user))
  }

  function logout() {
    token.value = ''
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return { token, user, isAuthenticated, login, logout }
})
