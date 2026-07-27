/**
 * 认证中间件
 */
const { UserModel, UsageModel } = require('../services/db');

/**
 * Token 认证中间件
 * Header: Authorization: Bearer <token>
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  const token = authHeader.split(' ')[1];
  const user = UserModel.findByToken(token);
  if (!user) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }

  req.userId = user.id;
  req.userPlan = user.plan;
  next();
}

/**
 * 订阅检查
 */
function subscriptionCheck(req, res, next) {
  const { userId, userPlan } = req;

  if (userPlan === 'free') {
    const todayUsage = UsageModel.getToday(userId);
    const dailyLimit = 5;
    if (todayUsage >= dailyLimit) {
      return res.status(429).json({
        error: '今日免费额度已用完',
        tip: '升级到Pro版享受无限生成 → 联系客服开通',
        upgradeLink: '/upgrade',
      });
    }
  }

  next();
}

/**
 * 频率限制
 */
function rateLimiter(req, res, next) {
  // 简单频率限制：1秒内最多5次请求（后续可扩展Redis）
  const now = Date.now();
  if (!rateLimiter.cache) rateLimiter.cache = {};

  const key = req.userId;
  const window = rateLimiter.cache[key];
  const limitPerSec = 5;

  if (window && now - window.start < 1000) {
    window.count++;
    if (window.count > limitPerSec) {
      return res.status(429).json({ error: '请求太快，请稍候再试' });
    }
  } else {
    rateLimiter.cache[key] = { start: now, count: 1 };
  }

  next();
}

module.exports = { authMiddleware, rateLimiter, subscriptionCheck };
