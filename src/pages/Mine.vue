<template>
  <div class="mine-page">
    <div v-if="!loaded" class="loading">加载中...</div>

    <template v-if="loaded && member">
      <!-- 我的职务卡 -->
      <div :class="['hero-card', `tier${heroTier}`]">
        <div v-if="heroTier >= 4" class="hero-crown">
          {{ heroTier === 5 ? '👑' : '🏅' }}
        </div>
        <div class="hero-top">
          <div class="hero-avatar" :style="{ background: heroColor }">
            {{ member.name.charAt(0) }}
          </div>
          <div class="hero-info">
            <div class="hero-name">{{ member.name }}</div>
            <div v-if="isVeto" class="hero-veto">🔱 享有一票否决权</div>
          </div>
          <div class="hero-score">
            <div class="hero-num">{{ member.approved_total }}</div>
            <div class="hero-label">已确认贡献度</div>
          </div>
        </div>
        <div class="hero-level" :style="{ color: heroColor }">
          {{ member.custom_title || member.level }}
        </div>
        <div v-if="levelIsCustom" class="hero-sub">⭐ 职务由管理员指定</div>
        <template v-else-if="nextLevel">
          <div class="hero-progress">
            <div
              class="hero-fill"
              :style="{ width: pct + '%', background: heroColor }"
            ></div>
          </div>
          <div class="hero-tip">
            距离「{{ nextLevel.name }}」还差 {{ remaining }} 贡献度，达标自动晋升
          </div>
        </template>
        <div v-else class="hero-tip">🏆 已达最高职务</div>
      </div>

      <!-- 我的贡献列表 -->
      <div class="card">
        <div class="card-title">📜 我的贡献</div>
        <div class="seg">
          <div
            :class="['seg-item', { active: tab === 'pending' }]"
            @click="tab = 'pending'"
          >
            待审批（{{ pending.length }}）
          </div>
          <div
            :class="['seg-item', { active: tab === 'approved' }]"
            @click="tab = 'approved'"
          >
            已审批
          </div>
        </div>

        <template v-if="tab === 'pending'">
          <div v-if="!pending.length" class="empty-mini">没有待审批的草案</div>
          <div
            v-for="item in pending"
            :key="item.id"
            class="c-item"
          >
            <div class="c-left">
              <div class="c-line1">
                <span class="c-amount">+{{ item.amount }}</span>
                <span class="c-cat">{{ item.category }}</span>
              </div>
              <div v-if="item.note" class="c-note">{{ item.note }}</div>
              <div class="c-time">{{ formatTime(item.created_at) }}</div>
            </div>
            <div class="status pending">待表决</div>
          </div>
        </template>

        <template v-else>
          <div class="approved-sum">已通过审批的贡献合计 {{ approvedTotal }} 分</div>
          <div v-if="!approved.length" class="empty-mini">还没有已审批通过的贡献</div>
          <div
            v-for="item in approved"
            :key="item.id"
            class="c-item"
          >
            <div class="c-left">
              <div class="c-line1">
                <span class="c-amount">+{{ item.amount }}</span>
                <span class="c-cat">{{ item.category }}</span>
              </div>
              <div v-if="item.note" class="c-note">{{ item.note }}</div>
              <div class="c-time">{{ formatTime(item.created_at) }}</div>
            </div>
            <div class="status approved">已入账</div>
          </div>
        </template>
      </div>

      <!-- 家庭信息 -->
      <div class="card">
        <div class="card-title">🏠 {{ family.name }}</div>
        <div class="invite-row">
          <span class="invite-code">邀请码 {{ family.invite_code }}</span>
          <button class="btn btn-primary btn-mini" @click="copyInvite">复制</button>
        </div>
        <div class="hint">家人打开本小程序，在加入页输入邀请码即可成为家庭委员</div>
        <button class="btn btn-secondary btn-block" style="margin-top: 16px" @click="$router.push('/history')">
          📜 历史提案记录
        </button>
        <button
          v-if="member.is_admin"
          class="btn btn-primary btn-block"
          style="margin-top: 12px"
          @click="$router.push('/admin')"
        >
          ️ 管理后台
        </button>
        <button
          class="btn btn-danger btn-block"
          style="margin-top: 12px"
          @click="logout"
        >
          退出登录
        </button>
      </div>

      <!-- 家庭规则 -->
      <div class="card">
        <div class="card-title">一、贡献度</div>
        <div class="rule-line">· 1 元人民币 = 1 贡献度。</div>
        <div class="rule-line">· 成员申报贡献度后，该记录为「草案（待表决）」状态，尚不计入总贡献度。</div>
        <div class="rule-line">· 只有表决通过的草案才会计入个人累计贡献度。</div>
      </div>

      <div class="card">
        <div class="card-title">二、委员表决</div>
        <div class="rule-line">· 全体家庭成员均为家庭委员，每人一票。</div>
        <div class="rule-line">· 草案需获得「过半数」赞成票方可入账（3 人需 2 票，4 人需 3 票，以此类推）。</div>
        <div class="rule-line">· 提交者对自己的草案默认投赞成票，无需重复操作。</div>
        <div class="rule-line">· 反对票过半，或全员已投票但赞成未过半，草案即不通过。</div>
        <div class="rule-line">· 表决截止前可修改自己的投票。</div>
      </div>

      <div class="card">
        <div class="card-title">三、一票否决权</div>
        <div class="rule-line">· 累计已确认贡献度最高的成员享有一票否决权，可否决任何待表决草案，草案立即作废。</div>
        <div class="rule-line">· 贡献度需 ≥ 1 才激活否决权；并列最高者共同享有。</div>
        <div class="rule-line">· 自己的草案不能否决，但可以撤回。</div>
      </div>

      <div class="card">
        <div class="card-title">四、职务等级（自动晋升）</div>
        <div class="rule-line">累计已确认贡献度达到标准即自动晋升，无需任何审批。</div>
        <div class="level-table">
          <div class="lv-head">
            <span class="c1">职务</span>
            <span class="c2">所需贡献度</span>
            <span class="c3">对应级别</span>
          </div>
          <div
            v-for="(level, index) in levels"
            :key="level.name"
            class="lv-row"
          >
            <span class="c1" :style="{ color: level.color, fontWeight: 700 }">{{ level.name }}</span>
            <span class="c2">{{ level.min }}{{ index === 0 ? '（初始）' : ' 以上' }}</span>
            <span class="c3">{{ level.desc }}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">五、职务顺序说明</div>
        <div class="rule-line">依据我国公务员领导职务层次（两端加入家庭虚构荣誉职务），职务由低到高共 15 级：</div>
        <div class="rule-line center">
          见习委员 → 办事员 → 科员 → 副科长 → 科长 → 副处长 → 处长 → 副司长 → 司长 → 副部长 → 部长 → 国务委员 → 委员长 → 家庭名誉主席 → 家庭终身成就委员长
        </div>
        <div class="rule-line">· 科级：副科长、科长（乡科级副职／正职）</div>
        <div class="rule-line">· 处级：副处长、处长（县处级副职／正职）</div>
        <div class="rule-line">· 司局级：副司长、司长（厅局级副职／正职）</div>
        <div class="rule-line">· 部级：副部长、部长（省部级副职／正职）</div>
        <div class="rule-line">· 国务委员：国家级副职（副国级）</div>
        <div class="rule-line">· 委员长：国家级正职（正国级，全国人大常委会委员长）</div>
        <div class="rule-line">· 家庭名誉主席、家庭终身成就委员长：家庭虚构最高荣誉 🏆</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, savedFamily } from '../utils/supabase.js'
import { LEVELS, getLevel, getLevelColor, getLevelTier } from '../utils/levels.js'

defineOptions({ name: 'Mine' })

const router = useRouter()
const loaded = ref(false)
const member = ref(null)
const family = ref(null)
const tab = ref('pending')
const pending = ref([])
const approved = ref([])
const approvedTotal = ref(0)
const levels = LEVELS

const heroTier = ref(1)
const heroColor = ref('#78909c')
const levelIsCustom = ref(false)
const isVeto = ref(false)
const nextLevel = ref(null)
const pct = ref(0)
const remaining = ref(0)

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
  const { data: memberData } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  if (!memberData) {
    router.push('/join')
    return
  }

  member.value = memberData
  heroTier.value = getLevelTier(memberData.approved_total)
  heroColor.value = getLevelColor(memberData.approved_total)
  levelIsCustom.value = !!memberData.custom_title

  const levelInfo = getLevel(memberData.approved_total)
  nextLevel.value = levelInfo.next

  if (levelInfo.next) {
    const progress = (memberData.approved_total - levelInfo.current.min) /
                     (levelInfo.next.min - levelInfo.current.min)
    pct.value = Math.min(100, Math.round(progress * 100))
    remaining.value = levelInfo.next.min - memberData.approved_total
  }

  // 获取家庭信息
  const { data: familyData } = await supabase
    .from(TABLES.FAMILIES)
    .select('*')
    .eq('id', memberData.family_id)
    .single()

  family.value = familyData

  // 获取所有成员计算否决权
  const { data: allMembers } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('family_id', memberData.family_id)

  const maxTotal = Math.max(...allMembers.map(m => m.approved_total || 0))
  isVeto.value = maxTotal > 0 && memberData.approved_total === maxTotal

  // 获取我的贡献记录
  const { data: contributions } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*')
    .eq('member_id', memberData.id)
    .order('created_at', { ascending: false })

  const pendingList = []
  const approvedList = []
  let total = 0

  for (const c of contributions) {
    if (c.status === 'pending') {
      pendingList.push(c)
    } else if (c.status === 'approved') {
      approvedList.push(c)
      total += c.amount
    }
  }

  pending.value = pendingList
  approved.value = approvedList
  approvedTotal.value = total

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

function copyInvite() {
  navigator.clipboard.writeText(family.value.invite_code)
    .then(() => alert('邀请码已复制'))
    .catch(() => alert('复制失败，请手动复制'))
}

function logout() {
  if (confirm('确定要退出登录吗？退出后需要用昵称和邀请码重新登录。')) {
    currentUser.clear()
    savedFamily.clear()
    router.push('/login')
  }
}
</script>

<style scoped>
.mine-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 100px 0;
  color: #999;
}

/* 职务英雄卡 */
.hero-card {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 24px 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(31, 35, 41, 0.08);
  overflow: hidden;
}

.hero-card.tier2 {
  border: 2px solid #90caf9;
}

.hero-card.tier3 {
  border: 2px solid #ab47bc;
  box-shadow: 0 0 24px rgba(171, 71, 188, 0.35);
}

.hero-card.tier4 {
  border: 3px solid #e5b93c;
  box-shadow: 0 0 32px rgba(229, 57, 53, 0.45);
}

.hero-card.tier5 {
  border: 3px solid #ffd700;
  background: linear-gradient(160deg, #fffdf5, #fff3c4 55%, #ffe082);
  animation: tier5-glow 2.2s ease-in-out infinite;
}

@keyframes tier5-glow {
  0%, 100% {
    box-shadow: 0 0 12px #ffd700;
  }
  50% {
    box-shadow: 0 0 30px #ffab00, 0 0 50px rgba(255, 215, 0, 0.6);
  }
}

.hero-crown {
  position: absolute;
  top: 12px;
  right: 16px;
  font-size: 28px;
}

.hero-top {
  display: flex;
  align-items: center;
}

.hero-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-info {
  flex: 1;
  margin-left: 16px;
  min-width: 0;
}

.hero-name {
  font-size: 20px;
  font-weight: 700;
}

.hero-veto {
  font-size: 11px;
  color: #e65100;
  background: #fff3e0;
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  margin-top: 6px;
}

.hero-score {
  text-align: right;
}

.hero-num {
  font-size: 32px;
  font-weight: 800;
  color: #c62828;
}

.hero-label {
  font-size: 12px;
  color: #999;
}

.hero-level {
  font-size: 48px;
  font-weight: 900;
  text-align: center;
  margin-top: 20px;
  letter-spacing: 4px;
}

.hero-card.tier3 .hero-level {
  text-shadow: 0 0 12px rgba(171, 71, 188, 0.5);
}

.hero-card.tier4 .hero-level {
  text-shadow: 0 0 16px rgba(229, 57, 53, 0.7);
}

.hero-card.tier5 .hero-level {
  animation: hero-glow 1.8s ease-in-out infinite;
}

@keyframes hero-glow {
  0%, 100% {
    text-shadow: 0 0 10px rgba(255, 171, 0, 0.6);
  }
  50% {
    text-shadow: 0 0 26px rgba(255, 140, 0, 0.95), 0 0 40px rgba(255, 215, 0, 0.7);
  }
}

.hero-sub {
  text-align: center;
  font-size: 12px;
  color: #78909c;
  margin-top: 4px;
}

.hero-progress {
  height: 10px;
  background: rgba(31, 35, 41, 0.08);
  border-radius: 5px;
  margin-top: 16px;
  overflow: hidden;
}

.hero-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.3s;
}

.hero-tip {
  font-size: 12px;
  color: #78909c;
  margin-top: 8px;
  text-align: center;
}

/* 分段切换 */
.seg {
  display: flex;
  background: #f5f6fa;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 16px;
}

.seg-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #78909c;
  font-size: 14px;
}

.seg-item.active {
  background: #c62828;
  color: #fff;
  font-weight: 700;
}

.empty-mini {
  text-align: center;
  color: #999;
  padding: 24px 0;
  font-size: 14px;
}

.c-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f6fa;
}

.c-item:last-of-type {
  border-bottom: none;
}

.c-left {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.c-line1 {
  display: flex;
  align-items: center;
}

.c-amount {
  font-size: 20px;
  font-weight: 800;
  color: #c62828;
  margin-right: 8px;
}

.c-cat {
  font-size: 11px;
  color: #78909c;
  background: #f1f2f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.c-note {
  font-size: 13px;
  color: #555;
  margin-top: 4px;
  line-height: 1.4;
}

.c-time {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.approved-sum {
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
}

/* 家庭信息 */
.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.invite-code {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.btn-mini {
  padding: 6px 16px;
  font-size: 13px;
}

.btn-block {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 600;
}

/* 规则部分 */
.rule-line {
  line-height: 1.9;
  font-size: 14px;
  color: #444;
  margin-bottom: 4px;
}

.rule-line.center {
  text-align: center;
  font-weight: 700;
  color: #c62828;
  margin: 8px 0;
  font-size: 14px;
}

.level-table {
  margin-top: 12px;
  border: 1px solid #f1f2f6;
  border-radius: 8px;
  overflow: hidden;
}

.lv-head,
.lv-row {
  display: flex;
  padding: 10px 12px;
  align-items: center;
}

.lv-head {
  background: #f7f8fa;
  font-size: 12px;
  color: #78909c;
}

.lv-row {
  border-top: 1px solid #f5f6fa;
  font-size: 13px;
}

.c1 {
  width: 26%;
  flex-shrink: 0;
}

.c2 {
  width: 36%;
  flex-shrink: 0;
}

.c3 {
  flex: 1;
  color: #78909c;
  font-size: 12px;
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

.status.pending {
  background: #fff8e1;
  color: #e65100;
}
</style>
