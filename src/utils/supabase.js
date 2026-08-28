import { createClient } from '@supabase/supabase-js'

// Supabase 配置 - 直接写死（Netlify Drop 不支持环境变量）
const supabaseUrl = 'https://fdzassixxlqbvqnymzms.supabase.co'
const supabaseKey = 'sb_publishable_nZN3olFTsOOPYHqZZWOiuw_ofdc58hN'

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

// 已加入的家庭信息（用于快速恢复，不依赖 member id）
export const savedFamily = {
  get() {
    return storage.get('savedFamily')
  },
  set(data) {
    storage.set('savedFamily', data)
  },
  clear() {
    storage.remove('savedFamily')
  }
}

// 清除会话（数据库清空后调用）
export function clearSession() {
  currentUser.clear()
  savedFamily.clear()
}
