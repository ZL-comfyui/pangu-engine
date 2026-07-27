# 盘古AI内容引擎 — 部署文档

> 从零到运行：环境准备、安装配置、启动服务、ComfyUI 联动

---

## 目录

1. [环境要求](#环境要求)
2. [项目结构](#项目结构)
3. [快速部署（5分钟）](#快速部署5分钟)
4. [配置说明](#配置说明)
5. [ComfyUI 联动配置](#comfyui-联动配置)
6. [服务管理](#服务管理)
7. [生产环境建议](#生产环境建议)
8. [常见问题排查](#常见问题排查)

---

## 环境要求

### 必需

| 组件 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 18.x | 推荐 20.x LTS |
| npm | ≥ 9.x | 随 Node.js 自带 |
| 磁盘空间 | ≥ 500MB | 项目 + 依赖 + SQLite 数据 |

### 可选

| 组件 | 用途 | 版本 |
|------|------|------|
| DeepSeek API Key | AI 文案生成 | — |
| ComfyUI | AI 配图引擎 | ≥ 0.20.1 |
| Edge TTS | 文字转语音（配音） | Windows 10/11 内置 |

### 操作系统

- ✅ Windows 10 / 11（开发测试环境）
- ✅ macOS
- ✅ Linux

> 当前项目在 Windows 上开发和测试，Linux/macOS 部署仅需调整路径分隔符。

---

## 项目结构

```
盘古AI内容引擎/
├── server/                  # Node.js 后端 API（端口 18790）
│   ├── index.js             # 主入口，Express 路由注册
│   ├── routes/
│   │   └── admin.js         # 管理后台 API 路由
│   ├── services/
│   │   ├── ai.js            # DeepSeek API 调用封装
│   │   └── db.js            # SQLite 数据层（sql.js）
│   └── middleware/
│       └── auth.js          # Token 认证 + 订阅检查 + 频率限制
├── prompts/                 # Prompt 模板库（核心 IP）
│   ├── index.js             # PromptEngine 入口
│   ├── industries/          # 6 大行业模板
│   ├── platforms/           # 5 大平台适配规则
│   └── tools/               # 6 大工具模板
├── web/                     # 用户前端（Vanilla JS SPA）
│   ├── index.html           # 入口 HTML
│   ├── js/app.js            # SPA 应用逻辑
│   └── css/style.css        # 样式
├── admin/                   # 管理前端（React + Vite，端口 18791）
│   ├── src/                 # 源码
│   ├── package.json         # 依赖
│   └── vite.config.js       # Vite 配置（含代理）
├── data/                    # SQLite 数据库文件（自动创建）
│   └── pangu.db
├── docs/                    # 项目文档
├── .env                     # 环境变量配置
├── package.json             # 后端根依赖
└── README.md                # 项目说明
```

---

## 快速部署（5分钟）

### 第1步：安装后端依赖

```bash
cd E:\盘古AI内容引擎
npm install
```

安装的依赖：

| 包名 | 用途 |
|------|------|
| `express` | Web 框架 |
| `cors` | 跨域支持 |
| `dotenv` | 环境变量加载 |
| `sql.js` | 纯 JS SQLite（免编译） |
| `uuid` | 唯一 ID 生成 |
| `axios` | HTTP 请求（调 DeepSeek API） |

### 第2步：配置环境变量

复制或编辑 `.env` 文件：

```env
# DeepSeek API 配置（必须）
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_BASE=https://api.deepseek.com
PANGU_MODEL=deepseek-chat

# OpenClaw 网关代理（可选，设为 true 使用本地网关通道）
USE_OPENCLAW=false

# ComfyUI 配图引擎地址（可选）
COMFYUI_URL=http://127.0.0.1:8188

# 服务端口
PORT=18790

# 管理后台密钥
ADMIN_KEY=pangu-admin-2024
```

> ⚠️ **生产环境请务必修改 `ADMIN_KEY`！**

### 第3步：安装管理前端依赖

```bash
cd E:\盘古AI内容引擎\admin
npm install
```

### 第4步：启动服务

**启动后端（必须）：**

```bash
cd E:\盘古AI内容引擎
npm run dev
```

服务启动后输出：

```
📦 数据库已初始化: E:\盘古AI内容引擎\data\pangu.db
🚀 盘古AI内容引擎 已启动: http://localhost:18790
   API: http://localhost:18790/api/health
   前端: http://localhost:18790
   管理后台API: http://localhost:18790/api/admin
```

**启动管理前端（独立终端）：**

```bash
cd E:\盘古AI内容引擎\admin
npm run dev
```

管理后台启动后访问：**http://localhost:18791**

### 第5步：验证

浏览器访问以下地址确认部署成功：

| 地址 | 期望结果 |
|------|----------|
| http://localhost:18790 | 盘古 SPA 首页 |
| http://localhost:18790/api/health | `{"status":"ok","version":"1.0.0"}` |
| http://localhost:18790/api/industries | 行业列表 JSON |
| http://localhost:18791 | 管理后台登录页 |

---

## 配置说明

### 核心配置项

| 变量 | 默认值 | 必填 | 说明 |
|------|--------|------|------|
| `DEEPSEEK_API_KEY` | — | 是 | DeepSeek API 密钥，从 [platform.deepseek.com](https://platform.deepseek.com) 获取 |
| `DEEPSEEK_BASE` | `https://api.deepseek.com` | 否 | API 基础地址（支持代理/中转） |
| `PANGU_MODEL` | `deepseek-chat` | 否 | 模型名称，可选 `deepseek-reasoner` |
| `USE_OPENCLAW` | `false` | 否 | 是否通过 OpenClaw 网关代理（需要本地 OpenClaw 运行） |
| `COMFYUI_URL` | `http://127.0.0.1:8188` | 否 | ComfyUI 服务地址 |
| `PORT` | `18790` | 否 | 后端服务端口 |
| `ADMIN_KEY` | `pangu-admin-2024` | 否 | 管理后台密钥（**生产环境必须修改**） |

### AI 引擎选择

盘古支持两种 AI 调用方式：

**方式一：直连 DeepSeek（推荐）**

```
DEEPSEEK_API_KEY=sk-xxxxx
USE_OPENCLAW=false
```

**方式二：通过 OpenClaw 网关代理**

```
DEEPSEEK_API_KEY=sk-xxxxx
USE_OPENCLAW=true
```

> OpenClaw 网关模式下，AI 调用通过本地 OpenClaw Gateway 的已配通道转发。

### 模型选择

| 模型 | ID | 特点 | 适用场景 |
|------|-----|------|----------|
| DeepSeek Chat | `deepseek-chat` | 快速、便宜 | 日常内容生成 |
| DeepSeek Reasoner | `deepseek-reasoner` | 深度推理、更贵 | 竞品分析、策略建议 |

在 `.env` 中修改 `PANGU_MODEL` 或在管理后台「系统配置」页面实时切换（仅本次运行生效）。

---

## ComfyUI 联动配置

### 前置条件

- ComfyUI 已安装并运行（推荐 v0.20.1+）
- 至少安装一个 SD 模型（如 SD1.5）
- ComfyUI 的 `--enable-cors-header` 参数（如前端直接调用）

### 启动 ComfyUI

```bash
# 在 ComfyUI 目录下
python main.py --port 8188 --listen 127.0.0.1
```

### 配置联动

在 `.env` 中设置 ComfyUI 地址：

```
COMFYUI_URL=http://127.0.0.1:8188
```

### 工作流程

```
用户在盘古输入文案 → 盘古调用 DeepSeek 生成配图 Prompt
                              ↓
              用户复制 Prompt → ComfyUI 粘贴 → 出图
```

> 当前版本：Prompt 生成和图片渲染分两步，后续将实现 API 直连全自动出图。

### ComfyUI Prompt 格式

盘古生成的 Prompt 已针对 SD1.5 优化，包含：

- **英文正向 Prompt**（主体描述 + 构图 + 光线 + 色调 + 风格 + 质量词）
- **中文翻译**（便于理解和微调）
- **简短版**（快速测试）
- **完整版**（最终出图）

使用示例：

1. 在盘古生成配图 Prompt
2. 复制完整版 Prompt
3. 打开 ComfyUI（http://127.0.0.1:8188）
4. 粘贴到 CLIP Text Encode (Positive) 节点
5. 点击 Queue Prompt 出图

---

## 服务管理

### 启动所有服务

**终端1 — 后端：**

```bash
cd E:\盘古AI内容引擎
npm run dev
```

**终端2 — 管理前端：**

```bash
cd E:\盘古AI内容引擎\admin
npm run dev
```

### 停止服务

在对应终端按 `Ctrl + C`。

### 端口说明

| 端口 | 服务 | 技术栈 |
|------|------|--------|
| 18790 | 后端 API + 用户前端 | Node.js + Express + 静态文件 |
| 18791 | 管理后台前端 | React + Vite（开发服务器） |
| 8188 | ComfyUI | Python（外部服务） |

> 18790 端口同时提供 API 和静态前端文件，Vite 开发服务器通过 proxy 将 `/api` 请求代理到 18790。

### 数据备份

SQLite 数据库文件位于 `data/pangu.db`。备份方式：

```bash
# 直接复制文件即可
copy E:\盘古AI内容引擎\data\pangu.db E:\backup\pangu_20260726.db
```

建议每日定时备份。

---

## 生产环境建议

### 安全加固

1. **修改 ADMIN_KEY**

   ```env
   ADMIN_KEY=<生成一个随机长字符串>
   ```

2. **使用 HTTPS**

   生产环境推荐 Nginx 反向代理 + SSL 证书：

   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://127.0.0.1:18790;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **密码加密**

   当前版本密码明文存储。生产环境建议在 UserModel 中增加 bcrypt 哈希：

   ```bash
   npm install bcrypt
   ```

   修改 `server/services/db.js` 中 `UserModel.create()` 和 `findByPhone()` 的密码逻辑。

4. **管理前端构建部署**

   ```bash
   cd admin
   npm run build
   # 将 dist/ 目录部署到 Nginx 或 CDN
   ```

   或用 Express 静态托管（修改 server/index.js）：

   ```js
   app.use('/admin', express.static(path.join(__dirname, '..', 'admin', 'dist')));
   ```

### 性能优化

| 建议 | 说明 |
|------|------|
| 使用 Redis 替代内存频率限制 | 当前频率限制存内存，多实例会失效 |
| 接入日志系统 | 替换 `console.log` 为 Winston/Pino |
| 接入监控告警 | 推荐 Sentry 或自建 Uptime Kuma |
| Nginx 静态资源缓存 | 前端静态文件加 `expires` 头 |
| PM2 进程管理 | 自动重启、日志管理、负载均衡 |

### PM2 部署示例

```bash
npm install -g pm2

# 启动后端
pm2 start server/index.js --name pangu-api

# 启动管理前端（构建后）
cd admin && npm run build
pm2 serve dist 18791 --name pangu-admin --spa

# 设置开机自启
pm2 save
pm2 startup
```

---

## 常见问题排查

### Q: 启动报错 "Cannot find module 'express'"

```bash
cd E:\盘古AI内容引擎
npm install
```

确保在项目根目录运行 `npm install`，不要漏掉。

### Q: API 返回 500 "生成失败"

**检查 DeepSeek API Key 是否正确：**

```bash
# 测试 API Key
curl https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-your-key" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hi"}]}'
```

如果 API Key 不可用，盘古会自动降级返回开发模式模拟结果。

### Q: 端口 18790 被占用

```bash
# 查找占用进程
netstat -ano | findstr :18790

# 修改端口
# 编辑 .env: PORT=18792
```

### Q: 管理后台无法登录

确认 `x-admin-key` Header 值与 `.env` 中 `ADMIN_KEY` 一致。默认值：`pangu-admin-2024`。

如果忘记密码，直接查看 `.env` 文件即可找到。

### Q: 数据库文件损坏

```bash
# 备份当前数据
copy data\pangu.db data\pangu_backup.db

# 删除数据库文件（重启后自动重建，但数据丢失）
del data\pangu.db

# 重启服务
npm run dev
```

### Q: ComfyUI 联动不生效

1. 确认 ComfyUI 正在运行：访问 http://127.0.0.1:8188
2. 确认 `COMFYUI_URL` 配置正确
3. 当前版本 ComfyUI 调用是手动流程（用户复制 Prompt → ComfyUI 粘贴），不是全自动。确保理解这一工作流程。

### Q: Node.js 版本不兼容

```bash
node --version
# 需要 ≥ 18.x
```

推荐使用 [nvm-windows](https://github.com/coreybutler/nvm-windows) 管理 Node 版本：

```bash
nvm install 20
nvm use 20
```

---

*文档版本 1.0.0 | 最后更新：2026-07-26 | 观音 📖*
