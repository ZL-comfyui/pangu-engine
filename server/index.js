/**
 * 盘古AI内容引擎 — 主服务入口
 * 启动: node server/index.js
 * 端口: 18790 (不冲突OpenClaw网关18789)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const logger = require('./services/logger');
const { setupErrorMonitoring, AppError } = require('./middleware/error-handler');
const promptEngine = require('../prompts');
const { generateContent, generateMultiPlatform, generateImagePrompt } = require('./services/ai');
const { createDB, UserModel, ContentModel, UsageModel } = require('./services/db');
const { authMiddleware, rateLimiter, subscriptionCheck } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 18790;

// ==========================================
// 中间件
// ==========================================

// 请求日志（需在 cors/body-parser 之前，记录原始请求）
app.use(logger.requestLogger);

// CORS：生产环境应限制为实际域名，开发环境允许 localhost
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:18790', 'http://localhost:18791', 'http://127.0.0.1:18790', 'http://127.0.0.1:18791'];

app.use(cors({
  origin: function (origin, callback) {
    // 同源请求（origin 为 undefined）放行
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: origin not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'web')));

// ==========================================
// 数据库初始化
// ==========================================
let db = null;
(async () => {
  try {
    db = await createDB();
    UserModel.init(db);
    ContentModel.init(db);
    UsageModel.init(db);
    logger.info('数据库就绪', { module: 'database' });
  } catch (err) {
    logger.error('数据库初始化失败', { error: err.message, stack: err.stack, module: 'database' });
  }
})();

// ==========================================
// 公开 API（无需认证）
// ==========================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 获取行业列表
app.get('/api/industries', (req, res) => {
  res.json(promptEngine.getIndustries());
});

// 获取平台列表
app.get('/api/platforms', (req, res) => {
  res.json(promptEngine.getPlatforms());
});

// 免费试用（限次）
app.post('/api/trial/generate', async (req, res, next) => {
  try {
    const { industry, platform, scene, inputs } = req.body;
    if (!industry || !platform) {
      throw new AppError('缺少必要参数: industry, platform', 400, 'MISSING_PARAMS');
    }

    const prompts = promptEngine.generate({ industry, platform, scene, inputs });
    logger.ai('免费试用生成', { industry, platform, scene });

    const result = await generateContent(prompts.system, prompts.user);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 需认证 API
// ==========================================

// 用户注册
app.post('/api/auth/register', (req, res, next) => {
  try {
    const { phone, name, password } = req.body;
    if (!phone || !password) {
      throw new AppError('手机号和密码必填', 400, 'MISSING_PARAMS');
    }
    const user = UserModel.create(phone, name, password);
    logger.info('用户注册', { userId: user.id, phone: phone?.replace(/.(?=.{4})/g, '*'), module: 'auth' });
    res.json({ success: true, user: { id: user.id, phone: user.phone, name: user.name, plan: user.plan } });
  } catch (err) {
    next(err);
  }
});

// 用户登录
app.post('/api/auth/login', (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = UserModel.findByPhone(phone);
    if (!user || user.password !== password) {
      throw new AppError('手机号或密码错误', 401, 'AUTH_FAILED');
    }
    const token = UserModel.login(user.id);
    logger.info('用户登录', { userId: user.id, module: 'auth' });
    res.json({ success: true, token, user: { id: user.id, phone: user.phone, name: user.name, plan: user.plan } });
  } catch (err) {
    next(err);
  }
});

// 获取用户信息
app.get('/api/user/profile', authMiddleware, (req, res, next) => {
  try {
    const user = UserModel.findById(req.userId);
    if (!user) throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');
    const usage = UsageModel.getToday(req.userId);
    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      plan: user.plan,
      planName: user.plan === 'free' ? '免费版' : user.plan === 'pro' ? 'Pro版' : user.plan === 'enterprise' ? '企业版' : '白标版',
      todayUsage: usage,
      dailyLimit: user.plan === 'free' ? 5 : user.plan === 'pro' ? 100 : Infinity,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 核心生成 API
// ==========================================

// 单次生成
app.post('/api/generate', authMiddleware, subscriptionCheck, rateLimiter, async (req, res, next) => {
  try {
    const { industry, platform, scene, inputs } = req.body;
    if (!industry || !platform || !scene) {
      throw new AppError('缺少必要参数', 400, 'MISSING_PARAMS');
    }

    const prompts = promptEngine.generate({ industry, platform, scene, inputs });
    logger.ai('单次生成', { userId: req.userId, industry, platform, scene });

    const result = await generateContent(prompts.system, prompts.user);

    // 记录用量和内容
    UsageModel.record(req.userId);
    ContentModel.save(req.userId, { type: 'single', industry, platform, scene, inputs, result });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 一键多平台改写（杀手功能）
app.post('/api/generate/multi-platform', authMiddleware, subscriptionCheck, rateLimiter, async (req, res, next) => {
  try {
    const { industry, scene, inputs, targetPlatforms } = req.body;
    if (!industry || !scene) {
      throw new AppError('缺少必要参数', 400, 'MISSING_PARAMS');
    }

    const platforms = targetPlatforms || ['wechat', 'xiaohongshu', 'douyin', 'zhihu', 'gongzhonghao'];
    logger.ai('多平台生成', { userId: req.userId, industry, scene, platforms: platforms.join(',') });

    const prompts = promptEngine.multiPlatform({ industry, scene, inputs, targetPlatforms: platforms });

    const results = {};
    for (const [plat, prompt] of Object.entries(prompts)) {
      results[plat] = await generateContent(prompt.system, prompt.user);
    }

    UsageModel.record(req.userId, Object.keys(prompts).length);
    ContentModel.save(req.userId, { type: 'multi-platform', industry, scene, inputs, results });

    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
});

// 爆款标题工厂
app.post('/api/tools/headline', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { topic, count = 20, platform = 'xiaohongshu' } = req.body;
    const prompt = promptEngine.headlineFactory({ topic, count, platform });
    logger.ai('标题工厂', { userId: req.userId, topic, platform });

    const result = await generateContent(prompt.system, prompt.user);

    UsageModel.record(req.userId);
    ContentModel.save(req.userId, { type: 'headline', topic, result });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 内容日历生成
app.post('/api/tools/calendar', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { industry, month, keyDates = [] } = req.body;
    const prompt = promptEngine.contentCalendar({ industry, month, keyDates });
    logger.ai('内容日历', { userId: req.userId, industry, month });

    const result = await generateContent(prompt.system, prompt.user);

    UsageModel.record(req.userId);
    ContentModel.save(req.userId, { type: 'calendar', industry, month, result });

    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 竞品分析
app.post('/api/tools/analyze', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { url, content, industry } = req.body;
    const prompt = promptEngine.competitorAnalysis({ url, content, industry });
    logger.ai('竞品分析', { userId: req.userId, industry });

    const result = await generateContent(prompt.system, prompt.user);

    UsageModel.record(req.userId);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 视频脚本生成
app.post('/api/tools/video', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { type, topic, duration, style } = req.body;
    const videoTool = require('../prompts/tools/video');
    const prompt = videoTool.script.user(type || '口播', { topic, duration, style });
    logger.ai('视频脚本', { userId: req.userId, videoType: type, topic });

    const result = await generateContent(videoTool.script.system, prompt);

    UsageModel.record(req.userId);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 直播话术生成
app.post('/api/tools/live', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { industry, product, price, duration } = req.body;
    const liveTool = require('../prompts/tools/live');
    const prompt = liveTool.user({ industry, product, price, duration });
    logger.ai('直播话术', { userId: req.userId, industry, product });

    const result = await generateContent(liveTool.system, prompt);

    UsageModel.record(req.userId);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 配图 Prompt 生成
app.post('/api/tools/image-prompt', authMiddleware, subscriptionCheck, async (req, res, next) => {
  try {
    const { content, style = '现代简约' } = req.body;
    logger.ai('配图Prompt', { userId: req.userId, style });

    const result = await generateImagePrompt(content, style);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

// 历史内容
app.get('/api/history', authMiddleware, (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const results = ContentModel.list(req.userId, page, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// 搜索历史
app.get('/api/history/search', authMiddleware, (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) throw new AppError('请提供搜索关键词', 400, 'MISSING_PARAMS');
    const results = ContentModel.search(req.userId, q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 管理 API
// ==========================================

// 系统统计（企业版/白标版用户可见）
app.get('/api/admin/stats', authMiddleware, (req, res, next) => {
  try {
    const user = UserModel.findById(req.userId);
    if (user.plan !== 'enterprise' && user.plan !== 'whitelabel') {
      throw new AppError('无权限', 403, 'FORBIDDEN');
    }
    res.json({
      totalUsers: UserModel.count(),
      totalContent: ContentModel.count(),
      todayUsage: UsageModel.todayTotal(),
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 管理后台 API
// ==========================================
// 管理后台 IP 白名单中间件（仅允许本地回环）
function adminIPWhitelist(req, res, next) {
  const clientIP = req.ip || req.connection.remoteAddress;
  const allowed = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
  if (!allowed.includes(clientIP) && !clientIP.startsWith('127.')) {
    logger.warn('管理后台非本地IP访问被拒', { ip: clientIP, module: 'security' });
    return res.status(403).json({ error: '管理后台仅限本地访问' });
  }
  next();
}

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminIPWhitelist, adminRoutes);

// ==========================================
// 白标版 API
// ==========================================
const whitelabelRoutes = require('./routes/whitelabel');
app.use('/api/whitelabel', whitelabelRoutes);

// ==========================================
// 注册错误监控 + 404 处理 + 统一错误中间件
// ==========================================
setupErrorMonitoring(app);

// ==========================================
// 启动服务器
// ==========================================
app.listen(PORT, () => {
  logger.info(`盘古AI内容引擎 已启动`, {
    port: PORT,
    urls: {
      api: `http://localhost:${PORT}/api/health`,
      web: `http://localhost:${PORT}`,
      admin: `http://localhost:${PORT}/api/admin`,
    },
  });
});

module.exports = app;
