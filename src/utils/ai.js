// DeepSeek AI 工具函数

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'

// 通用 AI 调用
async function callAI(prompt, maxTokens = 1000) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('AI 服务未配置，请联系管理员')
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || 'AI 服务调用失败，请稍后重试')
  }

  const data = await response.json()
  return data.choices[0].message.content.trim()
}

// 生成提交即时评语（20 字以内，带 emoji）
export async function generateSubmissionFeedback(amount, category, note) {
  const prompt = `你是家庭贡献度评估 AI。用户刚提交了一笔贡献：
- 金额：${amount} 元
- 类别：${category}
- 说明：${note || '无'}

请用一句话给出暖心、有趣的评语（20 字以内），带一个 emoji。
直接返回评语，不要其他内容。

示例：
- 买菜购物 50 元 → "🛒 今天的菜很新鲜吧！为家人健康买单！"
- 辅导作业 30 元 → "📚 耐心辅导，孩子进步看得见！"
- 房租房贷 3000 元 → "🏠 家里的顶梁柱，辛苦了！"
- 做家务 20 元 → "🧹 家里被你收拾得干干净净！"`

  return await callAI(prompt, 100)
}

// 辅助：获取某人的主要贡献类别
function getTopCategory(contributions) {
  const categoryCount = {}
  contributions.forEach(c => {
    categoryCount[c.category] = (categoryCount[c.category] || 0) + 1
  })
  return Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '其他'
}

// 辅助：获取某人在某类别的总金额
function getCategoryAmount(contributions, category) {
  return contributions
    .filter(c => c.category === category)
    .reduce((sum, c) => sum + Number(c.amount), 0)
}

// 生成月度总结
export async function generateMonthlySummary(contributions, members, month) {
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0)

  const memberStats = members.map(m => {
    const memberContribs = contributions.filter(c => c.member_id === m.id)
    const memberTotal = memberContribs.reduce((sum, c) => sum + Number(c.amount), 0)
    const topCategory = getTopCategory(memberContribs)
    const topAmount = getCategoryAmount(memberContribs, topCategory)
    return {
      name: m.name,
      total: memberTotal,
      count: memberContribs.length,
      topCategory,
      topAmount
    }
  }).sort((a, b) => b.total - a.total)

  // 消费洞察
  const categoryTotals = {}
  contributions.forEach(c => {
    categoryTotals[c.category] = (categoryTotals[c.category] || 0) + Number(c.amount)
  })
  const topSpending = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat} ${amt} 元`)
    .join('、')

  const prompt = `你是家庭贡献度分析 AI。请根据以下数据生成${month}月家庭贡献报告：

家庭总贡献：${total} 元

成员排名：
${memberStats.map((m, i) => `${i+1}. ${m.name}：${m.total} 元（申报${m.count}次，主要贡献：${m.topCategory} ${m.topAmount} 元）`).join('\n')}

消费洞察（前三大类）：${topSpending}

要求：
1. 给每人写一句个性化评语（突出贡献亮点，带 emoji）
2. 评选本月 MVP（贡献最高者）
3. 评选"最勤劳"（申报次数最多）
4. 评选"最贴心"（在情感社交/教育成长/家务劳动类贡献最多的人）
5. 写一段 AI 寄语（50 字以内，温暖鼓励）

严格按以下格式返回，不要加其他内容：

📊 ${month}月家庭贡献报告
━━━━━━━━━━━━━━━━━━━━
💰 本月家庭总贡献：${total} 元

${memberStats.map((m, i) => {
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
  return `${medal} ${m.name} — ${m.total} 元\n   主要贡献：${m.topCategory}\n   评语：（AI 生成评语）`
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
 本月 MVP：（名字）
 最勤劳：（名字）
❤️ 最贴心：（名字）

📊 消费洞察：${topSpending}

 AI 寄语：
（50 字以内的温暖寄语）`

  return await callAI(prompt, 1500)
}

// 生成季度总结
export async function generateQuarterlySummary(contributions, members, quarter) {
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0)

  const memberStats = members.map(m => {
    const memberContribs = contributions.filter(c => c.member_id === m.id)
    const memberTotal = memberContribs.reduce((sum, c) => sum + Number(c.amount), 0)
    const topCategory = getTopCategory(memberContribs)
    return { name: m.name, total: memberTotal, count: memberContribs.length, topCategory }
  }).sort((a, b) => b.total - a.total)

  const categoryTotals = {}
  contributions.forEach(c => {
    categoryTotals[c.category] = (categoryTotals[c.category] || 0) + Number(c.amount)
  })
  const topSpending = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat} ${amt} 元`)
    .join('、')

  const prompt = `你是家庭贡献度分析 AI。请根据以下数据生成${quarter}季度家庭贡献总结：

家庭总贡献：${total} 元

成员排名：
${memberStats.map((m, i) => `${i+1}. ${m.name}：${m.total} 元（申报${m.count}次，主要：${m.topCategory}）`).join('\n')}

消费洞察（前三大类）：${topSpending}

要求：
1. 回顾本季度整体表现
2. 给每人写一句评语（带 emoji）
3. 评选季度 MVP、最勤劳、最贴心
4. 消费洞察分析
5. AI 寄语（80 字以内）

严格按以下格式返回：

📊 ${quarter}季度家庭贡献总结
━━━━━━━━━━━━━━━━━━━━
 季度总贡献：${total} 元

${memberStats.map((m, i) => {
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
  return `${medal} ${m.name} — ${m.total} 元\n   评语：（AI 生成）`
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
🏆 季度 MVP：
🐝 最勤劳：
❤️ 最贴心：

📊 消费洞察：${topSpending}

📝 AI 寄语：
（80 字以内）`

  return await callAI(prompt, 1500)
}

// 生成全年总结
export async function generateYearlySummary(contributions, members, year) {
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0)

  const memberStats = members.map(m => {
    const memberContribs = contributions.filter(c => c.member_id === m.id)
    const memberTotal = memberContribs.reduce((sum, c) => sum + Number(c.amount), 0)
    const topCategory = getTopCategory(memberContribs)
    return { name: m.name, total: memberTotal, count: memberContribs.length, topCategory }
  }).sort((a, b) => b.total - a.total)

  const categoryTotals = {}
  contributions.forEach(c => {
    categoryTotals[c.category] = (categoryTotals[c.category] || 0) + Number(c.amount)
  })
  const topSpending = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => `${cat} ${amt} 元`)
    .join('、')

  const prompt = `你是家庭贡献度分析 AI。请根据以下数据生成${year}年度家庭贡献总结：

家庭总贡献：${total} 元

成员排名：
${memberStats.map((m, i) => `${i+1}. ${m.name}：${m.total} 元（申报${m.count}次，主要：${m.topCategory}）`).join('\n')}

消费洞察（前五大类）：${topSpending}

要求：
1. 回顾全年整体表现，给出年度评价
2. 给每人写一段评语（带 emoji，突出全年亮点）
3. 评选年度 MVP、最勤劳、最贴心、最大进步
4. 消费洞察分析
5. AI 寄语（100 字以内，温暖有力量）

严格按以下格式返回：

📊 ${year}年度家庭贡献总结
━━━━━━━━━━━━━━━━━━━━
💰 年度总贡献：${total} 元
📈 全年申报：${contributions.length} 笔

${memberStats.map((m, i) => {
  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : ''
  return `${medal} ${m.name} — ${m.total} 元\n   全年亮点：（AI 生成）`
}).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━
🏆 年度 MVP：
🐝 最勤劳：
❤️ 最贴心：
🚀 最大进步：

📊 消费洞察：${topSpending}

📝 AI 寄语：
（100 字以内）`

  return await callAI(prompt, 2000)
}
