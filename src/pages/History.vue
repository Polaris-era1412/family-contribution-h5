<template>
  <div class="history-page">
    <div class="filters">
      <div
        v-for="f in filters"
        :key="f.key"
        :class="['f-chip', { active: filter === f.key }]"
        @click="filter = f.key"
      >
        {{ f.label }}
      </div>
    </div>

    <div v-if="!shown.length" class="empty">
      <div class="empty-icon">📭</div>
      <div>暂无记录</div>
    </div>

    <div
      v-for="item in shown"
      :key="item.id"
      class="card h-item"
    >
      <div class="h-line1">
        <div class="h-name">{{ item.member_name }} · {{ item.category }}</div>
        <div :class="['status', item.status]">{{ getStatusText(item.status) }}</div>
      </div>
      <div class="h-amount">+{{ item.amount }}<span class="h-unit">贡献度</span></div>
      <div v-if="item.note" class="p-note">{{ item.note }}</div>
      <div v-if="item.status === 'vetoed'" class="p-note veto-reason">
        🔱 {{ item.veto_by }} 否决{{ item.veto_reason ? '：' + item.veto_reason : '' }}
      </div>
      <div class="h-time">{{ formatTime(item.created_at) }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, clearSession } from '../utils/supabase.js'

const router = useRouter()
const filters = [
  { key: 'all', label: '全部' },
  { key: 'approved', label: '已入账' },
  { key: 'rejected', label: '未通过' },
  { key: 'vetoed', label: '已否决' },
  { key: 'withdrawn', label: '已撤回' }
]

const filter = ref('all')
const all = ref([])

const shown = computed(() => {
  if (filter.value === 'all') return all.value
  return all.value.filter(c => c.status === filter.value)
})

const user = currentUser.get()

onMounted(async () => {
  if (!user) {
    router.push('/join')
    return
  }
  await loadData()
})

async function loadData() {
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

  const { data: contributions } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('family_id', member.family_id)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })

  all.value = contributions
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getStatusText(status) {
  const map = {
    approved: '已入账',
    rejected: '未通过',
    vetoed: '已否决',
    withdrawn: '已撤回'
  }
  return map[status] || status
}
</script>

<style scoped>
.history-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.f-chip {
  padding: 8px 20px;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.f-chip.active {
  background: #c62828;
  color: #fff;
  font-weight: 700;
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

.h-item {
  padding: 16px;
}

.h-line1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.h-name {
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 12px;
}

.h-amount {
  font-size: 28px;
  font-weight: 800;
  color: #c62828;
  margin: 6px 0;
}

.h-unit {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
  font-weight: 400;
}

.p-note {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
  line-height: 1.5;
}

.p-note.veto-reason {
  color: #c62828;
}

.h-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.status {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}

.status.approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.rejected {
  background: #eceff1;
  color: #78909c;
}

.status.vetoed {
  background: #ffebee;
  color: #c62828;
}

.status.withdrawn {
  background: #eceff1;
  color: #90a4ae;
}
</style>
