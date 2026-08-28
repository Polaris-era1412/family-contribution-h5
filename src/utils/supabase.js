import { createClient } from '@supabase/supabase-js'

// Supabase 配置 - 需要用户自己填写
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

// 数据库表名
export const TABLES = {
  FAMILIES: 'families',
  MEMBERS: 'members',
  CONTRIBUTIONS: 'contributions'
}

// 生成随机邀请码
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 本地存储工具
export const storage = {
  get(key) {
    const value = localStorage.getItem(key)
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },
  remove(key) {
    localStorage.removeItem(key)
  }
}

// 当前用户信息
export const currentUser = {
  get() {
    return storage.get('currentUser')
  },
  set(user) {
    storage.set('currentUser', user)
  },
  clear() {
    storage.remove('currentUser')
  }
}
