/**
 * 盘古AI内容引擎 — 结构化日志服务
 * 基于 winston，支持控制台 + 文件双输出
 *
 * 使用：
 *   const logger = require('./services/logger');
 *   logger.info('用户登录', { userId: 'xxx' });
 *   logger.error('AI调用失败', { error: err.message, stack: err.stack });
 *   logger.db('查询用户', { table: 'users', sql: 'SELECT ...', duration: 12 });
 *   logger.req(req, res, duration);
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 自定义格式：结构化 JSON，控制台彩色输出
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建 logger 实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // 控制台输出（开发环境彩色）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // 全量日志文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    // 错误日志单独文件
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

// ==========================================
// 扩展便捷方法
// ==========================================

/**
 * 数据库操作日志
 */
logger.db = function (operation, meta = {}) {
  this.info(`[DB] ${operation}`, { module: 'database', ...meta });
};

/**
 * HTTP 请求日志中间件
 * 用法：app.use(logger.requestLogger)
 */
logger.requestLogger = function (req, res, next) {
  const start = Date.now();

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level](`${req.method} ${req.originalUrl}`, {
      module: 'http',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent']?.substring(0, 120),
      contentLength: res.getHeader?.('content-length'),
    });
  });

  next();
};

/**
 * 请求摘要（供控制台快速浏览）
 */
logger.req = function (req, res, duration) {
  const icon = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';
  this.info(`${icon} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
};

/**
 * AI 调用日志
 */
logger.ai = function (action, meta = {}) {
  this.info(`[AI] ${action}`, { module: 'ai', ...meta });
};

// ==========================================
// 启动时输出日志路径
// ==========================================
logger.info('日志系统就绪', { logDir: LOG_DIR });

module.exports = logger;
