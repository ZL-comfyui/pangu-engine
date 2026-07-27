# 盘古AI内容引擎 — API 文档

> 版本：1.0.0 | 基础路径：`http://localhost:18790/api`

---

## 目录

1. [概述](#概述)
2. [认证方式](#认证方式)
3. [公开接口](#公开接口)
4. [用户接口](#用户接口)
5. [核心生成接口](#核心生成接口)
6. [工具接口](#工具接口)
7. [历史记录接口](#历史记录接口)
8. [企业统计接口](#企业统计接口)
9. [管理后台接口](#管理后台接口)
10. [错误码](#错误码)
11. [频率限制](#频率限制)

---

## 概述

盘古AI内容引擎提供 RESTful API，支持 JSON 格式。所有接口基础路径为 `/api`，服务端口 **18790**。

**接口分组：**

| 分组 | 接口数 | 认证要求 |
|------|--------|----------|
| 公开接口 | 4 | 无 |
| 用户接口 | 3 | Bearer Token |
| 核心生成接口 | 2 | Bearer Token + 订阅检查 |
| 工具接口 | 6 | Bearer Token + 订阅检查 |
| 历史记录接口 | 2 | Bearer Token |
| 企业统计接口 | 1 | Bearer Token（Enterprise+） |
| 管理后台接口 | 9 | Admin Key |

---

## 认证方式

### 用户认证（Bearer Token）

所有需认证的接口在 Header 中携带 Token：

```
Authorization: Bearer <token>
```

Token 通过 `/api/auth/login` 获取，服务端存储于 SQLite `tokens` 表，永不过期（当前版本）。

### 管理后台认证（Admin Key）

管理后台接口使用自定义 Header：

```
x-admin-key: pangu-admin-2024
```

默认 Key 由 `.env` 中的 `ADMIN_KEY` 配置。

---

## 公开接口

### 1. 健康检查

```
GET /api/health
```

**响应示例：**

```json
{
  "status": "ok",
  "timestamp": "2026-07-26T10:30:00.000Z",
  "version": "1.0.0"
}
```

---

### 2. 获取行业列表

返回所有可用行业及其支持的场景。

```
GET /api/industries
```

**响应示例：**

```json
[
  {
    "id": "beauty",
    "name": "美业",
    "scenes": [
      { "id": "promotion", "name": "促销活动" },
      { "id": "new_product", "name": "新品上市" },
      { "id": "daily", "name": "日常分享" },
      { "id": "festival", "name": "节日营销" }
    ]
  },
  {
    "id": "restaurant",
    "name": "餐饮",
    "scenes": [...]
  }
]
```

**可用行业：**

| ID | 行业名 | 说明 |
|----|--------|------|
| `beauty` | 美业 | 美容/美发/美甲 |
| `restaurant` | 餐饮 | 餐饮门店 |
| `retail` | 零售 | 零售商店 |
| `education` | 教育 | 教育机构 |
| `fitness` | 健身 | 健身房/瑜伽/普拉提/私教 |
| `decoration` | 家装 | 装修/家居 |

---

### 3. 获取平台列表

```
GET /api/platforms
```

**响应示例：**

```json
[
  {
    "id": "douyin",
    "name": "抖音",
    "description": "短视频平台，适合强视觉冲击和话题性内容"
  },
  {
    "id": "xiaohongshu",
    "name": "小红书",
    "description": "种草社区，适合精致图文和经验分享"
  }
]
```

**可用平台：** `douyin`（抖音）、`xiaohongshu`（小红书）、`wechat`（微信朋友圈）、`zhihu`（知乎）、`gongzhonghao`（公众号）

---

### 4. 免费试用生成

无需注册即可体验，无频率限制（当前版本）。

```
POST /api/trial/generate
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 是 | 行业 ID，如 `beauty` |
| `platform` | string | 是 | 平台 ID，如 `xiaohongshu` |
| `scene` | string | 否 | 场景 ID，默认 `promotion` |
| `inputs` | object | 否 | 业务信息键值对，填充模板变量 |

**请求示例：**

```json
{
  "industry": "beauty",
  "platform": "xiaohongshu",
  "scene": "new_product",
  "inputs": {
    "product": "玻尿酸精华液",
    "price": "298元",
    "feature": "三重玻尿酸+烟酰胺，28天淡化细纹"
  }
}
```

**响应示例：**

```json
{
  "success": true,
  "result": "💧 姐妹们！这瓶精华液真的绝了...\n\n（完整生成内容）"
}
```

---

## 用户接口

### 5. 用户注册

```
POST /api/auth/register
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | string | 是 | 手机号（唯一） |
| `password` | string | 是 | 密码（明文存储，生产环境需加密） |
| `name` | string | 否 | 昵称，默认空 |

**请求示例：**

```json
{
  "phone": "13800138000",
  "password": "abc123",
  "name": "张老板"
}
```

**成功响应（200）：**

```json
{
  "success": true,
  "user": {
    "id": "a1b2c3d4-...",
    "phone": "13800138000",
    "name": "张老板",
    "plan": "free"
  }
}
```

**错误响应（400）：**

```json
{
  "error": "该手机号已注册"
}
```

---

### 6. 用户登录

注册后自动分配免费版套餐。

```
POST /api/auth/login
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `phone` | string | 是 | 手机号 |
| `password` | string | 是 | 密码 |

**请求示例：**

```json
{
  "phone": "13800138000",
  "password": "abc123"
}
```

**成功响应（200）：**

```json
{
  "success": true,
  "token": "e5f6g7h8-...",
  "user": {
    "id": "a1b2c3d4-...",
    "phone": "13800138000",
    "name": "张老板",
    "plan": "free"
  }
}
```

**错误响应（401）：**

```json
{
  "error": "手机号或密码错误"
}
```

---

### 7. 获取用户信息

```
GET /api/user/profile
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "id": "a1b2c3d4-...",
  "phone": "13800138000",
  "name": "张老板",
  "plan": "free",
  "planName": "免费版",
  "todayUsage": 2,
  "dailyLimit": 5
}
```

| 字段 | 说明 |
|------|------|
| `plan` | 套餐标识：`free` / `pro` / `enterprise` / `whitelabel` |
| `planName` | 套餐中文名 |
| `todayUsage` | 今日已用次数 |
| `dailyLimit` | 每日次数上限（企业版/白标版为 `Infinity`） |

---

## 核心生成接口

### 8. 单次内容生成

盘古的核心生成能力：行业 + 平台 + 场景 → 专业文案。

```
POST /api/generate
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 是 | 行业 ID |
| `platform` | string | 是 | 平台 ID |
| `scene` | string | 是 | 场景 ID |
| `inputs` | object | 否 | 模板变量填充 |

**请求示例：**

```json
{
  "industry": "restaurant",
  "platform": "douyin",
  "scene": "promotion",
  "inputs": {
    "dish": "炭烤羊排",
    "price": "88元",
    "restaurant": "草原牧歌"
  }
}
```

**成功响应（200）：**

```json
{
  "success": true,
  "result": "🐑 88块吃正宗炭烤羊排！...\n\n（完整生成内容）"
}
```

**错误响应：**

| 状态码 | error | 说明 |
|--------|-------|------|
| 400 | 缺少必要参数 | industry / platform / scene 缺失 |
| 401 | 请先登录 | Token 无效或缺失 |
| 429 | 今日免费额度已用完 | 免费版达到每日5次上限 |
| 429 | 请求太快，请稍候再试 | 超过每秒5次限制 |
| 500 | 生成失败: ... | AI 调用异常 |

---

### 9. 一键多平台改写（杀手功能）

输入一份核心信息，同时生成多个平台的适配版本。

```
POST /api/generate/multi-platform
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 是 | 行业 ID |
| `scene` | string | 是 | 场景 ID |
| `inputs` | object | 否 | 模板变量 |
| `targetPlatforms` | string[] | 否 | 目标平台列表，默认全部5个 |

**请求示例：**

```json
{
  "industry": "fitness",
  "scene": "new_product",
  "inputs": {
    "course": "21天马甲线训练营",
    "price": "399元",
    "coach": "刘教练",
    "feature": "每天15分钟，零基础也能练出马甲线"
  },
  "targetPlatforms": ["xiaohongshu", "douyin", "wechat"]
}
```

**成功响应（200）：**

```json
{
  "success": true,
  "results": {
    "xiaohongshu": "🏋️‍♀️ 姐妹们！刘教练的21天马甲线训练营...",
    "douyin": "#马甲线挑战 21天...",
    "wechat": "朋友们，推荐一个超棒的训练营..."
  }
}
```

**说明：** 每个平台的结果独立生成，互不影响。用量按实际生成的平台数量计数（3 个平台消耗 3 次）。

---

## 工具接口

### 10. 爆款标题工厂

根据主题批量生成高点击率标题，可选平台风格。

```
POST /api/tools/headline
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `topic` | string | 是 | — | 内容主题 |
| `count` | number | 否 | 20 | 生成标题数量 |
| `platform` | string | 否 | `xiaohongshu` | 平台风格适配 |

**请求示例：**

```json
{
  "topic": "夏季防晒霜推荐",
  "count": 10,
  "platform": "douyin"
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（10条爆款标题，含emoji和话题标签）"
}
```

---

### 11. 内容日历生成

按月生成行业内容日历，支持自定义关键日期。

```
POST /api/tools/calendar
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 是 | 行业 ID |
| `month` | string | 是 | 月份，如 `2026-08` |
| `keyDates` | string[] | 否 | 自定义关键日期列表 |

**请求示例：**

```json
{
  "industry": "education",
  "month": "2026-08",
  "keyDates": ["8月15日开学季", "8月25日公开课"]
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（按周排列的内容日历，含主题、文案角度、发布建议）"
}
```

---

### 12. 竞品分析

分析竞品内容并提供策略建议。支持直接粘贴竞品文案或输入链接。

```
POST /api/tools/analyze
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 否 | 竞品内容链接 |
| `content` | string | 否 | 直接粘贴的竞品文案 |
| `industry` | string | 否 | 行业 ID（用于精准分析） |

> `url` 和 `content` 至少提供一个。

**请求示例：**

```json
{
  "content": "【限时秒杀】全场5折起...（竞品文案）",
  "industry": "retail"
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（竞品策略拆解 + 你的应对方案 + 优化版文案）"
}
```

---

### 13. 视频脚本生成

生成短视频口播/带货/Vlog 分镜脚本。

```
POST /api/tools/video
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 脚本类型：`口播` / `带货` / `Vlog`，默认 `口播` |
| `topic` | string | 否 | 视频主题 |
| `duration` | string | 否 | 时长，如 `60秒` |
| `style` | string | 否 | 风格描述 |

**请求示例：**

```json
{
  "type": "带货",
  "topic": "无线蓝牙耳机",
  "duration": "60秒",
  "style": "科技感、年轻化"
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（完整分镜脚本：镜头描述 + 台词 + 时长标记 + 配乐建议）"
}
```

---

### 14. 直播话术生成

生成直播间全套话术，含开场/产品介绍/逼单/结束。

```
POST /api/tools/live
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `industry` | string | 否 | 行业 |
| `product` | string | 否 | 产品名称 |
| `price` | string | 否 | 价格 |
| `duration` | string | 否 | 直播时长，如 `2小时` |

**请求示例：**

```json
{
  "industry": "beauty",
  "product": "水光精华面膜",
  "price": "99元/5片",
  "duration": "1小时"
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（开场暖场 → 产品讲解 → 答疑逼单 → 收尾预告 全套话术）"
}
```

---

### 15. AI 配图 Prompt 生成

将内容描述转化为 ComfyUI / Stable Diffusion 可用的高质量 Prompt，支持中英双语。

```
POST /api/tools/image-prompt
Authorization: Bearer <token>
```

**请求体：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `content` | string | 是 | — | 文字内容，用于生成配图 |
| `style` | string | 否 | `现代简约` | 视觉风格 |

**请求示例：**

```json
{
  "content": "夏季清爽护肤套装，蓝色海洋主题",
  "style": "清新自然"
}
```

**成功响应：**

```json
{
  "success": true,
  "result": "（中英双语 Prompt：简短版 + 完整版，含构图/光线/色调/风格/质量词）"
}
```

---

## 历史记录接口

### 16. 查看历史

分页查看当前用户的所有生成记录。

```
GET /api/history?page=1&limit=20
Authorization: Bearer <token>
```

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页条数 |

**响应示例：**

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "single",
      "data": { "industry": "beauty", "platform": "xiaohongshu", "scene": "new_product", "inputs": {...} },
      "result": "完整生成结果...",
      "createdAt": "2026-07-26 10:30:00"
    }
  ],
  "total": 25,
  "page": 1,
  "totalPages": 2
}
```

---

### 17. 搜索历史

按关键词搜索历史生成内容。

```
GET /api/history/search?q=<关键词>
Authorization: Bearer <token>
```

**请求示例：**

```
GET /api/history/search?q=精华液
```

**响应示例：**

```json
[
  {
    "id": "uuid",
    "type": "single",
    "data": {...},
    "result": "...精华液...",
    "createdAt": "2026-07-26 10:30:00"
  }
]
```

---

## 企业统计接口

### 18. 系统统计（企业版+）

企业版和白标版用户可查看系统全局统计。

```
GET /api/admin/stats
Authorization: Bearer <token>
```

> 权限要求：`plan` 为 `enterprise` 或 `whitelabel`

**响应示例：**

```json
{
  "totalUsers": 156,
  "totalContent": 3420,
  "todayUsage": 89
}
```

**错误（403）：**

```json
{
  "error": "无权限"
}
```

---

## 管理后台接口

> 所有管理后台接口使用 `x-admin-key` Header 认证，前缀 `/api/admin`。

### Dashboard

```
GET /api/admin/dashboard
x-admin-key: <admin_key>
```

**响应：**

```json
{
  "totalUsers": 156,
  "totalContent": 3420,
  "todayUsage": 89,
  "todayActiveUsers": 23,
  "dailyStats": [
    { "date": "2026-07-20", "count": 45 },
    { "date": "2026-07-21", "count": 52 }
  ],
  "planStats": { "free": 120, "pro": 25, "enterprise": 8, "whitelabel": 3 },
  "revenue": 14942
}
```

### 用户管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/users?page=1&limit=20&search=` | 用户列表（支持手机号/姓名搜索） |
| `GET` | `/api/admin/users/:id` | 用户详情（含今日用量） |
| `PUT` | `/api/admin/users/:id/plan` | 修改套餐 `{"plan":"pro"}` |
| `DELETE` | `/api/admin/users/:id` | 删除用户（级联删除 token/usage/contents） |

### 内容管理

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/contents?page=1&limit=20&search=` | 全量内容列表（关联用户信息） |
| `DELETE` | `/api/admin/contents/:id` | 删除指定内容 |

### 系统配置

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/admin/config` | 获取套餐/行业/平台/模型/端口等配置 |
| `PUT` | `/api/admin/config` | 更新配置 `{"model":"deepseek-chat"}`（仅本次运行） |

**PUT /config 示例响应：**

```json
{
  "success": true,
  "message": "配置已更新（本次运行生效，重启后需重新设置）"
}
```

---

## 错误码

| HTTP 状态码 | 说明 | 常见场景 |
|-------------|------|----------|
| 200 | 成功 | 正常返回 |
| 400 | 参数错误 | 必填参数缺失（手机号、industry、platform等） |
| 401 | 认证失败 | Token 无效/过期、Admin Key 错误 |
| 403 | 权限不足 | 非 Enterprise/Whitelabel 访问统计接口 |
| 404 | 资源不存在 | 用户不存在 |
| 429 | 频率限制 | 免费版日额度用完、每秒请求超5次 |
| 500 | 服务器错误 | DeepSeek API 调用异常等 |

**统一错误格式：**

```json
{
  "error": "具体错误信息"
}
```

额度耗尽时附加字段：

```json
{
  "error": "今日免费额度已用完",
  "tip": "升级到Pro版享受无限生成 → 联系客服开通",
  "upgradeLink": "/upgrade"
}
```

---

## 频率限制

### 订阅限制

| 套餐 | 每日上限 | 触发后行为 |
|------|----------|------------|
| 免费版 (free) | 5 次/天 | 返回 429，提示升级 |
| Pro版 (pro) | 100 次/天 | 建议升级 Enterprise |
| 企业版 (enterprise) | 无限 | — |
| 白标版 (whitelabel) | 无限 | — |

### 全局频率限制

所有认证用户每秒最多 **5 次请求**，超出返回 429。

> 当前为内存实现，服务重启后计数器清零。后续可迁移至 Redis。

---

## 附录：套餐功能矩阵

| 功能 | 免费版 | Pro版 (¥299/月) | 企业版 (¥999/月) | 白标版 (¥3999/月) |
|------|--------|-----------------|-------------------|--------------------|
| 单次生成 | 5次/天 | 100次/天 | 无限 | 无限 |
| 多平台改写 | ❌ | ✅ | ✅ | ✅ |
| 标题工厂 | ✅ | ✅ | ✅ | ✅ |
| 内容日历 | ✅ | ✅ | ✅ | ✅ |
| 竞品分析 | ❌ | ✅ | ✅ | ✅ |
| 视频脚本 | ✅ | ✅ | ✅ | ✅ |
| 直播话术 | ❌ | ✅ | ✅ | ✅ |
| AI配图 | ❌ | ✅ | ✅ | ✅ |
| 多账号 | ❌ | ❌ | ✅ | ✅ |
| 数据看板 | ❌ | ❌ | ✅ | ✅ |
| 行业深度定制 | ❌ | ❌ | ✅ | ✅ |
| 自有品牌 | ❌ | ❌ | ❌ | ✅ |
| 独立部署 | ❌ | ❌ | ❌ | ✅ |

---

*文档版本 1.0.0 | 最后更新：2026-07-26 | 观音 📖*
