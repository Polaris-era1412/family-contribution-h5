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

      <!-- 类别（分组显示） -->
      <div class="form-group">
        <label>类别</label>
        <div class="cat-group" v-for="group in categoryGroups" :key="group.name">
          <div class="cat-group-name">{{ group.name }}</div>
          <div class="categories">
            <div
              v-for="cat in group.items"
              :key="cat"
              :class="['category-item', { active: category === cat }]"
              @click="category = cat"
            >
              {{ cat }}
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>事由说明</label>
        <textarea
          v-model="note"
          class="textarea"
          placeholder="如：本周买菜、交水电费、辅导作业一小时…"
          maxlength="120"
          rows="3"
        ></textarea>
      </div>

      <!-- 图片上传（必选） -->
      <div class="form-group">
        <label>凭证图片（必选）</label>
        <div class="upload-area" @click="$refs.fileInput.click()">
          <template v-if="imagePreview">
            <img :src="imagePreview" class="upload-preview" />
            <div class="upload-remove" @click.stop="removeImage">✕</div>
          </template>
          <template v-else>
            <div class="upload-placeholder">
              <span class="upload-icon"></span>
              <span class="upload-text">点击上传图片</span>
              <span class="upload-hint">支持拍照或从相册选择</span>
            </div>
          </template>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display:none"
          @change="handleImageSelect"
        />
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
      {{ loading ? (uploading ? '上传图片中...' : '提交中...') : '提交草案' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, TABLES, currentUser, clearSession } from '../utils/supabase.js'

defineOptions({ name: 'Submit' })

const router = useRouter()
const amount = ref('')
const category = ref('买菜购物')
const note = ref('')
const loading = ref(false)
const uploading = ref(false)
const imageFile = ref(null)
const imagePreview = ref('')

const quickAmounts = [10, 50, 100, 520]

// 分类组
const categoryGroups = [
  {
    name: '家务劳动',
    items: ['做饭', '洗碗打扫', '洗衣整理', '带娃陪读', '辅导作业', '照顾老人', '遛狗喂猫', '修理家电']
  },
  {
    name: '家庭开支',
    items: ['买菜购物', '水电燃气', '房租房贷', '物业网费', '交通出行', '医疗健康']
  },
  {
    name: '收入贡献',
    items: ['工资上交', '奖金红包', '理财收益', '兼职外快']
  },
  {
    name: '情感社交',
    items: ['人情往来', '请客聚餐', '外出旅游', '节日礼物']
  },
  {
    name: '教育成长',
    items: ['学费培训', '买书资料', '兴趣班']
  },
  {
    name: '其他',
    items: ['其他']
  }
]

// 处理图片选择
function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  // 验证文件大小（限制 5MB）
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB')
    return
  }

  imageFile.value = file

  // 创建预览
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 移除图片
function removeImage() {
  imageFile.value = null
  imagePreview.value = ''
}

// 上传图片到 Supabase Storage
async function uploadImage(file, memberId) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${memberId}_${Date.now()}.${fileExt}`
  const filePath = `contributions/${fileName}`

  const { data, error } = await supabase.storage
    .from('contribution-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  // 获取公开访问 URL
  const { data: { publicUrl } } = supabase.storage
    .from('contribution-images')
    .getPublicUrl(filePath)

  return publicUrl
}

async function handleSubmit() {
  const num = parseFloat(amount.value)
  if (!num || num <= 0) {
    alert('请输入大于 0 的金额')
    return
  }

  if (!imageFile.value) {
    alert('请上传凭证图片')
    return
  }

  const user = currentUser.get()
  if (!user) {
    router.push('/join')
    return
  }

  loading.value = true
  uploading.value = true

  try {
    // 获取成员信息
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

    // 上传图片
    const imageUrl = await uploadImage(imageFile.value, member.id)

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
        image_url: imageUrl,
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
    removeImage()

    router.push('/vote')
  } catch (error) {
    alert(error.message || '提交失败')
  } finally {
    loading.value = false
    uploading.value = false
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

  const newTotal = Number(member.approved_total || 0) + Number(contribution.amount)

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

/* 分类组 */
.cat-group {
  margin-bottom: 12px;
}

.cat-group-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  padding-left: 4px;
}

/* 图片上传 */
.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: #c62828;
  background: #fff8f8;
}

.upload-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: contain;
}

.upload-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.upload-icon::before {
  content: '';
  font-size: 48px;
}

.upload-text {
  font-size: 16px;
  color: #666;
  font-weight: 600;
}

.upload-hint {
  font-size: 12px;
  color: #999;
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
