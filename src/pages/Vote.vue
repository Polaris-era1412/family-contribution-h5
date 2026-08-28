<template>
  <div class="vote-page">
    <div class="tabs">
      <div
        :class="['tab-item', { active: tab === 'pending' }]"
        @click="tab = 'pending'"
      >
        待表决{{ pending.length ? `（${pending.length}）` : '' }}
      </div>
      <div
        :class="['tab-item', { active: tab === 'done' }]"
        @click="tab = 'done'"
      >
        已办结
      </div>
    </div>

    <!-- 待表决 -->
    <template v-if="tab === 'pending'">
      <div v-if="!pending.length" class="empty">
        <div class="empty-icon">🎉</div>
        <div>没有待表决的提案</div>
      </div>

      <div
        v-for="item in pending"
        :key="item.id"
        class="card proposal"
      >
        <div class="p-head">
          <div class="p-name">
            {{ item.member_name }}
            <span class="p-cat">{{ item.category }}</span>
          </div>
          <div class="p-time">{{ formatTime(item.created_at) }}</div>
        </div>

        <div class="p-amount">+{{ item.amount }}<span class="p-unit">贡献度</span></div>
        <div v-if="item.note" class="p-note">{{ item.note }}</div>

        <div class="p-vote-line">
          <span class="v-ok">赞成 {{ item.approve_count }}</span>
          <span class="v-no">反对 {{ item.reject_count }}</span>
          <span class="v-need">通过需 {{ item.need }} 票 / 共 {{ item.member_count }} 人</span>
        </div>

        <div class="p-actions">
          <template v-if="item.mine">
            <div class="mine-tag">我的提案（已默认赞成）</div>
            <button class="btn btn-secondary btn-mini" @click="handleWithdraw(item.id)">
              撤回
            </button>
          </template>
          <template v-else>
            <button
              :class="['btn', 'btn-mini', item.my_vote === 'approve' ? 'btn-primary' : 'btn-secondary']"
              @click="handleVote(item.id, 'approve')"
            >
              👍 赞成
            </button>
            <button
              :class="['btn', 'btn-mini', item.my_vote === 'reject' ? 'btn-danger' : 'btn-secondary']"
              @click="handleVote(item.id, 'reject')"
            >
              👎 反对
            </button>
            <button
              v-if="canVeto"
              class="btn btn-mini btn-veto"
              @click="handleVeto(item.id)"
            >
              🔱 否决
            </button>
          </template>
        </div>
      </div>
    </template>

    <!-- 已办结 -->
    <template v-else>
      <div v-if="!done.length" class="empty">
        <div class="empty-icon">📭</div>
        <div>暂无已办结的提案</div>
      </div>

      <div
        v-for="item in done"
        :key="item.id"
        class="card proposal done"
      >
        <div class="p-head">
          <div class="p-name">{{ item.member_name }}</div>
          <div :class="['status', item.status]">{{ getStatusText(item.status) }}</div>
        </div>
        <div class="p-amount small">+{{ item.amount }}<span class="p-unit">贡献度</span></div>
        <div v-if="item.note" class="p-note">{{ item.note }}</div>
        <div v-if="item.status === 'vetoed'" class="p-note veto-reason">
          🔱 {{ item.veto_by }} 否决{{ item.veto_reason ? '：' + item.veto_reason : '' }}
        </div>
        <div class="p-time">{{ formatTime(item.created_at) }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser } from '../utils/supabase.js'

const router = useRouter()
const tab = ref('pending')
const pending = ref([])
const done = ref([])
const canVeto = ref(false)

const user = currentUser.get()

onMounted(async () => {
  if (!user) {
    router.push('/join')
    return
  }
  await loadData()
})

async function loadData() {
  // 获取当前成员信息
  const { data: member } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  // 获取所有贡献记录
  const { data: contributions } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('family_id', member.family_id)
    .order('created_at', { ascending: false })

  // 获取所有成员
  const { data: allMembers } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('family_id', member.family_id)

  const memberCount = allMembers.length
  const need = Math.floor(memberCount / 2) + 1

  // 计算一票否决权
  const maxTotal = Math.max(...allMembers.map(m => m.approved_total || 0))
  canVeto.value = maxTotal > 0 && member.approved_total === maxTotal

  // 分类贡献记录
  const pendingList = []
  const doneList = []

  for (const c of contributions) {
    const votes = c.votes || {}
    let approveCount = 0
    let rejectCount = 0

    Object.values(votes).forEach(v => {
      if (v.decision === 'approve') approveCount++
      else rejectCount++
    })

    const item = {
      ...c,
      approve_count: approveCount,
      reject_count: rejectCount,
      need,
      member_count: memberCount,
      mine: c.member_id === member.id,
      my_vote: votes[member.id]?.decision || ''
    }

    if (c.status === 'pending') {
      pendingList.push(item)
    } else {
      doneList.push(item)
    }
  }

  pending.value = pendingList
  done.value = doneList
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

function getStatusText(status) {
  const map = {
    approved: '已入账',
    rejected: '未通过',
    vetoed: '已否决',
    withdrawn: '已撤回'
  }
  return map[status] || status
}

async function handleVote(contributionId, decision) {
  const { data: member } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: contribution } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('id', contributionId)
    .single()

  const votes = contribution.votes || {}
  votes[member.id] = {
    name: member.name,
    decision,
    at: new Date().toISOString()
  }

  await supabase
    .from(TABLES.CONTRIBUTIONS)
    .update({ votes })
    .eq('id', contributionId)

  // 检查是否已决议
  await checkResolution(contributionId, contribution)

  await loadData()
}

async function handleVeto(contributionId) {
  if (!confirm('否决后该草案立即作废，确定吗？')) return

  const reason = prompt('否决理由（选填）') || ''

  const { data: member } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  await supabase
    .from(TABLES.CONTRIBUTIONS)
    .update({
      status: 'vetoed',
      resolved_at: new Date().toISOString(),
      veto_by: member.name,
      veto_reason: reason
    })
    .eq('id', contributionId)

  await loadData()
}

async function handleWithdraw(contributionId) {
  if (!confirm('确定撤回这项草案吗？')) return

  await supabase
    .from(TABLES.CONTRIBUTIONS)
    .update({
      status: 'withdrawn',
      resolved_at: new Date().toISOString()
    })
    .eq('id', contributionId)

  await loadData()
}

async function checkResolution(contributionId, contribution) {
  const { data: allMembers } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('family_id', contribution.family_id)

  const memberCount = allMembers.length
  const need = Math.floor(memberCount / 2) + 1

  const votes = Object.values(contribution.votes || {})
  const approve = votes.filter(v => v.decision === 'approve').length
  const reject = votes.filter(v => v.decision === 'reject').length

  if (approve >= need) {
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

    const { getLevel } = await import('../utils/levels.js')
    const { current: newLevel } = getLevel(newTotal)

    await supabase
      .from(TABLES.MEMBERS)
      .update({
        approved_total: newTotal,
        level: newLevel.name
      })
      .eq('id', contribution.member_id)
  } else if (reject >= need || approve + reject >= memberCount) {
    // 未通过
    await supabase
      .from(TABLES.CONTRIBUTIONS)
      .update({
        status: 'rejected',
        resolved_at: new Date().toISOString()
      })
      .eq('id', contributionId)
  }
}
</script>

<style scoped>
.vote-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  background: #fff;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #78909c;
}

.tab-item.active {
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

.proposal {
  border-left: 4px solid #ffb300;
}

.proposal.done {
  border-left-color: #e0e0e0;
}

.p-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.p-name {
  font-weight: 700;
  font-size: 16px;
}

.p-cat {
  font-size: 11px;
  color: #78909c;
  background: #f1f2f6;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 400;
}

.p-time {
  font-size: 12px;
  color: #999;
}

.p-amount {
  font-size: 32px;
  font-weight: 800;
  color: #c62828;
  margin: 8px 0;
}

.p-amount.small {
  font-size: 24px;
}

.p-unit {
  font-size: 12px;
  color: #999;
  margin-left: 4px;
  font-weight: 400;
}

.p-note {
  font-size: 14px;
  color: #555;
  margin-top: 4px;
  line-height: 1.5;
}

.p-note.veto-reason {
  color: #c62828;
}

.p-vote-line {
  margin-top: 12px;
  font-size: 12px;
  display: flex;
  gap: 12px;
}

.v-ok {
  color: #2e7d32;
}

.v-no {
  color: #c62828;
}

.v-need {
  color: #999;
}

.p-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 8px;
}

.mine-tag {
  flex: 1;
  font-size: 12px;
  color: #78909c;
}

.btn-mini {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 8px;
}

.btn-danger {
  background: #ffebee;
  color: #c62828;
}

.btn-veto {
  background: #fff3e0;
  color: #e65100;
  font-weight: 700;
}

.status {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
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
