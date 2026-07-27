/**
 * 管理后台 API 路由
 * 认证方式：Admin API Key（Header: x-admin-key）
 */

const express = require('express');
const router = express.Router();
const { UserModel, ContentModel, UsageModel } = require('../services/db');
const logger = require('../services/logger');
const configService = require('../services/config');
const { AppError } = require('../middleware/error-handler');

// 安全：无 ADMIN_KEY 则拒绝启动，不设默认值（防止暴力破解）
const ADMIN_KEY = process.env.ADMIN_KEY;
if (!ADMIN_KEY) {
  throw new Error('FATAL: ADMIN_KEY 未配置！请在 .env 文件中设置一个强随机密钥。\n示例：ADMIN_KEY=sk-' + require('crypto').randomBytes(24).toString('hex'));
}

// 防暴力破解：IP 级别限流（每分钟最多 5 次失败尝试）
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 60 * 1000;

function adminRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && record.count >= MAX_ATTEMPTS && (now - record.since) < ATTEMPT_WINDOW_MS) {
    return res.status(429).json({ error: '尝试次数过多，请1分钟后重试', retryAfter: Math.ceil((ATTEMPT_WINDOW_MS - (now - record.since)) / 1000) });
  }

  // 通过 res 拦截，记录失败次数
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode === 401) {
      if (!record || (now - record.since) >= ATTEMPT_WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, since: now });
      } else {
        record.count++;
      }
      logger.warn('管理后台认证失败', { ip, attempt: record?.count || 1, module: 'admin' });
    } else {
      // 成功登录，清除计数
      loginAttempts.delete(ip);
    }
    return originalJson(body);
  };
  next();
}

// 管理后台认证中间件
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: '管理员密钥无效' });
  }
  next();
}

router.use(adminRateLimit);
router.use(adminAuth);

// ==========================================
// Dashboard 仪表盘
// ==========================================

router.get('/dashboard', (req, res, next) => {
  try {
    const totalUsers = UserModel.count();
    const totalContent = ContentModel.count();
    const todayUsage = UsageModel.todayTotal();
    const todayActiveUsers = UsageModel.userStats();
    const dailyStats = UsageModel.dailyStats(7);

    // 按套餐统计
    const planStats = { free: 0, pro: 0, enterprise: 0, whitelabel: 0 };
    const allUsers = UserModel.listAll(1, 9999);
    allUsers.items.forEach(u => { if (planStats[u.plan] !== undefined) planStats[u.plan]++; });

    // 本月估算收入
    const revenue = planStats.pro * 299 + planStats.enterprise * 999 + planStats.whitelabel * 3999;

    res.json({ totalUsers, totalContent, todayUsage, todayActiveUsers, dailyStats, planStats, revenue });
  } catch (err) {
    logger.error('Dashboard 查询失败', { error: err.message, module: 'admin' });
    next(err);
  }
});

// ==========================================
// 用户管理
// ==========================================

router.get('/users', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const result = UserModel.listAll(page, limit, search);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:id', (req, res, next) => {
  try {
    const user = UserModel.findById(req.params.id);
    if (!user) throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    const usage = UsageModel.getToday(user.id);
    res.json({ ...user, todayUsage: usage });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:id/plan', (req, res, next) => {
  try {
    const { plan } = req.body;
    const validPlans = ['free', 'pro', 'enterprise', 'whitelabel'];
    if (!validPlans.includes(plan)) {
      throw new AppError('无效套餐，可选: free/pro/enterprise/whitelabel', 400, 'INVALID_PLAN');
    }
    UserModel.updatePlan(req.params.id, plan);
    logger.info('用户套餐更新', { userId: req.params.id, plan, module: 'admin' });
    res.json({ success: true, plan });
  } catch (err) {
    next(err);
  }
});

router.delete('/users/:id', (req, res, next) => {
  try {
    UserModel.deleteUser(req.params.id);
    logger.info('用户已删除', { userId: req.params.id, module: 'admin' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 内容管理
// ==========================================

router.get('/contents', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const result = ContentModel.listAll(page, limit, search);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete('/contents/:id', (req, res, next) => {
  try {
    ContentModel.deleteById(req.params.id);
    logger.info('内容已删除', { contentId: req.params.id, module: 'admin' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 系统配置（支持持久化到 .env）
// ==========================================

// 获取完整配置
router.get('/config', (req, res) => {
  res.json({
    plans: {
      free: { name: '免费版', price: 0, dailyLimit: 5, features: ['基础模板', '每天5次'] },
      pro: { name: 'Pro版', price: 299, dailyLimit: 100, features: ['无限生成', '全功能', 'AI配图'] },
      enterprise: { name: '企业版', price: 999, dailyLimit: Infinity, features: ['多账号', '行业深度定制', '数据看板', '优先支持'] },
      whitelabel: { name: '白标版', price: 3999, dailyLimit: Infinity, features: ['自有品牌', '后端赋能', '独立部署', '全部功能', '品牌定制'] },
    },
    industries: ['beauty', 'restaurant', 'retail', 'education', 'fitness', 'decoration'],
    platforms: ['douyin', 'xiaohongshu', 'wechat', 'zhihu', 'gongzhonghao'],
    // 当前运行时配置
    model: process.env.PANGU_MODEL || 'deepseek-chat',
    port: process.env.PORT || 18790,
    useOpenClaw: process.env.USE_OPENCLAW || 'false',
    comfyuiUrl: process.env.COMFYUI_URL || 'http://127.0.0.1:8188',
    adminKey: process.env.ADMIN_KEY ? '***已配置***' : '未配置',
    // 白标配置
    whitelabel: configService.getWhitelabelConfig(),
    // 配置文件信息
    envFileExists: configService.envFileExists(),
    envPath: configService.ENV_PATH,
  });
});

// 更新配置 — 持久化到 .env 文件
router.put('/config', (req, res, next) => {
  try {
    const { model, useOpenClaw, comfyuiUrl, port } = req.body;
    const updates = {};

    if (model) updates.PANGU_MODEL = model;
    if (useOpenClaw !== undefined) updates.USE_OPENCLAW = String(useOpenClaw);
    if (comfyuiUrl) updates.COMFYUI_URL = comfyuiUrl;
    if (port) updates.PORT = String(port);

    if (Object.keys(updates).length === 0) {
      throw new AppError('没有需要更新的配置项', 400, 'NO_UPDATES');
    }

    // 持久化写入 .env
    configService.setMany(updates);

    logger.info('系统配置已更新并持久化', { updates, module: 'admin' });

    res.json({
      success: true,
      message: '配置已保存到 .env 文件，重启服务后生效',
      updated: Object.keys(updates),
      needRestart: true,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 白标版配置管理
// ==========================================

// 获取白标配置
router.get('/whitelabel', (req, res) => {
  const config = configService.getWhitelabelConfig();
  const defaults = configService.WHITELABEL_DEFAULTS;
  res.json({ config, defaults });
});

// 更新白标配置
router.put('/whitelabel', (req, res, next) => {
  try {
    const updated = configService.updateWhitelabelConfig(req.body);
    logger.info('白标配置已更新', { module: 'admin' });
    res.json({
      success: true,
      message: '白标配置已保存到 .env 文件',
      config: updated,
    });
  } catch (err) {
    next(err);
  }
});

// 获取所有可管理配置（综合视图）
router.get('/config/all', (req, res) => {
  res.json(configService.getAllConfig());
});

module.exports = router;
