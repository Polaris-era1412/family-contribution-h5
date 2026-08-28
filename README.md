# 家庭贡献度 H5 网页版

一款家庭趣味记账/激励 H5 网页应用：**1 元 = 1 贡献度**。成员申报贡献度后生成「草案」，需家庭委员（全体成员）投票过半数通过方可入账；累计贡献度最高成员享有**一票否决权**；贡献度达标**自动晋升职务**（共 15 级：见习委员 → … → 委员长 → 家庭名誉主席 → 家庭终身成就委员长），无需审批。

基于 **Vue 3 + Supabase**，完全免费，无需服务器，三个人各自手机打开网页就能用。

## 一、功能一览

| 功能 | 说明 |
| --- | --- |
| 创建/加入家庭 | 创建者获得 6 位邀请码并自动成为**管理员**，家人凭码加入，全员即「家庭委员」 |
| 申报贡献度 | 填写金额（元）、类别（7 种）、事由，提交后状态为「草案（待表决）」 |
| 委员投票 | 每人一票，**过半数赞成**即入账；提交者对自己的草案默认赞成；可改票 |
| 一票否决 | 累计**已确认**贡献度最高（≥1，并列均可）的成员可否决任何草案，立即作废 |
| 撤回 | 提交者可撤回自己尚未办结的草案 |
| 自动晋升 | 已确认贡献度达标即自动升级职务，无需审批 |
| 排行榜 | 按已确认贡献度排序，标出否决权人 🔱，职务越高徽章特效越炫 |
| 「我」页 | 个人职务大卡（5 档特效）、我的待审批/已审批贡献列表、家庭邀请码、管理后台入口、完整规则说明 |
| 管理后台 | 仅管理员（"我"页进入）：直接改任何人的贡献度/职称、直接通过或驳回草案 |

## 二、职务等级制度（共 15 级）

主体顺序依据我国公务员领导职务层次（《公务员职务与职级并行规定》），并在两端加入家庭虚构职务，由低到高：

| 职务 | 所需累计贡献度 | 对应级别 |
| --- | --- | --- |
| 见习委员（虚构） | 0（初始） | 家庭委员入门 |
| 办事员 | 30 | 基层办事人员 |
| 科员 | 80 | 综合管理类职级 |
| 副科长 | 150 | 乡科级副职 |
| 科长 | 250 | 乡科级正职 |
| 副处长 | 400 | 县处级副职 |
| 处长 | 600 | 县处级正职 |
| 副司长 | 900 | 厅局级副职 |
| 司长 | 1300 | 厅局级正职 |
| 副部长 | 1800 | 省部级副职 |
| 部长 | 2500 | 省部级正职 |
| 国务委员 | 3500 | 国家级副职（副国级） |
| 委员长 | 5000 | 国家级正职（正国级） |
| 家庭名誉主席（虚构） | 7500 | 家庭最高荣誉 |
| 家庭终身成就委员长（虚构） | 10000 | 家庭至高荣誉 |

> 真实职务顺序：**副科长 < 科长 < 副处长 < 处长 < 副司长 < 司长 < 副部长 < 部长 < 国务委员 < 委员长**。相邻段位差距从 30 起步逐步拉大，早期升级很快、后期有追求。阈值可在 `src/utils/levels.js` 修改。

## 三、部署步骤（完全免费，约 10 分钟）

### 第 1 步：注册 Supabase（免费数据库）

1. 打开 [Supabase 官网](https://supabase.com/)，点「Start your project」
2. 用 GitHub 账号登录（没有就注册一个）
3. 点「New Project」创建项目：
   - Name：随意，如 `family-contribution`
   - Database Password：设置一个强密码（记下来）
   - Region：选离你最近的（如 Northeast Asia (Tokyo)）
4. 等 1-2 分钟，项目创建完成

### 第 2 步：创建数据库表

在 Supabase 控制台左侧点「SQL Editor」，粘贴以下 SQL 并点「Run」：

```sql
-- 家庭表
CREATE TABLE families (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 成员表
CREATE TABLE members (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  approved_total NUMERIC DEFAULT 0,
  level TEXT DEFAULT '见习委员',
  custom_title TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 贡献记录表
CREATE TABLE contributions (
  id BIGSERIAL PRIMARY KEY,
  family_id BIGINT REFERENCES families(id) ON DELETE CASCADE,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  category TEXT,
  status TEXT DEFAULT 'pending',
  votes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  veto_by TEXT,
  veto_reason TEXT
);

-- 开启实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE contributions;
```

### 第 3 步：获取 API 密钥

1. 在 Supabase 控制台左侧点「Settings」→「API」
2. 复制两个值：
   - **Project URL**：类似 `https://xxxxx.supabase.co`
   - **anon public key**：一长串字符串

### 第 4 步：配置项目

1. 在项目根目录创建 `.env` 文件，内容如下：

```env
VITE_SUPABASE_URL=你的Project URL
VITE_SUPABASE_ANON_KEY=你的anon public key
```

2. 把刚才复制的两个值填进去

### 第 5 步：安装依赖并运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器会自动打开 `http://localhost:3000`，就能看到应用了。

### 第 6 步：部署到线上（让家人访问）

**方案 A：Vercel（推荐，最简单）**

1. 把代码推送到 GitHub
2. 打开 [Vercel](https://vercel.com/)，用 GitHub 登录
3. 点「Import Project」，选择你的仓库
4. 点「Deploy」，等 1-2 分钟
5. 部署完成后会给你一个网址，如 `https://family-contribution-xxxx.vercel.app`
6. 把这个网址发给家人，各自手机打开就能用

**方案 B：Netlify**

1. 把代码推送到 GitHub
2. 打开 [Netlify](https://www.netlify.com/)，用 GitHub 登录
3. 点「Add new site」→「Import an existing project」
4. 选择你的仓库，点「Deploy site」
5. 部署完成后也会给你一个网址

**方案 C：本地预览（不部署）**

如果只是自己测试，可以直接用 `npm run dev` 启动，但家人无法访问。

### 第 7 步：添加到手机桌面（像 App 一样）

**iPhone：**
1. Safari 打开网址
2. 点底部的「分享」按钮
3. 点「添加到主屏幕」
4. 点「添加」

**Android：**
1. Chrome 打开网址
2. 点右上角菜单
3. 点「添加到主屏幕」
4. 点「添加」

之后桌面就有图标了，点开全屏显示，跟 App 一样。

## 四、目录结构

```
family-contribution-h5/
├── index.html                 # 入口 HTML
├── package.json               # 项目配置
├── vite.config.js             # Vite 构建配置
├── .env                       # 环境变量（Supabase 配置）
├── src/
│   ├── main.js                # Vue 入口
│   ├── App.vue                # 根组件（路由 + 底部导航）
│   ├── style.css              # 全局样式
│   ├── utils/
│   │   ├── supabase.js        # Supabase 客户端 + 工具函数
│   │   └── levels.js          # 职务等级配置
│   └── pages/
│       ├── Join.vue           # 创建/加入家庭
│       ├── Home.vue           # 首页（我的卡片 + 排行榜）
│       ├── Submit.vue         # 申报贡献度
│       ├── Vote.vue           # 表决（投票/否决/撤回）
│       ├── Mine.vue           # 我（职务特效卡 + 贡献列表 + 规则）
│       ├── Admin.vue          # 管理后台
│       └── History.vue        # 历史记录
└── README.md                  # 本文档
```

## 五、规则细节

- **过半数**：赞成票数 > 成员数 / 2（向下取整后 +1）。3 人家庭需 2 票，4 人需 3 票。
- **自动判负**：反对票过半，或全员已投票但赞成未过半，草案立即判为「未通过」。
- **单人家庭**：自己一票即过半，草案自动入账（方便先建家庭、后拉人）。
- **一票否决权激活条件**：累计已确认贡献度 ≥ 1 且为全家最高（并列最高者都享有），避免全家 0 贡献时互相否决卡死。
- **数据口径**：排行榜与晋升只看「已确认贡献度」（表决通过的），草案中的金额不计。

## 六、管理员与特效说明

- **管理员**：创建家庭的人自动成为管理员（`members.is_admin`），「我」页有「⚙️ 管理后台」入口。管理员可以：
  - 直接修改任何成员的贡献度（立即影响排行榜和一票否决权归属）
  - 直接指定/清空任何成员的职称（指定后固定显示，不再随贡献度变化；选「自动晋升」恢复自动）
  - 跳过投票直接通过/驳回草案
- **特效档位**：15 级职务分为 5 档特效（`levels.js` 中的 `tier` 字段），首页排行榜徽章、「我」页职务大卡都随档位升级：科级加描边 → 司部级加光晕 → 国家级红金发光 → 家庭荣誉金色流光 + 👑。

## 七、常见问题

- **提示「网络异常」**：检查 `.env` 文件是否配置正确，Supabase 项目是否正常运行
- **想重置数据**：Supabase 控制台 → Table Editor → 选中表 → 清空数据
- **想换昵称**：Supabase 控制台 → Table Editor → members 表 → 找到对应记录 → 修改 name 字段
- **家人打不开网址**：确认 Vercel/Netlify 部署成功，网址能正常访问

## 八、成本说明

- **Supabase 免费版**：500MB 数据库 + 每月 2GB 流量，三个人家庭使用完全够用
- **Vercel/Netlify 免费版**：无限静态网站托管，完全免费
- **总计**：0 元

## 九、与小程序版对比

| 对比项 | 小程序版 | H5 网页版 |
|--------|----------|-----------|
| 成本 | 19.9 元/月（云开发） | 完全免费 |
| 打开方式 | 微信里扫码/搜索 | 浏览器打开网址 |
| 界面外观 | 有底部 tabbar | 有底部 tabbar（一样） |
| 启动速度 | 略快（微信原生） | 略慢一点点（加载网页） |
| 添加到桌面 | 不能 | ✅ 可以，像 App 一样 |
| 微信登录 | 自动识别身份 | 需要输入昵称（简单注册） |
| 分享 | 微信里直接转发 | 发网址链接 |
| 功能 | 完全一样 | 完全一样 |

**总结**：功能一模一样，外观 95% 一样，就是少了微信原生的底部 tabbar，多了个"添加到桌面"的功能。三个人家庭使用，体验几乎没差别，而且完全免费。
