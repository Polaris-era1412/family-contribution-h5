<template>
  <div class="submit-page">
    <div class="card">
      <div class="card-title">申报贡献度（1 元 = 1 贡献度）</div>

      <div class="amount-box">
        <div class="currency">¥</div>
        <input
          v-model="amount"
          type="number"
          class="amount-input"
          placeholder="0.00"
          step="0.01"
        />
      </div>

      <div class="quick-amounts">
        <button
          v-for="v in quickAmounts"
          :key="v"
          class="chip"
          @click="amount = v"
        >
          {{ v }}
        </button>
      </div>

      <div class="form-group">
        <label>类别</label>
        <div class="categories">
          <div
            v-for="cat in categories"
            :key="cat"
            :class="['category-item', { active: category === cat }]"
            @click="category = cat"
          >
            {{ cat }}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>事由说明</label>
        <textarea
          v-model="note"
          class="textarea"
          placeholder="如：本周买菜、交水电费、辅导作业一小时…"
          maxlength="60"
          rows="3"
        ></textarea>
      </div>
    </div>

    <div class="notice">
      <p>· 提交后为「草案」状态，需家庭委员投票、过半数赞成后方计入贡献度；</p>
      <p>· 提交者对自己的草案默认投赞成票；</p>
      <p>· 贡献度最高成员可对草案行使一票否决权。</p>
    </div>

    <button
      class="btn btn-primary btn-block"
      :disabled="loading"
      @click="handleSubmit"
    >
      {{ loading ? '提交中...' : '提交草案' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser } from '../utils/supabase.js'

const router = useRouter()
const amount = ref('')
const category = ref('家用')
const note = ref('')
const loading = ref(false)

const quickAmounts = [10, 50, 100, 520]
const categories = [
  '家用', '家务劳动', '餐饮买菜', '教育辅导', '医疗照护', '人情往来', '其他'
]

async function handleSubmit() {
  const num = parseFloat(amount.value)
  if (!num || num <= 0) {
    alert('请输入大于 0 的金额')
    return
  }

  const user = currentUser.get()
  if (!user) {
    router.push('/join')
    return
  }

  loading.value = true

  try {
    // 获取成员信息
    const { data: member } = await supabase
      .from(TABLES.MEMBERS)
      .select('*')
      .eq('id', user.id)
      .single()

    // 创建贡献记录
    const { data: contribution, error } = await supabase
      .from(TABLES.CONTRIBUTIONS)
      .insert({
        family_id: member.family_id,
        member_id: member.id,
        member_name: member.name,
        amount: num,
        note: note.value.trim(),
        category: category.value,
        status: 'pending',
        votes: { [member.id]: { name: member.name, decision: 'approve', auto: true } },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // 检查是否单人家庭（自动通过）
    const { count } = await supabase
      .from(TABLES.MEMBERS)
      .select('*', { count: 'exact', head: true })
      .eq('family_id', member.family_id)

    if (count === 1) {
      // 单人家庭，自动通过
      await resolveContribution(contribution.id, member.family_id)
      alert('家庭仅一人，提案自动通过并计入贡献度')
    } else {
      alert('已提交，待表决')
    }

    // 清空表单
    amount.value = ''
    note.value = ''

    router.push('/vote')
  } catch (error) {
    alert(error.message || '提交失败')
  } finally {
    loading.value = false
  }
}

async function resolveContribution(contributionId, familyId) {
  // 获取贡献记录
  const { data: contribution } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('id', contributionId)
    .single()

  if (!contribution || contribution.status !== 'pending') return

  // 更新状态为已批准
  await supabase
    .from(TABLES.CONTRIBUTIONS)
    .update({
      status: 'approved',
      resolved_at: new Date().toISOString()
    })
    .eq('id', contributionId)

  // 增加成员贡献度
  const { data: member } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', contribution.member_id)
    .single()

  const newTotal = (member.approved_total || 0) + contribution.amount

  // 计算新等级
  const { getLevel } = await import('../utils/levels.js')
  const { current: newLevel } = getLevel(newTotal)

  await supabase
    .from(TABLES.MEMBERS)
    .update({
      approved_total: newTotal,
      level: newLevel.name
    })
    .eq('id', contribution.member_id)
}
</script>

<style scoped>
.submit-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.amount-box {
  display: flex;
  align-items: baseline;
  padding: 20px 0 8px;
  border-bottom: 2px solid #f1f2f6;
}

.currency {
  font-size: 32px;
  font-weight: 700;
  color: #c62828;
  margin-right: 8px;
}

.amount-input {
  flex: 1;
  font-size: 48px;
  font-weight: 800;
  color: #1f2329;
  border: none;
  outline: none;
  background: transparent;
}

.quick-amounts {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12px;
  gap: 8px;
}

.chip {
  padding: 8px 20px;
  background: #f1f2f6;
  border-radius: 20px;
  font-size: 14px;
  color: #555;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:active {
  background: #e0e0e0;
}

.form-group {
  margin-top: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #78909c;
  margin-bottom: 8px;
}

.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-item {
  padding: 8px 16px;
  background: #f1f2f6;
  border-radius: 20px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item.active {
  background: #ffebee;
  color: #c62828;
  font-weight: 700;
}

.textarea {
  width: 100%;
  background: #f7f8fa;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
}

.notice {
  background: #fff8e1;
  border-radius: 12px;
  padding: 12px;
  font-size: 12px;
  color: #8d6e63;
  margin: 16px 0;
  line-height: 1.8;
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
</style>
