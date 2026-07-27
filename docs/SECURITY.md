/* 
 * 管理后台安全隔离方案
 * 
 * 三层防护：
 * 1. 前端隐藏入口 — 只有 localStorage 有 admin_key 时才显示（web/index.html inline script）
 * 2. 登录真实验证 — 输入密钥后调后端 API 验证，失败拒绝进入（admin/src/pages/Login.jsx）
 * 3. API 层鉴权 — 每个请求带 x-admin-key，后端 adminAuth 中间件校验（server/routes/admin.js）
 * 4. 速率限制 — 同一 IP 每分钟最多 5 次失败尝试，超限封 1 分钟（server/routes/admin.js）
 * 
 * 默认密钥：pangu-admin-2024（可通过 .env ADMIN_KEY 覆盖）
 */
