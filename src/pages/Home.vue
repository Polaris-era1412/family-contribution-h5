<template>
  <div class="home-page">
    <div v-if="!loaded" class="loading">加载中...</div>

    <template v-if="loaded && me">
      <!-- 我的贡献卡片 -->
      <div class="card me-card">
        <div class="me-top">
          <div class="avatar">{{ me.name.charAt(0) }}</div>
          <div class="me-mid">
            <div class="me-name">{{ me.name }}</div>
            <div
              :class="['level-badge', `tier${myTier}`]"
              :style="{ background: levelColor }"
            >
              {{ myTier >= 4 ? (myTier === 5 ? '👑 ' : '🏅 ') : '' }}{{ me.level }}
            </div>
          </div>
          <div class="me-score">
            <div class="score-num">{{ me.approved_total }}</div>
            <div class="score-label">已确认贡献度</div>
          </div>
        </div>

        <template v-if="levelIsCustom">
          <div class="progress-tip">⭐ 当前职务由管理员指定</div>
        </template>
        <template v-else-if="nextLevel">
          <div class="progress">
            <div
              class="progress-fill"
              :style="{ width: pct + '%', background: levelColor }"
            ></div>
          </div>
          <div class="progress-tip">
            距离「{{ nextLevel.name }}」还差 {{ remaining }} 贡献度，达标自动晋升
          </div>
        </template>
        <div v-else class="progress-tip">🏆 已达最高职务</div>
      </div>

      <!-- 待表决提醒 -->
      <div
        v-if="pendingCount > 0"
        class="card banner"
        @click="$router.push('/vote')"
      >
        <span>📋 有 {{ pendingCount }} 项提案待表决</span>
        <span class="banner-go">去表决 ›</span>
      </div>

      <!-- 家庭排行榜 -->
      <div class="card">
        <div class="card-title">🏅 家庭排行榜</div>
        <div
          v-for="(member, index) in members"
          :key="member.id"
          class="rank-row"
        >
          <div class="rank-no">{{ index < 3 ? medals[index] : index + 1 }}</div>
          <div class="rank-name">
            <span v-if="member.tier >= 4" class="rank-crown">
              {{ member.tier === 5 ? '👑' : '🏅' }}
            </span>
            {{ member.name }}
            <span v-if="vetoMap[member.id]" class="veto-tag">🔱一票否决</span>
          </div>
          <div
            :class="['rank-level', `tier${member.tier}`]"
            :style="{ background: member.levelColor }"
          >
            {{ member.level }}
          </div>
          <div class="rank-score">{{ member.approved_total }}</div>
        </div>
        <div class="rank-tip">
          累计贡献度最高者（≥1，并列有效）享有一票否决权；职务越高徽章特效越炫
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser } from '../utils/supabase.js'
import { getLevel, getLevelColor, getLevelTier } from '../utils/levels.js'

defineOptions({ name: 'Home' })

const router = useRouter()
const loaded = ref(false)
const me = ref(null)
const members = ref([])
const pendingCount = ref(0)
const vetoMap = ref({})
const medals = ['🥇', '🥈', '🥉']

const avatarChar = ref('')
const meTotalText = ref('0')
const levelColor = ref('#78909c')
const myTier = ref(1)
const levelIsCustom = ref(false)
const nextLevel = ref(null)
const pct = ref(0)
const remaining = ref(0)

onMounted(async () => {
  const user = currentUser.get()
  if (!user) {
    router.push('/join')
    return
  }
  await loadData()
})

async function loadData() {
  const user = currentUser.get()

  // 获取当前成员信息
  const { data: memberData } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('id', user.id)
    .single()

  if (!memberData) {
    router.push('/join')
    return
  }

  me.value = memberData
  avatarChar.value = memberData.name.charAt(0)
  meTotalText.value = memberData.approved_total
  levelColor.value = getLevelColor(memberData.approved_total)
  myTier.value = getLevelTier(memberData.approved_total)
  levelIsCustom.value = !!memberData.custom_title

  const levelInfo = getLevel(memberData.approved_total)
  nextLevel.value = levelInfo.next

  if (levelInfo.next) {
    const progress = (memberData.approved_total - levelInfo.current.min) /
                     (levelInfo.next.min - levelInfo.current.min)
    pct.value = Math.min(100, Math.round(progress * 100))
    remaining.value = levelInfo.next.min - memberData.approved_total
  }

  // 获取所有成员
  const { data: allMembers } = await supabase
    .from(TABLES.MEMBERS)
    .select('*')
    .eq('family_id', memberData.family_id)
    .order('approved_total', { ascending: false })

  members.value = allMembers.map(m => ({
    ...m,
    levelColor: getLevelColor(m.approved_total),
    tier: getLevelTier(m.approved_total)
  }))

  // 计算一票否决权
  const maxTotal = Math.max(...allMembers.map(m => m.approved_total))
  const vetoIds = maxTotal > 0
    ? allMembers.filter(m => m.approved_total === maxTotal).map(m => m.id)
    : []
  vetoMap.value = Object.fromEntries(vetoIds.map(id => [id, true]))

  // 获取待表决数量
  const { count } = await supabase
    .from(TABLES.CONTRIBUTIONS)
    .select('*', { count: 'exact', head: true })
    .eq('family_id', memberData.family_id)
    .eq('status', 'pending')

  pendingCount.value = count || 0
  loaded.value = true
}
</script>

<style scoped>
.home-page {
  padding: 16px;
  max-width: 500px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: 100px 0;
  color: #999;
}

.me-card {
  background: linear-gradient(160deg, #fff7f0, #ffffff 60%);
}

.me-top {
  display: flex;
  align-items: center;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffb74d, #e53935);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.me-mid {
  flex: 1;
  margin-left: 16px;
  min-width: 0;
}

.me-name {
  font-size: 20px;
  font-weight: 700;
}

.level-badge {
  display: inline-block;
  margin-top: 6px;
  color: #fff;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
}

.level-badge.tier4 {
  box-shadow: 0 0 10px rgba(229, 57, 53, 0.6);
}

.level-badge.tier5 {
  animation: tier5-glow 2s ease-in-out infinite;
}

@keyframes tier5-glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 140, 0, 0.9);
  }
}

.me-score {
  text-align: right;
}

.score-num {
  font-size: 32px;
  font-weight: 800;
  color: #c62828;
}

.score-label {
  font-size: 12px;
  color: #999;
}

.progress {
  height: 8px;
  background: #f1f2f6;
  border-radius: 4px;
  margin-top: 16px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.progress-tip {
  font-size: 12px;
  color: #78909c;
  margin-top: 8px;
}

.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff8e1;
  border: 1px solid #ffe082;
  cursor: pointer;
}

.banner-go {
  color: #e65100;
  font-weight: 700;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f5f6fa;
}

.rank-row:last-of-type {
  border-bottom: none;
}

.rank-no {
  width: 40px;
  font-size: 20px;
  flex-shrink: 0;
}

.rank-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-crown {
  margin-right: 4px;
}

.veto-tag {
  font-size: 11px;
  color: #e65100;
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 6px;
  font-weight: 400;
}

.rank-level {
  font-size: 12px;
  color: #fff;
  margin-right: 12px;
  font-weight: 600;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 10px;
}

.rank-level.tier4 {
  box-shadow: 0 0 10px rgba(229, 57, 53, 0.6);
}

.rank-level.tier5 {
  animation: tier5-glow 2s ease-in-out infinite;
}

.rank-score {
  font-size: 16px;
  font-weight: 800;
  color: #c62828;
  min-width: 60px;
  text-align: right;
  flex-shrink: 0;
}

.rank-tip {
  font-size: 12px;
  color: #999;
  margin-top: 12px;
  line-height: 1.6;
}
</style>
