import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Role } from '../types'

export interface UserAccount {
  role: Role
  name: string
  /** 家长账号下登记的家庭姓氏/称呼，用于"我的物品"演示 */
  familyName?: string
}

export const ACCOUNTS: (UserAccount & { username: string; password: string; hint: string })[] = [
  { username: 'parent', password: '123456', role: 'parent', name: '周妈妈', familyName: '周', hint: '家长' },
  { username: 'staff', password: '123456', role: 'staff', name: '王社工', hint: '社区工作人员' },
  { username: 'volunteer', password: '123456', role: 'volunteer', name: '李志愿者', hint: '现场志愿者' },
  { username: 'charity', password: '123456', role: 'charity', name: '周老师', hint: '公益机构（阳光儿童之家）' },
]

export const useSessionStore = defineStore('session', () => {
  const user = ref<UserAccount | null>(
    JSON.parse(localStorage.getItem('swap:user') ?? 'null') as UserAccount | null,
  )

  function login(username: string, password: string): string | null {
    const acc = ACCOUNTS.find((a) => a.username === username)
    if (!acc) return '账号不存在'
    if (acc.password !== password) return '密码不正确（演示密码均为 123456）'
    user.value = { role: acc.role, name: acc.name, familyName: acc.familyName }
    localStorage.setItem('swap:user', JSON.stringify(user.value))
    return null
  }

  function logout() {
    user.value = null
    localStorage.removeItem('swap:user')
  }

  return { user, login, logout }
})
