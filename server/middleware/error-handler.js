/**
 * 盘古AI内容引擎 — 统一错误处理
 *
 * 功能：
 * 1. 全局未捕获异常捕获 (uncaughtException)
 * 2. 全局未处理的 Promise 拒绝 (unhandledRejection)
 * 3. Express 错误处理中间件（统一错误响应格式）
 * 4. 进程退出前的优雅关闭
 */

const logger = require('../services/logger');

/**
 * 自定义业务异常类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 注册全局异常捕获
 * @param {import('express').Application} app
 */
function setupErrorMonitoring(app) {
  // ==========================================
  // 未捕获的同步异常
  // ==========================================
  process.on('uncaughtException', (err) => {
    logger.error('未捕获异常 (uncaughtException)', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      module: 'process',
      fatal: true,
    });

    // 严重错误：记录后退出
    console.error('💥 发生未捕获异常，进程即将退出');
    console.error(err);

    // 给日志一点时间写入
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  // ==========================================
  // 未处理的 Promise 拒绝
  // ==========================================
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('未处理的 Promise 拒绝 (unhandledRejection)', {
      error: reason?.message || String(reason),
      stack: reason?.stack,
      module: 'process',
    });

    console.error('⚠️ 未处理的 Promise 拒绝:', reason);
  });

  // ==========================================
  // Express 404 处理
  // ==========================================
  app.use((req, res, next) => {
    res.status(404).json({
      error: '接口不存在',
      code: 'NOT_FOUND',
      path: req.originalUrl,
    });
  });

  // ==========================================
  // Express 统一错误处理中间件
  // ==========================================
  app.use((err, req, res, _next) => {
    // 记录错误日志
    const level = err.statusCode >= 500 || !err.isOperational ? 'error' : 'warn';

    logger[level]('API错误', {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode || 500,
      code: err.code || 'INTERNAL_ERROR',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.userId || 'anonymous',
      module: 'api',
    });

    // 返回统一格式
    const statusCode = err.statusCode || 500;
    const isDev = process.env.NODE_ENV !== 'production';

    res.status(statusCode).json({
      error: err.message || '服务器内部错误',
      code: err.code || 'INTERNAL_ERROR',
      // 开发环境返回堆栈
      ...(isDev && err.stack ? { stack: err.stack.split('\n').slice(0, 3) } : {}),
    });
  });

  logger.info('错误监控已注册', {
    features: ['uncaughtException', 'unhandledRejection', '404Handler', 'errorMiddleware'],
  });
}

module.exports = { setupErrorMonitoring, AppError };
