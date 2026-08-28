<template>
  <div class="join-page">
    <div class="header">
      <h1>家庭贡献度</h1>
      <p>一元即一点 · 委员投票 · 多劳多得</p>
    </div>

    <!-- 快速恢复：如果之前加入过家庭，显示回到家庭的按钮 -->
    <div v-if="savedFamilyInfo" class="card restore-card">
      <div class="restore-info">
        <span class="restore-name">{{ savedFamilyInfo.name }}</span>
        <span class="restore-family">（{{ savedFamilyInfo.familyName }}）</span>
      </div>
      <button class="btn btn-primary" @click="goBack">回到我的家庭</button>
    </div>

    <div class="card">
      <div class="tabs">
        <div
          :class="['tab', { active: mode === 'create' }]"
          @click="mode = 'create'"
        >
          创建家庭
        </div>
        <div
          :class="['tab', { active: mode === 'join' }]"
          @click="mode = 'join'"
        >
          加入家庭
        </div>
      </div>

      <div class="form-group">
        <label>我的昵称</label>
        <input
          v-model="myName"
          class="input"
          placeholder="如：爸爸 / 妈妈 / 小明"
          maxlength="8"
        />
      </div>

      <div v-if="mode === 'create'" class="form-group">
        <label>家庭名称</label>
        <input
          v-model="familyName"
          class="input"
          placeholder="如：老李之家"
          maxlength="12"
        />
      </div>

      <div v-if="mode === 'create'" class="form-group">
        <label>邀请码（自定义，家人用此码加入）</label>
        <input
          v-model="inviteCode"
          class="input code"
          placeholder="如：family"
          maxlength="12"
        />
      </div>

      <div v-else class="form-group">
        <label>邀请码</label>
        <input
          v-model="inviteCode"
          class="input code"
          placeholder="输入家庭邀请码"
          maxlength="12"
        />
      </div>

      <button
        class="btn btn-primary btn-block"
        :disabled="loading"
        @click="handleSubmit"
      >
        {{ loading ? '处理中...' : (mode === 'create' ? '创建家庭' : '加入家庭') }}
      </button>
    </div>

    <div class="tips">
      <p>· 贡献度以「元」为单位申报，1 元 = 1 贡献度</p>
      <p>· 申报后为「草案」，需家庭委员投票、过半数赞成方可入账</p>
      <p>· 累计贡献度最高的成员享有一票否决权</p>
      <p>· 贡献度达标自动晋升：见习委员 → 办事员 → ... → 委员长</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, generateInviteCode, currentUser, savedFamily, clearSession } from '../utils/supabase.js'

const router = useRouter()
const mode = ref('create')
const myName = ref('')
const familyName = ref('')
const inviteCode = ref('')
const loading = ref(false)

const savedFamilyInfo = computed(() => savedFamily.get())

async function goBack() {
  const info = savedFamily.get()
  if (info) {
    // 验证成员是否还存在
    const { data: member } = await supabase
      .from(TABLES.MEMBERS)
      .select('*')
      .eq('id', info.memberId)
      .single()

    if (!member) {
      clearSession()
      return
    }

    currentUser.set({ id: info.memberId, family_id: info.familyId, name: info.name })
    router.push('/home')
  }
}

async function handleSubmit() {
  if (!myName.value.trim()) {
    alert('请填写你的昵称')
    return
  }

  loading.value = true

  try {
    if (mode.value === 'create') {
      await createFamily()
    } else {
      await joinFamily()
    }
  } catch (error) {
    alert(error.message || '操作失败')
  } finally {
    loading.value = false
  }
}

async function createFamily() {
  if (!familyName.value.trim()) {
    throw new Error('请填写家庭名称')
  }
  if (!inviteCode.value.trim()) {
    throw new Error('请输入邀请码')
  }

  const code = inviteCode.value.trim().toUpperCase()

  // 创建家庭
  const { data: family, error: familyError } = await supabase
    .from(TABLES.FAMILIES)
    .insert({
      name: familyName.value.trim(),
      invite_code: code,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (familyError) {
    if (familyError.code === '23505') {
      throw new Error('邀请码已被使用，请换一个')
    }
    throw familyError
  }

  // 创建成员（创建者即管理员）
  const { data: member, error: memberError } = await supabase
    .from(TABLES.MEMBERS)
    .insert({
      family_id: family.id,
      name: myName.value.trim(),
      approved_total: 0,
      level: '见习委员',
      custom_title: '',
      is_admin: true,
      joined_at: new Date().toISOString()
    })
    .select()
    .single()

  if (memberError) throw memberError

  // 保存当前用户信息
  currentUser.set({
    id: member.id,
    family_id: family.id,
    name: member.name
  })

  // 额外保存家庭信息用于快速恢复
  savedFamily.set({
    memberId: member.id,
    familyId: family.id,
    name: member.name,
    familyName: family.name
  })

  router.push('/home')
}

async function joinFamily() {
  if (!inviteCode.value.trim()) {
    throw new Error('请填写邀请码')
  }

  // 查找家庭
  const { data: family, error: familyError } = await supabase
    .from(TABLES.FAMILIES)
    .select('*')
    .eq('invite_code', inviteCode.value.trim().toUpperCase())
    .single()

  if (familyError || !family) {
    throw new Error('邀请码无效')
  }

  // 创建成员
  const { data: member, error: memberError } = await supabase
    .from(TABLES.MEMBERS)
    .insert({
      family_id: family.id,
      name: myName.value.trim(),
      approved_total: 0,
      level: '见习委员',
      custom_title: '',
      is_admin: false,
      joined_at: new Date().toISOString()
    })
    .select()
    .single()

  if (memberError) throw memberError

  // 保存当前用户信息
  currentUser.set({
    id: member.id,
    family_id: family.id,
    name: member.name
  })

  // 额外保存家庭信息用于快速恢复
  savedFamily.set({
    memberId: member.id,
    familyId: family.id,
    name: member.name,
    familyName: family.name
  })

  router.push('/home')
}
</script>

<style scoped>
.join-page {
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
  letter-spacing: 1px;
}

.tabs {
  display: flex;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #999;
}

.tab.active {
  background: #fff;
  color: #c62828;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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

.tips {
  font-size: 12px;
  color: #999;
  line-height: 1.8;
  margin-top: 20px;
}

.tips p {
  margin-bottom: 4px;
}

/* 快速恢复卡片 */
.restore-card {
  background: linear-gradient(135deg, #fff8e1, #ffffff);
  border: 2px solid #ffe082;
  margin-bottom: 16px;
}
.restore-info {
  margin-bottom: 12px;
}
.restore-name {
  font-size: 18px;
  font-weight: 700;
  color: #c62828;
}
.restore-family {
  font-size: 14px;
  color: #78909c;
}
</style>
