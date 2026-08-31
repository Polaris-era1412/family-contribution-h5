<template>
  <div class="ai-summary-page">
    <div class="card">
      <div class="card-title"> AI 总结报告</div>

      <div class="form-group">
        <label>报告类型</label>
        <div class="type-tabs">
          <div
            :class="['type-tab', { active: reportType === 'monthly' }]"
            @click="reportType = 'monthly'"
          >月度</div>
          <div
            :class="['type-tab', { active: reportType === 'quarterly' }]"
            @click="reportType = 'quarterly'"
          >季度</div>
          <div
            :class="['type-tab', { active: reportType === 'yearly' }]"
            @click="reportType = 'yearly'"
          >年度</div>
        </div>
      </div>

      <div class="form-group">
        <label>选择时期</label>
        <select v-model="selectedPeriod" class="input">
          <option v-for="p in availablePeriods" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>
      </div>

      <button
        class="btn btn-primary btn-block"
        :disabled="loading"
        @click="generateReport"
      >
        {{ loading ? 'AI 正在分析中...' : '生成报告' }}
      </button>

      <div v-if="loading" class="loading-hint">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
        <div>AI 正在分析数据，通常需要 5-10 秒</div>
      </div>
    </div>

    <!-- 报告内容 -->
    <div v-if="reportContent" class="card report-card">
      <div class="report-content" v-html="formatReport(reportContent)"></div>
      <div class="report-actions">
        <button class="btn btn-secondary btn-block" @click="copyReport">
          复制报告
        </button>
      </div>
    </div>

    <div v-if="error" class="card error-card">
      <div class="error-text">{{ error }}</div>
      <button class="btn btn-secondary btn-block" @click="error = ''">关闭</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, clearSession } from '../utils/supabase.js'
import { generateMonthlySummary, generateQuarterlySummary, generateYearlySummary } from '../utils/ai.js'

defineOptions({ name: 'AISummary' })

const router = useRouter()
const reportType = ref('monthly')
const selectedPeriod = ref('')
const reportContent = ref('')
const loading = ref(false)
const error = ref('')
const allContributions = ref([])
const allMembers = ref([])

onMounted(async () => {
  const user = currentUser.get()
  if (!user) {
    router.push('/login')
    return
  }

  // 加载数据
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

  const [contribRes, membersRes] = await Promise.all([
    supabase.from(TABLES.CONTRIBUTIONS).select('*').eq('family_id', member.family_id).eq('status', 'approved').order('created_at', { ascending: false }),
    supabase.from(TABLES.MEMBERS).select('*').eq('family_id', member.family_id)
  ])

  allContributions.value = contribRes.data || []
  allMembers.value = membersRes.data || []
  updatePeriods()
})

const availablePeriods = computed(() => {
  if (reportType.value === 'monthly') {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ value: val, label: `${d.getFullYear()}年${d.getMonth() + 1}月` })
    }
    return months
  } else if (reportType.value === 'quarterly') {
    const quarters = []
    const now = new Date()
    for (let i = 0; i < 8; i++) {
      const year = now.getFullYear() - Math.floor(i / 4)
      const q = 4 - (i % 4)
      quarters.push({ value: `${year}-Q${q}`, label: `${year}年第${q}季度` })
    }
    return quarters
  } else {
    const years = []
    const now = new Date()
    for (let i = 0; i < 5; i++) {
      const y = now.getFullYear() - i
      years.push({ value: String(y), label: `${y}年` })
    }
    return years
  }
})

function updatePeriods() {
  if (availablePeriods.value.length > 0) {
    selectedPeriod.value = availablePeriods.value[0].value
  }
}

// 监听 reportType 变化，更新 selectedPeriod
import { watch } from 'vue'
watch(reportType, () => {
  updatePeriods()
})

function filterContributions() {
  const period = selectedPeriod.value
  return allContributions.value.filter(c => {
    const d = new Date(c.created_at)
    if (reportType.value === 'monthly') {
      const [year, month] = period.split('-')
      return d.getFullYear() === Number(year) && (d.getMonth() + 1) === Number(month)
    } else if (reportType.value === 'quarterly') {
      const [year, q] = period.split('-Q')
      const qMonth = (Number(q) - 1) * 3
      return d.getFullYear() === Number(year) && d.getMonth() >= qMonth && d.getMonth() < qMonth + 3
    } else {
      return d.getFullYear() === Number(period)
    }
  })
}

async function generateReport() {
  loading.value = true
  error.value = ''
  reportContent.value = ''

  try {
    const filtered = filterContributions()
    if (filtered.length === 0) {
      error.value = '该时期没有已通过的贡献记录'
      loading.value = false
      return
    }

    let report = ''
    if (reportType.value === 'monthly') {
      report = await generateMonthlySummary(filtered, allMembers.value, selectedPeriod.value)
    } else if (reportType.value === 'quarterly') {
      report = await generateQuarterlySummary(filtered, allMembers.value, selectedPeriod.value)
    } else {
      report = await generateYearlySummary(filtered, allMembers.value, selectedPeriod.value)
    }

    reportContent.value = report
  } catch (err) {
    error.value = err.message || '生成报告失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function formatReport(text) {
  return text
    .replace(/\n/g, '<br/>')
    .replace(/━+/g, '<hr style="border:none;border-top:1px solid #eee;margin:12px 0"/>')
}

function copyReport() {
  navigator.clipboard.writeText(reportContent.value)
    .then(() => alert('报告已复制到剪贴板'))
    .catch(() => alert('复制失败，请手动复制'))
}
</script>

<style scoped>
.ai-summary-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.type-tabs {
  display: flex;
  gap: 8px;
}

.type-tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  background: #f1f2f6;
  border-radius: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  transition: all 0.2s;
}

.type-tab.active {
  background: #c62828;
  color: #fff;
  font-weight: 700;
}

.btn-block {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
}

.loading-hint {
  text-align: center;
  margin-top: 16px;
  color: #999;
  font-size: 13px;
}

.loading-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c62828;
  animation: bounce 1.4s ease-in-out infinite;
}

.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.report-card {
  background: linear-gradient(160deg, #fffdf5, #ffffff);
  border: 2px solid #ffd700;
}

.report-content {
  font-size: 14px;
  line-height: 1.8;
  color: #333;
  white-space: pre-wrap;
}

.report-actions {
  margin-top: 16px;
}

.error-card {
  border: 2px solid #ffebee;
}

.error-text {
  color: #c62828;
  font-size: 14px;
  margin-bottom: 12px;
}
</style>
