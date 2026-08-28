// 职务等级配置（与小程序版保持一致）
export const LEVELS = [
  { name: '见习委员', min: 0, tier: 1, color: '#b0bec5', desc: '家庭委员入门' },
  { name: '办事员', min: 30, tier: 1, color: '#90a4ae', desc: '基层办事人员' },
  { name: '科员', min: 80, tier: 1, color: '#78909c', desc: '综合管理类职级' },
  { name: '副科长', min: 150, tier: 2, color: '#42a5f5', desc: '乡科级副职' },
  { name: '科长', min: 250, tier: 2, color: '#1e88e5', desc: '乡科级正职' },
  { name: '副处长', min: 400, tier: 2, color: '#5c6bc0', desc: '县处级副职' },
  { name: '处长', min: 600, tier: 2, color: '#3949ab', desc: '县处级正职' },
  { name: '副司长', min: 900, tier: 3, color: '#8e24aa', desc: '厅局级副职' },
  { name: '司长', min: 1300, tier: 3, color: '#6a1b9a', desc: '厅局级正职' },
  { name: '副部长', min: 1800, tier: 3, color: '#fb8c00', desc: '省部级副职' },
  { name: '部长', min: 2500, tier: 3, color: '#ef6c00', desc: '省部级正职' },
  { name: '国务委员', min: 3500, tier: 4, color: '#e53935', desc: '国家级副职（副国级）' },
  { name: '委员长', min: 5000, tier: 4, color: '#c62828', desc: '国家级正职（正国级）' },
  { name: '家庭名誉主席', min: 7500, tier: 5, color: '#d4af37', desc: '家庭最高荣誉' },
  { name: '家庭终身成就委员长', min: 10000, tier: 5, color: '#b8860b', desc: '家庭至高荣誉' }
]

// 根据贡献度获取等级
export function getLevel(total) {
  let current = LEVELS[0]
  let next = LEVELS[1]

  for (let i = 0; i < LEVELS.length; i++) {
    if (total >= LEVELS[i].min) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || null
    }
  }

  return { current, next }
}

// 获取等级颜色
export function getLevelColor(total) {
  const { current } = getLevel(total)
  return current.color
}

// 获取等级特效档位
export function getLevelTier(total) {
  const { current } = getLevel(total)
  return current.tier
}
