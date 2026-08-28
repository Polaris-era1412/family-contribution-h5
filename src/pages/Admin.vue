<template>
  <div class="admin-page">
    <div v-if="!loaded" class="loading">加载中...</div>

    <template v-if="loaded && !isAdmin">
      <div class="empty">
        <div class="empty-icon">🚫</div>
        <div>只有管理员（创建家庭者）可以进入后台</div>
      </div>
    </template>

    <template v-if="loaded && isAdmin">
      <!-- 成员管理 -->
      <div class="card">
        <div class="card-title">👥 成员管理（改贡献度 / 职称）</div>
        <div
          v-for="(m, index) in members"
          :key="m.id"
          class="adm-member"
        >
          <div class="adm-line1">
            <span class="adm-name">{{ m.name }}</span>
            <span class="adm-cur">当前：{{ m.custom_title || m.level }} · {{ m.approved_total }} 分</span>
          </div>
          <div class="adm-line2">
            <input
              v-model="m.totalInput"
              type="number"
              class="adm-input"
              placeholder="贡献度"
            />
            <select v-model="m.titleIndex" class="adm-picker">
              <option
                v-for="(opt, i) in titleOptions"
                :key="i"
                :value="i"
              >
                {{ opt }}
              </option>
            </select>
            <button
              class="btn btn-primary btn-mini"
              @click="saveMember(index)"
            >
              保存
            </button>
          </div>
        </div>
        <div class="hint">
          职称选「自动晋升」= 按累计贡献度自动计算；指定职称后固定显示，不受贡献度影响。修改贡献度会立即影响排行榜和一票否决权归属。
        </div>
      </div>

      <!-- 草案直批 -->
      <div class="card">
        <div class="card-title">📋 草案直批（管理员特权）</div>
        <div v-if="!pending.length" class="empty">
          <div class="empty-icon">🎉</div>
          <div>没有待处理的草案</div>
        </div>
        <div
          v-for="item in pending"
          :key="item.id"
          class="adm-proposal"
        >
          <div class="adm-p-line">
            {{ item.member_name }} 申报 +{{ item.amount }}（{{ item.category }}）
            <span class="p-time">{{ formatTime(item.created_at) }}</span>
          </div>
          <div v-if="item.note" class="p-note">{{ item.note }}</div>
          <div class="adm-actions">
            <button
              class="btn btn-primary btn-mini"
              @click="settle(item.id, 'approve')"
            >
              直接通过
            </button>
            <button
              class="btn btn-danger btn-mini"
              @click="settle(item.id, 'reject')"
            >
              直接驳回
            </button>
          </div>
        </div>
        <div class="hint">直接通过会立即计入贡献度并触发自动晋升。</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, clearSession } from '../utils/supabase.js'
import { LEVELS, getLevel } from '../utils/levels.js'

const router = useRouter()
const loaded = ref(false)
const isAdmin = ref(false)
const members = ref([])
const pending = ref([])
const titleOptions = ['自动晋升', ...LEVELS.map(l => l.name)]

const user = currentUser.get()

onMounted(async () => {
  if (!user) {
    router.push('/join')
    return
  }
  await loadData()
})

async function loadData() {
  // 获取当前成员
  const { data: member } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  if (!member) {
    clearSession()
    router.push('/login')
    return
  }

  isAdmin.value = member.is_admin

  if (!member.is_admin) {
    loaded.value = true
    return
  }

  // 获取所有成员
  const { data: allMembers } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('family_id', member.family_id)

  members.value = allMembers.map(m => {
    const custom = m.custom_title || ''
    const titleIndex = custom
      ? Math.max(0, LEVELS.findIndex(l => l.name === custom)) + 1
      : 0

    return {
      ...m,
      totalInput: String(m.approved_total || 0),
      titleIndex
    }
  })

  // 获取待处理草案
  const { data: contributions } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('family_id', member.family_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  pending.value = contributions

  loaded.value = true
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前'

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function saveMember(index) {
  const m = members.value[index]
  const total = Number(m.totalInput)

  if (!Number.isFinite(total) || total < 0) {
    alert('贡献度需为不小于 0 的数字')
    return
  }

  const customTitle = m.titleIndex === 0 ? '' : titleOptions[m.titleIndex]

  const updateData = {
    approved_total: total
  }

  if (customTitle) {
    updateData.custom_title = customTitle
  } else {
    // 自动晋升
    const { current: newLevel } = getLevel(total)
    updateData.level = newLevel.name
    updateData.custom_title = null
  }

  await supabase
    .from(TABLES.MEMBERS)
    .update(updateData)
    .eq('id', m.id)

  alert('已保存')
  await loadData()
}

async function settle(contributionId, decision) {
  const { data: contribution } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('id', contributionId)
    .single()

  if (!contribution) {
    alert('提案不存在')
    return
  }

  if (decision === 'approve') {
    // 通过
    await supabase
      .from(TABLES.CONTRIBUTIONS)
      .update({
        status: 'approved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', contributionId)

    // 增加贡献度
    const { data: member } = await supabase
      .from(TABLES.MEMBERS)
      .select('*')
      .eq('id', contribution.member_id)
      .single()

    const newTotal = (member.approved_total || 0) + contribution.amount

    const { current: newLevel } = getLevel(newTotal)

    await supabase
      .from(TABLES.MEMBERS)
      .update({
        approved_total: newTotal,
        level: newLevel.name
      })
      .eq('id', contribution.member_id)

    alert('已通过入账')
  } else {
    // 驳回
    await supabase
      .from(TABLES.CONTRIBUTIONS)
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString()
      })
      .eq('id', contributionId)

    alert('已驳回')
  }

  await loadData()
}
</script>

<style scoped>
.admin-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 100px 0;
  color: #999;
}

.empty {
  text-align: center;
  padding: 60px 0;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.adm-member {
  padding: 16px 0;
  border-bottom: 1px solid #f5f6fa;
}

.adm-member:last-of-type {
  border-bottom: none;
}

.adm-line1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.adm-name {
  font-weight: 700;
  font-size: 16px;
}

.adm-cur {
  font-size: 12px;
  color: #999;
}

.adm-line2 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.adm-input {
  flex: 1;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  border: none;
  outline: none;
  min-width: 0;
}

.adm-picker {
  background: #f1f2f6;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #555;
  border: none;
  outline: none;
  cursor: pointer;
}

.btn-mini {
  padding: 6px 16px;
  font-size: 13px;
}

.btn-danger {
  background: #ffebee;
  color: #c62828;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-top: 12px;
  line-height: 1.6;
}

.adm-proposal {
  padding: 16px 0;
  border-bottom: 1px solid #f5f6fa;
}

.adm-proposal:last-of-type {
  border-bottom: none;
}

.adm-p-line {
  font-size: 14px;
  font-weight: 600;
}

.p-time {
  font-size: 12px;
  color: #999;
  font-weight: 400;
  margin-left: 8px;
}

.p-note {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
  line-height: 1.5;
}

.adm-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
</style>
