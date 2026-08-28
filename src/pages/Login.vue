<template>
  <div class="login-page">
    <div class="header">
      <h1>家庭贡献度</h1>
      <p>输入昵称和邀请码，数据随身带</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label>我的昵称</label>
        <input
          v-model="nickname"
          class="input"
          placeholder="如：爸爸 / 妈妈 / 小明"
          maxlength="8"
        />
      </div>

      <div class="form-group">
        <label>家庭邀请码</label>
        <input
          v-model="inviteCode"
          class="input code"
          placeholder="6 位邀请码"
          maxlength="6"
        />
      </div>

      <button
        class="btn btn-primary btn-block"
        :disabled="loading"
        @click="handleLogin"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <div class="divider">或</div>

      <button
        class="btn btn-secondary btn-block"
        @click="$router.push('/join')"
      >
        创建新家庭
      </button>
    </div>

    <div class="tips">
      <p>· 昵称和邀请码组合就是你的"账号"</p>
      <p>· 换手机时输入同样的昵称和邀请码，数据自动恢复</p>
      <p>· 邀请码在首页的家庭卡片里可以找到</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, savedFamily } from '../utils/supabase.js'

const router = useRouter()
const nickname = ref('')
const inviteCode = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!nickname.value.trim()) {
    alert('请输入昵称')
    return
  }
  if (!inviteCode.value.trim()) {
    alert('请输入家庭邀请码')
    return
  }

  loading.value = true
  try {
    // 查找家庭
    const { data: family, error: familyError } = await supabase
      .from(TABLES.FAMILIES)
      .select('*')
      .eq('invite_code', inviteCode.value.trim().toUpperCase())
      .single()

    if (familyError || !family) {
      throw new Error('邀请码无效')
    }

    // 查找该家庭中的成员（按昵称匹配）
    const { data: members, error: memberError } = await supabase
      .from(TABLES.MEMBERS)
      .select('*')
      .eq('family_id', family.id)
      .eq('name', nickname.value.trim())

    if (memberError) throw memberError

    if (!members || members.length === 0) {
      throw new Error('该家庭中没有找到昵称"' + nickname.value.trim() + '"的成员，请检查昵称是否正确')
    }

    // 取第一个匹配的成员（如果有重名，取第一个）
    const member = members[0]

    // 保存用户信息
    currentUser.set({
      id: member.id,
      family_id: family.id,
      name: member.name
    })

    savedFamily.set({
      memberId: member.id,
      familyId: family.id,
      name: member.name,
      familyName: family.name
    })

    router.push('/home')
  } catch (error) {
    alert(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  padding: 24px 16px;
  max-width: 500px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 32px;
  color: #c62828;
  margin-bottom: 8px;
}

.header p {
  color: #999;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.input.code {
  letter-spacing: 8px;
  font-weight: 600;
  text-align: center;
}

.btn-block {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
}

.btn-block:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 20px 0;
  color: #999;
  font-size: 14px;
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: #e0e0e0;
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.tips {
  font-size: 12px;
  color: #999;
  line-height: 1.8;
  margin-top: 20px;
}

.tips p {
  margin-bottom: 4px;
}
</style>
