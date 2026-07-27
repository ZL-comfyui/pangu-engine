# 盘古AI内容引擎 — 项目全程记录

> 面向中小微企业的一站式AI内容工厂：文案+图片+视频脚本+直播话术+数据闭环

---

## 📅 时间线

### 2026-07-26 凌晨 — 构想与命名

**触发事件：** 子良提出要做一款比「小鱼AI」更厉害的内容生成产品。

**定位讨论：**
- 小鱼AI = 模板+API套壳，纯文字单次生成，泛用户
- 盘古 = 全模态（文+图+视频+直播）、行业深度定制、多平台一键改写、飞书群原生入口

**6大碾压维度确立：**
| 维度 | 小鱼AI | 盘古 |
|------|--------|------|
| 能力 | 单次文字生成 | 文字+图片+视频脚本+直播话术 全模态 |
| 深度 | 通用模板 | 6大行业深度定制，懂行话/痛点 |
| 智能 | 被动生成 | 主动竞品分析+策略建议 |
| 输出 | 一段文案 | 完整内容日历，多平台一键适配 |
| 学习 | 无 | 学习老板风格，越用越像本人 |
| 闭环 | 写完即止 | 发布→数据回传→优化迭代 |

**商业模式确立：** 免费版（¥0/每天5次）→ Pro版（¥299/月）→ 企业版（¥999/月）→ 白标版（¥3999/月）

---

### 2026-07-26 凌晨 — 核心架构搭建

**项目路径：** `E:\盘古AI内容引擎\`

#### 1. Prompt 模板库（核心IP资产）
`prompts/` 目录，模块化设计：
```
prompts/
├── index.js                 ← PromptEngine 入口
├── industries/              ← 6大行业深度模板
│   ├── beauty.js            ← 美业（美容/美发/美甲）
│   ├── restaurant.js        ← 餐饮
│   ├── retail.js            ← 零售
│   ├── education.js         ← 教育
│   ├── fitness.js           ← 健身（健身房/瑜伽/普拉提/私教）
│   └── decoration.js        ← 家装
├── platforms/               ← 5大平台适配规则
│   ├── douyin.js            ← 抖音
│   ├── xiaohongshu.js       ← 小红书
│   ├── wechat.js            ← 微信朋友圈
│   ├── zhihu.js             ← 知乎
│   └── gongzhonghao.js      ← 公众号
└── tools/                   ← 6大工具模板
    ├── headline.js           ← 爆款标题工厂
    ├── video.js              ← 视频脚本
    ├── live.js               ← 直播话术
    ├── poster.js             ← 海报文案
    ├── rewrite.js            ← 竞品分析+洗稿
    └── calendar.js           ← 内容日历
```
**组合能力：** 6行业 × 5平台 × 6工具 × 4场景 = 720+ Prompt 组合

#### 2. 后端服务（Express + sql.js）
`server/` 目录：
- `index.js` — 主服务入口，端口 18790
- `services/ai.js` — DeepSeek API 调用封装
- `services/db.js` — SQLite 数据库（sql.js，零依赖编译）
- `middleware/auth.js` — Token认证 + 订阅检查 + 频率限制

**API 端点（12个）：** 注册/登录、单次生成、多平台改写、标题工厂、内容日历、竞品分析、视频脚本、直播话术、AI配图、历史记录、搜索、用户信息

**数据库表：** users / tokens / contents / usage_logs

#### 3. 前端（Vanilla JS SPA）
`web/` 目录：
- `index.html` — Tailwind CSS CDN 响应式布局
- `js/app.js` — 完整单页应用（~74KB，约1800行）
  - AuthService：登录/注册/Token管理
  - ApiService：12个API端点封装
  - 10个功能页面：生成/改写/标题/日历/分析/视频/直播/配图/历史/设置

#### 4. ComfyUI 配图引擎集成
- 本地 ComfyUI v0.20.1，端口 8188
- SD1.5 模型 + AnimateDiff
- API 调用方式：curl + subprocess（Python urllib 会卡死）
- AI 配图 Prompt 生成 → ComfyUI 渲染

#### 5. 飞书群机器人入口
- @盘古 即可触发内容生成
- 群内返回生成结果

---

### 2026-07-26 深夜 — 管理后台搭建

**子良要求：** 给盘古搭一个管理后台

**实现内容：**

#### 后端扩展（server/）
- **`routes/admin.js`** — 管理后台 API 路由
  - 认证方式：Header `x-admin-key`
  - Dashboard（总用户/总内容/今日用量/活跃用户/7日趋势/套餐分布/预估收入）
  - 用户管理（列表/搜索/套餐升级/删除）
  - 内容管理（全量列表/搜索/删除）
  - 系统配置（套餐方案/模型切换/平台行业一览）
- **`services/db.js`** — DB 模型扩展
  - UserModel: `listAll()` / `updatePlan()` / `deleteUser()`
  - ContentModel: `listAll()` / `deleteById()`
  - UsageModel: `dailyStats()` / `userStats()`

#### 管理前端（admin/）
- 技术栈：**React 18 + Vite 5 + Tailwind CSS + Recharts + React Router 6**
- 端口：**18791**
- 页面：
  - 🔐 **登录页** — 管理员密钥认证
  - 📊 **仪表盘** — 统计卡片 + 近7日柱状图 + 套餐分布 + 预估收入
  - 👥 **用户管理** — 搜索/列表/套餐下拉切换/级联删除
  - 📝 **内容管理** — 全量浏览/搜索/展开查看/删除
  - ⚙️ **系统配置** — 套餐可视化/AI模型切换/运行信息
- Vite proxy 自动代理 `/api` → 后端 18790

---

## 🏗️ 架构总览

```
盘古AI内容引擎/
├── server/              ← Node.js 后端 API（端口 18790）
│   ├── index.js         ← 主入口
│   ├── routes/
│   │   └── admin.js     ← 管理后台路由
│   ├── services/
│   │   ├── ai.js        ← DeepSeek API 封装
│   │   └── db.js        ← SQLite 数据层
│   └── middleware/
│       └── auth.js      ← Token + 订阅 + 频率限制
├── prompts/             ← 🔑 Prompt 模板库（核心IP）
│   ├── industries/      ← 6行业
│   ├── platforms/       ← 5平台
│   └── tools/           ← 6工具
├── web/                 ← 用户前端（Vanilla JS SPA）
├── admin/               ← 管理前端（React + Vite，端口 18791）
├── data/                ← SQLite 数据库文件
├── docs/                ← 项目文档
├── .env                 ← 环境变量
└── README.md            ← 项目说明
```

## 🔗 关键地址

| 入口 | 地址 | 说明 |
|------|------|------|
| 用户前端 | http://localhost:18790 | SPA Web App |
| 后端 API | http://localhost:18790/api | RESTful API |
| 管理后台 | http://localhost:18791 | React Admin Panel |
| 管理API | http://localhost:18790/api/admin | Header: x-admin-key |
| ComfyUI | http://127.0.0.1:8188 | 本地配图引擎 |

## 📊 数据流

```
用户输入 → Express API → DeepSeek v4-pro（文案）
                       → ComfyUI SD1.5（配图）
                       → Edge TTS（配音）
         ↓
      结果存入 SQLite
         ↓
      返回 Web / 飞书群
```

## 💡 关键设计决策

1. **sql.js 而非 better-sqlite3** — 纯 JS，免编译，Windows 上零坑
2. **Prompt 模板分离** — 每个行业/平台/工具独立文件，可插拔扩展
3. **Vanilla JS 用户前端** — 刚启动时不引入框架复杂度，快速出 MVP
4. **React 管理后台** — 内部工具需要组件化和图表能力，React+Recharts 最合适
5. **四级套餐** — 参考小鱼AI但定价更激进，白标版作为代理商模式入口
6. **ComfyUI 本地** — 配图不走付费 API，边际成本为零

## ⚠️ 已知问题 & TODO

- [x] 管理后台 .env 配置持久化 ✅ P008
- [x] 白标版功能对接 ✅ P008
- [x] 日志系统 ✅ P007
- [x] 错误监控/告警 ✅ P007
- [ ] 用户前端 app.js 越来越大，后续考虑拆模块或迁移 React
- [ ] ComfyUI 配图管线稳定性待提升
- [ ] 需要真实客户案例填充产品手册第8章

---

### 2026-07-26 凌晨 — 团队协作：9/9 全部完成 🎉

**最终状态：P004~P012 全部验收通过**

| 编号 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| P004 | 核心架构 | 🙏 唐僧 | prompts/ + server/ + web/ |
| P005 | 后端API+DB | 🔧 沙僧 | 12个端点 |
| P006 | 管理后台 | 🔧 沙僧 | admin/ React SPA |
| P007 | 日志+监控 | 🔧 沙僧 | winston+错误处理 |
| P008 | 配置+白标 | 🔧 沙僧 | .env引擎+白标API |
| P009 | 文档 | 📖 观音 | API+USER_GUIDE+DEPLOY |
| P010 | 获客物料 | 📣 八戒 | 落地页+帖子+SOP |
| P011 | 进度管理 | 📋 白龙马 | M1→M2→M3 |
| P012 | 交付包 | 📨 悟空 | 手册+FAQ+定价 |

**里程碑：** M1(8/3 MVP) → M2(8/10 公测) → M3(8/17 发布)

**八戒追加产出：** `docs/P010_飞书群欢迎语文案.md`（5模块：入群+追评+彩蛋+耗尽提醒+FAQ预设）

**老板决策：** 落地页A版 ✅ | 首月199 ✅ | 飞书群欢迎语待配入机器人

### 2026-07-26 凌晨 — 界面视觉升级 v2.0 + 移动端适配

**用户前端：**
- 全新设计系统：CSS 变量、玻璃拟态、渐变体系、微动效
- 10个页面模板全面重写（Hero渐变/统计/功能卡片/套餐/表单/弹窗）
- 移动端底部标签栏（🏠首页/✍️生成/🔄多平台/📋历史/☰菜单）
- 侧边栏抽屉式展开 + 遮罩层
- 全尺寸断点：≤1024px 平板 / ≤768px 手机 / ≤375px 小屏
- iOS 输入防缩放 (font-size:16px)、48px 最小触摸目标

**管理后台：**
- Sidebar 移动端全屏抽屉 + 遮罩
- 表格横向滚动、统计卡片2列、图表/配置1列
- 套餐卡片手机端单列、搜索框防缩放
- React state 驱动的菜单开关

---

### 2026-07-26 凌晨 03:15 — 🔐 安全漏洞修复（子良发现）

**子良发现管理后台可直接进入，不需要密钥验证。排查结果：**

**漏洞1：登录是假的。** `admin/src/api/index.js` 的 `login()` 函数直接 `localStorage.setItem('admin_key', key)` 就放行，`isAuthenticated()` 只检查 localStorage 有没有值——任何人随便输入任意字符就能进入后台。

**漏洞2：默认密钥 `pangu-admin-2024` 太弱，硬编码在代码里。**

**修复内容：**

1. **登录真实验证** — `login()` 改为 async，调 `/api/admin/dashboard` 验证密钥，后端返回 401 则拒绝进入；Login 页面加 loading 状态和错误提示
2. **API 层速率限制** — `server/routes/admin.js` 加 IP 级限流：同一 IP 每分钟最多 5 次失败，超限返回 429，封 1 分钟
3. **前端隐藏入口** — `web/index.html` 的 ⚙️ 管理后台按钮默认 `hidden`，只有 `localStorage` 已存 `admin_key` 的用户才能看到
4. **安全文档** — 新建 `docs/SECURITY.md`，记录三层防护方案

**修改文件：**
- `admin/src/api/index.js` — login 改为真实验证
- `admin/src/pages/Login.jsx` — async 提交 + loading + 错误提示
- `server/routes/admin.js` — 添加 adminRateLimit 中间件
- `web/index.html` — 隐藏入口 + inline script
- `docs/SECURITY.md` — 新建

---

*最后更新：2026-07-26 03:18 | 唐僧 🙏*

---

### 2026-07-26 凌晨 03:00 — DeepSeek API Key 更换

- 子良提供新 Key（见本地 `.env`），已写入 `.env`
- 旧 node 进程已 kill，**后端尚未重启加载新 Key**
- 明天继续：重启后端 → 验证 Key → 确认 ComfyUI 状态
- 📝 建立项目记忆体系：`docs/PROJECT_MEMORY.md`（项目上下文） + `docs/PROJECT_LOG.md`（过程日志），每个项目独立闭环
